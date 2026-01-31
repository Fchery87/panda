'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

interface UseFileContentReturn {
  content: string;
  isDirty: boolean;
  updateContent: (newContent: string) => void;
  savedContent: string;
}

export function useFileContent(
  initialContent: string,
  onSave?: (content: string) => void,
  debounceMs: number = 1000
): UseFileContentReturn {
  const [content, setContent] = useState(initialContent);
  const [savedContent, setSavedContent] = useState(initialContent);
  const [isDirty, setIsDirty] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setContent(initialContent);
    setSavedContent(initialContent);
    setIsDirty(false);
  }, [initialContent]);

  const updateContent = useCallback(
    (newContent: string) => {
      setContent(newContent);

      const hasChanges = newContent !== savedContent;
      setIsDirty(hasChanges);

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      if (hasChanges && onSave) {
        debounceRef.current = setTimeout(() => {
          onSave(newContent);
          setSavedContent(newContent);
          setIsDirty(false);
        }, debounceMs);
      }
    },
    [savedContent, onSave, debounceMs]
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return {
    content,
    isDirty,
    updateContent,
    savedContent,
  };
}
