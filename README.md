# Learnify — OER Adaptive Learning Engine

Offline-first adaptive learning platform for Android and web, built with Django, React Native (mobile), React + Vite (PWA), and a transparent SM-2 spaced-repetition algorithm.

## Architecture

```
teacher ──→ backend ──sync──→ device ──→ learner
   │          │                      │
   │          ▼                      ▼
   │     PostgreSQL              SQLite / IndexedDB
   │     (Django REST)           (React Native / PWA)
   │
   └── upload content + author items
```

- **Backend:** Django REST Framework (`content`, `learning`, `sync`, `teacher` apps)
- **Mobile:** React Native with TypeScript, local SQLite, offline-first sync (native-only, `mobile/`)
- **PWA:** React + TypeScript + Vite, IndexedDB, offline-first, installable to home screen (`pwa/`)
- **Scheduling:** Pure-function SM-2 variant in `learning/srs.py` (also mirrored in client `services/srs.ts`)

## Running the PWA

```bash
cd pwa
npm install
npm run dev          # dev server at http://localhost:5173
npm run build        # production build
npm run preview      # preview production build
```

The PWA uses the same Django backend API. In local development, the Vite dev server proxies `/api` to `http://localhost:8000`, so the browser stays on a single origin.

If you need to target a different backend, set `VITE_API_BASE_URL` in the PWA environment to the full API root, for example `http://localhost:8000/api`.

## Data flow

1. Teachers upload content units and author items via the web UI or API
2. Devices pull content incrementally via `GET /api/sync/content/`
3. Learners practice offline — attempts are stored in local SQLite
4. When online, devices push progress via `POST /api/sync/progress/`
5. Backend runs the SRS algorithm on each attempt, returns updated item states
6. Due items are surfaced through `GET /api/learners/{id}/next_items/`

## Quick start

```bash
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

Dev mode uses SQLite. For production, set `DJANGO_SETTINGS_MODULE=oer_engine.settings.prod` and configure DB credentials via environment variables.

## Project structure

| App | Domain |
|---|---|
| `content` | OER content units, variants, items, tags |
| `learning` | Learners, attempts, item states, SRS algorithm |
| `sync` | Incremental content pull and progress push |
| `teacher` | Teacher-facing content authoring |
| `mobile/` | React Native app (Android/iOS) |
| `pwa/` | PWA web app (React + Vite, IndexedDB) |

## Testing

```bash
python -m pytest learning/tests/
```

The SRS algorithm in `learning/srs.py` is a pure function with no framework dependencies — testable in isolation and portable to the React Native client.

## Notes

- The **mobile** app (`mobile/`) is React Native native-only — it uses `react-native-sqlite-storage` (native SQLite) and Metro bundler.
- The **PWA** app (`pwa/`) is the web/browser version. It uses IndexedDB (via `idb`) for local storage and `vite-plugin-pwa` for offline support and home screen installation. It can run alongside the same Django backend.
- The mobile API base URL is in `mobile/src/api/config.ts`; the PWA API base URL is in `pwa/src/api/config.ts`.
- The default mobile URL (`10.0.2.2:8000`) targets the host machine from an Android emulator — change for physical devices or iOS.

## Extensibility

- `content/ai_utils.py` provides a documented stub for wiring in LLM-based quiz generation
- The SRS algorithm is a single pure function with documented constants — tweak `EASE_CORRECT_BONUS`, `EASE_INCORRECT_PENALTY`, etc. to adjust behavior
- Sync endpoints are idempotent and tolerate re-sent data
