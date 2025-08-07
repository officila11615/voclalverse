'use client';

import { useState, useRef, useEffect } from 'react';
import { Loader2, MicOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getOpenRouterResponse } from '@/ai/flows/understand-user-intent';

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
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [micError, setMicError] = useState(false);
  const { toast } = useToast();
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const playSound = (type: 'start' | 'end' | 'confirmation') => {
    if (!audioContextRef.current) return;
    const context = audioContextRef.current;
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);

    gainNode.gain.setValueAtTime(0, context.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.1, context.currentTime + 0.01);

    if (type === 'start') {
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(440, context.currentTime); // A5
    } else if (type === 'end') {
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(330, context.currentTime); // E4
    } else if (type === 'confirmation') {
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(523.25, context.currentTime); // C5
      oscillator.frequency.linearRampToValueAtTime(783.99, context.currentTime + 0.1); // G5
    }
    
    oscillator.start(context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.00001, context.currentTime + (type === 'confirmation' ? 0.15 : 0.1));
    oscillator.stop(context.currentTime + (type === 'confirmation' ? 0.15 : 0.1));
  };
  
  const startRecording = () => {
    setTimeout(() => {
      if (recognitionRef.current && !isRecording && !isLoading && !micError) {
        try {
          setIsRecording(true);
          recognitionRef.current.start();
        } catch (error) {
           console.error("Error starting speech recognition:", error);
           setIsRecording(false);
           setTimeout(startRecording, 100);
        }
      }
    }, 100); 
  };
  
  const speak = (text: string, onEndCallback?: () => void) => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.onend = () => {
        setIsLoading(false);
        onEndCallback?.();
        startRecording(); 
      };
      utterance.onerror = (event: SpeechSynthesisErrorEvent) => {
        // Ignore 'interrupted' errors, which can happen if user speaks again mid-playback
        if (event.error !== 'interrupted') {
          console.error('SpeechSynthesis Error:', event);
          handleError('There was an error during speech playback.', null, false);
        }
        setIsLoading(false);
        onEndCallback?.();
      };
      speechSynthesis.speak(utterance);
    } else {
      setIsLoading(false);
      onEndCallback?.();
      startRecording();
    }
  };

  const handleError = (message: string, error?: any, speakMessage = false) => {
    if (error) {
      if ((error as any).error !== 'no-speech') {
        console.error(message, error);
      }
    } else {
       console.error(message);
    }
    
    if (speakMessage) {
      speak(message, () => setIsLoading(false));
    } else {
      toast({
        variant: 'destructive',
        title: 'An error occurred',
        description: message,
      });
      setIsLoading(false);
      startRecording();
    }
  };

  useEffect(() => {
    setIsMounted(true);
    // Initialize AudioContext on first user interaction (or page load)
    if (typeof window !== 'undefined' && !audioContextRef.current) {
        try {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        } catch (e) {
            console.error("Web Audio API is not supported in this browser.");
        }
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onstart = () => {
        playSound('start');
      };

      recognitionRef.current.onresult = (event: any) => {
        if (typeof window !== 'undefined' && window.speechSynthesis.speaking) {
          window.speechSynthesis.cancel();
        }
        playSound('confirmation');
        const transcript = event.results[0][0].transcript;
        handleSubmit(transcript);
      };

      recognitionRef.current.onerror = (event: any) => {
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setMicError(true);
          handleError("Microphone permission denied. Please grant access and refresh the page.", event, true);
        } else if (event.error === 'no-speech') {
           // Do not restart here, onend will handle it.
        } else {
           handleError(`Speech recognition error: ${event.error}`, event, true);
        }
        setIsRecording(false);
        setIsLoading(false);
      };
      
      recognitionRef.current.onend = () => {
        setIsRecording(false);
        // Only restart if not loading and not in an error state
        if (!isLoading && !micError) {
          playSound('end');
          // A brief timeout can prevent race conditions on some browsers.
          setTimeout(() => startRecording(), 50);
        }
      };
      
      startRecording();

    } else {
       setMicError(true);
       toast({
        variant: 'destructive',
        title: 'Browser Not Supported',
        description: 'Speech recognition is not supported in your browser.',
      });
    }

    return () => {
      if (recognitionRef.current) {
        // Prevent onend from running when component unmounts
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      }
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        speechSynthesis.cancel();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast]);

  const handleSubmit = async (text: string) => {
    if (!text || isLoading) return;

    setIsLoading(true);
    
    try {
      const intentResult = await getOpenRouterResponse({ transcription: text });
      const responseText = intentResult.response;
      speak(responseText);

    } catch (error) {
      handleError('Failed to get response. Please try again.', error, true);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-[#1A1A2E] to-[#16213E] text-foreground">
       <header className="p-4 border-b border-white/10 shadow-lg">
         <h1 className="text-3xl font-bold text-center font-headline tracking-wider text-white">VocalVerse</h1>
       </header>
       <main className="flex-1 flex flex-col items-center justify-center overflow-hidden">
          {micError && <ErrorIndicator />}
          {!micError && isLoading && <Loader2 className="w-20 h-20 animate-spin text-primary animate-fade-in" />}
          {!micError && isRecording && !isLoading && isMounted && <RecordingIndicator />}
       </main>
       <footer className="p-4 border-t border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="container mx-auto flex items-center justify-center h-16">
           <p className="text-muted-foreground text-center text-lg font-body">
             {micError ? "Microphone Error" : isLoading ? "Thinking..." : isRecording ? "Listening..." : "Initializing..."}
           </p>
        </div>
       </footer>
    </div>
  );
}
