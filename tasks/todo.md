# Wire StatusBar to live backend /health data

- [x] Import FE version from `package.json`
- [x] Add `HealthData` type definition
- [x] Add `useHealthCheck` hook (polls /health every 30s)
- [x] Update JSX to use live data with fallbacks
- [x] Verify frontend build passes

## Review

All changes in `frontend/src/components/StatusBar.tsx`:
- FE version now reads from `package.json` instead of hardcoded string
- New `useHealthCheck` hook fetches `GET /health` on mount + every 30s
- Backend unreachable → `health` is `null` → red dots, fallback text ("?", "DB / unknown")
- Backend reachable → green dots, real version/DB info displayed
