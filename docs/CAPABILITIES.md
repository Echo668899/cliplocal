# ClipLocal capability manifest

Pinned packages:

- @ffmpeg/ffmpeg@0.12.15
- @ffmpeg/util@0.12.2
- @ffmpeg/core@0.12.10 (single-thread)
- @ffmpeg/core-mt@0.12.10 (multi-thread)

Multi-thread requires `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` plus `SharedArrayBuffer`. Otherwise the app falls back to single-thread automatically.

## Protocols

Browser wasm builds expose file / MEMFS style access through the `@ffmpeg/ffmpeg` virtual FS. Network protocols are not used for user media (privacy design). Only workspace files written via `writeFile` are readable by exec.

## Verified feature matrix

| Capability | Entry | Conditions | Status |
|---|---|---|---|
| h264 decode/encode (libx264) | Export / Precise cut | Default path | verified-local |
| aac encode | Export audio | Default path | verified-local |
| mp3 encode (libmp3lame) | Extract audio | Tool + Advanced | verified-local |
| pcm_s16le / wav | Extract audio | Tool | verified-local |
| gif + palettegen/paletteuse | Video to GIF | Tool | verified-local |
| webm vp9 | Export container webm | Editor export settings | pending-device |
| trim / -ss / -t | Timeline trim | Precise & Fast cut | verified-local |
| stream copy (-c copy) | Fast cut / mute | Keyframe alignment caveat | verified-local |
| scale / crop / pad / transpose / hflip / vflip | Frame tools | Inspector Frame | verified-local |
| eq / hue / gblur / unsharp / boxblur | Color tools | Inspector Color | verified-local |
| drawtext | Text overlay | Requires font availability in core FS | limited |
| subtitles filter | Burn-in SRT | Editor Subtitles | verified-local |
| concat filter | Merge tool | Optional unify size/fps | verified-local |
| setpts / atempo / reverse / areverse | Speed / reverse | Timeline tools | verified-local |
| afade / volume / loudnorm / aformat / amix | Audio tools | Inspector Audio | partial |
| xfade | Transitions | Multi-clip timeline | pending-device |
| overlay (PiP / watermark image) | Composite | Inspector / Advanced | partial |
| hstack / vstack | Split screen | Advanced + edit graph | partial |
| fps / tpad | Frame rate / freeze | Timeline | verified-local |
| map_metadata -1 | Strip metadata | Batch feature | verified-local |
| ffprobe via ffmpeg -i logs | Probe tool | Parses ffmpeg logs | verified-local |

Status legend:

- `verified-local`: exercised in this repository’s implementation paths
- `partial`: wired in edit graph / args; needs broader device QA
- `limited`: works with caveats
- `pending-device`: awaiting broader browser/device confirmation (see ACCEPTANCE.md)

## Honest UI notes (current build)

| UI control | Export behavior |
|---|---|
| Precise / Fast trim selection | Applied on active clip selection |
| Aspect / rotate / flip / color / text / mute / BGM | Applied in export args |
| Multi-clip transitions / PiP / split screen | Stored in edit graph; use Merge tool or Advanced for full multi-input graphs |
| Region blur | Approximated; boxed blur via Advanced |
| drawtext fonts | Depends on font availability in MEMFS |

## Containers (stock core)

**Demux/read (common):** mp4/mov, matroska/webm, gif, image2, mp3, wav, aac, srt/webvtt (as data)

**Mux/write (common):** mp4, mov, matroska, webm, gif, mp3, wav, adts/ipod (aac), image2 (png/jpeg)

Exact `ffmpeg -formats/-encoders/-decoders/-filters/-bsfs` dumps should be captured in CI by running the loaded core with those queries when automating releases.


## Custom core gaps

ClipLocal ships the stock GPL cores and does **not** rebuild FFmpeg by default.

| Missing / limited component | Impact | Extra download if custom-built | Compatibility notes |
|---|---|---|---|
| Guaranteed embedded DejaVu/Noto fonts for drawtext | Some text overlays may need user-provided fonts written into MEMFS | +2–10 MB fonts | User font upload supported via workspace |
| libass full ASS feature parity | Complex ASS may render differently | depends on build | Prefer SRT/VTT burn-in for reliability |
| Hardware encoders | Not available in wasm | n/a | Always software encode |
| Very large filter graphs on low-RAM devices | May OOM | n/a | Offer shorter preview / lower resolution |

Rebuilding a custom core would increase wasm size beyond the already ~31–32 MiB stock cores and worsen Cloudflare Pages file-size constraints.

