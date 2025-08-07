
'use client';

import { ArrowLeft, Mic, Languages, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function VoiceTranslatorPage() {
  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-[#1A1A2E] to-[#16213E] text-foreground">
      <header className="p-4 border-b border-white/10 shadow-lg flex items-center">
        <h1 className="text-3xl font-bold text-center font-headline tracking-wider text-white flex-1 animate-fade-in">Voice Translator</h1>
      </header>
      <main className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-4xl flex flex-col items-center gap-8">
            <div className="w-full flex items-center justify-center gap-4">
                <div className="flex-1">
                    <label className="text-lg mb-2 block text-center">From</label>
                    <Select defaultValue="en-US">
                        <SelectTrigger className="w-full bg-black/30 border-white/20 h-14 text-lg">
                            <SelectValue placeholder="Select language" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="en-US">English (US)</SelectItem>
                            <SelectItem value="es-ES">Spanish</SelectItem>
                            <SelectItem value="fr-FR">French</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="pt-8">
                   <Languages className="w-8 h-8 text-primary"/>
                </div>
                <div className="flex-1">
                    <label className="text-lg mb-2 block text-center">To</label>
                    <Select defaultValue="es-ES">
                        <SelectTrigger className="w-full bg-black/30 border-white/20 h-14 text-lg">
                            <SelectValue placeholder="Select language" />
                        </SelectTrigger>
                        <SelectContent>
                             <SelectItem value="en-US">English (US)</SelectItem>
                            <SelectItem value="es-ES">Spanish</SelectItem>
                            <SelectItem value="fr-FR">French</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
            
            <div className="w-full p-6 bg-background/30 backdrop-blur-sm rounded-lg border border-white/10 shadow-xl min-h-[200px] flex flex-col gap-4">
                <div className="flex-1">
                    <h3 className="font-semibold text-muted-foreground">Original:</h3>
                    <p className="text-lg italic">"Hello, how are you?"</p>
                </div>
                <div className="border-t border-white/20 my-2"></div>
                <div className="flex-1">
                    <h3 className="font-semibold text-muted-foreground">Translation:</h3>
                    <p className="text-lg font-semibold text-primary">"Hola, ¿cómo estás?"</p>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <Button size="icon" className="w-24 h-24 rounded-full bg-primary hover:bg-primary/80 animate-pulse-glow">
                    <Mic className="w-12 h-12"/>
                </Button>
                 <Button variant="outline" size="icon" className="w-16 h-16 rounded-full bg-transparent border-primary text-primary hover:bg-primary/10">
                    <Volume2 className="w-8 h-8"/>
                </Button>
            </div>
             <p className="text-muted-foreground text-center text-lg font-body">
                Press the button and start speaking.
             </p>
        </div>
      </main>
    </div>
  );
}
