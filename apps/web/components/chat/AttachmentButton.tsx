'use client'

import { useCallback, useRef, useState } from 'react'
import { FilePlus2, ImagePlus, Paperclip, X } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

export interface Attachment {
  id: string
  file: File
  type: 'file' | 'image'
  preview?: string // data URL for images
}

interface AttachmentButtonProps {
  attachments: Attachment[]
  onAttach: (attachment: Attachment) => void
  onRemove: (id: string) => void
  disabled?: boolean
}

export function AttachmentButton({
  attachments,
  onAttach,
  onRemove,
  disabled,
}: AttachmentButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(
    (file: File, type: 'file' | 'image') => {
      const id = `${Date.now()}-${file.name}`
      const attachment: Attachment = { id, file, type }
      if (type === 'image') {
        const reader = new FileReader()
        reader.onload = (e) => {
          onAttach({ ...attachment, preview: e.target?.result as string })
        }
        reader.readAsDataURL(file)
      } else {
        onAttach(attachment)
      }
      setIsOpen(false)
    },
    [onAttach]
  )

  return (
    <div>
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="group relative flex items-center gap-1.5 border border-border bg-background px-2 py-1"
            >
              {att.type === 'image' && att.preview ? (
                <img src={att.preview} alt={att.file.name} className="h-8 w-8 object-cover" />
              ) : (
                <FilePlus2 className="h-3.5 w-3.5 text-muted-foreground" />
              )}
              <span className="max-w-[120px] truncate font-mono text-[10px] text-muted-foreground">
                {att.file.name}
              </span>
              <button
                type="button"
                onClick={() => onRemove(att.id)}
                className="ml-1 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className="flex h-7 w-7 items-center justify-center border border-border text-muted-foreground transition-colors duration-150 hover:border-foreground/30 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Attach file or image"
          >
            <Paperclip className="h-3.5 w-3.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          side="top"
          sideOffset={8}
          className="w-auto min-w-[160px] rounded-none border-border p-1"
        >
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="hover:bg-surface-2 flex w-full items-center gap-2 px-3 py-2 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <FilePlus2 className="h-3.5 w-3.5" />
            Upload File
          </button>
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            className="hover:bg-surface-2 flex w-full items-center gap-2 px-3 py-2 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ImagePlus className="h-3.5 w-3.5" />
            Upload Image
          </button>
        </PopoverContent>
      </Popover>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file, 'file')
          e.target.value = ''
        }}
      />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file, 'image')
          e.target.value = ''
        }}
      />
    </div>
  )
}
