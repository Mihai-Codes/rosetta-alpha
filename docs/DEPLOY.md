# 🚀 Deployment Guide

**Stack**: FastAPI (Railway) + React/Vite (Vercel)  
**Est. time**: ~15 minutes

---

## 1. Backend → Railway

1. Go to [railway.app](https://railway.app) → **New Project → Deploy from GitHub Repo**
2. Select `rosetta-alpha`, set **Root Directory** to `api`
3. Railway auto-detects the `Dockerfile` — no extra config needed
4. Add env vars (Settings → Variables):
   ```
   PORT=8000
   ```
5. Note the generated URL, e.g. `https://rosetta-alpha-api.up.railway.app`

---

## 2. Frontend → Vercel

1. Go to [vercel.com](https://vercel.com) → **New Project → Import Git Repository**
2. Select `rosetta-alpha`, set **Root Directory** to `frontend`
3. Vercel auto-detects Vite — build command `npm run build`, output `dist`
4. **Before deploying**, update `frontend/vercel.json` → replace the Railway URL placeholder with your actual Railway URL:
   ```json
   "destination": "https://<your-railway-url>/api/$1"
   ```
5. Deploy → you'll get a `https://rosetta-alpha.vercel.app` URL

---

## 3. Verify

```bash
# Backend health
curl https://<your-railway-url>/health

# Frontend
open https://rosetta-alpha.vercel.app
```

---

## Notes
- The frontend proxy in `vercel.json` rewrites `/api/*` → Railway, so CORS is handled automatically.
- `results.json` is seeded empty on container start; the settler agent writes to it at runtime.
- For the hackathon demo, run `python demo/e2e_run.py` on Railway via a one-off job or include it in the `CMD`.
