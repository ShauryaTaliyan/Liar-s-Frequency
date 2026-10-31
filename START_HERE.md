# Start here (Mac)

The app opens to a minimal, full-screen title menu using `frontend/public/liars-frequency-home.webp`. It shows only **LIAR'S FREQUENCY**, **MERIDIAN PRIVATE INVESTIGATIONS**, **Start Investigation**, **Settings**, and **About**. Both tape reels rotate at different speeds, the recorder LED pulses softly, the lamp glow gently breathes, film grain drifts, a few dust flecks cross the beam, and rare horizontal glitch slices appear in the black negative space. The archive keeps the same black-and-brass palette. Case 001 opens as a full-screen visual-novel sequence: each chapter uses a full-bleed scene, a focused dialogue panel, and a small set of guided question choices instead of a multi-panel dashboard. These effects stop when reduced motion is enabled or requested by the operating system. Start Investigation opens the case archive: Case 001 is playable, while Cases 002–005 are marked **More to come**. About includes the project description and credits.

## Terminal 1 — API

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

## Terminal 2 — Web app

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

Open `http://localhost:5173`. The first screen is the image-led title menu; click **Start Investigation** → **Case 001** to enter the playable case. Use **Archive** in the case header to return to the case selection screen. Inside Case 001, use the bottom chapter strip to move between Story, Interrogate, Evidence, and Accuse. The formal accusation unlocks after you discover at least five clues.

## Try the first interrogation

In the visual-novel dialogue scene, choose a guided question (e.g. **Your timeline** or **The access logs**). The suspect responds in the dialogue box and discovered evidence appears in the case file. You can expand **Ask your own question** for free text or dictation. Use **History** only when you need to review the transcript; the main scene remains uncluttered.

## Bolna

Create an Arjun agent using `backend/ARJUN_BOLNA_PROMPT.md`, then add credentials to `backend/.env`. This starter does **not** yet connect the in-browser conversation to the Bolna Web Call SDK; it includes an optional backend endpoint for an explicitly initiated outbound test call. See the README before using it.

## Case 001 opening cinematic

1. Start the frontend as above.
2. Select **Start Investigation** → **Case 001**.
3. The opening cinematic begins automatically. Click **ANSWER CALL** or press **Enter/Space** when Anika calls. If unanswered, it proceeds after a short timeout.
4. Use **SKIP INTRO** or **Escape** to skip straight to the existing briefing.
5. After the title card appears, select **BEGIN INVESTIGATION** to load the original Case 001 game.

The cinematic uses Web Audio for the ringtone and an original, locally synthesized noir music cue during the title reveal; no third-party music file or license is required. The clean, watermark-free waking artwork is used for Scene 1, and the answered-call artwork appears only after the call is answered. Anika uses browser speech synthesis where supported; subtitles remain visible regardless. No live Bolna agent is required or implied by this opening.

## Scoring and reveal integrity

- The suspect is no longer preselected on the accusation screen. You must explicitly choose a suspect, select discovered evidence, and write at least 12 words before submitting.
- A correct name alone is worth only 10 points. Reasoning points require sentence-level links between the vendor records and motive, the independent alibi contradiction, and the 9:17 call/forensic timeline. Keyword soup cannot earn full marks.
- The canonical answer key remains in the FastAPI backend; it is not embedded in the frontend. Start the backend before submitting an accusation. If the scoring API is unavailable, the game keeps you on the accusation screen and shows an actionable error instead of silently grading locally.
- After scoring, choose **Unseal the truth** to request the canonical timeline. The public case endpoint does not include the culprit or method.
- Field notes autosave in the current browser using local storage.

## Case 001 visual-novel artwork

The game now uses the supplied Gemma artwork pack as scene art rather than a gallery:

- Anika and the three suspects appear as recurring transparent character sprites during briefing/interrogation; their expression variants change when their statements are challenged or they admit a concealed fact.
- The executive office is the briefing/crime-scene setting and the default Meera/reveal environment.
- The executive corridor frames Arjun's interview and access/timeline evidence.
- The security monitoring room frames Dev's interview and camera-outage evidence.
- The vendor ledger, access-control record, phone-call record, and camera-maintenance log appear only with their corresponding evidence entries.
- The archive uses a subdued executive-office backdrop. Dialogue and choices stay on a dark, legible text panel so the scene remains readable.

All 15 supplied source images are retained byte-for-byte under `frontend/public/visual-novel/case001/`. Character sprites used in-scene are transparent derivative cutouts; their unmodified originals are kept under `source-art/characters/`. Evidence entries without an actual supplied evidence photograph remain text-only rather than displaying a misleading character or location image. See `CASE001_ARTWORK_MAP.md` for the full mapping.

The home artwork and all seven opening-cinematic files remain unchanged. The original procedural noir music continues on the home menu, archive, and investigation screens, and during the title reveal when enabled in Settings.

## Updated Case 001 flow

1. Start Case 001 and complete or skip the opening cinematic.
2. Read Anika's **Case Premise** screen. It explains who was found dead, where and when the body was discovered, what made the scene suspicious, and why the 9:17 PM call matters.
3. Open **Statements**. Review all three full first-person accounts: Meera, Arjun, and Dev. Use **PLAY STATEMENT** to hear the selected account through browser speech synthesis (requires Voice On).
4. After all three are marked read, choose **BEGIN INTERVIEWS**. The interview begins with the selected suspect's initial account already in the transcript.
5. Continue to investigate, discover evidence, and build the accusation as before.

The initial accounts are unverified claims. Do not treat an interview statement as proof until it is checked against independent evidence.
