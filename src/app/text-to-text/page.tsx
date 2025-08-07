
'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Send, Bot, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getOpenRouterResponse } from '@/ai/flows/understand-user-intent';
import { cn } from '@/lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function TextToTextPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const result = await getOpenRouterResponse({ transcription: input });
      const assistantMessage: Message = { role: 'assistant', content: result.response };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error getting response:", error);
      const errorMessage: Message = { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-[#1A1A2E] to-[#16213E] text-foreground">
      <header className="p-4 border-b border-white/10 shadow-lg flex items-center">
        <Link href="/" passHref>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-6 h-6" />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold text-center font-headline tracking-wider text-white flex-1">Text to Text</h1>
      </header>
      <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 overflow-hidden">
        <div className="w-full max-w-2xl h-full flex flex-col bg-background/30 backdrop-blur-sm rounded-lg border border-white/10 shadow-xl">
          <ScrollArea className="flex-1 p-6" ref={scrollAreaRef}>
            <div className="space-y-6">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex items-start gap-4 animate-fade-in",
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {message.role === 'assistant' && (
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        <Bot className="w-5 h-5" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={cn(
                      "max-w-[75%] rounded-lg px-4 py-3 text-sm md:text-base",
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-br-none'
                        : 'bg-secondary text-secondary-foreground rounded-bl-none'
                    )}
                  >
                    <p>{message.content}</p>
                  </div>
                   {message.role === 'user' && (
                    <Avatar className="w-8 h-8">
                       <AvatarFallback className="bg-muted-foreground/50 text-white">
                        <User className="w-5 h-5" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
               {isLoading && (
                <div className="flex items-start gap-4 justify-start animate-fade-in">
                   <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        <Bot className="w-5 h-5" />
                      </AvatarFallback>
                    </Avatar>
                  <div className="bg-secondary text-secondary-foreground rounded-lg px-4 py-3 text-sm md:text-base rounded-bl-none flex items-center gap-2">
                     <span className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse" style={{ animationDelay: '0s' }}/>
                     <span className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}/>
                     <span className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}/>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
          <div className="p-4 border-t border-white/10">
            <form onSubmit={handleSubmit} className="flex items-center gap-4">
              <Input
                type="text"
                placeholder="Type your message..."
                value={input}
                onChange={handleInputChange}
                disabled={isLoading}
                className="flex-1 bg-black/30 border border-white/20 rounded-full px-6 py-3 text-white placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <Button type="submit" size="icon" className="rounded-full w-12 h-12 bg-primary hover:bg-primary/80" disabled={isLoading || !input.trim()}>
                <Send className="w-6 h-6" />
              </Button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
