'use client';

import { useState, useRef, useEffect, type FC } from 'react';
import { User, Bot, Loader2, BrainCircuit, Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { getOpenRouterResponse } from '@/ai/flows/understand-user-intent';
import { cn } from '@/lib/utils';

const WelcomeMessage = () => (
  <div className="flex flex-col items-center justify-center h-full text-center p-4">
    <BrainCircuit className="w-24 h-24 mb-6 text-primary" />
    <h1 className="text-4xl font-bold font-headline text-foreground">VocalVerse</h1>
    <p className="mt-2 text-lg text-muted-foreground">Your personal AI voice assistant.</p>
    <p className="mt-4 text-muted-foreground">Click the microphone to start speaking.</p>
  </div>
);

export default function VocalVersePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const { toast } = useToast();
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        handleSubmit(transcript);
      };

      recognitionRef.current.onerror = (event: any) => {
        handleError(`Speech recognition error: ${event.error}`);
        setIsRecording(false);
      };
      
      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };
    } else {
       toast({
        variant: 'destructive',
        title: 'Browser Not Supported',
        description: 'Speech recognition is not supported in your browser.',
      });
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      speechSynthesis.cancel();
    };
  }, [toast]);

  const speak = (text: string) => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.onend = () => setIsLoading(false);
      utterance.onerror = () => {
        handleError('There was an error during speech playback.');
        setIsLoading(false);
      };
      speechSynthesis.speak(utterance);
    } else {
        setIsLoading(false);
    }
  };

  const handleError = (message: string, error?: any) => {
    if (error) console.error(message, error);
    toast({
      variant: 'destructive',
      title: 'An error occurred',
      description: message,
    });
    setIsLoading(false);
  };

  const handleSubmit = async (text: string) => {
    if (!text || isLoading) return;

    setIsLoading(true);
    
    try {
      const intentResult = await getOpenRouterResponse({ transcription: text });
      const responseText = intentResult.response;
      speak(responseText);

    } catch (error) {
      handleError('Failed to get response. Please try again.', error);
    }
  };

  const toggleRecording = () => {
    if (!recognitionRef.current) return;
    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      setIsRecording(true);
      recognitionRef.current.start();
    }
  };
  
  const getMicIcon = () => {
    if (isRecording) return <MicOff className="w-12 h-12" />;
    if (isLoading) return <Loader2 className="w-12 h-12 animate-spin" />;
    return <Mic className="w-12 h-12" />;
  }

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
       <header className="p-4 border-b shadow-sm">
         <h1 className="text-2xl font-bold text-center font-headline">VocalVerse</h1>
       </header>
       <main className="flex-1 flex flex-col items-center justify-center overflow-hidden">
          <WelcomeMessage />
       </main>
       <footer className="p-4 border-t bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex items-center justify-center">
            <Button
                type="button"
                size="lg"
                variant={isRecording ? 'destructive' : 'outline'}
                className="h-24 w-24 rounded-full"
                onClick={toggleRecording}
                disabled={isLoading}
                aria-label={isRecording ? 'Stop recording' : 'Start recording'}
              >
                {getMicIcon()}
            </Button>
        </div>
       </footer>
    </div>
  );
}