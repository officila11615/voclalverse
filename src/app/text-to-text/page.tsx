
'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

// Fake message data for styling
const fakeMessages = [
  { id: 1, role: 'user', content: 'Hello, assistant!' },
  { id: 2, role: 'assistant', content: 'Hello! How can I help you today?' },
  { id: 3, role: 'user', content: 'Can you tell me a joke?' },
  { id: 4, role: 'assistant', content: 'Why don’t scientists trust atoms? Because they make up everything!' },
  { id: 5, role: 'user', content: 'Haha, that\'s a good one.' },
];

export default function TextToTextPage() {
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
        <ScrollArea className="flex-1 p-4 md:p-6">
          <div className="flex flex-col gap-4">
            {fakeMessages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'flex w-full max-w-lg items-end gap-2',
                  message.role === 'user' ? 'self-end flex-row-reverse' : 'self-start'
                )}
              >
                <div
                  className={cn(
                    'rounded-lg p-3 shadow-md',
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
    </div>
  );
}
