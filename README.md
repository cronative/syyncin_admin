# SyyncIn Admin Console

React 18 + Vite + TypeScript + Ant Design 5, themed with the SyyncIn brand (blue → teal gradient, navy, Inter).
Talks to the SyyncIn Node API (`syyncin_api`).

## Run

```bash
# 1. API (in syyncin_api/)
npm run dev                       # http://localhost:4000

# 2. Admin console
npm install
npm run dev                       # http://localhost:5173  (proxies /api and /uploads to :4000)
```

Log in with the admin you created via `npm run admin:create` in the API project.

## Production

```bash
VITE_API_URL=https://api.yourdomain.com/api/v1 npm run build   # → dist/
```

Serve `dist/` from any static host (Nginx, Netlify, S3 + CloudFront). Configure the host to send unknown paths
to `index.html` (SPA fallback), and add the console's origin to `CORS_ORIGINS` in the API `.env`.

## Screens

| Screen | What it does |
|---|---|
| Login | Email + password; session auto-refreshes (rotating refresh token); expired sessions return to login |
| Dashboard | KPIs, 14-day sign-ups, onboarding funnel, top interests, master-data summary |
| Verifications | Selfie queue (images loaded securely with the admin token), approve, reject with preset/custom reason, filter by status, search |
| Users | Search + filters (status, selfie, onboarding, city), full profile drawer, block / unblock |
| Master data ×8 | Industries, Experience levels, Skills, Interests, Reasons, Mindset questions, Cities, Localities — add, edit, show/hide in app, delete (auto-hides if in use), drag-to-reorder (= order in the app), search, filters, pagination |
| Mindset questions | Expand a row to add / rename / hide / delete answer options |

## Structure

```
src/
  theme.ts                 brand tokens → Ant Design theme
  styles.css               gradient buttons, sidebar, cards, charts
  api/client.ts            axios, token storage, 401 → refresh → retry
  api/types.ts             response types
  auth/AuthContext.tsx     login / logout / session
  layout/AppLayout.tsx     sidebar (pending badge), header
  config/masterData.tsx    one config entry per master-data type (fields, columns, copy)
  pages/                   Login, Dashboard, MasterData (generic), Verifications, Users
  components/              UserDrawer, MindsetOptionsEditor, SortableTable, shared UI
```

Adding a new master-data type = one entry in the API `TYPES` map + one entry in `config/masterData.tsx`.
