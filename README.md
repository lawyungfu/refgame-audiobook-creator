# RefGame Audiobook Creator

Production-ready audiobook creation platform.

## Features
- Upload or load sample text
- Automatic sentence segmentation
- Synchronized text highlighting during playback
- Text-to-speech with voice selection
- Per-segment voice recording using device microphone
- Project export as JSON
- Guided demo for new users

## Tech Stack
- Next.js (frontend)
- Supabase (auth + database + storage)
- Stripe (payments)
- Vercel (hosting)

## Getting Started (local)
1. Clone the repo
2. `npm install`
3. Set up Supabase and Stripe keys in `.env.local`
4. `npm run dev`

## Live Demo
[Link will be added after first Vercel deployment]

## Roadmap
- MVP: Core creation flow + export
- Monetization: Freemium + Stripe subscriptions
- Scale: Public sharing, user accounts, analytics via PostHog

Built as the first income-generating automation on StarNet.