
'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

type Message = {
  id: number;
  role: 'user' | 'assistant';
  content: string;
};

const initialMessages: Message[] = [
  { id: 1, role: 'assistant', content: 'Hello! How can I help you today?' },
];

export default function TextToTextPage() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputValue, setInputValue] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    if (inputValue.trim() === '') return;

    const newUserMessage: Message = {
      id: messages.length + 1,
      role: 'user',
      content: inputValue,
    };

    setMessages((prevMessages) => [...prevMessages, newUserMessage]);
    setInputValue('');

    // Fake assistant reply after a delay
    setTimeout(() => {
      const assistantReply: Message = {
        id: messages.length + 2,
        role: 'assistant',
        content: "This is a hardcoded reply. I'll be smarter soon!",
      };
      setMessages((prevMessages) => [...prevMessages, assistantReply]);
    }, 1500);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSendMessage();
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
      <main className="flex-1 flex flex-col overflow-hidden">
        <ScrollArea className="flex-1 p-4 md:p-6" ref={scrollAreaRef}>
          <div className="flex flex-col gap-4 max-w-2xl mx-auto">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'flex w-full max-w-lg items-end gap-2',
                  message.role === 'user' ? 'self-end flex-row-reverse' : 'self-start'
                )}
              >
                <div
                  className={cn(
                    'rounded-lg p-3 shadow-md animate-fade-in',
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-none'
                      : 'bg-secondary text-secondary-foreground rounded-bl-none'
                  )}
                >
                  <p className="text-sm">{message.content}</p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </main>
      <footer className="p-4 border-t border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-2">
            <Input 
              type="text" 
              placeholder="Type your message..." 
              className="flex-1 bg-background/50 border-white/20 focus:ring-primary/50 focus:ring-2"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <Button size="icon" className="bg-primary hover:bg-primary/80" onClick={handleSendMessage}>
              <Send className="w-5 h-5" />
              <span className="sr-only">Send</span>
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
}
