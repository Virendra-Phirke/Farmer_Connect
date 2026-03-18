/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_CLERK_PUBLISHABLE_KEY: string;
  readonly VITE_OPENWEATHER_API_KEY: string;
  readonly VITE_GEMINI_API_KEY?: string;
  readonly VITE_GOOGLE_AI_API_KEY?: string;
  readonly VITE_GOOGLE_API_KEY?: string;
  readonly VITE_GEMINI_MODEL?: string;
  readonly VITE_GEMINI_RATE_LIMIT_MAX_REQUESTS?: string;
  readonly VITE_GEMINI_RATE_LIMIT_WINDOW_MS?: string;
  readonly VITE_GEMINI_MIN_REQUEST_INTERVAL_MS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
