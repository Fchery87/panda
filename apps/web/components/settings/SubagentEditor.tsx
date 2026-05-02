'use client'

import * as React from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { Plus, Trash2, Bot } from 'lucide-react'

interface SubagentEditorProps {
  className?: string
}

type SubagentId = Id<'subagents'>

const PRESET_PERMISSIONS = {
  readOnly: {
    tools: {
      read: 'allow',
      glob: 'allow',
      grep: 'allow',
      list: 'allow',
      edit: 'deny',
      write: 'deny',
      bash: 'deny',
    },
  },
  standard: {
    tools: {
      read: 'allow',
      glob: 'allow',
      grep: 'allow',
      list: 'allow',
      edit: 'ask',
      write: 'ask',
      bash: 'ask',
    },
  },
  full: {
    tools: { '*': 'allow' },
    bash: { '*': 'allow' },
  },
}

export function SubagentEditor({ className }: SubagentEditorProps) {
  const subagents = useQuery(api.subagents.list)
  const customSkills = useQuery(api.customSkills.list)
  const addSubagent = useMutation(api.subagents.add)
  const removeSubagent = useMutation(api.subagents.remove)

  const [showAddForm, setShowAddForm] = React.useState(false)
  const [newAgent, setNewAgent] = React.useState({
    name: '',
    description: '',
    prompt: '',
    capabilityPreset: 'assistant' as 'research' | 'assistant' | 'builder' | 'restricted',
    defaultSkillIds: [] as Array<Id<'customSkills'>>,
    skillAutoMatchingEnabled: true,
  })

  const getPermissionsForCapability = (preset: typeof newAgent.capabilityPreset) => {
    if (preset === 'research') return PRESET_PERMISSIONS.readOnly
    if (preset === 'builder') return PRESET_PERMISSIONS.full
    return PRESET_PERMISSIONS.standard
  }

  const handleAdd = async () => {
    if (!newAgent.name.trim() || !newAgent.description.trim()) return

    await addSubagent({
      name: newAgent.name,
      description: newAgent.description,
      prompt: newAgent.prompt || undefined,
      capabilityPreset: newAgent.capabilityPreset,
      defaultSkillIds: newAgent.defaultSkillIds,
      skillAutoMatchingEnabled: newAgent.skillAutoMatchingEnabled,
      permissions: getPermissionsForCapability(newAgent.capabilityPreset),
    })

    setNewAgent({
      name: '',
      description: '',
      prompt: '',
      capabilityPreset: 'assistant',
      defaultSkillIds: [],
      skillAutoMatchingEnabled: true,
    })
    setShowAddForm(false)
  }

  const handleRemove = async (id: SubagentId) => {
    await removeSubagent({ id })
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-mono text-sm font-medium">Custom Subagents</h4>
          <p className="text-xs text-muted-foreground">
            Create specialized agents for specific tasks, invoke with @name
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAddForm(!showAddForm)}
          className="rounded-none font-mono text-xs"
        >
          <Plus className="mr-1 h-3 w-3" />
          Add Agent
        </Button>
      </div>

      {showAddForm && (
        <div className="space-y-3 border border-border p-4">
          <div className="grid gap-3">
            <div>
              <label className="mb-1 block font-mono text-xs">Name *</label>
              <Input
                value={newAgent.name}
                onChange={(e) => setNewAgent((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="my-agent"
                className="rounded-none font-mono text-xs"
              />
            </div>

            <div>
              <label className="mb-1 block font-mono text-xs">Description *</label>
              <Input
                value={newAgent.description}
                onChange={(e) => setNewAgent((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Analyzes code and suggests improvements"
                className="rounded-none font-mono text-xs"
              />
            </div>

            <div>
              <label className="mb-1 block font-mono text-xs">System Prompt (optional)</label>
              <textarea
                value={newAgent.prompt}
                onChange={(e) => setNewAgent((prev) => ({ ...prev, prompt: e.target.value }))}
                placeholder="You are a specialized agent that..."
                className="min-h-[80px] w-full rounded-none border border-border bg-background px-3 py-2 font-mono text-xs"
              />
            </div>

            <div>
              <label className="mb-1 block font-mono text-xs">Capability Preset</label>
              <select
                value={newAgent.capabilityPreset}
                onChange={(e) =>
                  setNewAgent((prev) => ({
                    ...prev,
                    capabilityPreset: e.target.value as typeof newAgent.capabilityPreset,
                  }))
                }
                className="w-full rounded-none border border-border bg-background px-3 py-2 font-mono text-xs"
              >
                <option value="research">Research - Read and search only</option>
                <option value="assistant">Assistant - Ask before writes and commands</option>
                <option value="builder">Builder - Full delegated build capability</option>
                <option value="restricted">Restricted - Admin or project constrained</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block font-mono text-xs">Default attached skills</label>
              <div className="max-h-32 space-y-1 overflow-y-auto border border-border p-2">
                {(customSkills || []).length > 0 ? (
                  customSkills?.map((skill) => (
                    <label key={skill._id} className="flex items-center gap-2 font-mono text-xs">
                      <input
                        type="checkbox"
                        checked={newAgent.defaultSkillIds.includes(skill._id)}
                        onChange={(event) =>
                          setNewAgent((prev) => ({
                            ...prev,
                            defaultSkillIds: event.target.checked
                              ? [...prev.defaultSkillIds, skill._id]
                              : prev.defaultSkillIds.filter((id) => id !== skill._id),
                          }))
                        }
                      />
                      {skill.name}
                    </label>
                  ))
                ) : (
                  <p className="font-mono text-xs text-muted-foreground">No custom skills yet</p>
                )}
              </div>
            </div>

            <label className="flex items-center gap-2 font-mono text-xs">
              <input
                type="checkbox"
                checked={newAgent.skillAutoMatchingEnabled}
                onChange={(event) =>
                  setNewAgent((prev) => ({
                    ...prev,
                    skillAutoMatchingEnabled: event.target.checked,
                  }))
                }
              />
              Allow task-specific skill auto-matching
            </label>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowAddForm(false)
                setNewAgent({
                  name: '',
                  description: '',
                  prompt: '',
                  capabilityPreset: 'assistant',
                  defaultSkillIds: [],
                  skillAutoMatchingEnabled: true,
                })
              }}
              className="rounded-none font-mono text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleAdd}
              disabled={!newAgent.name.trim() || !newAgent.description.trim()}
              className="rounded-none font-mono text-xs"
            >
              Create Agent
            </Button>
          </div>
        </div>
      )}

      {subagents && subagents.length > 0 ? (
        <div className="divide-y divide-border border border-border">
          {subagents.map((agent) => (
            <div key={agent._id} className="flex items-center gap-3 p-3">
              <Bot className="h-4 w-4 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-mono text-sm">{agent.name}</span>
                  <code className="font-mono text-xs text-muted-foreground">
                    @{agent.name.toLowerCase().replace(/\s+/g, '-')}
                  </code>
                </div>
                <div className="truncate font-mono text-xs text-muted-foreground">
                  {agent.description}
                </div>
                <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70">
                  {agent.capabilityPreset ?? 'assistant'} · {agent.defaultSkillIds?.length ?? 0} skills
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemove(agent._id)}
                className="h-7 rounded-none text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="border border-border p-6 text-center">
          <Bot className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
          <p className="font-mono text-xs text-muted-foreground">No custom subagents yet</p>
          <p className="mt-1 font-mono text-xs text-muted-foreground/60">
            Built-in agents: @explore, @general, @review
          </p>
        </div>
      )}

      <div className="bg-surface-2 rounded-none border border-border p-3">
        <p className="font-mono text-xs text-muted-foreground">
          Subagents are specialized AI assistants you can invoke during chat. Use @agent-name to
          delegate tasks.
        </p>
      </div>
    </div>
  )
}
