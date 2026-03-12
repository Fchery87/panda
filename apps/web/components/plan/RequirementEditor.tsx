'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { Plus, Trash2, AlertCircle, Check } from 'lucide-react'
import type { AcceptanceCriterion } from '@/lib/agent/spec/types'
import { createAcceptanceCriterion } from '@/lib/agent/spec/types'

interface RequirementEditorProps {
  requirements: AcceptanceCriterion[]
  onChange: (requirements: AcceptanceCriterion[]) => void
  className?: string
  readOnly?: boolean
}

/**
 * Validates EARS syntax for a requirement
 * EARS format: WHEN <trigger> THE SYSTEM SHALL <behavior>
 */
function validateEARS(trigger: string, behavior: string): { valid: boolean; error?: string } {
  if (!trigger.trim()) {
    return { valid: false, error: 'Trigger is required (WHEN clause)' }
  }
  if (!behavior.trim()) {
    return { valid: false, error: 'Behavior is required (THE SYSTEM SHALL clause)' }
  }
  if (trigger.length < 3) {
    return { valid: false, error: 'Trigger must be at least 3 characters' }
  }
  if (behavior.length < 5) {
    return { valid: false, error: 'Behavior must be at least 5 characters' }
  }
  return { valid: true }
}

/**
 * RequirementEditor - EARS-style requirement editor component
 *
 * Edit EARS-style requirements (WHEN...THE SYSTEM SHALL...)
 * Fields: trigger, behavior, verificationMethod
 * Add/remove/edit requirements
 * Validation for EARS syntax
 */
export function RequirementEditor({
  requirements,
  onChange,
  className,
  readOnly = false,
}: RequirementEditorProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  const handleAdd = useCallback(() => {
    const newRequirement = createAcceptanceCriterion(`req-${Date.now()}`, '', '', 'automated')
    onChange([...requirements, newRequirement])
    setEditingId(newRequirement.id)
  }, [requirements, onChange])

  const handleRemove = useCallback(
    (id: string) => {
      onChange(requirements.filter((r) => r.id !== id))
      if (editingId === id) {
        setEditingId(null)
      }
      setValidationErrors((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
    },
    [requirements, onChange, editingId]
  )

  const handleUpdate = useCallback(
    (id: string, updates: Partial<AcceptanceCriterion>) => {
      const updated = requirements.map((r) => (r.id === id ? { ...r, ...updates } : r))
      onChange(updated)

      // Validate on update
      const req = updated.find((r) => r.id === id)
      if (req) {
        const validation = validateEARS(req.trigger, req.behavior)
        setValidationErrors((prev) => ({
          ...prev,
          [id]: validation.valid ? '' : validation.error || '',
        }))
      }
    },
    [requirements, onChange]
  )

  const handleSave = useCallback(
    (id: string) => {
      const req = requirements.find((r) => r.id === id)
      if (req) {
        const validation = validateEARS(req.trigger, req.behavior)
        if (validation.valid) {
          setEditingId(null)
          setValidationErrors((prev) => {
            const next = { ...prev }
            delete next[id]
            return next
          })
        } else {
          setValidationErrors((prev) => ({
            ...prev,
            [id]: validation.error || 'Invalid requirement',
          }))
        }
      }
    },
    [requirements]
  )

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Requirements ({requirements.length})
        </h3>
        {!readOnly && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleAdd}
            className="h-7 rounded-none border-border font-mono text-xs"
          >
            <Plus className="mr-1 h-3 w-3" />
            Add Requirement
          </Button>
        )}
      </div>

      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {requirements.map((req, index) => (
            <motion.div
              key={req.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className={cn(
                'border border-border',
                editingId === req.id && 'border-primary/50',
                validationErrors[req.id] && 'border-destructive/50'
              )}
            >
              {editingId === req.id && !readOnly ? (
                // Edit Mode
                <div className="space-y-3 p-3">
                  <div className="space-y-2">
                    <Label className="font-mono text-xs uppercase tracking-wide">
                      WHEN (Trigger)
                    </Label>
                    <Input
                      value={req.trigger}
                      onChange={(e) => handleUpdate(req.id, { trigger: e.target.value })}
                      placeholder="e.g., the user submits the form"
                      className="rounded-none border-border font-mono text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="font-mono text-xs uppercase tracking-wide">
                      THE SYSTEM SHALL (Behavior)
                    </Label>
                    <Input
                      value={req.behavior}
                      onChange={(e) => handleUpdate(req.id, { behavior: e.target.value })}
                      placeholder="e.g., validate all input fields"
                      className="rounded-none border-border font-mono text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="font-mono text-xs uppercase tracking-wide">
                      Verification Method
                    </Label>
                    <Select
                      value={req.verificationMethod}
                      onValueChange={(value: 'automated' | 'llm-judge' | 'manual') =>
                        handleUpdate(req.id, { verificationMethod: value })
                      }
                    >
                      <SelectTrigger className="rounded-none border-border font-mono text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-none">
                        <SelectItem value="automated">Automated</SelectItem>
                        <SelectItem value="llm-judge">LLM Judge</SelectItem>
                        <SelectItem value="manual">Manual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {validationErrors[req.id] && (
                    <div className="flex items-center gap-2 text-destructive">
                      <AlertCircle className="h-3 w-3" />
                      <span className="font-mono text-xs">{validationErrors[req.id]}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      size="sm"
                      onClick={() => handleSave(req.id)}
                      className="h-7 rounded-none font-mono text-xs"
                    >
                      <Check className="mr-1 h-3 w-3" />
                      Save
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingId(null)}
                      className="h-7 rounded-none font-mono text-xs"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                // View Mode
                <div
                  className={cn(
                    'flex items-start gap-3 p-3',
                    !readOnly && 'cursor-pointer hover:bg-muted/30'
                  )}
                  onClick={() => !readOnly && setEditingId(req.id)}
                >
                  <span className="mt-0.5 font-mono text-xs text-muted-foreground">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm">
                      WHEN{' '}
                      <span className="font-medium text-primary">
                        {req.trigger || '(no trigger)'}
                      </span>{' '}
                      THE SYSTEM SHALL{' '}
                      <span className="font-medium text-primary">
                        {req.behavior || '(no behavior)'}
                      </span>
                    </p>
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'border px-1.5 py-0.5 font-mono text-[10px] uppercase',
                          req.verificationMethod === 'automated' &&
                            'border-success/50 bg-success/5 text-success',
                          req.verificationMethod === 'llm-judge' &&
                            'border-primary/50 bg-primary/5 text-primary',
                          req.verificationMethod === 'manual' &&
                            'border-border bg-muted/50 text-muted-foreground'
                        )}
                      >
                        {req.verificationMethod}
                      </span>
                      <span
                        className={cn(
                          'font-mono text-[10px] uppercase',
                          req.status === 'passed' && 'text-success',
                          req.status === 'failed' && 'text-destructive',
                          req.status === 'pending' && 'text-muted-foreground',
                          req.status === 'skipped' && 'text-muted-foreground/50'
                        )}
                      >
                        {req.status}
                      </span>
                    </div>
                  </div>
                  {!readOnly && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRemove(req.id)
                      }}
                      className="h-7 w-7 shrink-0 rounded-none text-muted-foreground hover:text-destructive"
                      aria-label={`Remove requirement ${index + 1}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {requirements.length === 0 && (
          <div className="flex h-24 flex-col items-center justify-center border border-dashed border-border">
            <p className="font-mono text-xs text-muted-foreground">No requirements defined</p>
            {!readOnly && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleAdd}
                className="mt-2 h-7 rounded-none font-mono text-xs"
              >
                <Plus className="mr-1 h-3 w-3" />
                Add your first requirement
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
