'use client';

import { useState, useRef, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getOpenRouterResponse } from '@/ai/flows/understand-user-intent';

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

  const startRecording = () => {
    // Adding a timeout to prevent race conditions where start is called before recognition has fully stopped.
    setTimeout(() => {
      if (recognitionRef.current && !isRecording && !isLoading) {
        try {
          setIsRecording(true);
          recognitionRef.current.start();
        } catch (error) {
           console.error("Error starting speech recognition:", error);
           // If starting fails, reset state and try again after a delay.
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
        // Automatically start listening again after speaking is finished
        startRecording(); 
      };
      utterance.onerror = (event) => {
        console.error('SpeechSynthesis Error:', event);
        handleError('There was an error during speech playback.');
        setIsLoading(false);
        onEndCallback?.();
      };
      speechSynthesis.speak(utterance);
    } else {
      setIsLoading(false);
      onEndCallback?.();
      // If speech is not supported, still try to listen
      startRecording();
    }
  };

  const handleError = (message: string, error?: any, speakMessage = false) => {
    if (error) {
       // Do not log "no-speech" as a console error, as it's expected behavior
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
      // If there was a non-spoken error, try to start listening again
      startRecording();
    }
  };

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
        let speakableMessage = "An unexpected error occurred. Please try again."

        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          speakableMessage = "I can't access the microphone. Please grant permission and try again.";
          handleError("Microphone permission denied.", event, true);
        } else if (event.error === 'no-speech') {
           // Don't speak an error, just restart listening
           startRecording();
        } else {
           handleError(`Speech recognition error: ${event.error}`, event, true);
        }
        
        setIsRecording(false);
        setIsLoading(false);
      };
      
      recognitionRef.current.onend = () => {
        setIsRecording(false);
        // This ensures listening continues in a loop
        if (!isLoading) {
          startRecording();
        }
      };
      
      // Automatically start listening on page load
      startRecording();

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
    <div className="flex flex-col h-screen bg-background text-foreground">
       <header className="p-4 border-b shadow-sm">
         <h1 className="text-2xl font-bold text-center font-headline">VocalVerse</h1>
       </header>
       <main className="flex-1 flex flex-col items-center justify-center overflow-hidden">
          {isLoading && <Loader2 className="w-16 h-16 animate-spin" />}
          {isRecording && !isLoading && <RecordingIndicator />}
       </main>
       <footer className="p-4 border-t bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex items-center justify-center h-32">
           <p className="text-muted-foreground text-center">
             {isLoading ? "Thinking..." : isRecording ? "Listening..." : "Waiting to listen..."}
           </p>
        </div>
       </footer>
    </div>
  );
}
