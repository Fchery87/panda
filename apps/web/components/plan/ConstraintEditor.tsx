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
import { Plus, Trash2, Target, ListChecks, Zap, Shield, AlertCircle, Check } from 'lucide-react'
import type { Constraint } from '@/lib/agent/spec/types'
import {
  createStructuralConstraint,
  createBehavioralConstraint,
  createPerformanceConstraint,
  createCompatibilityConstraint,
  createSecurityConstraint,
} from '@/lib/agent/spec/types'

type ConstraintType = Constraint['type']

interface ConstraintEditorProps {
  constraints: Constraint[]
  onChange: (constraints: Constraint[]) => void
  className?: string
  readOnly?: boolean
}

const constraintTypeConfig: Record<
  ConstraintType,
  {
    label: string
    icon: React.ReactNode
    description: string
    colorClass: string
  }
> = {
  structural: {
    label: 'Structural',
    icon: <Target className="h-3.5 w-3.5" />,
    description: 'Code structure and organization constraints',
    colorClass: 'text-blue-500',
  },
  behavioral: {
    label: 'Behavioral',
    icon: <ListChecks className="h-3.5 w-3.5" />,
    description: 'Functional behavior and logic constraints',
    colorClass: 'text-green-500',
  },
  performance: {
    label: 'Performance',
    icon: <Zap className="h-3.5 w-3.5" />,
    description: 'Performance metrics and thresholds',
    colorClass: 'text-yellow-500',
  },
  compatibility: {
    label: 'Compatibility',
    icon: <Shield className="h-3.5 w-3.5" />,
    description: 'Compatibility and integration constraints',
    colorClass: 'text-purple-500',
  },
  security: {
    label: 'Security',
    icon: <Shield className="h-3.5 w-3.5" />,
    description: 'Security requirements and standards',
    colorClass: 'text-red-500',
  },
}

/**
 * ConstraintEditor - Typed constraint editor component
 *
 * Edit typed constraints (structural, behavioral, performance, compatibility, security)
 * Type selector dropdown
 * Dynamic fields based on constraint type
 * Add/remove/edit constraints
 */
export function ConstraintEditor({
  constraints,
  onChange,
  className,
  readOnly = false,
}: ConstraintEditorProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [validationErrors, setValidationErrors] = useState<Record<number, string>>({})

  const validateConstraint = useCallback(
    (constraint: Constraint): { valid: boolean; error?: string } => {
      switch (constraint.type) {
        case 'structural':
          if (!constraint.rule.trim()) return { valid: false, error: 'Rule is required' }
          if (!constraint.target.trim()) return { valid: false, error: 'Target is required' }
          break
        case 'behavioral':
          if (!constraint.rule.trim()) return { valid: false, error: 'Rule is required' }
          if (!constraint.assertion.trim()) return { valid: false, error: 'Assertion is required' }
          break
        case 'performance':
          if (!constraint.metric.trim()) return { valid: false, error: 'Metric is required' }
          if (constraint.threshold <= 0)
            return { valid: false, error: 'Threshold must be positive' }
          if (!constraint.unit.trim()) return { valid: false, error: 'Unit is required' }
          break
        case 'compatibility':
          if (!constraint.requirement.trim())
            return { valid: false, error: 'Requirement is required' }
          if (!constraint.scope.trim()) return { valid: false, error: 'Scope is required' }
          break
        case 'security':
          if (!constraint.requirement.trim())
            return { valid: false, error: 'Requirement is required' }
          break
      }
      return { valid: true }
    },
    []
  )

  const handleAdd = useCallback(
    (type: ConstraintType) => {
      let newConstraint: Constraint
      switch (type) {
        case 'structural':
          newConstraint = createStructuralConstraint('', '')
          break
        case 'behavioral':
          newConstraint = createBehavioralConstraint('', '')
          break
        case 'performance':
          newConstraint = createPerformanceConstraint('', 0, '')
          break
        case 'compatibility':
          newConstraint = createCompatibilityConstraint('', '')
          break
        case 'security':
          newConstraint = createSecurityConstraint('')
          break
      }
      const newIndex = constraints.length
      onChange([...constraints, newConstraint])
      setEditingIndex(newIndex)
    },
    [constraints, onChange]
  )

  const handleRemove = useCallback(
    (index: number) => {
      onChange(constraints.filter((_, i) => i !== index))
      if (editingIndex === index) {
        setEditingIndex(null)
      } else if (editingIndex !== null && editingIndex > index) {
        setEditingIndex(editingIndex - 1)
      }
      setValidationErrors((prev) => {
        const next: Record<number, string> = {}
        Object.entries(prev).forEach(([key, value]) => {
          const keyNum = parseInt(key, 10)
          if (keyNum < index) {
            next[keyNum] = value
          } else if (keyNum > index) {
            next[keyNum - 1] = value
          }
        })
        return next
      })
    },
    [constraints, onChange, editingIndex]
  )

  const handleUpdate = useCallback(
    (index: number, updates: Partial<Constraint>) => {
      const updated = constraints.map((c, i) =>
        i === index ? { ...c, ...updates } : c
      ) as Constraint[]
      onChange(updated)

      // Validate on update
      const constraint = updated[index]
      const validation = validateConstraint(constraint)
      setValidationErrors((prev) => ({
        ...prev,
        [index]: validation.valid ? '' : validation.error || '',
      }))
    },
    [constraints, onChange, validateConstraint]
  )

  const handleSave = useCallback(
    (index: number) => {
      const constraint = constraints[index]
      const validation = validateConstraint(constraint)
      if (validation.valid) {
        setEditingIndex(null)
        setValidationErrors((prev) => {
          const next = { ...prev }
          delete next[index]
          return next
        })
      } else {
        setValidationErrors((prev) => ({
          ...prev,
          [index]: validation.error || 'Invalid constraint',
        }))
      }
    },
    [constraints, validateConstraint]
  )

  const renderConstraintFields = (constraint: Constraint, index: number) => {
    switch (constraint.type) {
      case 'structural':
        return (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="font-mono text-xs uppercase tracking-wide">Rule</Label>
              <Input
                value={constraint.rule}
                onChange={(e) => handleUpdate(index, { rule: e.target.value })}
                placeholder="e.g., No new runtime dependencies"
                className="rounded-none border-border font-mono text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-mono text-xs uppercase tracking-wide">Target</Label>
              <Input
                value={constraint.target}
                onChange={(e) => handleUpdate(index, { target: e.target.value })}
                placeholder="e.g., package.json"
                className="rounded-none border-border font-mono text-sm"
              />
            </div>
          </div>
        )
      case 'behavioral':
        return (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="font-mono text-xs uppercase tracking-wide">Rule</Label>
              <Input
                value={constraint.rule}
                onChange={(e) => handleUpdate(index, { rule: e.target.value })}
                placeholder="e.g., Input must be validated"
                className="rounded-none border-border font-mono text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-mono text-xs uppercase tracking-wide">Assertion</Label>
              <Input
                value={constraint.assertion}
                onChange={(e) => handleUpdate(index, { assertion: e.target.value })}
                placeholder="e.g., regex match or function call"
                className="rounded-none border-border font-mono text-sm"
              />
            </div>
          </div>
        )
      case 'performance':
        return (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="font-mono text-xs uppercase tracking-wide">Metric</Label>
              <Input
                value={constraint.metric}
                onChange={(e) => handleUpdate(index, { metric: e.target.value })}
                placeholder="e.g., Response time"
                className="rounded-none border-border font-mono text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="font-mono text-xs uppercase tracking-wide">Threshold</Label>
                <Input
                  type="number"
                  value={constraint.threshold}
                  onChange={(e) =>
                    handleUpdate(index, { threshold: parseFloat(e.target.value) || 0 })
                  }
                  placeholder="e.g., 500"
                  className="rounded-none border-border font-mono text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-mono text-xs uppercase tracking-wide">Unit</Label>
                <Input
                  value={constraint.unit}
                  onChange={(e) => handleUpdate(index, { unit: e.target.value })}
                  placeholder="e.g., ms"
                  className="rounded-none border-border font-mono text-sm"
                />
              </div>
            </div>
          </div>
        )
      case 'compatibility':
        return (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="font-mono text-xs uppercase tracking-wide">Requirement</Label>
              <Input
                value={constraint.requirement}
                onChange={(e) => handleUpdate(index, { requirement: e.target.value })}
                placeholder="e.g., Backward compatible with v1 API"
                className="rounded-none border-border font-mono text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-mono text-xs uppercase tracking-wide">Scope</Label>
              <Input
                value={constraint.scope}
                onChange={(e) => handleUpdate(index, { scope: e.target.value })}
                placeholder="e.g., All public endpoints"
                className="rounded-none border-border font-mono text-sm"
              />
            </div>
          </div>
        )
      case 'security':
        return (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="font-mono text-xs uppercase tracking-wide">Requirement</Label>
              <Input
                value={constraint.requirement}
                onChange={(e) => handleUpdate(index, { requirement: e.target.value })}
                placeholder="e.g., All inputs must be sanitized"
                className="rounded-none border-border font-mono text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-mono text-xs uppercase tracking-wide">
                Standard (Optional)
              </Label>
              <Input
                value={constraint.standard || ''}
                onChange={(e) => handleUpdate(index, { standard: e.target.value })}
                placeholder="e.g., OWASP Top 10"
                className="rounded-none border-border font-mono text-sm"
              />
            </div>
          </div>
        )
    }
  }

  const getConstraintSummary = (constraint: Constraint): string => {
    switch (constraint.type) {
      case 'structural':
        return `${constraint.rule} → ${constraint.target}`
      case 'behavioral':
        return `${constraint.rule}`
      case 'performance':
        return `${constraint.metric}: ${constraint.threshold}${constraint.unit}`
      case 'compatibility':
        return `${constraint.requirement}`
      case 'security':
        return `${constraint.requirement}${constraint.standard ? ` (${constraint.standard})` : ''}`
    }
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Constraints ({constraints.length})
        </h3>
        {!readOnly && (
          <Select onValueChange={(value: ConstraintType) => handleAdd(value)}>
            <SelectTrigger className="h-7 w-auto rounded-none border-border font-mono text-xs">
              <Plus className="mr-1 h-3 w-3" />
              <SelectValue placeholder="Add constraint" />
            </SelectTrigger>
            <SelectContent className="rounded-none">
              {(Object.keys(constraintTypeConfig) as ConstraintType[]).map((type) => (
                <SelectItem key={type} value={type} className="font-mono text-xs">
                  <div className="flex items-center gap-2">
                    {constraintTypeConfig[type].icon}
                    <span>{constraintTypeConfig[type].label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {constraints.map((constraint, index) => {
            const isEditing = editingIndex === index
            const constraintConfig = constraintTypeConfig[constraint.type]

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  'border border-border',
                  isEditing && 'border-primary/50',
                  validationErrors[index] && 'border-destructive/50'
                )}
              >
                {isEditing && !readOnly ? (
                  // Edit Mode
                  <div className="space-y-3 p-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'flex items-center gap-1.5 font-mono text-xs',
                          constraintConfig.colorClass
                        )}
                      >
                        {constraintConfig.icon}
                        {constraintConfig.label}
                      </span>
                    </div>

                    {renderConstraintFields(constraint, index)}

                    {validationErrors[index] && (
                      <div className="flex items-center gap-2 text-destructive">
                        <AlertCircle className="h-3 w-3" />
                        <span className="font-mono text-xs">{validationErrors[index]}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-2">
                      <Button
                        size="sm"
                        onClick={() => handleSave(index)}
                        className="h-7 rounded-none font-mono text-xs"
                      >
                        <Check className="mr-1 h-3 w-3" />
                        Save
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingIndex(null)}
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
                    onClick={() => !readOnly && setEditingIndex(index)}
                  >
                    <span className={cn('mt-0.5 shrink-0', constraintConfig.colorClass)}>
                      {constraintConfig.icon}
                    </span>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                          {constraintConfig.label}
                        </span>
                      </div>
                      <p className="text-sm">{getConstraintSummary(constraint)}</p>
                    </div>
                    {!readOnly && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRemove(index)
                        }}
                        className="h-7 w-7 shrink-0 rounded-none text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                )}
              </motion.div>
            )
          })}
        </AnimatePresence>

        {constraints.length === 0 && (
          <div className="flex h-24 flex-col items-center justify-center border border-dashed border-border">
            <p className="font-mono text-xs text-muted-foreground">No constraints defined</p>
            {!readOnly && (
              <Select onValueChange={(value: ConstraintType) => handleAdd(value)}>
                <SelectTrigger className="mt-2 h-7 w-auto rounded-none border-border font-mono text-xs">
                  <Plus className="mr-1 h-3 w-3" />
                  <SelectValue placeholder="Add your first constraint" />
                </SelectTrigger>
                <SelectContent className="rounded-none">
                  {(Object.keys(constraintTypeConfig) as ConstraintType[]).map((type) => (
                    <SelectItem key={type} value={type} className="font-mono text-xs">
                      {constraintTypeConfig[type].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
