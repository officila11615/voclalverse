
'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Send, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { getOpenRouterResponse } from '@/ai/flows/understand-user-intent';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

type Message = {
  id: number;
  role: 'user' | 'assistant';
  content: string;
};

const initialMessages: Message[] = [
  { id: 1, role: 'assistant', content: 'Hello! Type a message to start the conversation.' },
];

function NeuralThreadsBackground() {
  const [nodes, setNodes] = useState<any[]>([]);
  const [threads, setThreads] = useState<any[]>([]);

  useEffect(() => {
    const generateNetwork = () => {
      if (typeof window === 'undefined') return;
      const isMobile = window.innerWidth < 768;
      const numNodes = isMobile ? 5 : 8;
      const newNodes = Array.from({ length: numNodes }).map((_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 8 + 6,
      }));

      const newThreads: any[] = [];
      for (let i = 0; i < newNodes.length; i++) {
        const connections = Math.floor(Math.random() * 2) + 1;
        for (let j = 0; j < connections; j++) {
          const targetNode = newNodes[Math.floor(Math.random() * newNodes.length)];
          if (i !== targetNode.id) {
            newThreads.push({
              id: `${i}-${targetNode.id}-${j}`,
              source: newNodes[i],
              target: targetNode,
            });
          }
        }
      }
      setNodes(newNodes);
      setThreads(newThreads);
    };

    generateNetwork();
    // No need to regenerate on resize for this example, but you could add a listener here.
  }, []);

  return (
    <div className="neural-threads-bg">
      <svg width="100%" height="100%" className="neural-threads-svg">
        <defs>
          <radialGradient id="node-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="hsl(var(--primary) / 0.8)" />
            <stop offset="100%" stopColor="hsl(var(--primary) / 0)" />
          </radialGradient>
        </defs>
        {threads.map(thread => {
          const { source, target } = thread;
          // Add some randomness to the curve control points
          const controlX = (source.x + target.x) / 2 + (Math.random() - 0.5) * 30;
          const controlY = (source.y + target.y) / 2 + (Math.random() - 0.5) * 30;
          const animationDuration = Math.random() * 10 + 10; // Random duration between 10s and 20s
          
          return (
            <path
              key={thread.id}
              d={`M ${source.x}vw ${source.y}vh Q ${controlX}vw ${controlY}vh ${target.x}vw ${target.y}vh`}
              stroke="url(#node-glow)"
              strokeWidth="1"
              fill="none"
              className="neural-thread-path"
              style={{ animationDuration: `${animationDuration}s` }}
            />
          );
        })}
      </svg>
      {nodes.map(node => (
        <div
          key={node.id}
          className="neural-node"
          style={{
            left: `${node.x}vw`,
            top: `${node.y}vh`,
            width: `${node.size}px`,
            height: `${node.size}px`,
          }}
        />
      ))}
    </div>
  );
}


export default function TextToTextPage() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAnimationEnabled, setIsAnimationEnabled] = useState(true);
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector('div');
      if (viewport) {
        viewport.scrollTo({
          top: viewport.scrollHeight,
          behavior: 'smooth',
        });
      }
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (inputValue.trim() === '' || isLoading) return;

    const newUserMessage: Message = {
      id: Date.now(),
      role: 'user',
      content: inputValue,
    };

    setMessages((prevMessages) => [...prevMessages, newUserMessage]);
    const currentInputValue = inputValue;
    setInputValue('');
    setIsLoading(true);

    try {
      const result = await getOpenRouterResponse({ transcription: currentInputValue });
      const assistantReply: Message = {
        id: Date.now() + 1,
        role: 'assistant',
        content: result.response,
      };
      setMessages((prevMessages) => [...prevMessages, assistantReply]);
    } catch (error) {
      console.error("Failed to get AI response:", error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to get a response from the assistant. Please try again.',
      });
       const assistantReply: Message = {
        id: Date.now() + 1,
        role: 'assistant',
        content: "Sorry, I couldn't connect to the AI. Please check the server and try again.",
      };
       setMessages((prevMessages) => [...prevMessages, assistantReply]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-transparent text-foreground font-sans overflow-hidden">
      {isAnimationEnabled && <NeuralThreadsBackground />}
      <div className={cn("relative z-10 flex flex-col h-full", !isAnimationEnabled && 'bg-gradient-to-br from-[#1A1A2E] to-[#16213E]', isAnimationEnabled && 'bg-black/40 backdrop-blur-sm' )}>
        <header className="p-4 border-b border-white/10 shadow-lg flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/" passHref>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-6 h-6" />
                <span className="sr-only">Back to Dashboard</span>
              </Button>
            </Link>
            <h1 className="text-2xl font-bold font-headline tracking-wider text-white animate-fade-in">Text to Text</h1>
          </div>
          <TooltipProvider>
            <div className="flex items-center space-x-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Switch
                    id="animation-toggle"
                    checked={isAnimationEnabled}
                    onCheckedChange={setIsAnimationEnabled}
                    aria-label="Toggle background animation"
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Toggle background animation</p>
                </TooltipContent>
              </Tooltip>
              <Label htmlFor="animation-toggle" className="text-sm text-white/80 hidden sm:block">Animate</Label>
            </div>
          </TooltipProvider>
        </header>
        <main className="flex-1 flex flex-col overflow-hidden">
          <ScrollArea className="flex-1 p-4 md:p-6" ref={scrollAreaRef}>
            <div className="flex flex-col gap-4 max-w-2xl mx-auto">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    'flex w-full items-end gap-3 animate-fade-in',
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {message.role === 'assistant' && (
                      <Avatar className="w-8 h-8 bg-primary/20 text-primary shadow-lg">
                          <AvatarFallback>AI</AvatarFallback>
                      </Avatar>
                  )}
                  <div
                    className={cn(
                      'max-w-md rounded-lg p-3 shadow-xl',
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-br-none'
                        : 'bg-background/50 backdrop-blur-sm text-foreground rounded-bl-none'
                    )}
                  >
                    <p className="text-sm font-body whitespace-pre-wrap">{message.content}</p>
                  </div>
                  {message.role === 'user' && (
                      <Avatar className="w-8 h-8 shadow-lg">
                          <AvatarFallback>U</AvatarFallback>
                      </Avatar>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start items-end gap-3 animate-fade-in">
                  <Avatar className="w-8 h-8 bg-primary/20 text-primary">
                    <AvatarFallback>AI</AvatarFallback>
                  </Avatar>
                  <div className="max-w-md rounded-lg p-3 shadow-md bg-background/50 text-foreground rounded-bl-none">
                    <Loader2 className="w-5 h-5 animate-spin" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </main>
        <footer className="p-4 border-t border-white/10">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-2">
              <Input 
                type="text" 
                placeholder="Type your message..." 
                className="flex-1 bg-background/50 border-white/20 focus:ring-primary/50 focus:ring-2 font-body"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
              />
              <Button size="icon" className="bg-primary hover:bg-primary/80" onClick={handleSendMessage} disabled={isLoading}>
                <Send className="w-5 h-5" />
                <span className="sr-only">Send Message</span>
              </Button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
