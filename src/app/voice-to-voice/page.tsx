
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

  const handleSubmit = useCallback(async (text: string) => {
    if (!text) {
      if (isMountedRef.current) setAssistantState(AssistantState.Idle);
      return;
    };
    
    stopRecognition();
    if (isMountedRef.current) setAssistantState(AssistantState.Thinking);
    
    const lowerCaseText = text.toLowerCase().trim();
    const repeatCommands = ["repeat", "say that again", "what was that"];
    if (repeatCommands.includes(lowerCaseText) && lastResponse) {
        // speak() will be called via useEffect watching assistantState
        if (isMountedRef.current) setAssistantState(AssistantState.Speaking);
        return;
    }
    
    try {
      const intentResult = await getOpenRouterResponse({ transcription: text });
      const responseText = intentResult.response;
      setLastResponse(responseText);
    } catch (error) {
      console.error('Failed to get response. Please try again.', error);
      const errorMessage = 'Sorry, I had trouble getting a response. Please try again.';
      setLastResponse(errorMessage);
    } finally {
        if(isMountedRef.current) setAssistantState(AssistantState.Speaking);
    }
  }, [stopRecognition, lastResponse]);
  
  const speak = useCallback((text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis || !text) {
        if (isMountedRef.current) setAssistantState(AssistantState.Idle);
        return;
    }

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
  }, [toast]);
  
  const startRecognition = useCallback(() => {
    if (recognitionRef.current || assistantState === AssistantState.Thinking || assistantState === AssistantState.Error) {
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        setAssistantState(AssistantState.Error);
        return;
    }
    
    wasSpeakingWhenListeningStarted.current = window.speechSynthesis.speaking;

    if (!wasSpeakingWhenListeningStarted.current) {
        setAssistantState(AssistantState.Listening);
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false; // Process single utterances
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
        if (!isMountedRef.current) return;
        if (!wasSpeakingWhenListeningStarted.current) {
          playSound('start');
        }
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
            setAssistantState(AssistantState.Speaking);
        } else if (event.error !== 'no-speech' && event.error !== 'aborted') {
            console.error(`Speech recognition error: ${event.error}`, event);
        }
    };
    
    recognition.onend = () => {
      recognitionRef.current = null;
      if (isMountedRef.current && assistantState === AssistantState.Listening) {
        if (!wasSpeakingWhenListeningStarted.current) {
          playSound('end');
        }
        setAssistantState(AssistantState.Idle);
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (e) {
      console.error("Could not start recognition", e);
      // Clean up if start fails
      recognitionRef.current = null;
    }
  }, [assistantState, playSound, handleSubmit]);


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

    // Set up voices
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        const voiceNamesToTry = [
            "Google US English", "Samantha", "Microsoft Zira - English (United States)", "Alex",
        ];
        let foundVoice: SpeechSynthesisVoice | null = null;
        for (const name of voiceNamesToTry) {
            foundVoice = voices.find(voice => voice.name === name && voice.lang.startsWith('en')) || null;
            if (foundVoice) break;
        }
        if (!foundVoice) foundVoice = voices.find(voice => voice.lang === "en-US" && voice.default) || null;
        if (!foundVoice) foundVoice = voices.find(voice => voice.lang === "en-US") || null;
        preferredVoiceRef.current = foundVoice || voices[0] || null;
      }
    };

    if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
        loadVoices();
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
    // This effect handles state transitions to Listening or Speaking
    if (assistantState === AssistantState.Idle || assistantState === AssistantState.Speaking) {
      startRecognition();
    } else if (assistantState === AssistantState.Thinking) {
      stopRecognition();
    }
  }, [assistantState, startRecognition, stopRecognition]);

  useEffect(() => {
    // This effect triggers speech when the state becomes Speaking
    if (assistantState === AssistantState.Speaking && lastResponse) {
      speak(lastResponse);
    }
  }, [assistantState, lastResponse, speak]);


  const getStatusText = () => {
    switch(assistantState) {
        case AssistantState.Listening: return "Listening...";
        case AssistantState.Thinking: return "Thinking...";
        case AssistantState.Speaking: return "Speaking...";
        case AssistantState.Error: return "Microphone Error. Please grant access.";
        case AssistantState.Idle:
        default: return "Ready. Tap the orb or start speaking.";
    }
  }

  const handleOrbClick = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel(); // Interrupt speech
    }
    stopRecognition();
    setAssistantState(AssistantState.Idle); // Return to idle to re-trigger listening
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-[#1A1A2E] to-[#16213E] text-foreground">
       <header className="p-4 border-b border-white/10 shadow-lg flex items-center">
         <h1 className="text-3xl font-bold text-center font-headline tracking-wider text-white flex-1 animate-fade-in">Voice to Voice</h1>
       </header>
       <main className="flex-1 flex flex-col items-center justify-center overflow-hidden">
          <button onClick={handleOrbClick} className="cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-full">
            <VocalOrb state={assistantState} />
          </button>
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

    