# ClipLocal

Private, browser-based video editor powered by ffmpeg.wasm. Media stays on the device — no uploads, accounts, or installs.

## Stack

- Vite + React + TypeScript
- `@ffmpeg/ffmpeg@0.12.15`
- `@ffmpeg/core@0.12.10` / `@ffmpeg/core-mt@0.12.10`
- Cloudflare Pages (`public/_headers` for COOP/COEP)

## Develop

```bash
npm install
npm run ffmpeg:copy   # refresh public/ffmpeg from node_modules
npm run caps          # regenerate docs/CAPABILITIES.md
npm run dev
```

Open the printed local URL. Confirm `crossOriginIsolated` is `true` in the console so multi-thread mode can engage.

## Build & deploy

```bash
npm run build
npm run preview
npm run deploy        # Workers: strip oversized wasm, wrangler deploy
```

### GitHub Actions → Cloudflare Worker

Push to `master`/`main` runs [`.github/workflows/deploy-worker.yml`](.github/workflows/deploy-worker.yml):

1. Build the SPA
2. Strip `ffmpeg-core.wasm` from `dist` (asset size limit)
3. Create/upload cores to R2 bucket `cliplocal-ffmpeg`
4. `wrangler deploy` Worker + static assets

Required repository **secrets**:

| Secret | Purpose |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Workers Scripts Edit + R2 Edit + Account read |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account id |

Production URL (workers.dev): `https://cliplocal.<your-subdomain>.workers.dev`

### FFmpeg cores on R2

Stock `ffmpeg-core.wasm` is ~31–32 MiB. The Worker serves `/ffmpeg/*` from R2 (`FFMPEG_BUCKET` → `cliplocal-ffmpeg`). JS/CSS/fonts stay on Worker assets. No third-party analytics.

## Product surfaces

| Route | Purpose |
|---|---|
| `/` | Choose / drop video |
| `/editor` | Full timeline editor |
| `/tools` | Task tools (trim, compress, merge, …) |
| `/formats` | Read / preview / encode / mux matrix |
| `/advanced` | FFmpeg Console |
| `/privacy` | Privacy & clear workspace |

## Docs

- [docs/CAPABILITIES.md](docs/CAPABILITIES.md)
- [docs/ACCEPTANCE.md](docs/ACCEPTANCE.md)
