import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { ProjectDocument } from '@/edit-graph/types'

interface ClipLocalDB extends DBSchema {
  projects: {
    key: string
    value: {
      id: string
      savedAt: number
      document: ProjectDocument
      /** Whether media blobs were also persisted */
      includesMedia: boolean
    }
  }
  media: {
    key: string
    value: {
      id: string
      projectId: string
      name: string
      mimeType: string
      blob: Blob
    }
  }
  presets: {
    key: string
    value: {
      id: string
      name: string
      args: string[]
      createdAt: number
    }
  }
}

let dbPromise: Promise<IDBPDatabase<ClipLocalDB>> | null = null

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<ClipLocalDB>('cliplocal', 1, {
      upgrade(db) {
        db.createObjectStore('projects', { keyPath: 'id' })
        db.createObjectStore('media', { keyPath: 'id' })
        db.createObjectStore('presets', { keyPath: 'id' })
      },
    })
  }
  return dbPromise
}

export async function listSavedProjects() {
  const db = await getDb()
  return db.getAll('projects')
}

export async function saveProjectSettings(id: string, document: ProjectDocument) {
  const db = await getDb()
  await db.put('projects', {
    id,
    savedAt: Date.now(),
    document: stripObjectUrls(document),
    includesMedia: false,
  })
}

export async function saveProjectWithMedia(
  id: string,
  document: ProjectDocument,
  blobs: Record<string, Blob>,
) {
  const db = await getDb()
  const tx = db.transaction(['projects', 'media'], 'readwrite')
  await tx.objectStore('projects').put({
    id,
    savedAt: Date.now(),
    document: stripObjectUrls(document),
    includesMedia: true,
  })
  for (const [assetId, blob] of Object.entries(blobs)) {
    const asset = document.assets[assetId]
    if (!asset) continue
    await tx.objectStore('media').put({
      id: `${id}:${assetId}`,
      projectId: id,
      name: asset.name,
      mimeType: asset.mimeType,
      blob,
    })
  }
  await tx.done
}

export async function loadProject(id: string) {
  const db = await getDb()
  const project = await db.get('projects', id)
  if (!project) return null
  const media = await db.getAll('media')
  const related = media.filter((m) => m.projectId === id)
  return { ...project, media: related }
}

export async function deleteProject(id: string) {
  const db = await getDb()
  const tx = db.transaction(['projects', 'media'], 'readwrite')
  await tx.objectStore('projects').delete(id)
  const media = await db.getAll('media')
  for (const m of media) {
    if (m.projectId === id) await tx.objectStore('media').delete(m.id)
  }
  await tx.done
}

export async function clearAllSaved() {
  const db = await getDb()
  await db.clear('projects')
  await db.clear('media')
}

export async function listPresets() {
  const db = await getDb()
  return db.getAll('presets')
}

export async function savePreset(name: string, args: string[]) {
  const db = await getDb()
  const id = crypto.randomUUID()
  await db.put('presets', { id, name, args, createdAt: Date.now() })
  return id
}

export async function deletePreset(id: string) {
  const db = await getDb()
  await db.delete('presets', id)
}

function stripObjectUrls(doc: ProjectDocument): ProjectDocument {
  const assets = Object.fromEntries(
    Object.entries(doc.assets).map(([id, a]) => [
      id,
      { ...a, objectUrl: '' },
    ]),
  )
  return { ...doc, assets }
}
