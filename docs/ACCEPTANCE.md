# ClipLocal acceptance results

Pinned engines: `@ffmpeg/ffmpeg@0.12.15`, `@ffmpeg/core@0.12.10`, `@ffmpeg/core-mt@0.12.10`.

## Environment matrix

| Browser / device | Engine mode | Core load | Trim export | Notes |
|---|---|---|---|---|
| Chromium desktop (Linux) | Multi-thread when COOP/COEP set | Pending manual | Pending manual | Use `npm run dev` / `npm run preview` with Vite headers |
| Firefox desktop | Multi-thread when isolated | Pending manual | Pending manual | Confirm `crossOriginIsolated === true` |
| Safari desktop | Often single-thread | Pending manual | Pending manual | SharedArrayBuffer / isolation varies by version |
| Chrome Android | Single or MT | Pending manual | Pending manual | Large files may OOM — verify recovery prompts |
| Safari iOS | Single-thread likely | Pending manual | Pending manual | Touch timeline handles; A/V sync check |

Mark each cell `pass` / `fail` / `pending` during QA. Items below list the required procedure.

## 1. Cut accuracy

**Setup:** Use a source with burnt-in timecode and an audio sync clap/beep. Prefer a 60s H.264/AAC MP4. Choose a start time that falls between keyframes (e.g. 5.00s when GOP is 2s).

**Steps:**

1. Open ClipLocal → Choose video → editor loads preview immediately.
2. Drag handles to ~5.000–12.000s (or type times). Enable Loop selection and confirm A/V loop.
3. Export with **Precise cut** → review first/last frame, duration (~7s), A/V sync.
4. Repeat with **Fast cut** → confirm UI warning about keyframe snap; measure actual start skew.

**Also test:** portrait phone clip, variable frame-rate clip, video without audio.

| Case | Result | Tester / date |
|---|---|---|
| Precise cut mid-GOP | pending | |
| Fast cut mid-GOP skew noted | pending | |
| Portrait 9:16 source | pending | |
| VFR source | pending | |
| No-audio source | pending | |

## 2. Combined edit

**Steps:** Select range → set aspect 9:16 → add subtitle cues + optional BGM volume → export MP4 → reopen output and verify framing, text position, audio.

| Check | Result |
|---|---|
| 9:16 framing | pending |
| Subtitle position/timing | pending |
| BGM / original levels | pending |

## 3. Privacy & offline

**Offline:** After engine + app assets load, disable network, choose a new video, trim, export, download. Must succeed without network.

**Online traffic:** With DevTools Network open, run a full edit. Confirm requests are only same-origin app/wasm/font assets — no media upload bodies, no analytics.

| Check | Result |
|---|---|
| Offline export after warm cache | pending |
| No media egress in Network panel | pending |

## 4. Failure recovery

| Scenario | Expected | Result |
|---|---|---|
| Cancel export | Edits retained; can export again | pending |
| Corrupt file | Clear error; workspace recoverable | pending |
| Unsupported codec | Error + optional local preview remux path | pending |
| Memory pressure | Guidance to shorten clip / lower resolution / lower quality | pending |
| Multi-thread unavailable | Auto single-thread; chip shows mode | pending |

## 5. Feature coverage map

| Feature | Visual entry | Advanced-only | Core/device limited |
|---|---|---|---|
| Precise / fast trim | Editor + Trim tool | Params visible | Fast cut keyframe skew |
| Split / delete middle / reorder | Editor Timeline | | Multi-clip transitions pending-device |
| Merge + unify specs | Merge tool | Yes | Memory on long joins |
| Speed / reverse / freeze / fades | Inspector | | atempo chaining |
| Crop / aspect / rotate / flip / pad | Inspector + tools | | |
| Color / blur region | Inspector | | Heavy blur perf |
| Text overlay | Inspector | drawtext fonts | Font embedding limited |
| Image watermark / PiP / split | Edit graph + Advanced | Primary | partial |
| Mute / extract / BGM / loudnorm | Tools + Inspector | amix fine control | partial |
| Subtitles import / burn-in | Inspector + tool | Soft-track mux | ASS complexity |
| Compress / target size estimate | Compress tool | | Estimate ≠ exact |
| GIF / screenshot | Tools | | Long GIF RAM |
| Probe / strip metadata / batch preset | Probe tool + `features/batch` | Console | |
| FFmpeg Console + presets | Advanced page | — | Workspace FS only |

## Deploy checks (Cloudflare)

- [ ] `COOP` / `COEP` present once (no duplicated merged values)
- [ ] `self.crossOriginIsolated === true`
- [ ] `.wasm` served as `application/wasm`
- [ ] Core files reachable (static or R2 proxy under `/ffmpeg/*`)
- [ ] Single-file size strategy documented if Pages 25 MiB limit blocks wasm upload

## Automated / local verification already run

| Check | Result | Environment |
|---|---|---|
| `npm run build` (tsc + vite) | pass | Linux CI-like shell |
| Vite preview serves `/` `/editor` `/tools/trim` | pass (HTTP 200) | `vite preview` 127.0.0.1:4173 |
| Response headers COOP/COEP on HTML | pass | same |
| `ffmpeg-core.wasm` Content-Type `application/wasm` | pass | same |
| Interactive cut accuracy / offline / Network egress | pending | Requires manual browser QA with test media |
| Multi-thread `crossOriginIsolated` in Chromium | pending | Confirm in DevTools after open |
