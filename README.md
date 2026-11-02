# TRIPZY — Your Trip. Your Vibe.

A luxury AI travel planner for India, built with **Next.js (App Router) · React · TypeScript · Tailwind CSS · Framer Motion · Lucide**.

| Route | Page |
|---|---|
| `/` | **Home** — cinematic hero; the plane flies *along* a dotted route that joins three destination cards |
| `/explore` | **Explore India** — 8 destinations, multi-select filters, 3-D hover cards, destination detail view |
| `/preferences` | **Your Travel Style** — 8-step personal consultation (all optional steps can be skipped) |
| `/planner` | **Plan Your Trip** — day-by-day itinerary, stays, dining, attractions, budget, AI concierge, save / print / share |

Your answers live in one shared, persistent store (`hooks/useTrip.tsx`, saved to `localStorage`), so you can go back, change anything and continue without losing data.

---

## 1 · Run it (Windows PowerShell)

Requires **Node.js 18.18 or newer** (https://nodejs.org).

```powershell
# 1. extract the ZIP, then open the folder in VS Code
cd path\to\tripzy-luxury-ai-travel-planner
code .

# 2. install
npm install

# 3. (optional) add API keys — skip this to use demo mode
Copy-Item .env.example .env.local
notepad .env.local

# 4. start
npm run dev
```

Open http://localhost:3000. Other commands:

```powershell
npm run typecheck      # TypeScript check
npm run build          # production build
npm start              # run the production build
npm run test:engine    # offline checks of the planner, budget maths, preference rules and assistant (no keys, no network)
```

> The fonts (Playfair Display, Manrope) are fetched from Google Fonts by `next/font` during `dev`/`build`, so the first run needs internet access.

---

## 2 · Demo mode vs live mode

Tripzy **runs without any keys**. In demo mode:

* Itineraries are built by Tripzy's own planner from curated data for all 8 regions.
* Hotels and restaurants are clearly labelled **“Demo sample”**, carry **no ratings or review counts**, and every price is marked **“Estimated”**. Nothing is presented as a real guest rating.
* The assistant uses a rule-based understanding of your request.

Add keys to `.env.local` to switch parts of it to live:

| Variable | What it enables | Where to get it |
|---|---|---|
| `GOOGLE_PLACES_API_KEY` | Verified hotels / restaurants with real ratings, review counts, photos, map links | Google Cloud Console → enable **Places API (New)** → Credentials → API key (restrict it to that API) |
| `GEMINI_API_KEY` | Gemini rewrites day narratives with your personality and understands free-form assistant requests | https://aistudio.google.com/app/apikey |
| `GEMINI_MODEL` | Optional model override (default `gemini-2.5-flash`) | — |
| `UNSPLASH_ACCESS_KEY` | Optional licensed destination photos (with attribution) when you have not added your own | https://unsplash.com/developers |

Keys are read **only inside server-side API routes** (`app/api/*`) and are never sent to the browser. Google Places photos are proxied through `/api/place-photo` so the key stays private. Gemini is used for personalisation and for editing the plan — **never for inventing ratings or business details**; those only ever come from Places.

If a live call fails, the app falls back to demo data and says so in a banner.

---

## 3 · Photographs

Tripzy never hot-links images it cannot verify. Photo order for each destination:

1. a file you place in `public/images/destinations/<id>.jpg` (see the README.txt in that folder for the 8 filenames),
2. a licensed Unsplash photo, if `UNSPLASH_ACCESS_KEY` is set,
3. Tripzy's own illustrated landscape (always drawn underneath, so there is never an empty box).

For real photographs out of the box, either drop 8 files into that folder or add an Unsplash key.

---

## 4 · How your answers shape the plan

Every questionnaire answer is sent to `POST /api/itinerary`, validated (`lib/sanitize.ts`) and used by the planner (`lib/planner.ts`):

* **Alcohol = No / prefer not** → no bars, pubs or alcohol-centred venues or experiences.
* **Vegetarian / vegan / eggetarian** → non-vegetarian-only restaurants are excluded; meals use vegetarian-friendly places.
* **Transport = public** → buses, trains and walking, with realistic speeds and costs; **own vehicle / rental / bike** change cost and travel-time maths.
* **Budget & category** → stay tier, meal cost and activities scale with it; over-budget plans are flagged with concrete savings.
* **Relaxed pace** → fewer sights per day and later starts; **packed** adds more.
* **Seniors / low walking / mobility notes** → strenuous attractions are dropped.
* **Hidden gems vs famous**, **guided vs independent**, **interests**, **early/late starts**, **children**, **facilities**, **minimum rating** and **nightly cap** all feed scoring or filtering.

The **AI concierge** (`POST /api/assistant`) changes the actual itinerary: replace a hotel, cheaper or vegetarian restaurants, add an adventure, relax a day, reduce the budget by a percentage, swap an attraction. The budget recalculates after every change.

---

## 5 · Project structure

```
app/                  routes (/, /explore, /preferences, /planner) and API routes (itinerary, assistant, places, photo, place-photo, status, health)
components/           home · explore · preferences · planner · layout · ui
hooks/                useTrip (shared persistent state), usePhotos
lib/                  planner, assistant, budget, stays, sanitize, summary, data/ (8 destinations), server/ (Gemini, Places, env)
types/                shared TypeScript types
public/               icons and the destination photo folder
scripts/              offline engine tests
```

---

## 6 · Honest status

* Verified by running: the planner, preference rules, budget maths, sanitiser and assistant (`npm run test:engine`, 44 checks), and the API route handlers end-to-end in demo mode.
* **Not verified in the build environment** that produced this ZIP (it had no access to the npm registry): `npm install`, `npm run build`, and visual/mobile checks in a real browser. Please run `npm run typecheck` and `npm run build` on your machine; if anything is reported, it is a small fix.
* **Not tested with real keys:** Gemini and Google Places integrations are implemented against their documented APIs but have not been exercised with live credentials.
* “Download PDF” uses your browser's Print dialog (choose **Save as PDF**); the print stylesheet lays out every section.
* In demo mode the booking button opens a Google Maps search for that kind of stay; with Places enabled it opens the property's own website. Tripzy does not take bookings or payments.
