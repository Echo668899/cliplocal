import type { ProjectDocument } from '@/edit-graph/types'
import { buildProjectExportJob } from './argBuilder'
import { bytesToBlob } from './bytes'
import { cuesToSrt } from './exportService'
import { ffmpegRuntime, type ProgressEvent } from './runtime'
import { createManagedObjectUrl } from '@/workspace/objectUrls'

/**
 * Export path that can mix original audio with a BGM asset from the workspace.
 */
export async function exportProjectWithOptionalBgm(options: {
  project: ProjectDocument
  primaryBlob: Blob
  bgmBlob?: Blob
  signal?: AbortSignal
  onProgress?: (e: ProgressEvent) => void
}) {
  await ffmpegRuntime.ensureLoaded(options.onProgress)
  const container = options.project.export.container
  const outputName = `clip_${Date.now()}.${container}`
  const inputName = `input_${Date.now()}.bin`
  const job = buildProjectExportJob(options.project, inputName, outputName)
  const inputs: Array<{ name: string; data: Blob | Uint8Array }> = [
    { name: inputName, data: options.primaryBlob },
  ]
  let args = [...job.args]
  const notes = [...job.notes]

  if (options.project.subtitles.burnIn && options.project.subtitles.cues.length > 0) {
    const srt = cuesToSrt(options.project.subtitles.cues)
    const subName = 'subs.srt'
    inputs.push({ name: subName, data: new Blob([srt], { type: 'text/plain' }) })
    const vfIdx = args.indexOf('-vf')
    const subFilter = `subtitles=${subName}`
    if (vfIdx >= 0) args[vfIdx + 1] = `${args[vfIdx + 1]},${subFilter}`
    else {
      const outIdx = args.length - 1
      args = [...args.slice(0, outIdx), '-vf', subFilter, ...args.slice(outIdx)]
    }
  }

  if (options.bgmBlob && options.project.audio.bgmAssetId) {
    const bgmName = 'bgm.bin'
    inputs.push({ name: bgmName, data: options.bgmBlob })
    // Rebuild with filter_complex amix when BGM present
    const start = options.project.selection.start
    const duration = Math.max(0.01, options.project.selection.end - start)
    const vol = options.project.audio.originalVolume
    const bgmVol = options.project.audio.bgmVolume
    const mute = options.project.audio.muteOriginal || options.project.audio.replaceOriginal
    args = [
      '-hide_banner',
      '-y',
      '-ss',
      start.toFixed(3),
      '-t',
      duration.toFixed(3),
      '-i',
      inputName,
      '-stream_loop',
      '-1',
      '-i',
      bgmName,
      '-t',
      duration.toFixed(3),
      '-filter_complex',
      mute
        ? `[1:a]volume=${bgmVol}[aout]`
        : `[0:a]volume=${vol}[a0];[1:a]volume=${bgmVol}[a1];[a0][a1]amix=inputs=2:duration=first:dropout_transition=2[aout]`,
      '-map',
      '0:v',
      '-map',
      '[aout]',
      '-c:v',
      'libx264',
      '-preset',
      options.project.export.preset,
      '-crf',
      String(options.project.export.crf ?? 23),
      '-c:a',
      'aac',
      '-movflags',
      '+faststart',
      outputName,
    ]
    notes.push('Mixed background music with original audio on this device.')
  }

  const result = await ffmpegRuntime.run({
    args,
    inputs,
    outputs: [outputName],
    signal: options.signal,
    onProgress: options.onProgress,
  })

  const mime = container === 'gif' ? 'image/gif' : container === 'mp3' ? 'audio/mpeg' : 'video/mp4'
  const blob = bytesToBlob(result[outputName], mime)
  const url = createManagedObjectUrl(blob)
  const name = `${options.project.name || 'clip'}.${container}`
  return { blob, url, name, bytes: blob.size, args, notes }
}
