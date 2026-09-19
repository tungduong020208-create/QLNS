# Run Doc — Preview Setup

## Reproduce Uncommitted Artifacts
- Copy `.env.example` → `.env.local` and fill the REAL office Wi-Fi values
  (public IP, LAN subnet). `.env.local` is gitignored — never commit it.
  The app still runs without it (RFC 5737 placeholder fallbacks in
  `src/utils/constants.ts`), but the Wi-Fi attendance check won't pass.
- If `GEMINI_API_KEY` is needed later, it also lives in `.env.local`.
- Dependencies are already installed in `node_modules/`.

## How to Run the Server
- Start Vite dev server on port 3000:
  ```
  npm run dev
  ```
  (This runs `vite --port=3000 --host=0.0.0.0`)
- Vite reads `.env*` at STARTUP ONLY — restart the server after editing `.env.local`.
- Vite auto-selects the next free port (3004+) when 3000–3003 are occupied.
- Server logs go to `.freebuff/preview-*.log` (stdout) and `.freebuff/preview-*.log.err` (stderr).
- Current port: 3000 (was free this run).
- PowerShell `Start-Process` hangs in this shell — use `nohup npm run dev > /dev/null 2> /dev/null &` (bash) instead.
