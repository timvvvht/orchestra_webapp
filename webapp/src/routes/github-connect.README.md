# GitHub Access Flow (Supabase → ACS → GitHub App)

This page guides users to connect the "Orchestra Agents" GitHub App and verify access.

## Open the Page

- Start the webapp: bun dev (or npm run dev)
- Navigate to: http://localhost:5173/github/connect

## Prerequisites

- ACS server running (local or via ngrok)
- Supabase project configured in `src/auth/SupabaseClient.ts`
- GitHub account to install the app

## Steps (Follow in Order)

1. Login/Register (Supabase)
2. CRITICAL: "Exchange for ACS Cookies"
3. "Connect GitHub (Install App)" opens the GitHub install page
4. After installing, "My Installations" and "My Repos" should list your data
5. Optional: Provisioning buttons for infra tests

## Configuration

- Set ACS Server URL at top of page (e.g., http://localhost:8001 or https://<ngrok>.ngrok-free.app)
- The page will append /api/v1 automatically for API calls

## Troubleshooting

- 401 Unauthorized: Ensure you clicked "Exchange for ACS Cookies"
- CORS: Ensure your origin is allowed by ACS; default includes localhost:5173
- Ngrok URL changes on restart; update the ACS URL accordingly
