
'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
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
      <main className="flex-1 flex flex-col items-center justify-center">
        <div>It works!</div>
      </main>
    </div>
  );
}
