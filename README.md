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
npm run deploy        # direct wrangler deploy (includes large wasm — may fail on Pages)
npm run deploy:cf     # Pages-safe: strip wasm, expect R2 for cores
```

### GitHub Actions

Push to `master`/`main` runs [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml).

Required repository **secrets**:

| Secret | Purpose |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Token with Pages + (optional) R2 edit |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account id |

Optional repository **variables**:

| Variable | Purpose |
|---|---|
| `UPLOAD_FFMPEG_R2` | Set to `true` to sync cores to R2 on each deploy |
| `FFMPEG_R2_BUCKET` | R2 bucket name (default `cliplocal-ffmpeg`) |

### Cloudflare Pages note (25 MiB)

Stock `ffmpeg-core.wasm` is ~31–32 MiB, above the Pages per-file limit. Options:

1. Host cores via R2 and enable `functions/ffmpeg/[[path]].js` with an `FFMPEG_BUCKET` binding (see `wrangler.toml`). Set `UPLOAD_FFMPEG_R2=true` in GitHub Actions variables.
2. Deploy the SPA to a host without that file-size cap, keeping the same `_headers` requirements.

Application JS/CSS/fonts remain self-hosted either way. No third-party analytics.

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
