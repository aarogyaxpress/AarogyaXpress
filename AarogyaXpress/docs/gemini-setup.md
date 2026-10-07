# Gemini setup

Gemini is supported as an AI provider and handles PDF document input. Configure `GEMINI_API_KEY` as a server-only Vercel environment variable; never prefix it with `VITE_`. Set `AI_PROVIDER=gemini` to route text and image requests to Gemini as well. In Groq mode, Gemini is used as the PDF fallback when configured.

See [deployment setup](./deployment-setup.md) for Supabase, Groq, local development, and Vercel environment configuration.

Keys previously pasted into chat should be revoked and replaced in Google AI Studio.
