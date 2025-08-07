
'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Mic, Languages } from 'lucide-react';

const FeatureCard = ({ title, href, icon: Icon, children }: { title: string, href: string, icon: React.ElementType, children: React.ReactNode }) => (
  <Link href={href} passHref>
    <div className="group relative rounded-2xl h-full">
      <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-600 via-purple-600 to-blue-500 rounded-2xl blur opacity-25 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt"></div>
      <Card className="relative bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl h-full transition-all duration-300 ease-in-out transform group-hover:-translate-y-1 group-hover:scale-105 group-hover:[transform:perspective(1000px)_rotateX(4deg)_rotateY(-2deg)]">
        <CardHeader className="flex flex-row items-center gap-4 space-y-0">
          <div className="p-3 bg-primary/20 rounded-full">
            <Icon className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-xl font-bold text-white/90 transition-all duration-300 group-hover:tracking-wider">{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex-grow">
          <p className="text-muted-foreground">{children}</p>
        </CardContent>
      </Card>
    </div>
  </Link>
);

export default function DashboardPage() {
  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-[#1A1A2E] to-[#16213E] text-foreground font-sans">
      <header className="p-4 border-b border-white/10 shadow-lg">
        <h1 className="text-3xl font-bold text-center font-headline tracking-wider text-white animate-fade-in">VocalVerse Dashboard</h1>
      </header>
      <main className="flex-1 flex flex-col items-center justify-center p-8 overflow-y-auto">
        <div className="w-full max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard title="Text to Text" href="/text-to-text" icon={MessageSquare}>
              A classic chat interface where you can type your questions and get text-based responses from the AI.
            </FeatureCard>
            <FeatureCard title="Voice to Voice" href="/voice-to-voice" icon={Mic}>
              The original hands-free experience. Speak to the assistant and hear its responses, all through voice.
            </FeatureCard>
            <FeatureCard title="Voice Translator" href="/voice-translator" icon={Languages}>
              Speak in one language, and hear the translation in another. Perfect for learning or communicating across languages.
            </FeatureCard>
          </div>
        </div>
      </main>
      <footer className="p-4 border-t border-white/10 bg-black/20 backdrop-blur-sm">
        <p className="text-muted-foreground text-center text-sm">Select a mode to get started.</p>
      </footer>
    </div>
  );
}
