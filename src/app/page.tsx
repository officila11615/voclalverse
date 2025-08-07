'use client';

import { useState, useRef, useEffect, type FC } from 'react';
import { User, Bot, Loader2, BrainCircuit, Send, Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { getOpenRouterResponse } from '@/ai/flows/understand-user-intent';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';

type ConversationEntry = {
  type: 'user' | 'assistant';
  text: string;
  isLoading?: boolean;
};

const WelcomeMessage = () => (
  <div className="flex flex-col items-center justify-center h-full text-center p-4">
    <BrainCircuit className="w-24 h-24 mb-6 text-primary" />
    <h1 className="text-4xl font-bold font-headline text-foreground">Welcome to VocalVerse</h1>
    <p className="mt-2 text-lg text-muted-foreground">Your personal AI voice and text assistant.</p>
    <p className="mt-4 text-muted-foreground">Click the microphone to start speaking or type a message below.</p>
  </div>
);

const ChatBubble: FC<{ message: ConversationEntry }> = ({ message }) => {
  const isUser = message.type === 'user';

  return (
    <div className={cn('flex items-start gap-4 my-4', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <Avatar>
          <AvatarFallback className="bg-accent text-accent-foreground">
            <Bot className="w-6 h-6" />
          </AvatarFallback>
        </Avatar>
      )}
      <Card className={cn('max-w-md shadow-md', isUser ? 'bg-primary text-primary-foreground' : 'bg-card')}>
        <CardContent className="p-4">
          {message.isLoading ? (
            <div className="flex items-center space-x-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Thinking...</span>
            </div>
          ) : (
            <p className="font-body whitespace-pre-wrap">{message.text}</p>
          )}
        </CardContent>
      </Card>
      {isUser && (
        <Avatar>
          <AvatarFallback className="bg-secondary text-secondary-foreground">
            <User className="w-6 h-6" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
};

export default function VocalVersePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [conversation, setConversation] = useState<ConversationEntry[]>([]);
  const [inputText, setInputText] = useState('');
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
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
        setInputText(transcript);
        // Automatically submit after transcription
        handleSubmit(null, transcript);
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

    // Clean up on component unmount
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      speechSynthesis.cancel();
    };
  }, [toast]);

  useEffect(() => {
    const viewport = scrollAreaRef.current?.querySelector('div[data-radix-scroll-area-viewport]');
    if (viewport) {
      viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' });
    }
  }, [conversation]);

  const speak = (text: string) => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      speechSynthesis.cancel(); // Cancel any previous speech
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      speechSynthesis.speak(utterance);
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
    setConversation(prev => {
        const newConversation = [...prev];
        const lastMessage = newConversation[newConversation.length - 1];
        if (lastMessage?.isLoading) {
            newConversation.pop();
        }
        return newConversation;
    });
  };

  const handleSubmit = async (e: React.FormEvent | null, textOverride?: string) => {
    if(e) e.preventDefault();
    const text = (textOverride || inputText).trim();
    if (!text || isLoading) return;

    setInputText('');
    setIsLoading(true);

    const userMessage: ConversationEntry = { type: 'user', text };
    const assistantLoadingMessage: ConversationEntry = { type: 'assistant', text: '', isLoading: true };

    setConversation(prev => [...prev, userMessage, assistantLoadingMessage]);
    
    try {
      const intentResult = await getOpenRouterResponse({ transcription: text });
      const responseText = intentResult.response;

      setConversation(prev => {
        const newConversation = [...prev];
        const lastMessageIndex = newConversation.length - 1;
        if(newConversation[lastMessageIndex]?.isLoading) {
          newConversation[lastMessageIndex] = { 
            type: 'assistant', 
            text: responseText, 
            isLoading: false
          };
        }
        return newConversation;
      });
      speak(responseText);

    } catch (error) {
      handleError('Failed to get response. Please try again.', error);
    } finally {
      setIsLoading(false);
      textAreaRef.current?.focus();
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


  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
       <header className="p-4 border-b shadow-sm">
         <h1 className="text-2xl font-bold text-center font-headline">VocalVerse</h1>
       </header>
       <main className="flex-1 overflow-hidden">
        <ScrollArea className="h-full" ref={scrollAreaRef}>
          <div className="container mx-auto p-4 h-full">
            {conversation.length === 0 ? (
              <WelcomeMessage />
            ) : (
              conversation.map((msg, index) => <ChatBubble key={index} message={msg} />)
            )}
          </div>
        </ScrollArea>
       </main>
       <footer className="p-4 border-t bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto">
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
             <Button
                type="button"
                size="lg"
                variant={isRecording ? 'destructive' : 'outline'}
                className="h-12"
                onClick={toggleRecording}
                aria-label={isRecording ? 'Stop recording' : 'Start recording'}
              >
                {isRecording ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </Button>
            <Textarea
              ref={textAreaRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type or speak..."
              className="flex-1 resize-none"
              rows={1}
              disabled={isLoading}
            />
            <Button
              type="submit"
              size="lg"
              className="h-12"
              disabled={isLoading || !inputText.trim()}
              aria-label="Send message"
            >
              {isLoading && !isRecording ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <Send className="w-6 h-6" />
              )}
            </Button>
          </form>
        </div>
       </footer>
    </div>
  );
}
