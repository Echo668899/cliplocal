import { buildTrimJob } from './argBuilder'
import { bytesToBlob } from './bytes'
import { ffmpegRuntime, type ProgressEvent } from './runtime'
import { createManagedObjectUrl } from '@/workspace/objectUrls'
import type { ProjectDocument } from '@/edit-graph/types'

function extForContainer(container: string) {
  return container === 'mpeg' ? 'mpg' : container
}

export async function exportProject(options: {
  project: ProjectDocument
  primaryBlob: Blob
  signal?: AbortSignal
  onProgress?: (e: ProgressEvent) => void
}): Promise<{ blob: Blob; url: string; name: string; bytes: number; args: string[]; notes: string[] }> {
  await ffmpegRuntime.ensureLoaded(options.onProgress)

  const container = options.project.export.container
  const outputName = `clip_${Date.now()}.${extForContainer(container)}`
  const inputName = `input_${Date.now()}.bin`
  const job = buildTrimJob(options.project, inputName, outputName)

  // Apply burn-in subtitles via temp srt if needed
  const inputs: Array<{ name: string; data: Blob | File | Uint8Array }> = [
    { name: inputName, data: options.primaryBlob },
  ]
  let args = [...job.args]

  if (options.project.subtitles.burnIn && options.project.subtitles.cues.length > 0) {
    const srt = cuesToSrt(options.project.subtitles.cues)
    const subName = 'subs.srt'
    inputs.push({ name: subName, data: new Blob([srt], { type: 'text/plain' }) })
    const vfIdx = args.indexOf('-vf')
    const subFilter = `subtitles=${subName}`
    if (vfIdx >= 0) {
      args[vfIdx + 1] = `${args[vfIdx + 1]},${subFilter}`
    } else {
      const outIdx = args.length - 1
      args = [...args.slice(0, outIdx), '-vf', subFilter, ...args.slice(outIdx)]
    }
  }

  const result = await ffmpegRuntime.run({
    args,
    inputs,
    outputs: [outputName],
    signal: options.signal,
    onProgress: options.onProgress,
  })

  const data = result[outputName]
  const mime =
    container === 'gif'
      ? 'image/gif'
      : container === 'mp3'
        ? 'audio/mpeg'
        : container === 'wav'
          ? 'audio/wav'
          : container === 'webm'
            ? 'video/webm'
            : 'video/mp4'
  const blob = bytesToBlob(data, mime)
  const url = createManagedObjectUrl(blob)
  const name = `${options.project.name || 'clip'}.${extForContainer(container)}`
  return { blob, url, name, bytes: blob.size, args, notes: job.notes }
}

export function cuesToSrt(cues: Array<{ start: number; end: number; text: string }>): string {
  return cues
    .map((c, i) => `${i + 1}\n${formatSrtTime(c.start)} --> ${formatSrtTime(c.end)}\n${c.text}\n`)
    .join('\n')
}

function formatSrtTime(sec: number) {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.floor(sec % 60)
  const ms = Math.floor((sec % 1) * 1000)
  const p = (n: number, w = 2) => n.toString().padStart(w, '0')
  return `${p(h)}:${p(m)}:${p(s)},${p(ms, 3)}`
}

export function parseSrt(content: string) {
  const blocks = content.replace(/\r/g, '').split(/\n\n+/)
  const cues: Array<{ id: string; start: number; end: number; text: string }> = []
  for (const block of blocks) {
    const lines = block.trim().split('\n')
    if (lines.length < 2) continue
    const timeLine = lines.find((l) => l.includes('-->'))
    if (!timeLine) continue
    const [startRaw, endRaw] = timeLine.split('-->').map((s) => s.trim())
    const text = lines.slice(lines.indexOf(timeLine) + 1).join('\n')
    cues.push({
      id: crypto.randomUUID(),
      start: parseSrtTime(startRaw),
      end: parseSrtTime(endRaw),
      text,
    })
  }
  return cues
}

function parseSrtTime(v: string) {
  const m = v.match(/(\d+):(\d+):(\d+)[,.](\d+)/)
  if (!m) return 0
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) + Number(m[4]) / 1000
}
