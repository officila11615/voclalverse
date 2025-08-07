'use client';

import { useState, useRef, useEffect } from 'react';
import { Loader2, Mic } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getOpenRouterResponse } from '@/ai/flows/understand-user-intent';
import { cn } from '@/lib/utils';

const RecordingIndicator = () => (
  <div className="flex items-center justify-center space-x-2 h-16">
    <span className="w-2 h-8 bg-primary rounded-full animate-waveform" style={{ animationDelay: '0ms' }} />
    <span className="w-2 h-12 bg-primary rounded-full animate-waveform" style={{ animationDelay: '200ms' }} />
    <span className="w-2 h-6 bg-primary rounded-full animate-waveform" style={{ animationDelay: '400ms' }} />
    <span className="w-2 h-12 bg-primary rounded-full animate-waveform" style={{ animationDelay: '600ms' }} />
    <span className="w-2 h-8 bg-primary rounded-full animate-waveform" style={{ animationDelay: '800ms' }} />
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
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        speechSynthesis.cancel();
      }
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
    if (isLoading) return <Loader2 className="w-16 h-16 animate-spin" />;
    return <Mic className="w-16 h-16" />;
  }

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
       <header className="p-4 border-b shadow-sm">
         <h1 className="text-2xl font-bold text-center font-headline">VocalVerse</h1>
       </header>
       <main className="flex-1 flex flex-col items-center justify-center overflow-hidden">
          {isRecording && <RecordingIndicator />}
       </main>
       <footer className="p-4 border-t bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex items-center justify-center">
            <button
              type="button"
              className={cn(
                  'h-32 w-32 rounded-full flex items-center justify-center text-white transition-all duration-300 ease-in-out',
                  'bg-gradient-to-br from-primary to-accent hover:from-accent hover:to-primary',
                  'shadow-lg hover:shadow-2xl transform hover:scale-105',
                  { 'animate-pulse-glow': isRecording },
                  { 'cursor-not-allowed opacity-50': isLoading }
              )}
              onClick={toggleRecording}
              disabled={isLoading}
              aria-label={isRecording ? 'Stop recording' : 'Start recording'}
            >
              {getMicIcon()}
            </button>
        </div>
       </footer>
    </div>
  );
}
