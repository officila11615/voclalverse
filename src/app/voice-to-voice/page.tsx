
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Loader2, MicOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getOpenRouterResponse } from '@/ai/flows/understand-user-intent';

// Enum for the different states of the voice assistant
enum AssistantState {
  Idle, // Initializing or waiting
  Listening, // Actively listening for user input
  Thinking, // Processing user input and waiting for AI response
  Speaking, // Playing back the AI response
  Error, // An error has occurred (e.g., mic permission denied)
}

const RecordingIndicator = () => (
  <div className="flex items-center justify-center space-x-2 h-24 animate-fade-in">
    <div className="w-3 h-full bg-primary/80 rounded-full animate-waveform-glow" style={{ animationDelay: '0ms' }} />
    <div className="w-3 h-full bg-primary/80 rounded-full animate-waveform-glow" style={{ animationDelay: '200ms' }} />
    <div className="w-3 h-full bg-primary/80 rounded-full animate-waveform-glow" style={{ animationDelay: '400ms' }} />
    <div className="w-3 h-full bg-primary/80 rounded-full animate-waveform-glow" style={{ animationDelay: '600ms' }} />
    <div className="w-3 h-full bg-primary/80 rounded-full animate-waveform-glow" style={{ animationDelay: '800ms' }} />
  </div>
);

const ErrorIndicator = () => (
  <div className="flex flex-col items-center justify-center animate-fade-in">
    <div className="w-48 h-48 rounded-full bg-destructive/20 flex items-center justify-center animate-pulse-glow-red">
       <MicOff className="w-24 h-24 text-destructive-foreground/80" />
    </div>
    <p className="mt-6 text-xl text-destructive-foreground/90 font-medium">Microphone Unavailable</p>
  </div>
);

export default function VocalVersePage() {
  const [assistantState, setAssistantState] = useState<AssistantState>(AssistantState.Idle);
  const { toast } = useToast();
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const isMountedRef = useRef(false);

  // This ref helps prevent race conditions by tracking if a recognition restart is pending
  const recognitionStopTimer = useRef<NodeJS.Timeout | null>(null);

  const playSound = useCallback((type: 'start' | 'end' | 'confirmation') => {
    if (!audioContextRef.current) return;
    const context = audioContextRef.current;
    
    // Resume context if it's suspended (required by browser autoplay policies)
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
      oscillator.frequency.setValueAtTime(523.25, context.currentTime);
      oscillator.frequency.linearRampToValueAtTime(783.99, context.currentTime + 0.1);
    }
    
    oscillator.start(context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.00001, context.currentTime + (type === 'confirmation' ? 0.15 : 0.1));
    oscillator.stop(context.currentTime + (type === 'confirmation' ? 0.15 : 0.1));
  }, []);

  const stopRecognition = useCallback(() => {
    if (recognitionRef.current) {
        // Clear any pending restarts to avoid race conditions
        if (recognitionStopTimer.current) {
            clearTimeout(recognitionStopTimer.current);
            recognitionStopTimer.current = null;
        }
        recognitionRef.current.onstart = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
        recognitionRef.current = null;
    }
  }, []);
  
  const speak = useCallback((text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
        setAssistantState(AssistantState.Idle);
        return;
    }

    // Stop listening before speaking
    stopRecognition();
    setAssistantState(AssistantState.Speaking);

    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;

    utterance.onend = () => {
        if (isMountedRef.current && assistantState === AssistantState.Speaking) {
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
        if (isMountedRef.current && assistantState === AssistantState.Speaking) {
            setAssistantState(AssistantState.Idle);
        }
    };

    window.speechSynthesis.speak(utterance);
  }, [assistantState, stopRecognition, toast]);

  const handleSubmit = useCallback(async (text: string) => {
    if (!text) {
      setAssistantState(AssistantState.Idle);
      return;
    };
    
    setAssistantState(AssistantState.Thinking);
    stopRecognition();
    
    try {
      const intentResult = await getOpenRouterResponse({ transcription: text });
      const responseText = intentResult.response;
      
      setTimeout(() => {
          speak(responseText);
      }, 2500);

    } catch (error) {
      console.error('Failed to get response. Please try again.', error);
      speak('Sorry, I had trouble getting a response. Please try again.');
    }
  }, [speak, stopRecognition]);

  const startRecognition = useCallback(() => {
      // If we are not in a state where we should be listening, do nothing.
      if (assistantState === AssistantState.Thinking || assistantState === AssistantState.Speaking || assistantState === AssistantState.Error) {
        return;
      }
      stopRecognition();

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
       if (!SpeechRecognition) {
          setAssistantState(AssistantState.Error);
          return;
       }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
          if (!isMountedRef.current) return;
          playSound('start');
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
              speak("Microphone permission denied. Please grant access and refresh the page.");
              setAssistantState(AssistantState.Error);
          } else if (event.error !== 'no-speech' && event.error !== 'aborted') {
              console.error(`Speech recognition error: ${event.error}`, event);
          }
      };
      
      recognition.onend = () => {
          if (isMountedRef.current && assistantState === AssistantState.Listening) {
             playSound('end');
             if (assistantState === AssistantState.Listening) {
                // A small delay before restarting to prevent race conditions on some browsers.
                recognitionStopTimer.current = setTimeout(() => {
                   startRecognition();
                }, 100);
             }
          }
      };

      recognitionRef.current = recognition;
      try {
        recognition.start();
      } catch (e) {
        console.error("Could not start recognition", e);
        stopRecognition(); // clean up
        // try again after a short delay
        setTimeout(() => startRecognition(), 250);
      }
  }, [assistantState, stopRecognition, playSound, handleSubmit, speak]);

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  // This effect manages the state transitions. When state becomes Idle, it should start listening.
  useEffect(() => {
    if (assistantState === AssistantState.Idle && isMountedRef.current) {
      // Use a timeout to ensure all cleanup from previous states is complete
      const transitionTimeout = setTimeout(() => {
        startRecognition();
      }, 100);
      return () => clearTimeout(transitionTimeout);
    }
  }, [assistantState, startRecognition]);

  const getStatusText = () => {
    switch(assistantState) {
        case AssistantState.Listening: return "Listening...";
        case AssistantState.Thinking: return "Thinking...";
        case AssistantState.Speaking: return "Speaking...";
        case AssistantState.Error: return "Microphone Error";
        case AssistantState.Idle: return "Initializing...";
        default: return "Waiting...";
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-[#1A1A2E] to-[#16213E] text-foreground">
       <header className="p-4 border-b border-white/10 shadow-lg flex items-center">
         <h1 className="text-3xl font-bold text-center font-headline tracking-wider text-white flex-1 animate-fade-in">Voice to Voice</h1>
       </header>
       <main className="flex-1 flex flex-col items-center justify-center overflow-hidden">
          {assistantState === AssistantState.Error && <ErrorIndicator />}
          {assistantState === AssistantState.Thinking && <Loader2 className="w-20 h-20 animate-spin text-primary animate-fade-in" />}
          {assistantState === AssistantState.Listening && <RecordingIndicator />}
       </main>
       <footer className="p-4 border-t border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="container mx-auto flex items-center justify-center h-16">
           <p className="text-muted-foreground text-center text-lg font-body">
             {getStatusText()}
           </p>
        </div>
       </footer>
    </div>
  );
}
