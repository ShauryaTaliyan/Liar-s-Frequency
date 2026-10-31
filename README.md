# Liar's Frequency — Case 001

A voice-first detective game prototype for the Bolna Symphony Buildathon.

## What is implemented

- Minimal full-screen title menu using the supplied projector artwork, with Start Investigation, Settings, and About.
- Animated analog-noir ambience: two independently rotating reel spools, a softly pulsing recorder LED, breathing lamp glow, intermittent projector flicker, moving film grain, drifting dust, and rare horizontal signal glitches in the black negative space; respects reduced-motion preferences.
- Unified black-and-brass visual theme across the archive, briefing, interrogation, evidence, accusation, and reveal screens.
- Case archive selection screen: Case 001 is playable; Cases 002–005 are locked preview cards labelled “More to come”.
- Archive navigation from inside the investigation back to the case selection screen.

- React + TypeScript visual-novel interface: full-bleed noir scenes, bottom dialogue panels, guided spoken/typed interrogation choices, a compact case file, accusation, and controlled reveal. The gameplay has been simplified away from the multi-panel dashboard layout.
- A deterministic, spoiler-controlled case file for **The Last Call at 9:17**.
- Guided interrogation of Arjun in demo mode, including browser speech-to-text where supported and browser text-to-speech.
- FastAPI endpoints for case data, interrogation, scoring, and Bolna configuration status.
- Optional Bolna outbound-call endpoint; API key and agent ID remain server-side.

> **Voice status:** The prototype works immediately in local demo mode. Browser speech uses the browser's Web Speech APIs; it is not Bolna. To connect an actual Bolna agent, configure the environment variables described below. Bolna outbound calls require a valid agent, number/provider setup, and credits. The current in-app interrogation remains deterministic unless you add and configure the Bolna Web Call SDK.

## Run locally

### 1. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate       # Windows: .venv\\Scripts\\activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

### 2. Frontend

In another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the URL Vite prints (usually http://localhost:5173).

The frontend expects the API at `http://localhost:8000` by default. Set `VITE_API_BASE_URL` in `frontend/.env.local` if needed.

## Optional Bolna configuration

In `backend/.env`:

```env
BOLNA_API_KEY=your_api_key
BOLNA_AGENT_ID_ARJUN=your_agent_id
BOLNA_FROM_PHONE_NUMBER=your_verified_from_number
```

The API key is never exposed to the frontend. The optional `POST /api/bolna/start-call` endpoint starts a **real phone call**, so test only with a number you control and have authorized.

Create an Arjun agent in Bolna Studio using `backend/ARJUN_BOLNA_PROMPT.md`. Keep the following rules in the agent prompt:

- Arjun does not confess unless the reveal phase has been authorized by the game engine.
- He cannot change the canonical timeline, claim facts, or case evidence.
- He can lie only according to his authored cover story; do not invent new evidence.
- He should respond briefly in a guarded, professional tone.

Official Bolna docs: https://www.bolna.ai/docs/api-reference/introduction

## Important implementation notes

- `backend/app/case_data.py` is the canonical source of truth. It contains the spoiler key; do not send the entire file to the frontend. The first suspect’s copy-ready voice-agent prompt is in `backend/ARJUN_BOLNA_PROMPT.md`.
- The public case endpoint intentionally excludes the culprit, method, and reveal sequence.
- The demo interrogation service is rule-based so core gameplay is stable and judge-demo-ready even without external credentials.
- Accusation scoring is authoritative and server-side; the culprit key is not shipped to the browser. A correct guess alone is worth 10 points. Reasoning is scored using explicit sentence-level links to evidence, and gibberish/keyword soup cannot earn a supported conclusion. The score is a deterministic rubric, not a semantic AI judge. It is a fictional game outcome, not a real-world accusation system.

## Quick test

```bash
cd backend
source .venv/bin/activate
pytest -q
```

## Suggested next steps

1. Run the local prototype and confirm the flow works.
2. Create the first Bolna suspect agent (Arjun) in Studio.
3. Connect the browser-based call flow using Bolna's current Web Call SDK once your account/agent is ready.
4. Record a backup demo using the deterministic mode in case live voice setup fails.

## Case 001 opening cinematic

Selecting **Case 001** from the archive now launches a full-screen, skippable opening cinematic before the existing briefing. It uses the supplied noir illustrations from `frontend/public/cinematic/` and transitions through waking, ringing phone, 07:23 AM alarm, Anika Rao's incoming call, spoken/subtitled dialogue, and the supplied title card. **BEGIN INVESTIGATION** enters the existing Case 001 briefing. Escape or **SKIP INTRO** skips directly to that briefing.

- The ringtone and original noir title-screen music are synthesized locally with the browser Web Audio API (no downloaded track, external service, or music license dependency).
- Anika's dialogue uses browser speech synthesis when enabled and available; subtitles always display as the fallback. The waking scene uses the newer watermark-free image, and the answered-call image appears immediately after the player answers. The title reveal now uses a signal-lock animation, amber light bloom, scan sweep, intermittent interference slices, and a slow camera settle.
- There is no live Bolna voice session in this cinematic. Bolna integration remains separate and unchanged.
- Ambient room/traffic audio and a separate tape-recorder sample remain omitted because no corresponding audio assets were supplied.
- Timers, speech playback, and ringtone oscillators are cleaned up when the cinematic exits. Reduced-motion preferences disable camera and interface animations.

## Visual-novel controls and scoring

- The in-game screen now presents one background scene and a focused dialogue box. In interviews, select one of the guided question choices; **Ask your own question** expands the optional free-text/microphone input. History is a separate drawer.
- The formal accusation is available after at least five clues are discovered. Nothing is pre-selected: choose a suspect and evidence, then provide at least 12 words of reasoning.
- If the backend is offline, accusation submission will show a message and remain on the form; this is deliberate so the answer key never has to live in the frontend bundle. Start FastAPI on port 8000 before the final accusation.
- The truth is only fetched after selecting **Unseal the truth**. It is still a local-demo endpoint, not an authenticated production security boundary.

## Case 001 visual-novel artwork

The Gemma artwork pack is integrated into the visual-novel scenes. Eight character portraits are used as recurring sprites (with expression changes), three location illustrations set the office, corridor, and security-room scenes, and four close-up images are attached to their matching evidence records. The archive receives a subdued office backdrop. Supplied source PNGs are retained unchanged in `frontend/public/visual-novel/case001/`; transparent sprite cutouts are separate derivatives, with the originals preserved in `source-art/characters/`.

See [`CASE001_ARTWORK_MAP.md`](./CASE001_ARTWORK_MAP.md) for the scene/evidence mapping. The approved home artwork and the seven opening-cinematic assets are byte-for-byte unchanged. The original procedural noir music continues to play across the menu, archive, and investigation flow when enabled.

## Case 001 story flow

After the opening cinematic, the player now receives a full case-premise briefing from Anika Rao. The briefing establishes the victim, location, time of discovery, apparent burglary, the significance of the 9:17 PM call, and the three claims that need verification.

The player then enters **First Accounts** and reads Meera Sethi's, Arjun Malhotra's, and Dev Bhatia's complete initial statements. Each is presented in first person alongside the matching character portrait and scene. Statements can be read aloud with the Play Statement control. The interview chapter remains locked until all three accounts have been reviewed. Each interview transcript begins with that character's original statement so the account remains available during questioning.

The statements are deliberately framed as claims, not facts. The player must test them against evidence during the investigation.
