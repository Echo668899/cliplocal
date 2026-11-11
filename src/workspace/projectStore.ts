import { create } from 'zustand'
import {
  createClipFromAsset,
  createEmptyProject,
  type CutMode,
  type MediaAsset,
  type ProjectDocument,
  type TimelineClip,
} from '@/edit-graph/types'
import { initHistory, pushHistory, redo as redoHistory, undo as undoHistory, type HistoryState } from '@/edit-graph/history'
import { createManagedObjectUrl, clearAllObjectUrls, revokeManagedObjectUrl } from './objectUrls'
import { readMediaMetadata } from '@/services/ffmpeg/mediaInfo'
import { clearAllSaved, deleteProject, saveProjectSettings, saveProjectWithMedia } from './storage'

type EngineState = {
  status: 'idle' | 'loading' | 'ready' | 'running' | 'error'
  mode: 'mt' | 'st' | null
  phase: string
  error?: string
}

type ExportResult = {
  blob: Blob
  url: string
  name: string
  bytes: number
  args: string[]
  notes: string[]
}

type ProjectStore = {
  history: HistoryState
  originalSnapshot: ProjectDocument | null
  fileBlobs: Record<string, Blob>
  selectedClipId: string | null
  selectedTool: string
  engine: EngineState
  exportResult: ExportResult | null
  abortController: AbortController | null
  /** Live scrub time while dragging the timeline (seconds). */
  scrubTime: number | null

  project: () => ProjectDocument
  setProject: (doc: ProjectDocument, recordHistory?: boolean) => void
  undo: () => void
  redo: () => void
  resetToOriginal: () => void

  ingestFiles: (files: FileList | File[]) => Promise<MediaAsset[]>
  setSelection: (start: number, end: number, options?: { recordHistory?: boolean; scrubTo?: number | null }) => void
  setScrubTime: (time: number | null) => void
  setLoopSelection: (loop: boolean) => void
  setCutMode: (mode: CutMode) => void
  updateClip: (clipId: string, patch: Partial<TimelineClip>) => void
  reorderClips: (from: number, to: number) => void
  splitSelectedClip: (at: number) => void
  deleteRange: (start: number, end: number) => void
  addTextOverlay: (text: string) => void
  setSelectedTool: (tool: string) => void
  setEngine: (patch: Partial<EngineState>) => void
  setExportResult: (result: ExportResult | null) => void
  setAbortController: (c: AbortController | null) => void

  saveSettingsOnly: (id?: string) => Promise<string>
  saveWithMedia: (id?: string) => Promise<string>
  clearWorkspace: () => Promise<void>
}

function primaryDuration(doc: ProjectDocument): number {
  const clip = doc.clips[0]
  if (!clip) return 0
  const asset = doc.assets[clip.assetId]
  return asset?.duration ?? clip.sourceEnd
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  history: initHistory(createEmptyProject('ClipLocal project')),
  originalSnapshot: null,
  fileBlobs: {},
  selectedClipId: null,
  selectedTool: 'trim',
  engine: { status: 'idle', mode: null, phase: 'Engine idle' },
  exportResult: null,
  abortController: null,
  scrubTime: null,

  project: () => get().history.present,

  setProject: (doc, recordHistory = true) => {
    set((s) => ({
      history: recordHistory ? pushHistory(s.history, doc) : { ...s.history, present: doc },
    }))
  },

  undo: () => set((s) => ({ history: undoHistory(s.history) })),
  redo: () => set((s) => ({ history: redoHistory(s.history) })),

  resetToOriginal: () => {
    const snap = get().originalSnapshot
    if (!snap) return
    set((s) => ({
      history: pushHistory(s.history, structuredClone(snap)),
      exportResult: null,
    }))
  },

  ingestFiles: async (files) => {
    const list = Array.from(files)
    const assets: MediaAsset[] = []
    const blobs: Record<string, Blob> = { ...get().fileBlobs }
    let doc = structuredClone(get().project())

    for (const file of list) {
      const id = crypto.randomUUID()
      const objectUrl = createManagedObjectUrl(file)
      const meta = await readMediaMetadata(file, objectUrl)
      const asset: MediaAsset = {
        id,
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
        objectUrl,
        kind: meta.kind ?? 'other',
        duration: meta.duration,
        width: meta.width,
        height: meta.height,
        fps: meta.fps,
        hasAudio: meta.hasAudio,
        hasVideo: meta.hasVideo,
      }
      assets.push(asset)
      blobs[id] = file
      doc.assets[id] = asset

      if (asset.kind === 'video' || (asset.kind === 'audio' && doc.clips.length === 0)) {
        const clip = createClipFromAsset(asset)
        doc.clips.push(clip)
        if (doc.clips.length === 1) {
          doc.selection = { start: 0, end: asset.duration ?? 0 }
          doc.name = file.name.replace(/\.[^.]+$/, '')
        }
      } else if (asset.kind === 'audio') {
        doc.audio.bgmAssetId = id
      } else if (asset.kind === 'subtitle') {
        doc.subtitles.assetId = id
      }
    }

    const firstVideo = assets.find((a) => a.kind === 'video')
    set((s) => ({
      fileBlobs: blobs,
      selectedClipId: doc.clips[0]?.id ?? s.selectedClipId,
      originalSnapshot: s.originalSnapshot ?? structuredClone(doc),
      history: pushHistory(s.history, doc),
      exportResult: null,
    }))

    if (firstVideo) {
      // keep original snapshot after first ingest
      const snap = get().originalSnapshot
      if (!snap || Object.keys(snap.assets).length === 0) {
        set({ originalSnapshot: structuredClone(get().project()) })
      }
    }

    return assets
  },

  setSelection: (start, end, options) => {
    const doc = structuredClone(get().project())
    const duration = primaryDuration(doc)
    const s = Math.max(0, Math.min(start, duration || start))
    const e = Math.max(s + 0.01, Math.min(end, duration || end))
    doc.selection = { start: s, end: e }
    if (doc.clips[0]) {
      doc.clips[0].sourceStart = s
      doc.clips[0].sourceEnd = e
    }
    const recordHistory = options?.recordHistory ?? true
    get().setProject(doc, recordHistory)
    if (options && 'scrubTo' in options) {
      set({ scrubTime: options.scrubTo ?? null })
    }
  },

  setScrubTime: (time) => set({ scrubTime: time }),

  setLoopSelection: (loop) => {
    const doc = structuredClone(get().project())
    doc.loopSelection = loop
    get().setProject(doc, false)
  },

  setCutMode: (mode) => {
    const doc = structuredClone(get().project())
    doc.export.cutMode = mode
    get().setProject(doc)
  },

  updateClip: (clipId, patch) => {
    const doc = structuredClone(get().project())
    const idx = doc.clips.findIndex((c) => c.id === clipId)
    if (idx < 0) return
    doc.clips[idx] = { ...doc.clips[idx], ...patch }
    get().setProject(doc)
  },

  reorderClips: (from, to) => {
    const doc = structuredClone(get().project())
    const [item] = doc.clips.splice(from, 1)
    if (!item) return
    doc.clips.splice(to, 0, item)
    get().setProject(doc)
  },

  splitSelectedClip: (at) => {
    const doc = structuredClone(get().project())
    const clip = doc.clips.find((c) => c.id === get().selectedClipId) ?? doc.clips[0]
    if (!clip) return
    if (at <= clip.sourceStart + 0.05 || at >= clip.sourceEnd - 0.05) return
    const right: TimelineClip = {
      ...structuredClone(clip),
      id: crypto.randomUUID(),
      sourceStart: at,
    }
    clip.sourceEnd = at
    const idx = doc.clips.findIndex((c) => c.id === clip.id)
    doc.clips.splice(idx + 1, 0, right)
    get().setProject(doc)
  },

  deleteRange: (start, end) => {
    const doc = structuredClone(get().project())
    const clip = doc.clips[0]
    if (!clip) return
    if (start <= clip.sourceStart && end >= clip.sourceEnd) {
      doc.clips = []
      get().setProject(doc)
      return
    }
    if (start <= clip.sourceStart) {
      clip.sourceStart = end
      doc.selection = { start: clip.sourceStart, end: clip.sourceEnd }
      get().setProject(doc)
      return
    }
    if (end >= clip.sourceEnd) {
      clip.sourceEnd = start
      doc.selection = { start: clip.sourceStart, end: clip.sourceEnd }
      get().setProject(doc)
      return
    }
    // delete middle => two clips
    const right: TimelineClip = {
      ...structuredClone(clip),
      id: crypto.randomUUID(),
      sourceStart: end,
    }
    clip.sourceEnd = start
    const idx = doc.clips.findIndex((c) => c.id === clip.id)
    doc.clips.splice(idx + 1, 0, right)
    doc.selection = { start: clip.sourceStart, end: clip.sourceEnd }
    get().setProject(doc)
  },

  addTextOverlay: (text) => {
    const doc = structuredClone(get().project())
    const clip = doc.clips[0]
    if (!clip) return
    clip.texts.push({
      id: crypto.randomUUID(),
      text,
      start: doc.selection.start,
      end: doc.selection.end,
      x: 40,
      y: 40,
      fontSize: 36,
      color: '#ffffff',
      fontFamily: 'sans',
      opacity: 1,
    })
    get().setProject(doc)
  },

  setSelectedTool: (tool) => set({ selectedTool: tool }),
  setEngine: (patch) => set((s) => ({ engine: { ...s.engine, ...patch } })),
  setExportResult: (result) => {
    const prev = get().exportResult
    if (prev?.url) revokeManagedObjectUrl(prev.url)
    set({ exportResult: result })
  },
  setAbortController: (c) => set({ abortController: c }),

  saveSettingsOnly: async (id) => {
    const projectId = id ?? crypto.randomUUID()
    await saveProjectSettings(projectId, get().project())
    return projectId
  },

  saveWithMedia: async (id) => {
    const projectId = id ?? crypto.randomUUID()
    await saveProjectWithMedia(projectId, get().project(), get().fileBlobs)
    return projectId
  },

  clearWorkspace: async () => {
    const result = get().exportResult
    if (result?.url) revokeManagedObjectUrl(result.url)
    clearAllObjectUrls()
    await clearAllSaved()
    set({
      history: initHistory(createEmptyProject('ClipLocal project')),
      originalSnapshot: null,
      fileBlobs: {},
      selectedClipId: null,
      exportResult: null,
      engine: { status: 'idle', mode: null, phase: 'Engine idle' },
      abortController: null,
      scrubTime: null,
    })
  },
}))

export async function removeSavedProject(id: string) {
  await deleteProject(id)
}
