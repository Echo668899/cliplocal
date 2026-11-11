import { useEffect, type RefObject } from 'react'
import { useProjectStore } from '@/workspace/projectStore'

export function useEditorHotkeys(options: {
  videoRef: RefObject<HTMLVideoElement | null>
  onExport?: () => void
}) {
  const undo = useProjectStore((s) => s.undo)
  const redo = useProjectStore((s) => s.redo)
  const project = useProjectStore((s) => s.history.present)
  const setSelection = useProjectStore((s) => s.setSelection)
  const splitSelectedClip = useProjectStore((s) => s.splitSelectedClip)
  const deleteRange = useProjectStore((s) => s.deleteRange)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return
      }
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
        return
      }
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault()
        const v = options.videoRef.current
        if (!v) return
        if (v.paused) void v.play()
        else v.pause()
        return
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault()
        const v = options.videoRef.current
        if (!v) return
        const step = e.shiftKey ? 1 : 1 / 30
        v.currentTime = Math.max(0, v.currentTime + (e.key === 'ArrowRight' ? step : -step))
        return
      }
      if (e.key.toLowerCase() === 'i') {
        const t = options.videoRef.current?.currentTime ?? project.selection.start
        setSelection(t, Math.max(t + 0.05, project.selection.end))
        return
      }
      if (e.key.toLowerCase() === 'o') {
        const t = options.videoRef.current?.currentTime ?? project.selection.end
        setSelection(Math.min(t - 0.05, project.selection.start), t)
        return
      }
      if (e.key.toLowerCase() === 's') {
        const t = options.videoRef.current?.currentTime ?? (project.selection.start + project.selection.end) / 2
        splitSelectedClip(t)
        return
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        deleteRange(project.selection.start, project.selection.end)
      }
      if (e.key === '?') {
        alert(
          'Shortcuts:\nSpace play/pause\n←/→ frame (Shift = 1s)\nI/O mark in/out\nS split\nDelete remove selection\nCtrl/Cmd+Z undo\nShift+Ctrl/Cmd+Z redo',
        )
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [
    undo,
    redo,
    project.selection.start,
    project.selection.end,
    setSelection,
    splitSelectedClip,
    deleteRange,
    options.videoRef,
    options.onExport,
  ])
}
