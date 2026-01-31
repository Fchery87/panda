import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ArtifactType = 'file_write' | 'command_run'

export type ArtifactStatus = 'pending' | 'applied' | 'rejected'

export interface FileWritePayload {
  filePath: string
  content: string
  originalContent?: string
}

export interface CommandRunPayload {
  command: string
  workingDirectory?: string
}

export type ArtifactPayload = FileWritePayload | CommandRunPayload

export interface Artifact {
  id: string
  type: ArtifactType
  payload: ArtifactPayload
  status: ArtifactStatus
  createdAt: number
  description?: string
}

interface ArtifactStore {
  artifacts: Artifact[]
  addToQueue: (artifact: Omit<Artifact, 'status' | 'createdAt'>) => void
  applyArtifact: (id: string) => void
  rejectArtifact: (id: string) => void
  clearQueue: () => void
  getPending: () => Artifact[]
  applyAll: () => void
  rejectAll: () => void
}

export const useArtifactStore = create<ArtifactStore>()(
  persist(
    (set, get) => ({
      artifacts: [],

      addToQueue: (artifact) => {
        const newArtifact: Artifact = {
          ...artifact,
          status: 'pending',
          createdAt: Date.now(),
        }
        set((state) => ({
          artifacts: [...state.artifacts, newArtifact],
        }))
      },

      applyArtifact: (id) => {
        set((state) => ({
          artifacts: state.artifacts.map((artifact) =>
            artifact.id === id ? { ...artifact, status: 'applied' } : artifact
          ),
        }))
      },

      rejectArtifact: (id) => {
        set((state) => ({
          artifacts: state.artifacts.map((artifact) =>
            artifact.id === id ? { ...artifact, status: 'rejected' } : artifact
          ),
        }))
      },

      clearQueue: () => {
        set({ artifacts: [] })
      },

      getPending: () => {
        return get().artifacts.filter((artifact) => artifact.status === 'pending')
      },

      applyAll: () => {
        set((state) => ({
          artifacts: state.artifacts.map((artifact) =>
            artifact.status === 'pending' ? { ...artifact, status: 'applied' } : artifact
          ),
        }))
      },

      rejectAll: () => {
        set((state) => ({
          artifacts: state.artifacts.map((artifact) =>
            artifact.status === 'pending' ? { ...artifact, status: 'rejected' } : artifact
          ),
        }))
      },
    }),
    {
      name: 'panda-artifacts',
      partialize: (state) => ({ artifacts: state.artifacts }),
    }
  )
)

export const selectPendingArtifacts = (state: ArtifactStore) =>
  state.artifacts.filter((artifact) => artifact.status === 'pending')

export const selectArtifactCount = (state: ArtifactStore) =>
  state.artifacts.filter((artifact) => artifact.status === 'pending').length
