export const dynamic = 'force-dynamic';

'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, Languages, Volume2, Loader2, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { languageOptions, translateAndSpeak } from '@/ai/flows/translate-and-speak';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

enum TranslatorState {
  Idle,
  Listening,
  Thinking,
  Speaking,
  Error,
}

export default function VoiceTranslatorPage() {
  const [state, setState] = useState<TranslatorState>(TranslatorState.Idle);
  const [sourceLang, setSourceLang] = useState('en-US');
  const [targetLang, setTargetLang] = useState('es-ES');
  const [originalText, setOriginalText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  
  const { toast } = useToast();
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isMountedRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    audioRef.current = new Audio();
    return () => {
        isMountedRef.current = false;
        if (recognitionRef.current) {
          recognitionRef.current.abort();
        }
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
        }
    };
  }, []);

  const handleTranslation = useCallback(async (text: string) => {
    if (!text) {
        setState(TranslatorState.Idle);
        return;
    }
    
    setOriginalText(text);
    setTranslatedText('...');
    setState(TranslatorState.Thinking);

    try {
        const result = await translateAndSpeak({ text, sourceLanguage: sourceLang, targetLanguage: targetLang });
        setTranslatedText(result.translation);
        
        if (audioRef.current) {
            audioRef.current.src = result.audioDataUri;
            audioRef.current.play();
            setState(TranslatorState.Speaking);
            audioRef.current.onended = () => {
                if (isMountedRef.current) setState(TranslatorState.Idle);
            };
        } else {
             if (isMountedRef.current) setState(TranslatorState.Idle);
        }
    } catch (error) {
        console.error("Translation failed:", error);
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Failed to get translation. Please try again.',
        });
        if (isMountedRef.current) setState(TranslatorState.Error);
    }
  }, [sourceLang, targetLang, toast]);

  const startRecognition = useCallback(() => {
    if (state !== TranslatorState.Idle && state !== TranslatorState.Error) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({
        variant: 'destructive',
        title: 'Browser Not Supported',
        description: 'Speech recognition is not supported in your browser.',
      });
      setState(TranslatorState.Error);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = sourceLang;
    recognition.interimResults = false;
    recognitionRef.current = recognition;

    recognition.onstart = () => {
      if (isMountedRef.current) setState(TranslatorState.Listening);
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      handleTranslation(transcript);
    };

    recognition.onerror = (event) => {
      if (event.error === 'not-allowed') {
        toast({
            variant: 'destructive',
            title: 'Permission Denied',
            description: 'Please grant microphone access to use the translator.',
        });
        setState(TranslatorState.Error);
      } else if (event.error !== 'no-speech') {
        console.error('Speech recognition error:', event.error);
         setState(TranslatorState.Idle);
      }
    };
    
    recognition.onend = () => {
       if (isMountedRef.current && state === TranslatorState.Listening) {
           setState(TranslatorState.Idle);
       }
    };

    recognition.start();
  }, [state, sourceLang, handleTranslation, toast]);

  const playLastTranslation = () => {
    if (audioRef.current && audioRef.current.src && translatedText) {
        audioRef.current.play();
    }
  };

  const getStatusText = () => {
    switch (state) {
      case TranslatorState.Listening:
        return 'Listening...';
      case TranslatorState.Thinking:
        return 'Translating...';
      case TranslatorState.Speaking:
        return 'Speaking...';
      case TranslatorState.Error:
        return 'Error. Please check permissions.';
      case TranslatorState.Idle:
      default:
        return 'Press the button and start speaking.';
    }
  };
  
  const MicButtonIcon = state === TranslatorState.Thinking ? Loader2 : Mic;

  // Guard the languageOptions to ensure it's an array before mapping
  const safeLanguageOptions = Array.isArray(languageOptions) ? languageOptions : [];

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
                    <Select value={sourceLang} onValueChange={setSourceLang}>
                        <SelectTrigger className="w-full bg-black/30 border-white/20 h-14 text-lg">
                            <SelectValue placeholder="Select language" />
                        </SelectTrigger>
                        <SelectContent>
                           {safeLanguageOptions.map(lang => <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="pt-8">
                   <Languages className="w-8 h-8 text-primary" />
                </div>
                <div className="flex-1">
                    <label className="text-lg mb-2 block text-center">To</label>
                    <Select value={targetLang} onValueChange={setTargetLang}>
                        <SelectTrigger className="w-full bg-black/30 border-white/20 h-14 text-lg">
                            <SelectValue placeholder="Select language" />
                        </SelectTrigger>
                        <SelectContent>
                           {safeLanguageOptions.map(lang => <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            
            <div className="w-full p-6 bg-background/30 backdrop-blur-sm rounded-lg border border-white/10 shadow-xl min-h-[200px] flex flex-col gap-4">
                <div className="flex-1">
                    <h3 className="font-semibold text-muted-foreground">Original:</h3>
                    <p className="text-lg italic min-h-[28px]">{originalText || '...'}</p>
                </div>
                <div className="border-t border-white/20 my-2"></div>
                <div className="flex-1">
                    <h3 className="font-semibold text-muted-foreground">Translation:</h3>
                    <p className="text-lg font-semibold text-primary min-h-[28px]">{translatedText || '...'}</p>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <Button                    
                    size="icon" 
                    className={cn(
                        "w-24 h-24 rounded-full bg-primary hover:bg-primary/80",
                         (state === TranslatorState.Listening || state === TranslatorState.Thinking) && "animate-pulse-glow"
                    )}
                    onClick={startRecognition}
                    disabled={state !== TranslatorState.Idle && state !== TranslatorState.Error}
                >
                    {state === TranslatorState.Thinking && <Loader2 className="w-12 h-12 animate-spin" />}
                    {state === TranslatorState.Listening && <Mic className="w-12 h-12" />}
                    {state === TranslatorState.Error && <MicOff className="w-12 h-12" />}
                    {(state === TranslatorState.Idle || state === TranslatorState.Speaking) && <Mic className="w-12 h-12" />}
                </Button>
                 <Button                    
                    variant="outline" 
                    size="icon" 
                    className="w-16 h-16 rounded-full bg-transparent border-primary text-primary hover:bg-primary/10"
                    onClick={playLastTranslation}
                    disabled={!translatedText || state === TranslatorState.Speaking}
                  >
                    <Volume2 className="w-8 h-8"/>
                </Button>
            </div>

             <p className="text-muted-foreground text-center text-lg font-body min-h-[28px]">
                {getStatusText()}
             </p>
        </div>
      </main>
    </div>
  );
}
