# Supabase and AI deployment setup

## Environment variables

Set these in Vercel Project Settings → Environment Variables for Production and Preview, then redeploy:

| Variable | Where it is used | Value |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Browser build | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Browser build | Supabase publishable key (`sb_publishable_…`) or legacy anon key |
| `SUPABASE_URL` | Vercel Functions | Same Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Vercel Functions only | Supabase service role/secret key |
| `AI_PROVIDER` | Vercel Functions | `groq` or `gemini`; defaults to `groq` |
| `GROQ_API_KEY` | Vercel Functions | Key from GroqCloud; needed for text/image analysis when using Groq |
| `GROQ_MODEL` | Vercel Functions | Optional; defaults to `qwen/qwen3.8-27b` |
| `GEMINI_API_KEY` | Vercel Functions | Optional with Groq; needed for PDF analysis in Groq mode |
| `GEMINI_MODEL` | Vercel Functions | Optional; defaults to `gemini-3.8-flash` |

Never put the Supabase service role key or any AI key in a `VITE_` variable. Do not paste secrets into chat or commit `.env` files. Rotate any API keys previously pasted into chat.

## Supabase database migration

In the Supabase dashboard for the project matching `SUPABASE_URL`, open SQL Editor and run `supabase/migrations/20261008_profile_setup.sql`. The setup page needs `location`, `chronic_diseases`, and `profile_completed` columns. Existing `emergency_name` and `emergency_contact` columns are used for the emergency contact fields.

Profile reads and writes now go through the authenticated `/api/profile` Vercel Function. The function verifies the Firebase ID token and uses the service role key server-side, so the service key never enters the browser and the existing restrictive RLS policy remains enabled.

## AI provider

Groq uses its OpenAI-compatible chat completions endpoint with `qwen/qwen3.8-27b` for text and image input. PDF requests continue through Gemini when `GEMINI_API_KEY` is configured; Groq mode alone cannot process PDFs. The frontend continues calling `/api/gemini` for backward compatibility even though the route now supports provider selection.

Local development: copy `.env.example` to ignored `.env.local`, fill values there, and run `vercel dev` so `/api/*` functions are available. The regular Vite dev server does not serve Vercel Functions.
