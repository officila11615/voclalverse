import { config } from 'dotenv';
config();

import '@/ai/flows/transcribe-voice.ts';
import '@/ai/flows/understand-user-intent.ts';
import '@/ai/flows/generate-response.ts';