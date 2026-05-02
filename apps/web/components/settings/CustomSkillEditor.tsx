'use client'

import * as React from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { Plus, Sparkles, Trash2 } from 'lucide-react'

interface CustomSkillEditorProps {
  className?: string
}

type CustomSkillId = Id<'customSkills'>

const CHAT_MODES = ['ask', 'plan', 'code', 'build'] as const

export function CustomSkillEditor({ className }: CustomSkillEditorProps) {
  const customSkills = useQuery(api.customSkills.list)
  const addCustomSkill = useMutation(api.customSkills.add)
  const removeCustomSkill = useMutation(api.customSkills.remove)

  const [showAddForm, setShowAddForm] = React.useState(false)
  const [newSkill, setNewSkill] = React.useState({
    name: '',
    description: '',
    triggerPhrases: '',
    applicableModes: ['code', 'build'] as Array<(typeof CHAT_MODES)[number]>,
    profile: 'soft_guidance' as 'soft_guidance' | 'strict_workflow',
    instructions: '',
    checklist: '',
    requiredValidation: '',
    suggestedSubagents: '',
    autoActivationEnabled: true,
  })

  const resetForm = () => {
    setNewSkill({
      name: '',
      description: '',
      triggerPhrases: '',
      applicableModes: ['code', 'build'],
      profile: 'soft_guidance',
      instructions: '',
      checklist: '',
      requiredValidation: '',
      suggestedSubagents: '',
      autoActivationEnabled: true,
    })
  }

  const parseLines = (value: string) =>
    value
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)

  const handleModeToggle = (mode: (typeof CHAT_MODES)[number]) => {
    setNewSkill((prev) => ({
      ...prev,
      applicableModes: prev.applicableModes.includes(mode)
        ? prev.applicableModes.filter((item) => item !== mode)
        : [...prev.applicableModes, mode],
    }))
  }

  const handleAdd = async () => {
    if (!newSkill.name.trim() || !newSkill.description.trim() || !newSkill.instructions.trim())
      return

    await addCustomSkill({
      name: newSkill.name.trim(),
      description: newSkill.description.trim(),
      triggerPhrases: parseLines(newSkill.triggerPhrases),
      applicableModes: newSkill.applicableModes,
      profile: newSkill.profile,
      instructions: newSkill.instructions.trim(),
      checklist: parseLines(newSkill.checklist),
      requiredValidation: parseLines(newSkill.requiredValidation),
      suggestedSubagents: parseLines(newSkill.suggestedSubagents),
      autoActivationEnabled: newSkill.autoActivationEnabled,
    })

    resetForm()
    setShowAddForm(false)
  }

  const handleRemove = async (id: CustomSkillId) => {
    await removeCustomSkill({ id })
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-mono text-sm font-medium">Custom Skills</h4>
          <p className="text-xs text-muted-foreground">
            Create reusable workflow guidance that auto-activates by intent.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAddForm(!showAddForm)}
          className="rounded-none font-mono text-xs"
        >
          <Plus className="mr-1 h-3 w-3" />
          Add Skill
        </Button>
      </div>

      {showAddForm && (
        <div className="space-y-3 border border-border p-4">
          <div className="grid gap-3">
            <div>
              <label className="mb-1 block font-mono text-xs">Name *</label>
              <Input
                value={newSkill.name}
                onChange={(event) => setNewSkill((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="tdd-bugfix"
                className="rounded-none font-mono text-xs"
              />
            </div>
            <div>
              <label className="mb-1 block font-mono text-xs">Description *</label>
              <Input
                value={newSkill.description}
                onChange={(event) =>
                  setNewSkill((prev) => ({ ...prev, description: event.target.value }))
                }
                placeholder="Requires a failing regression test before bug fixes"
                className="rounded-none font-mono text-xs"
              />
            </div>
            <div>
              <label className="mb-1 block font-mono text-xs">Trigger phrases</label>
              <textarea
                value={newSkill.triggerPhrases}
                onChange={(event) =>
                  setNewSkill((prev) => ({ ...prev, triggerPhrases: event.target.value }))
                }
                placeholder="tdd workflow&#10;test first"
                className="min-h-[64px] w-full rounded-none border border-border bg-background px-3 py-2 font-mono text-xs"
              />
            </div>
            <div className="grid gap-2">
              <label className="font-mono text-xs">Applicable modes</label>
              <div className="flex flex-wrap gap-2">
                {CHAT_MODES.map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => handleModeToggle(mode)}
                    className={cn(
                      'border border-border px-2 py-1 font-mono text-xs uppercase',
                      newSkill.applicableModes.includes(mode)
                        ? 'bg-primary text-primary-foreground'
                        : ''
                    )}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1 block font-mono text-xs">Profile</label>
              <select
                value={newSkill.profile}
                onChange={(event) =>
                  setNewSkill((prev) => ({
                    ...prev,
                    profile: event.target.value as 'soft_guidance' | 'strict_workflow',
                  }))
                }
                className="w-full rounded-none border border-border bg-background px-3 py-2 font-mono text-xs"
              >
                <option value="soft_guidance">Soft guidance</option>
                <option value="strict_workflow">Strict workflow</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block font-mono text-xs">Instructions *</label>
              <textarea
                value={newSkill.instructions}
                onChange={(event) =>
                  setNewSkill((prev) => ({ ...prev, instructions: event.target.value }))
                }
                placeholder="Follow this workflow when the skill applies..."
                className="min-h-[96px] w-full rounded-none border border-border bg-background px-3 py-2 font-mono text-xs"
              />
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <textarea
                aria-label="Checklist"
                value={newSkill.checklist}
                onChange={(event) =>
                  setNewSkill((prev) => ({ ...prev, checklist: event.target.value }))
                }
                placeholder="Checklist items"
                className="min-h-[72px] rounded-none border border-border bg-background px-3 py-2 font-mono text-xs"
              />
              <textarea
                aria-label="Required validation"
                value={newSkill.requiredValidation}
                onChange={(event) =>
                  setNewSkill((prev) => ({ ...prev, requiredValidation: event.target.value }))
                }
                placeholder="Required validation"
                className="min-h-[72px] rounded-none border border-border bg-background px-3 py-2 font-mono text-xs"
              />
              <textarea
                aria-label="Suggested Subagents"
                value={newSkill.suggestedSubagents}
                onChange={(event) =>
                  setNewSkill((prev) => ({ ...prev, suggestedSubagents: event.target.value }))
                }
                placeholder="Suggested Subagents"
                className="min-h-[72px] rounded-none border border-border bg-background px-3 py-2 font-mono text-xs"
              />
            </div>
            <label className="flex items-center gap-2 font-mono text-xs">
              <input
                type="checkbox"
                checked={newSkill.autoActivationEnabled}
                onChange={(event) =>
                  setNewSkill((prev) => ({ ...prev, autoActivationEnabled: event.target.checked }))
                }
              />
              Auto-activate when trigger language matches
            </label>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowAddForm(false)
                resetForm()
              }}
              className="rounded-none font-mono text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleAdd}
              disabled={
                !newSkill.name.trim() ||
                !newSkill.description.trim() ||
                !newSkill.instructions.trim()
              }
              className="rounded-none font-mono text-xs"
            >
              Create Skill
            </Button>
          </div>
        </div>
      )}

      {customSkills && customSkills.length > 0 ? (
        <div className="divide-y divide-border border border-border">
          {customSkills.map((skill) => (
            <div key={skill._id} className="flex items-center gap-3 p-3">
              <Sparkles className="h-4 w-4 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-mono text-sm">{skill.name}</span>
                  <code className="font-mono text-xs text-muted-foreground">{skill.profile}</code>
                </div>
                <div className="truncate font-mono text-xs text-muted-foreground">
                  {skill.description}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemove(skill._id)}
                className="h-7 rounded-none text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="border border-border p-6 text-center">
          <Sparkles className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
          <p className="font-mono text-xs text-muted-foreground">No custom skills yet</p>
        </div>
      )}
    </div>
  )
}
