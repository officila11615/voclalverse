'use client';

import { useState, useRef, useEffect, type FC } from 'react';
import { Mic, User, Bot, Play, Loader2, BrainCircuit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { transcribeVoice } from '@/ai/flows/transcribe-voice';
import { understandUserIntent } from '@/ai/flows/understand-user-intent';
import { generateSpokenResponse } from '@/ai/flows/generate-response';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

type ConversationEntry = {
  type: 'user' | 'assistant';
  text: string;
  audioDataUri?: string;
  isLoading?: boolean;
};

const WelcomeMessage = () => (
  <div className="flex flex-col items-center justify-center h-full text-center p-4">
    <BrainCircuit className="w-24 h-24 mb-6 text-primary" />
    <h1 className="text-4xl font-bold font-headline text-foreground">Welcome to VocalVerse</h1>
    <p className="mt-2 text-lg text-muted-foreground">Your personal AI voice assistant.</p>
    <p className="mt-4 text-muted-foreground">Click the microphone to start a conversation.</p>
  </div>
);

const ChatBubble: FC<{ message: ConversationEntry }> = ({ message }) => {
  const isUser = message.type === 'user';
  const audioPlayer = useRef<HTMLAudioElement>(null);

  const playAudio = () => {
    if (audioPlayer.current) {
      audioPlayer.current.play().catch(e => console.error("Audio playback failed:", e));
    }
  };

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
            <p className="font-body">{message.text}</p>
          )}
          {!isUser && message.audioDataUri && !message.isLoading && (
            <>
              <Button variant="ghost" size="sm" className="mt-2 text-card-foreground hover:bg-accent/50" onClick={playAudio}>
                <Play className="w-4 h-4 mr-2" />
                Play Response
              </Button>
              <audio ref={audioPlayer} src={message.audioDataUri} className="hidden" />
            </>
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
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [conversation, setConversation] = useState<ConversationEntry[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const viewport = scrollAreaRef.current?.querySelector('div[data-radix-scroll-area-viewport]');
    if (viewport) {
      viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' });
    }
  }, [conversation]);

  useEffect(() => {
    const lastMessage = conversation[conversation.length - 1];
    if (lastMessage?.type === 'assistant' && lastMessage.audioDataUri && !lastMessage.isLoading) {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.src = lastMessage.audioDataUri;
        audioPlayerRef.current.play().catch(e => console.error("Audio playback failed:", e));
      }
    }
  }, [conversation]);


  const handleError = (message: string, error?: any) => {
    if (error) console.error(message, error);
    toast({
      variant: 'destructive',
      title: 'An error occurred',
      description: message,
    });
    setIsLoading(false);
    setIsRecording(false);
    setConversation(prev => prev.filter(m => !m.isLoading));
  };

  const toggleRecording = async () => {
    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;
        audioChunksRef.current = [];

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) audioChunksRef.current.push(event.data);
        };

        recorder.onstop = async () => {
          setIsLoading(true);
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const base64Audio = reader.result as string;
            await processVoice(base64Audio);
          };
          stream.getTracks().forEach(track => track.stop());
        };
        
        recorder.start();
        setIsRecording(true);
      } catch (error) {
        handleError('Microphone access was denied. Please allow microphone access in your browser settings.', error);
      }
    }
  };

  const processVoice = async (audioDataUri: string) => {
    try {
      const { transcription } = await transcribeVoice({ audioDataUri });
      if (!transcription) throw new Error('Transcription failed. The audio might be silent.');
      
      setConversation(prev => [...prev, { type: 'user', text: transcription }]);
      setConversation(prev => [...prev, { type: 'assistant', text: '', isLoading: true }]);

      const intentResult = await understandUserIntent({ transcription });

      const responseText = intentResult.response;
      
      const { audioDataUri: responseAudioUri } = await generateSpokenResponse({ text: responseText });

      setConversation(prev => {
        const newConversation = [...prev];
        const lastMessageIndex = newConversation.length - 1;
        if(newConversation[lastMessageIndex]?.isLoading) {
          newConversation[lastMessageIndex] = { 
            type: 'assistant', 
            text: responseText, 
            audioDataUri: responseAudioUri,
            isLoading: false
          };
        }
        return newConversation;
      });

    } catch (error) {
      handleError('Failed to process voice command. Please try again.', error);
    } finally {
      setIsLoading(false);
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
            {conversation.length === 0 && !isLoading ? (
              <WelcomeMessage />
            ) : (
              conversation.map((msg, index) => <ChatBubble key={index} message={msg} />)
            )}
             {conversation.length === 0 && isLoading && (
                <div className="flex justify-center items-center h-full">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            )}
          </div>
        </ScrollArea>
       </main>
       <footer className="p-4 border-t bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex justify-center">
          <Button
            size="lg"
            className={cn(
              'rounded-full w-20 h-20 shadow-lg transition-all duration-300',
              isRecording ? 'bg-red-500 hover:bg-red-600 animate-pulse' : 'bg-primary hover:bg-accent',
            )}
            onClick={toggleRecording}
            disabled={isLoading}
            aria-label={isRecording ? 'Stop recording' : 'Start recording'}
          >
            {isLoading ? (
              <Loader2 className="w-8 h-8 animate-spin" />
            ) : (
              <Mic className="w-8 h-8 text-primary-foreground" />
            )}
          </Button>
        </div>
       </footer>
       <audio ref={audioPlayerRef} className="hidden" />
    </div>
  );
}
