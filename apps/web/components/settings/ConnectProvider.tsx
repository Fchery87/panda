'use client'

import { useState, useCallback } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ConnectProviderProps {
  provider: 'chutes' | 'deepseek' | 'groq' | 'fireworks'
  className?: string
}

const PROVIDER_CONFIG: Record<
  string,
  {
    name: string
    description: string
    oauthUrl?: string
    scopes?: string[]
    supportsOAuth: boolean
  }
> = {
  chutes: {
    name: 'Chutes.ai',
    description: 'Decentralized AI model serving',
    oauthUrl: 'https://chutes.ai/idp/authorize',
    scopes: ['chutes:read', 'chutes:execute'],
    supportsOAuth: true,
  },
  deepseek: {
    name: 'DeepSeek',
    description: 'Advanced reasoning AI models',
    supportsOAuth: false,
  },
  groq: {
    name: 'Groq',
    description: 'Ultra-fast LLM inference',
    supportsOAuth: false,
  },
  fireworks: {
    name: 'Fireworks AI',
    description: 'Fast inference with fine-tuning',
    supportsOAuth: false,
  },
}

export function ConnectProvider({ provider, className }: ConnectProviderProps) {
  const [isConnecting, setIsConnecting] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [showApiKeyInput, setShowApiKeyInput] = useState(false)

  const storeTokens = useMutation(api.providers.storeProviderTokens)
  const deleteTokens = useMutation(api.providers.deleteProviderTokens)
  const tokens = useQuery(api.providers.getProviderTokens, { provider })

  const config = PROVIDER_CONFIG[provider]
  const isConnected = tokens && !tokens.expired
  const isExpired = tokens?.expired

  const handleOAuthConnect = useCallback(() => {
    const clientId = process.env.NEXT_PUBLIC_CHUTES_CLIENT_ID
    const redirectUri = `${window.location.origin}/api/auth/chutes/callback`

    const params = new URLSearchParams({
      client_id: clientId || '',
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: config.scopes?.join(' ') || '',
    })

    window.location.href = `${config.oauthUrl}?${params}`
  }, [config])

  const handleApiKeyConnect = useCallback(async () => {
    if (!apiKey.trim()) return

    setIsConnecting(true)
    try {
      await storeTokens({
        provider,
        accessToken: apiKey.trim(),
      })
      setApiKey('')
      setShowApiKeyInput(false)
    } catch (error) {
      console.error('Failed to store API key:', error)
    } finally {
      setIsConnecting(false)
    }
  }, [apiKey, provider, storeTokens])

  const handleDisconnect = useCallback(async () => {
    try {
      await deleteTokens({ provider })
    } catch (error) {
      console.error('Failed to disconnect:', error)
    }
  }, [provider, deleteTokens])

  if (isConnected) {
    return (
      <div className={cn('flex items-center justify-between border border-border p-4', className)}>
        <div>
          <h3 className="font-mono text-sm font-medium">{config.name}</h3>
          <p className="text-xs text-muted-foreground">Connected</p>
        </div>
        <Button
          onClick={handleDisconnect}
          variant="outline"
          size="sm"
          className="rounded-none font-mono"
        >
          Disconnect
        </Button>
      </div>
    )
  }

  if (isExpired) {
    return (
      <div className={cn('flex items-center justify-between border border-border p-4', className)}>
        <div>
          <h3 className="font-mono text-sm font-medium">{config.name}</h3>
          <p className="text-xs text-destructive">Token expired - reconnect needed</p>
        </div>
        <Button
          onClick={config.supportsOAuth ? handleOAuthConnect : () => setShowApiKeyInput(true)}
          variant="outline"
          size="sm"
          className="rounded-none font-mono"
        >
          Reconnect
        </Button>
      </div>
    )
  }

  if (showApiKeyInput || !config.supportsOAuth) {
    return (
      <div className={cn('space-y-3 border border-border p-4', className)}>
        <div>
          <h3 className="font-mono text-sm font-medium">{config.name}</h3>
          <p className="text-xs text-muted-foreground">{config.description}</p>
        </div>
        <div className="flex gap-2">
          <input
            type="password"
            placeholder="Enter API key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="flex-1 rounded-none border border-border bg-background px-3 py-2 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <Button
            onClick={handleApiKeyConnect}
            disabled={!apiKey.trim() || isConnecting}
            size="sm"
            className="rounded-none font-mono"
          >
            {isConnecting ? 'Connecting...' : 'Connect'}
          </Button>
          {config.supportsOAuth && (
            <Button
              onClick={() => setShowApiKeyInput(false)}
              variant="outline"
              size="sm"
              className="rounded-none font-mono"
            >
              Cancel
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex items-center justify-between border border-border p-4', className)}>
      <div>
        <h3 className="font-mono text-sm font-medium">{config.name}</h3>
        <p className="text-xs text-muted-foreground">{config.description}</p>
      </div>
      <div className="flex gap-2">
        <Button onClick={handleOAuthConnect} size="sm" className="rounded-none font-mono">
          Sign in with {config.name}
        </Button>
        <Button
          onClick={() => setShowApiKeyInput(true)}
          variant="outline"
          size="sm"
          className="rounded-none font-mono"
        >
          Use API Key
        </Button>
      </div>
    </div>
  )
}
