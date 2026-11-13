# Peekaboo Post

Interactive digital invitations that guests love to open. Tap, peek, party!

**Website:** [peekaboopost.com](https://peekaboopost.com)

## What's here (phase 1: coming-soon page + invite gallery)
| File | What it does |
|---|---|
| `index.html` | The coming-soon page: hero, tap-to-peek envelope demo, mascot crew, features and early-access signup |
| `styles.css` | All styling (mobile-first, respects reduced-motion settings) |
| `script.js` | Envelope animation and the signup form |
| `api/subscribe.js` | Vercel serverless function that saves signups to Supabase |
| `supabase/schema.sql` | Creates the `waitlist` table in Supabase |
| `favicon.svg`, `apple-touch-icon.png` | Browser-tab and phone home-screen icons (the stamp logo) |
| `invites/` | The 8 live invite demos, the gallery (`invites/index.html`), the shared styles and `invite.js`, which runs each card |
| `vercel.json` | Clean URLs, e.g. `/invites/harvest-table` instead of `.html` |
| `brand/` | Logo files: stamp icon (SVG, 512px PNG) and a 1080px social profile picture |

No build step and no packages to install. Vercel serves the files as-is.

## Going live (one-time setup)
1. **Vercel:** sign in with GitHub → **Add New → Project** → import `peekaboo-post-site` → **Deploy**. Keep the default settings (Framework preset: *Other*).
2. **Supabase:** create a project → **SQL Editor** → paste `supabase/schema.sql` → **Run**.
3. **Connect the two:** in Vercel → Project → **Settings → Environment Variables**, add:
   - `SUPABASE_URL`: from Supabase → Project Settings → API (Project URL)
   - `SUPABASE_SERVICE_ROLE_KEY`: from the same page (the `service_role` secret). Never put this in the website files.

   Then **redeploy** so the variables take effect.
4. **Domain:** in Vercel → Project → **Settings → Domains**, add `peekaboopost.com` and `www.peekaboopost.com`. Vercel shows the DNS records to add. Enter them at **Porkbun** → Domain Management → DNS.

Until step 3 is done, the page works but the signup form says "Sign-ups open very soon."

## Viewing signups
Supabase → **Table Editor → waitlist**. You can export to CSV from there.

## Updating an invite
Each page in `invites/` is generated from the card designs on the design canvas. To change a card, edit it on the canvas and ask the team to regenerate that page. Hosts' event dates can already be passed in the link, e.g. `/invites/friendsgiving-potluck?eventDate=2026-11-21T18:00`.
