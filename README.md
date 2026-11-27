# ClearAir

ClearAir combines modeled outdoor air quality, a household routine planner, practical indoor-air tips, and a gasoline-car tailpipe CO₂ calculator.

Run `npm start` with Node.js 22 or later and open `http://127.0.0.1:4173`. The project has no install step. An internet connection enables city search and the air-quality forecast through Open-Meteo. New Delhi has a labeled winter example for when the forecast is unavailable. Household preferences, city selection, and trip distance are stored in the browser.

## Ask ClearAir

Set `OPENAI_API_KEY` in the server environment to enable generated answers through the OpenAI Responses API. Optionally set `OPENAI_MODEL` to override `gpt-4.1-mini`. For local development, copy `.env.example` to `.env`, fill in the key, and start with `node --env-file=.env scripts/serve.mjs`. When the model is unavailable, chat uses built-in guidance based on the same selected city and household preferences.

`npm run build` creates the Sites Worker artifact under `dist/`.
