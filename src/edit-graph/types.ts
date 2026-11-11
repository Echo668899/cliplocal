export type AspectPreset = 'free' | '16:9' | '9:16' | '1:1' | '4:5'

export type CutMode = 'precise' | 'fast'

export type TransitionType = 'none' | 'fade' | 'dissolve' | 'wipeleft' | 'wiperight'

export interface MediaAsset {
  id: string
  name: string
  mimeType: string
  size: number
  objectUrl: string
  duration?: number
  width?: number
  height?: number
  fps?: number
  hasAudio?: boolean
  hasVideo?: boolean
  kind: 'video' | 'audio' | 'image' | 'subtitle' | 'font' | 'other'
}

export interface ClipTransform {
  crop?: { x: number; y: number; w: number; h: number }
  aspect?: AspectPreset
  fitMode?: 'cover' | 'contain-pad'
  rotation?: 0 | 90 | 180 | 270
  flipH?: boolean
  flipV?: boolean
  scale?: number
  padColor?: string
}

export interface ColorGrade {
  brightness: number
  contrast: number
  saturation: number
  grayscale: boolean
  blur: number
  sharpen: number
}

export interface BlurRegion {
  id: string
  x: number
  y: number
  w: number
  h: number
  strength: number
}

export interface TextOverlay {
  id: string
  text: string
  start: number
  end: number
  x: number
  y: number
  fontSize: number
  color: string
  fontFamily: string
  opacity: number
}

export interface ImageOverlay {
  id: string
  assetId: string
  start: number
  end: number
  x: number
  y: number
  width: number
  opacity: number
}

export interface PipOverlay {
  id: string
  assetId: string
  start: number
  end: number
  x: number
  y: number
  width: number
  height: number
}

export interface SplitScreen {
  enabled: boolean
  mode: 'side-by-side' | 'top-bottom'
  secondaryAssetId?: string
}

export interface AudioSettings {
  muteOriginal: boolean
  originalVolume: number
  bgmAssetId?: string
  bgmVolume: number
  replaceOriginal: boolean
  fadeIn: number
  fadeOut: number
  loudnorm: boolean
  channels?: number
  sampleRate?: number
}

export interface SubtitleCue {
  id: string
  start: number
  end: number
  text: string
}

export interface SubtitleTrack {
  assetId?: string
  format?: 'srt' | 'vtt' | 'ass'
  cues: SubtitleCue[]
  burnIn: boolean
  style: {
    fontSize: number
    color: string
    position: 'bottom' | 'top' | 'center'
  }
}

export interface TimelineClip {
  id: string
  assetId: string
  label: string
  /** Source in/out on original media */
  sourceStart: number
  sourceEnd: number
  /** Speed multiplier */
  speed: number
  reverse: boolean
  freezeAt?: number
  freezeDuration?: number
  fadeIn: number
  fadeOut: number
  transitionOut: TransitionType
  transitionDuration: number
  transform: ClipTransform
  color: ColorGrade
  blurRegions: BlurRegion[]
  texts: TextOverlay[]
  images: ImageOverlay[]
  pips: PipOverlay[]
  split?: SplitScreen
}

export interface ExportSettings {
  cutMode: CutMode
  container: 'mp4' | 'webm' | 'mkv' | 'mov' | 'gif' | 'mp3' | 'wav' | 'aac'
  videoCodec: 'libx264' | 'libx265' | 'libvpx-vp9' | 'copy' | 'gif'
  audioCodec: 'aac' | 'libmp3lame' | 'pcm_s16le' | 'copy' | 'none'
  width?: number
  height?: number
  fps?: number
  videoBitrate?: string
  audioBitrate?: string
  crf?: number
  targetSizeMb?: number
  preset: 'ultrafast' | 'veryfast' | 'fast' | 'medium'
}

export interface ProjectDocument {
  version: 1
  name: string
  createdAt: number
  updatedAt: number
  assets: Record<string, MediaAsset>
  clips: TimelineClip[]
  audio: AudioSettings
  subtitles: SubtitleTrack
  export: ExportSettings
  /** Selection on primary clip for simple trim UX */
  selection: { start: number; end: number }
  loopSelection: boolean
  unifyOutput?: {
    width: number
    height: number
    fps: number
  }
}

export const defaultColorGrade = (): ColorGrade => ({
  brightness: 0,
  contrast: 1,
  saturation: 1,
  grayscale: false,
  blur: 0,
  sharpen: 0,
})

export const defaultTransform = (): ClipTransform => ({
  aspect: 'free',
  fitMode: 'cover',
  rotation: 0,
  flipH: false,
  flipV: false,
  scale: 1,
  padColor: 'black',
})

export const defaultAudio = (): AudioSettings => ({
  muteOriginal: false,
  originalVolume: 1,
  bgmVolume: 0.5,
  replaceOriginal: false,
  fadeIn: 0,
  fadeOut: 0,
  loudnorm: false,
})

export const defaultSubtitles = (): SubtitleTrack => ({
  cues: [],
  burnIn: true,
  style: {
    fontSize: 24,
    color: '#ffffff',
    position: 'bottom',
  },
})

export const defaultExport = (): ExportSettings => ({
  cutMode: 'precise',
  container: 'mp4',
  videoCodec: 'libx264',
  audioCodec: 'aac',
  crf: 23,
  preset: 'veryfast',
})

export function createEmptyProject(name = 'Untitled'): ProjectDocument {
  const now = Date.now()
  return {
    version: 1,
    name,
    createdAt: now,
    updatedAt: now,
    assets: {},
    clips: [],
    audio: defaultAudio(),
    subtitles: defaultSubtitles(),
    export: defaultExport(),
    selection: { start: 0, end: 0 },
    loopSelection: true,
  }
}

export function createClipFromAsset(asset: MediaAsset): TimelineClip {
  const duration = asset.duration ?? 0
  return {
    id: crypto.randomUUID(),
    assetId: asset.id,
    label: asset.name,
    sourceStart: 0,
    sourceEnd: duration,
    speed: 1,
    reverse: false,
    fadeIn: 0,
    fadeOut: 0,
    transitionOut: 'none',
    transitionDuration: 0.5,
    transform: defaultTransform(),
    color: defaultColorGrade(),
    blurRegions: [],
    texts: [],
    images: [],
    pips: [],
  }
}
