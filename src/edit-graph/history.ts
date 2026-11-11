import type { ProjectDocument } from './types'

const MAX = 80

export interface HistoryState {
  past: ProjectDocument[]
  present: ProjectDocument
  future: ProjectDocument[]
}

export function initHistory(present: ProjectDocument): HistoryState {
  return { past: [], present, future: [] }
}

export function pushHistory(state: HistoryState, next: ProjectDocument): HistoryState {
  const past = [...state.past, state.present].slice(-MAX)
  return { past, present: { ...next, updatedAt: Date.now() }, future: [] }
}

export function undo(state: HistoryState): HistoryState {
  if (!state.past.length) return state
  const previous = state.past[state.past.length - 1]
  return {
    past: state.past.slice(0, -1),
    present: previous,
    future: [state.present, ...state.future],
  }
}

export function redo(state: HistoryState): HistoryState {
  if (!state.future.length) return state
  const next = state.future[0]
  return {
    past: [...state.past, state.present],
    present: next,
    future: state.future.slice(1),
  }
}
