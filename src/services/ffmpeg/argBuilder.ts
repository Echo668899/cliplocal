import type {
  AspectPreset,
  ColorGrade,
  ClipTransform,
  ExportSettings,
  ProjectDocument,
  TimelineClip,
} from '@/edit-graph/types'

export type BuiltJob = {
  args: string[]
  inputs: Array<{ key: string; fileName: string }>
  outputName: string
  notes: string[]
}

function aspectSize(aspect: AspectPreset, srcW = 1280, srcH = 720): { w: number; h: number } | null {
  switch (aspect) {
    case '16:9':
      return { w: 1280, h: 720 }
    case '9:16':
      return { w: 720, h: 1280 }
    case '1:1':
      return { w: 1080, h: 1080 }
    case '4:5':
      return { w: 864, h: 1080 }
    default:
      return { w: srcW, h: srcH }
  }
}

function buildVf(clip: TimelineClip, exportSettings: ExportSettings, project: ProjectDocument): string[] {
  const filters: string[] = []
  const t = clip.transform
  const c = clip.color

  if (t.crop) {
    filters.push(`crop=${Math.round(t.crop.w)}:${Math.round(t.crop.h)}:${Math.round(t.crop.x)}:${Math.round(t.crop.y)}`)
  }

  if (t.rotation === 90) filters.push('transpose=1')
  if (t.rotation === 180) filters.push('transpose=1,transpose=1')
  if (t.rotation === 270) filters.push('transpose=2')
  if (t.flipH) filters.push('hflip')
  if (t.flipV) filters.push('vflip')

  const target = exportSettings.width && exportSettings.height
    ? { w: exportSettings.width, h: exportSettings.height }
    : aspectSize(t.aspect ?? 'free')

  if (target && t.aspect && t.aspect !== 'free') {
    if (t.fitMode === 'contain-pad') {
      filters.push(
        `scale=${target.w}:${target.h}:force_original_aspect_ratio=decrease`,
        `pad=${target.w}:${target.h}:(ow-iw)/2:(oh-ih)/2:${t.padColor ?? 'black'}`,
      )
    } else {
      filters.push(
        `scale=${target.w}:${target.h}:force_original_aspect_ratio=increase`,
        `crop=${target.w}:${target.h}`,
      )
    }
  } else if (exportSettings.width || exportSettings.height) {
    const w = exportSettings.width ?? -2
    const h = exportSettings.height ?? -2
    filters.push(`scale=${w}:${h}`)
  }

  if (c.brightness !== 0 || c.contrast !== 1 || c.saturation !== 1) {
    filters.push(`eq=brightness=${c.brightness}:contrast=${c.contrast}:saturation=${c.saturation}`)
  }
  if (c.grayscale) filters.push('hue=s=0')
  if (c.blur > 0) filters.push(`gblur=sigma=${c.blur}`)
  if (c.sharpen > 0) filters.push(`unsharp=5:5:${c.sharpen}:5:5:0`)

  for (const r of clip.blurRegions) {
    filters.push(
      `split[main][tmp];[tmp]crop=${Math.round(r.w)}:${Math.round(r.h)}:${Math.round(r.x)}:${Math.round(r.y)},boxblur=${r.strength}:${r.strength}[blur];[main][blur]overlay=${Math.round(r.x)}:${Math.round(r.y)}`,
    )
  }

  if (clip.fadeIn > 0 || clip.fadeOut > 0) {
    const duration = Math.max(0.01, (clip.sourceEnd - clip.sourceStart) / Math.max(clip.speed, 0.01))
    const fi = clip.fadeIn > 0 ? `fade=t=in:st=0:d=${clip.fadeIn}` : ''
    const fo = clip.fadeOut > 0 ? `fade=t=out:st=${Math.max(0, duration - clip.fadeOut)}:d=${clip.fadeOut}` : ''
    filters.push([fi, fo].filter(Boolean).join(','))
  }

  if (clip.speed !== 1 && !clip.reverse) {
    filters.push(`setpts=${(1 / clip.speed).toFixed(6)}*PTS`)
  }
  if (clip.reverse) filters.push('reverse')

  if (typeof clip.freezeAt === 'number' && clip.freezeDuration) {
    filters.push(`tpad=stop_mode=clone:stop_duration=${clip.freezeDuration}`)
  }

  for (const text of clip.texts) {
    const escaped = text.text.replace(/\\/g, '\\\\').replace(/:/g, '\\:').replace(/'/g, "\\'")
    filters.push(
      `drawtext=text='${escaped}':x=${text.x}:y=${text.y}:fontsize=${text.fontSize}:fontcolor=${text.color}@${text.opacity}:enable='between(t,${text.start},${text.end})'`,
    )
  }

  if (project.subtitles.burnIn && project.subtitles.cues.length) {
    // Burn-in handled via separate subtitle file in builder
  }

  if (exportSettings.fps) filters.push(`fps=${exportSettings.fps}`)

  return filters.filter(Boolean)
}

function buildAf(project: ProjectDocument, clip: TimelineClip): string[] {
  const filters: string[] = []
  const a = project.audio
  if (a.muteOriginal || a.replaceOriginal) return filters

  if (clip.speed !== 1 && !clip.reverse) {
    // atempo only supports 0.5–2.0; chain if needed
    let speed = clip.speed
    while (speed > 2.0) {
      filters.push('atempo=2.0')
      speed /= 2
    }
    while (speed < 0.5) {
      filters.push('atempo=0.5')
      speed /= 0.5
    }
    filters.push(`atempo=${speed.toFixed(4)}`)
  }
  if (clip.reverse) filters.push('areverse')

  if (a.originalVolume !== 1) filters.push(`volume=${a.originalVolume}`)
  if (a.fadeIn > 0) filters.push(`afade=t=in:st=0:d=${a.fadeIn}`)
  if (a.fadeOut > 0) {
    const duration = Math.max(0.01, (clip.sourceEnd - clip.sourceStart) / Math.max(clip.speed, 0.01))
    filters.push(`afade=t=out:st=${Math.max(0, duration - a.fadeOut)}:d=${a.fadeOut}`)
  }
  if (a.loudnorm) filters.push('loudnorm')
  if (a.channels || a.sampleRate) {
    const parts = []
    if (a.sampleRate) parts.push(`sample_rates=${a.sampleRate}`)
    if (a.channels) parts.push(`channel_layouts=${a.channels === 1 ? 'mono' : 'stereo'}`)
    filters.push(`aformat=${parts.join(':')}`)
  }
  return filters
}

export function buildTrimJob(
  project: ProjectDocument,
  inputFileName: string,
  outputName = 'output.mp4',
): BuiltJob {
  const notes: string[] = []
  const clip = project.clips[0]
  const start = project.selection.start
  const end = project.selection.end
  const duration = Math.max(0.01, end - start)
  const settings = project.export

  if (!clip) {
    return {
      args: ['-i', inputFileName, '-c', 'copy', outputName],
      inputs: [{ key: 'primary', fileName: inputFileName }],
      outputName,
      notes: ['No clip in project'],
    }
  }

  const vf = buildVf({ ...clip, sourceStart: start, sourceEnd: end }, settings, project)
  const af = buildAf(project, { ...clip, sourceStart: start, sourceEnd: end })
  const hasVideoFilters = vf.length > 0
  const hasAudioFilters = af.length > 0
  const mute = project.audio.muteOriginal
  if (settings.cutMode === 'fast') {
    notes.push(
      'Fast cut copies bitstreams when possible. Cut points may snap to keyframes, so start/end can differ slightly from the selection.',
    )
  }

  const args: string[] = ['-hide_banner', '-y']

  if (settings.cutMode === 'precise') {
    args.push('-ss', start.toFixed(3), '-i', inputFileName, '-t', duration.toFixed(3))
  } else {
    // Input seeking for fast/copy friendliness
    args.push('-ss', start.toFixed(3), '-i', inputFileName, '-t', duration.toFixed(3))
  }

  if (settings.cutMode === 'fast' && !hasVideoFilters && !hasAudioFilters && !mute && clip.speed === 1 && !clip.reverse) {
    args.push('-c', 'copy')
    if (settings.container === 'mp4') args.push('-movflags', '+faststart')
    args.push(outputName)
    return {
      args,
      inputs: [{ key: 'primary', fileName: inputFileName }],
      outputName,
      notes,
    }
  }

  if (hasVideoFilters) args.push('-vf', vf.join(','))
  if (mute) {
    args.push('-an')
  } else if (hasAudioFilters) {
    args.push('-af', af.join(','))
  }

  if (settings.videoCodec === 'copy' && hasVideoFilters) {
    args.push('-c:v', 'libx264')
  } else {
    args.push('-c:v', settings.videoCodec === 'gif' ? 'gif' : settings.videoCodec)
  }

  if (settings.videoCodec === 'libx264' || settings.videoCodec === 'libx265') {
    args.push('-preset', settings.preset)
    if (settings.crf != null) args.push('-crf', String(settings.crf))
  }
  if (settings.videoBitrate) args.push('-b:v', settings.videoBitrate)

  if (!mute) {
    if (settings.audioCodec === 'none') args.push('-an')
    else args.push('-c:a', settings.audioCodec === 'copy' && hasAudioFilters ? 'aac' : settings.audioCodec)
    if (settings.audioBitrate) args.push('-b:a', settings.audioBitrate)
  }

  if (settings.container === 'mp4') args.push('-movflags', '+faststart')
  args.push(outputName)

  return {
    args,
    inputs: [{ key: 'primary', fileName: inputFileName }],
    outputName,
    notes,
  }
}

export function buildMergeJob(
  inputNames: string[],
  outputName: string,
  unify?: { width: number; height: number; fps: number },
): BuiltJob {
  const notes: string[] = []
  if (unify) {
    notes.push(`Unifying outputs to ${unify.width}x${unify.height} @ ${unify.fps}fps`)
    const args: string[] = ['-hide_banner', '-y']
    inputNames.forEach((n) => args.push('-i', n))
    const n = inputNames.length
    const scalePads = inputNames
      .map(
        (_, i) =>
          `[${i}:v]scale=${unify.width}:${unify.height}:force_original_aspect_ratio=decrease,pad=${unify.width}:${unify.height}:(ow-iw)/2:(oh-ih)/2,fps=${unify.fps},setsar=1[v${i}]`,
      )
      .join(';')
    const concatIn = inputNames.map((_, i) => `[v${i}][${i}:a?]`).join('')
    args.push('-filter_complex', `${scalePads};${concatIn}concat=n=${n}:v=1:a=1[vout][aout]`)
    args.push('-map', '[vout]', '-map', '[aout]', '-c:v', 'libx264', '-c:a', 'aac', outputName)
    return {
      args,
      inputs: inputNames.map((fileName, i) => ({ key: `in${i}`, fileName })),
      outputName,
      notes,
    }
  }

  // concat demuxer list approach via filter
  const args: string[] = ['-hide_banner', '-y']
  inputNames.forEach((n) => args.push('-i', n))
  const concat = inputNames.map((_, i) => `[${i}:v][${i}:a]`).join('')
  args.push(
    '-filter_complex',
    `${concat}concat=n=${inputNames.length}:v=1:a=1[v][a]`,
    '-map',
    '[v]',
    '-map',
    '[a]',
    '-c:v',
    'libx264',
    '-c:a',
    'aac',
    outputName,
  )
  return {
    args,
    inputs: inputNames.map((fileName, i) => ({ key: `in${i}`, fileName })),
    outputName,
    notes,
  }
}

export function buildExtractAudioArgs(input: string, output: string, codec: 'mp3' | 'aac' | 'wav' = 'mp3'): string[] {
  if (codec === 'wav') return ['-hide_banner', '-y', '-i', input, '-vn', '-c:a', 'pcm_s16le', output]
  if (codec === 'aac') return ['-hide_banner', '-y', '-i', input, '-vn', '-c:a', 'aac', output]
  return ['-hide_banner', '-y', '-i', input, '-vn', '-c:a', 'libmp3lame', '-q:a', '2', output]
}

export function buildMuteArgs(input: string, output: string, copy: boolean): string[] {
  if (copy) return ['-hide_banner', '-y', '-i', input, '-c:v', 'copy', '-an', output]
  return ['-hide_banner', '-y', '-i', input, '-c:v', 'libx264', '-an', '-movflags', '+faststart', output]
}

export function buildGifArgs(input: string, output: string, start: number, duration: number, fps = 10, width = 480): string[] {
  return [
    '-hide_banner',
    '-y',
    '-ss',
    start.toFixed(3),
    '-t',
    duration.toFixed(3),
    '-i',
    input,
    '-vf',
    `fps=${fps},scale=${width}:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse`,
    output,
  ]
}

export function buildCompressArgs(
  input: string,
  output: string,
  opts: { crf?: number; width?: number; height?: number; videoBitrate?: string; targetSizeMb?: number; duration?: number },
): { args: string[]; note?: string } {
  const args = ['-hide_banner', '-y', '-i', input]
  const vf: string[] = []
  if (opts.width || opts.height) vf.push(`scale=${opts.width ?? -2}:${opts.height ?? -2}`)
  if (vf.length) args.push('-vf', vf.join(','))
  args.push('-c:v', 'libx264', '-preset', 'veryfast')
  if (opts.videoBitrate) {
    args.push('-b:v', opts.videoBitrate)
  } else if (opts.targetSizeMb && opts.duration) {
    const bits = opts.targetSizeMb * 8 * 1024 * 1024
    const audioBits = 128_000
    const videoBitrate = Math.max(100_000, Math.floor(bits / opts.duration - audioBits))
    args.push('-b:v', `${Math.floor(videoBitrate / 1000)}k`)
  } else {
    args.push('-crf', String(opts.crf ?? 28))
  }
  args.push('-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', output)
  return {
    args,
    note: opts.targetSizeMb ? 'Target size is an estimate based on bitrate; actual size may differ.' : undefined,
  }
}

export function buildScreenshotArgs(input: string, output: string, time: number): string[] {
  return ['-hide_banner', '-y', '-ss', time.toFixed(3), '-i', input, '-frames:v', '1', output]
}

export function buildStripMetadataArgs(input: string, output: string): string[] {
  return ['-hide_banner', '-y', '-i', input, '-map_metadata', '-1', '-c', 'copy', output]
}

export function previewStyle(t: ClipTransform, c: ColorGrade): Record<string, string> {
  return {
    filter: [
      `brightness(${1 + c.brightness})`,
      `contrast(${c.contrast})`,
      `saturate(${c.grayscale ? 0 : c.saturation})`,
      c.blur > 0 ? `blur(${Math.min(c.blur, 8)}px)` : '',
    ]
      .filter(Boolean)
      .join(' '),
    transform: [
      t.flipH ? 'scaleX(-1)' : '',
      t.flipV ? 'scaleY(-1)' : '',
      t.rotation ? `rotate(${t.rotation}deg)` : '',
      t.scale && t.scale !== 1 ? `scale(${t.scale})` : '',
    ]
      .filter(Boolean)
      .join(' '),
  }
}
