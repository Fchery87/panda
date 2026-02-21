'use client'

import { useState, useCallback, useRef, useEffect } from 'react'

interface UseFileContentReturn {
  content: string
  isDirty: boolean
  updateContent: (newContent: string) => void
  savedContent: string
}

export function useFileContent(
  initialContent: string,
  onSave?: (content: string) => void | Promise<void>,
  debounceMs: number = 1000
): UseFileContentReturn {
  const [content, setContent] = useState(initialContent)
  const [savedContent, setSavedContent] = useState(initialContent)
  const [isDirty, setIsDirty] = useState(false)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const contentRef = useRef(initialContent)
  const savedContentRef = useRef(initialContent)
  const onSaveRef = useRef(onSave)
  const fileVersionRef = useRef(0)
  const saveSeqRef = useRef(0)

  useEffect(() => {
    onSaveRef.current = onSave
  }, [onSave])

  const scheduleSave = useCallback((nextContent: string, version: number) => {
    const saveSeq = ++saveSeqRef.current
    void Promise.resolve(onSaveRef.current?.(nextContent))
      .then(() => {
        if (fileVersionRef.current !== version || saveSeq !== saveSeqRef.current) {
          return
        }
        savedContentRef.current = nextContent
        setSavedContent(nextContent)
        setIsDirty(contentRef.current !== nextContent)
      })
      .catch(() => {
        if (fileVersionRef.current !== version) return
        setIsDirty(true)
      })
  }, [])

  useEffect(() => {
    const previousContent = contentRef.current
    const previousSaved = savedContentRef.current
    const previousVersion = fileVersionRef.current

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
    }

    // Flush pending changes for the previously open file before switching.
    if (previousContent !== previousSaved && onSaveRef.current) {
      scheduleSave(previousContent, previousVersion)
    }

    fileVersionRef.current += 1
    contentRef.current = initialContent
    savedContentRef.current = initialContent
    setContent(initialContent)
    setSavedContent(initialContent)
    setIsDirty(false)
  }, [initialContent, scheduleSave])

  const updateContent = useCallback(
    (newContent: string) => {
      contentRef.current = newContent
      setContent(newContent)

      const hasChanges = newContent !== savedContentRef.current
      setIsDirty(hasChanges)

      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }

      if (hasChanges && onSave) {
        const versionAtSchedule = fileVersionRef.current
        debounceRef.current = setTimeout(() => {
          scheduleSave(newContent, versionAtSchedule)
        }, debounceMs)
      }
    },
    [onSave, debounceMs, scheduleSave]
  )

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  return {
    content,
    isDirty,
    updateContent,
    savedContent,
  }
}
