# Frontend

The Vite + React single-page application for the B2B Dead Stock marketplace. It supports city/state and category search, tagged surplus listings, buyer purchase history, seller offer negotiation, business profiles, listing reports, notifications, and admin moderation tools.

## Local development

```powershell
npm install
npm run dev
```

Vite proxies `/api` requests to `http://localhost:8080` by default. Set `BACKEND_API_URL` before `npm run dev` to use a different local API. On Vercel, the serverless API proxy forwards requests to the `BACKEND_API_URL` environment variable.

## Vercel deployment

Deploy this directory as the Vercel project root. Set `BACKEND_API_URL` to the public Render API origin (for example, `https://b2b-dead-stock-api.onrender.com`). The `/api/*` serverless proxy forwards API calls and the session cookie so browser requests remain same-origin.

The older `src/main/resources/templates` files are retained for the Spring backend's legacy server-rendered routes; the React application is the deployed Vercel UI.
