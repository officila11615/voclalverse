
'use client';

import Link from 'next/link';
import { ArrowLeft, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
      <main className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-2xl h-full flex flex-col bg-background/30 backdrop-blur-sm rounded-lg border border-white/10 shadow-xl">
           <div className="flex-1 p-6 overflow-y-auto">
              {/* Chat messages will go here */}
              <div className="text-center text-muted-foreground">
                  Chat UI coming soon.
              </div>
           </div>
           <div className="p-4 border-t border-white/10">
              <div className="flex items-center gap-4">
                  <input
                      type="text"
                      placeholder="Type your message..."
                      className="flex-1 bg-black/30 border border-white/20 rounded-full px-6 py-3 text-white placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <Button size="icon" className="rounded-full w-12 h-12 bg-primary hover:bg-primary/80">
                      <Send className="w-6 h-6"/>
                  </Button>
              </div>
           </div>
        </div>
      </main>
    </div>
  );
}
