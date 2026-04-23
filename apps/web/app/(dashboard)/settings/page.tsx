'use client'

import * as React from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ProviderCard } from '@/components/settings/ProviderCard'
import { ConnectProvider } from '@/components/settings/ConnectProvider'
import { ThemeToggleFull } from '@/components/settings/ThemeToggle'
import { AgentDefaultsEditor } from '@/components/settings/AgentDefaultsEditor'
import { MCPServerEditor } from '@/components/settings/MCPServerEditor'
import { SubagentEditor } from '@/components/settings/SubagentEditor'
import { UserLLMConfig } from '@/components/settings/UserLLMConfig'
import { ProviderCatalogModal } from '@/components/settings/ProviderCatalogModal'
import { getDefaultProviderCapabilities, type ProviderType } from '@/lib/llm/types'
import {
  useSettingsForm,
  languages,
  defaultProviders,
  type ProviderConfig,
} from '@/hooks/useSettingsForm'
import { User, Palette, Bot, Settings2, Plus, X, ArrowLeft, Cpu } from 'lucide-react'
import type { SettingsTab } from '@/lib/settings-navigation'

const sidebarItems: { id: SettingsTab; label: string; icon: React.ElementType }[] = [
  { id: 'general', label: 'General', icon: User },
  { id: 'providers', label: 'LLM Providers', icon: Bot },
  { id: 'automation', label: 'Automation', icon: Cpu },
  { id: 'advanced', label: 'Advanced', icon: Settings2 },
]

export default function SettingsPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [showLeaveDialog, setShowLeaveDialog] = React.useState(false)

  const {
    formState,
    agentDefaults,
    setAgentDefaults,
    freshProviders,
    isDirty,
    isSaving,
    activeTab,
    setActiveTab,
    adminDefaults,
    catalogModalOpen,
    setCatalogModalOpen,
    refreshingModels,
    updateProvider,
    addProviderFromCatalog,
    removeProvider,
    refreshModelsFromApi,
    testProvider,
    testProviderCompletion,
    handleSave,
    handleDiscard,
    updateFormState,
  } = useSettingsForm(pathname, searchParams, router)

  const allowUserMcp = adminDefaults?.allowUserMCP !== false
  const allowUserSubagents = adminDefaults?.allowUserSubagents !== false

  const handleBackToProjects = () => {
    if (isDirty) {
      setShowLeaveDialog(true)
      return
    }
    router.push('/projects')
  }

  return (
    <>
      <div className="mx-auto flex max-w-6xl gap-0 px-4 py-6 lg:gap-8">
        {/* Sidebar Navigation */}
        <nav className="hidden w-52 shrink-0 lg:block" aria-label="Settings sections">
          <div className="surface-1 sticky top-24 space-y-1 border border-border p-4">
            <Button
              variant="ghost"
              size="sm"
              className="-ml-2 mb-4 text-muted-foreground hover:text-foreground"
              onClick={handleBackToProjects}
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back to Projects
            </Button>

            <div className="mb-4 flex items-center gap-3 border-b border-border pb-4">
              <span className="h-px w-6 bg-primary" />
              <span className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Configuration
              </span>
            </div>
            <h1 className="mb-6 text-2xl font-bold tracking-tight">Settings</h1>

            {sidebarItems.map((item) => {
              const Icon = item.icon
              const isActive = activeTab === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-none border px-3 py-2 text-left font-mono text-sm transition-colors',
                    isActive
                      ? 'border-primary/40 bg-primary/10 text-primary'
                      : 'border-transparent text-muted-foreground hover:border-border hover:bg-accent hover:text-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              )
            })}
          </div>
        </nav>

        {/* Mobile Navigation */}
        <div className="mb-6 w-full lg:hidden">
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2 mb-4 text-muted-foreground hover:text-foreground"
            onClick={handleBackToProjects}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Projects
          </Button>

          <div className="mb-4 flex items-center gap-3">
            <span className="h-px w-6 bg-primary" />
            <span className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Configuration
            </span>
          </div>
          <h1 className="mb-4 text-2xl font-bold tracking-tight">Settings</h1>

          <div className="flex gap-1 overflow-x-auto border-b border-border pb-px">
            {sidebarItems.map((item) => {
              const Icon = item.icon
              const isActive = activeTab === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={cn(
                    'flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 font-mono text-sm transition-colors',
                    isActive
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className="min-w-0 flex-1">
          {isDirty && (
            <div className="mb-4 border border-primary/30 bg-primary/5 px-3 py-2 font-mono text-xs uppercase tracking-[0.18em] text-primary">
              Unsaved changes ready to review
            </div>
          )}

          {/* General Section */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <Card className="rounded-none">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    General
                  </CardTitle>
                  <CardDescription>
                    Language, default model, and workspace preferences.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="language">Language</Label>
                    <Select
                      value={formState.language}
                      onValueChange={(value) => updateFormState({ language: value })}
                    >
                      <SelectTrigger id="language" className="w-full max-w-sm rounded-none">
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                      <SelectContent>
                        {languages.map((lang) => (
                          <SelectItem key={lang.value} value={lang.value}>
                            {lang.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  <UserLLMConfig
                    adminDefaults={adminDefaults}
                    userSettings={{
                      defaultProvider: formState.defaultProvider,
                      defaultModel: formState.defaultModel,
                      overrideGlobalProvider: formState.overrideGlobalProvider,
                      overrideGlobalModel: formState.overrideGlobalModel,
                      providers: formState.providers,
                    }}
                    onUpdate={(config) => {
                      updateFormState(config)
                    }}
                    availableProviders={Object.fromEntries(
                      Object.entries(freshProviders).map(([key, p]) => [
                        key,
                        {
                          name: p.name || key,
                          availableModels: p.availableModels || [],
                          enabled: p.enabled === true,
                        },
                      ])
                    )}
                  />
                </CardContent>
              </Card>

              <Card className="rounded-none">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="h-5 w-5" />
                    Appearance
                  </CardTitle>
                  <CardDescription>
                    Switch between light, dark, and system-matched themes.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <Label>Theme</Label>
                    <ThemeToggleFull
                      value={formState.theme}
                      onChange={(theme) => updateFormState({ theme })}
                    />
                    <p className="text-sm text-muted-foreground">
                      Choose your preferred color scheme. System will follow your OS preference.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* LLM Providers Section */}
          {activeTab === 'providers' && (
            <div className="space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-medium">LLM Providers</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Add API keys for the providers you want to use. Panda supports any
                    OpenAI-compatible endpoint.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 rounded-none font-mono"
                  onClick={() => setCatalogModalOpen(true)}
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  Add Provider
                </Button>
              </div>

              <ProviderCatalogModal
                open={catalogModalOpen}
                onOpenChange={setCatalogModalOpen}
                configuredProviderIds={Object.keys(formState.providers)}
                onSelectProvider={addProviderFromCatalog}
              />

              <div className="space-y-3">
                {Object.entries(freshProviders).map(([key, provider]) => {
                  const resolvedProvider: ProviderConfig = {
                    ...defaultProviders[key],
                    ...provider,
                    name: provider.name || defaultProviders[key]?.name || key,
                    description:
                      provider.description ||
                      defaultProviders[key]?.description ||
                      provider.name ||
                      key,
                    enabled: provider.enabled === true,
                    availableModels: provider.availableModels || [],
                    apiKey: provider.apiKey || '',
                    defaultModel:
                      provider.defaultModel ||
                      provider.availableModels?.[0] ||
                      defaultProviders[key]?.defaultModel ||
                      '',
                  }
                  const providerType = (provider.provider || key) as ProviderType
                  const supportsReasoning =
                    getDefaultProviderCapabilities(providerType).supportsReasoning
                  return (
                    <div key={key} className="relative">
                      <ProviderCard
                        provider={resolvedProvider}
                        supportsReasoning={supportsReasoning}
                        onChange={(updates) => updateProvider(key, updates)}
                        onTest={() => testProvider(key)}
                        onTestCompletion={
                          key === 'chutes' ? () => testProviderCompletion(key) : undefined
                        }
                        onRefreshModels={
                          provider.baseUrl ? () => refreshModelsFromApi(key) : undefined
                        }
                        refreshingModels={refreshingModels === key}
                      />
                      {!defaultProviders[key] && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute right-2 top-2"
                          onClick={() => removeProvider(key)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  )
                })}
              </div>

              <Card className="rounded-none">
                <CardHeader>
                  <CardTitle>OAuth Connections</CardTitle>
                  <CardDescription>
                    Authenticate with providers using OAuth instead of manual API keys.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ConnectProvider provider="chutes" />
                </CardContent>
              </Card>
            </div>
          )}

          {/* Automation Section */}
          {activeTab === 'automation' && (
            <div className="space-y-6">
              <Card className="rounded-none">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Cpu className="h-5 w-5" />
                    Automation Defaults
                  </CardTitle>
                  <CardDescription>
                    Default agent behavior for new projects. These can be overridden per-project.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AgentDefaultsEditor value={agentDefaults} onChange={setAgentDefaults} />
                </CardContent>
              </Card>
            </div>
          )}

          {/* Advanced Section */}
          {activeTab === 'advanced' && (
            <div className="space-y-6">
              <Card className="rounded-none">
                <CardHeader>
                  <CardTitle>MCP Servers</CardTitle>
                  <CardDescription>
                    Connect external tools and data sources via the Model Context Protocol.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {allowUserMcp ? (
                    <MCPServerEditor />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      MCP access is disabled by your admin.
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-none">
                <CardHeader>
                  <CardTitle>Custom Subagents</CardTitle>
                  <CardDescription>
                    Define specialized agents for repetitive or domain-specific tasks.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {allowUserSubagents ? (
                    <SubagentEditor />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Custom subagents are disabled by your admin.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Sticky Save Bar */}
      {isDirty && (
        <div className="sticky bottom-0 z-10 border-t border-border bg-background/95 px-6 py-3 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between">
            <p className="font-mono text-sm text-muted-foreground">You have unsaved changes</p>
            <div className="flex gap-3">
              <Button variant="outline" className="rounded-none font-mono" onClick={handleDiscard}>
                Discard
              </Button>
              <Button className="rounded-none font-mono" onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <Dialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <DialogContent className="rounded-none font-mono">
          <DialogHeader>
            <DialogTitle>Unsaved Changes</DialogTitle>
            <DialogDescription>
              You have unsaved changes. Are you sure you want to leave?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-none"
              onClick={() => setShowLeaveDialog(false)}
            >
              Stay
            </Button>
            <Button
              variant="destructive"
              className="rounded-none"
              onClick={() => router.push('/projects')}
            >
              Leave Without Saving
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
