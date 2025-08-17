// Implementation Summary: Start Chat Surface + Provisioning Overlay
// 
// ✅ COMPLETED IMPLEMENTATION:
//
// 1. Created StartChat.tsx route component:
//    - ChatGPT-like centered interface with repo dropdown, branch input, prompt textarea
//    - Enforces GitHub connection via acsGithubApi.listRepos and installUrl
//    - On submit, navigates to /mission-control with provisioning payload in location.state
//
// 2. Created ProvisioningOverlay.tsx component:
//    - Full-screen overlay that calls acsGithubApi.provisionWithRepo
//    - Polls acsGithubApi.repoStatus every 5 seconds until ready/failed/timeout (5 min)
//    - Uses Orchestra design system (glass panels, dark background, subtle motion)
//
// 3. Updated routes.tsx:
//    - Added { path: "start", element: <StartChat /> } route
//    - Imported StartChat component
//
// 4. Updated auth/callback.tsx:
//    - Changed post-login redirect from /mission-control to /start
//    - Updated fallback link text
//
// 5. Updated MissionControl.tsx:
//    - Added useLocation and useNavigate imports
//    - Added ProvisioningOverlay import and conditional rendering
//    - Reads location.state?.provision and mounts overlay when present
//    - Overlay clears state via navigate(".", { replace: true, state: null }) on completion
//
// 🎯 USER FLOW:
// Google OAuth → /start → Select repo + branch + prompt → Start → /mission-control with overlay
// → Provision infra → Poll status → Ready/Failed → Overlay dismisses
//
// 🔧 TECHNICAL DETAILS:
// - Uses existing acsGithubApi endpoints (listRepos, installUrl, provisionWithRepo, repoStatus)
// - Supabase JWT passed as Bearer token for ACS authentication
// - Orchestra design system classes (glass-panel, text-display, etc.) from app.css
// - Float animation keyframes already defined in app.css
// - Error handling for no repos, provisioning failures, timeouts
//
// 📋 ACCEPTANCE CRITERIA MET:
// ✅ After Google login, user lands on /start
// ✅ GitHub connection enforced with install CTA + refresh
// ✅ Repo dropdown + branch input (default 'main') + prompt textarea
// ✅ Start button navigates to Mission Control with provisioning overlay
// ✅ Overlay provisions via ACS and polls until ready/failed/timeout
// ✅ No regressions to existing routes
//
console.log('🎉 Start Chat Surface + Provisioning Overlay - IMPLEMENTATION COMPLETE!');