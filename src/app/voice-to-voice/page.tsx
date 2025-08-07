
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { MicOff, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getOpenRouterResponse } from '@/ai/flows/understand-user-intent';
import { cn } from '@/lib/utils';

// Enum for the different states of the voice assistant
enum AssistantState {
  Idle, // Waiting for the 'wake word' or user interaction
  Listening, // Actively listening for user input
  Thinking, // Processing user input and waiting for AI response
  Speaking, // Playing back the AI response
  Error, // An error has occurred (e.g., mic permission denied)
}

const VocalOrb = ({ state }: { state: AssistantState }) => {
  const isListening = state === AssistantState.Listening;
  const isThinking = state === AssistantState.Thinking;
  const isError = state === AssistantState.Error;

  return (
    <div className="relative w-48 h-48 md:w-64 md:h-64 flex items-center justify-center animate-fade-in">
      {/* Outer glow and pulse animation */}
      <div
        className={cn(
          "absolute w-full h-full rounded-full transition-all duration-500",
          isListening && "animate-orb-pulse",
          isError && "animate-orb-error-glow",
          !isListening && !isError && "bg-primary/10 shadow-[0_0_30px_-5px_hsl(var(--primary)),_inset_0_0_20px_-10px_hsl(var(--primary))]"
        )}
        style={{
            animationDuration: isListening ? '3s' : '2.5s'
        }}
      />
      {/* Inner orb structure */}
      <div
        className={cn(
          "w-[90%] h-[90%] rounded-full bg-background/50 backdrop-blur-xl border border-white/5 shadow-inner",
          "flex items-center justify-center"
        )}
      >
        <div
          className={cn(
            "w-[80%] h-[80%] rounded-full bg-background/50 border border-white/10 shadow-lg",
             "flex items-center justify-center transition-all duration-300",
             isThinking && "scale-95"
          )}
        >
          {isThinking && (
            <div className="absolute w-[120%] h-[120%] border-2 border-dashed border-primary/50 rounded-full animate-orb-spin" style={{animationDuration: '10s'}} />
          )}
          
          {isError ? (
            <MicOff className="w-16 h-16 text-destructive" />
          ) : isThinking ? (
            <Loader2 className="w-16 h-16 text-primary/80 animate-spin" style={{animationDuration: '1.5s'}} />
          ) : (
             <div className="w-16 h-16 rounded-full bg-primary/20 shadow-[0_0_15px_0px_hsl(var(--primary)/0.5)]" />
          )}
        </div>
      </div>
    </div>
  );
};


export default function VocalVersePage() {
  const [assistantState, setAssistantState] = useState<AssistantState>(AssistantState.Idle);
  const [lastResponse, setLastResponse] = useState('');
  const { toast } = useToast();
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const isMountedRef = useRef(false);
  const wasSpeakingWhenListeningStarted = useRef(false);
  const preferredVoiceRef = useRef<SpeechSynthesisVoice | null>(null);

  const recognitionStopTimer = useRef<NodeJS.Timeout | null>(null);

  const playSound = useCallback((type: 'start' | 'end' | 'confirmation') => {
    if (!audioContextRef.current) return;
    const context = audioContextRef.current;
    
    if (context.state === 'suspended') {
      context.resume();
    }
    
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);

    gainNode.gain.setValueAtTime(0, context.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.1, context.currentTime + 0.01);

    if (type === 'start') {
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(440, context.currentTime);
    } else if (type === 'end') {
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(330, context.currentTime);
    } else if (type === 'confirmation') {
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(523.25, context.currentTime); // C5
      oscillator.frequency.linearRampToValueAtTime(783.99, context.currentTime + 0.1); // G5
    }
    
    oscillator.start(context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.00001, context.currentTime + (type === 'confirmation' ? 0.15 : 0.1));
    oscillator.stop(context.currentTime + (type === 'confirmation' ? 0.15 : 0.1));
  }, []);

  const stopRecognition = useCallback(() => {
    if (recognitionRef.current) {
        if (recognitionStopTimer.current) {
            clearTimeout(recognitionStopTimer.current);
            recognitionStopTimer.current = null;
        }
        recognitionRef.current.onstart = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.abort(); // Use abort for immediate stop
        recognitionRef.current = null;
    }
  }, []);
  
  const speak = useCallback((text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
        setAssistantState(AssistantState.Idle);
        return;
    }
    
    setAssistantState(AssistantState.Speaking);

    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    if (preferredVoiceRef.current) {
      utterance.voice = preferredVoiceRef.current;
    }

    utterance.onend = () => {
        if (isMountedRef.current) {
            setAssistantState(AssistantState.Idle);
        }
    };
    
    utterance.onerror = (event: SpeechSynthesisErrorEvent) => {
        console.error('SpeechSynthesis Error:', event);
        if (event.error !== 'interrupted' && event.error !== 'canceled') {
            toast({
                variant: 'destructive',
                title: 'Playback Error',
                description: 'Sorry, there was an error during speech playback.',
            });
        }
        if (isMountedRef.current) {
            setAssistantState(AssistantState.Idle);
        }
    };

    window.speechSynthesis.speak(utterance);
    // startRecognition() is called from within speak to allow for barge-in
    // but we can't call it directly due to dependency cycle.
    // It's called from an effect that watches the state.
  }, [toast]);
  
  const handleSubmit = useCallback(async (text: string) => {
    if (!text) {
      setAssistantState(AssistantState.Idle);
      return;
    };

    const lowerCaseText = text.toLowerCase().trim();
    const repeatCommands = ["repeat", "say that again", "what was that"];
    if (repeatCommands.includes(lowerCaseText) && lastResponse) {
        speak(lastResponse);
        return;
    }
    
    stopRecognition();
    setAssistantState(AssistantState.Thinking);
    
    try {
      const intentResult = await getOpenRouterResponse({ transcription: text });
      const responseText = intentResult.response;
      setLastResponse(responseText);
      speak(responseText);

    } catch (error) {
      console.error('Failed to get response. Please try again.', error);
      const errorMessage = 'Sorry, I had trouble getting a response. Please try again.';
      setLastResponse(errorMessage);
      speak(errorMessage);
    }
  }, [stopRecognition, speak, lastResponse]);

  const startRecognition = useCallback(() => {
    if (assistantState === AssistantState.Thinking || assistantState === AssistantState.Error) {
      return;
    }
    stopRecognition();

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        setAssistantState(AssistantState.Error);
        return;
    }

    wasSpeakingWhenListeningStarted.current = window.speechSynthesis.speaking;

    const recognition = new SpeechRecognition();
    recognition.continuous = !wasSpeakingWhenListeningStarted.current;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
        if (!isMountedRef.current) return;
        if (!wasSpeakingWhenListeningStarted.current) {
          playSound('start');
        }
        setAssistantState(AssistantState.Listening);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
        if (!isMountedRef.current) return;
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript;
            }
        }

        const transcript = finalTranscript.trim();
        if (transcript) {
            if (window.speechSynthesis.speaking) {
                window.speechSynthesis.cancel();
            }
            playSound('confirmation');
            handleSubmit(transcript);
        }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (!isMountedRef.current) return;
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
            setAssistantState(AssistantState.Error);
            const errorMessage = "Microphone permission denied. Please grant access in your browser settings and refresh the page.";
            setLastResponse(errorMessage);
            speak(errorMessage);
        } else if (event.error !== 'no-speech' && event.error !== 'aborted') {
            console.error(`Speech recognition error: ${event.error}`, event);
        }
    };
    
    recognition.onend = () => {
      if (isMountedRef.current && assistantState === AssistantState.Listening) {
        if (!wasSpeakingWhenListeningStarted.current) {
          playSound('end');
        }
        if (assistantState === AssistantState.Listening) {
            recognitionStopTimer.current = setTimeout(() => {
              if (isMountedRef.current && assistantState === AssistantState.Listening) {
                  setAssistantState(AssistantState.Idle);
              }
            }, 100);
        }
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (e) {
      console.error("Could not start recognition", e);
      // It might fail if another recognition is already running.
      // We can try to recover by stopping and starting again.
      stopRecognition();
      setTimeout(() => startRecognition(), 100);
    }
  }, [assistantState, stopRecognition, playSound, handleSubmit, speak]);

  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        const voiceNamesToTry = [
            "Google US English",
            "Samantha",
            "Microsoft Zira - English (United States)",
            "Alex",
        ];
        let foundVoice: SpeechSynthesisVoice | null = null;
        for (const name of voiceNamesToTry) {
            foundVoice = voices.find(voice => voice.name === name && voice.lang.startsWith('en')) || null;
            if (foundVoice) break;
        }
        
        if (!foundVoice) {
            foundVoice = voices.find(voice => voice.lang === "en-US" && voice.default) || null;
        }
        
        if (!foundVoice) {
            foundVoice = voices.find(voice => voice.lang === "en-US") || null;
        }
        
        preferredVoiceRef.current = foundVoice || voices[0] || null;
      }
    };

    if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
        loadVoices();
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    
    if (typeof window !== 'undefined' && !audioContextRef.current) {
        try {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        } catch (e) {
            console.error("Web Audio API is not supported in this browser.");
        }
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setAssistantState(AssistantState.Error);
      toast({
        variant: 'destructive',
        title: 'Browser Not Supported',
        description: 'Speech recognition is not supported in your browser.',
      });
      return;
    }

    return () => {
      isMountedRef.current = false;
      stopRecognition();
      if (recognitionStopTimer.current) {
          clearTimeout(recognitionStopTimer.current);
      }
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [toast, stopRecognition]); 

  useEffect(() => {
    if (assistantState === AssistantState.Idle || assistantState === AssistantState.Speaking) {
      const canStart = assistantState === AssistantState.Idle || (assistantState === AssistantState.Speaking && !wasSpeakingWhenListeningStarted.current);
       if (canStart) {
        const transitionTimeout = setTimeout(() => {
          if (isMountedRef.current) {
            startRecognition();
          }
        }, 100);
        return () => clearTimeout(transitionTimeout);
      }
    }
  }, [assistantState, startRecognition]);

  const getStatusText = () => {
    switch(assistantState) {
        case AssistantState.Listening: return "Listening...";
        case AssistantState.Thinking: return "Thinking...";
        case AssistantState.Speaking: return "Speaking...";
        case AssistantState.Error: return "Microphone Error. Please grant access.";
        case AssistantState.Idle:
        default: return "Ready. Waiting for you to speak.";
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-[#1A1A2E] to-[#16213E] text-foreground">
       <header className="p-4 border-b border-white/10 shadow-lg flex items-center">
         <h1 className="text-3xl font-bold text-center font-headline tracking-wider text-white flex-1 animate-fade-in">Voice to Voice</h1>
       </header>
       <main className="flex-1 flex flex-col items-center justify-center overflow-hidden">
          <VocalOrb state={assistantState} />
       </main>
       <footer className="p-4 border-t border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="container mx-auto flex items-center justify-center h-16">
           <p className="text-muted-foreground text-center text-lg font-body min-h-[28px]">
             {getStatusText()}
           </p>
        </div>
       </footer>
    </div>
  );
}
