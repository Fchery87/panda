// apps/web/app/api/lsp/route.ts
import { spawn } from 'node:child_process'
import type { WebSocket } from 'ws'
import { isAuthenticatedNextjs } from '@/lib/auth/nextjs'
import { requireLocalWorkspaceApiEnabled } from '../local-workspace-gate'

export const dynamic = 'force-dynamic'

export async function GET() {
  if (!(await isAuthenticatedNextjs())) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const workspaceApiGate = requireLocalWorkspaceApiEnabled()
  if (workspaceApiGate) return workspaceApiGate

  return new Response('WebSocket upgrade required', { status: 426 })
}

/**
 * WebSocket handler for Language Server Protocol
 * Spawns typescript-language-server and proxies messages between WebSocket and LSP process
 */
export async function SOCKET(client: WebSocket, request?: Request) {
  if (!(await isAuthenticatedNextjs())) {
    client.close(1008, 'Unauthorized')
    return
  }

  if (requireLocalWorkspaceApiEnabled()) {
    client.close(1008, 'Local workspace API is not available')
    return
  }

  const requestUrl = request ? new URL(request.url) : null
  const requestOrigin = request?.headers.get('origin')
  if (requestUrl && requestOrigin && requestOrigin !== requestUrl.origin) {
    client.close(1008, 'Invalid origin')
    return
  }

  console.log('[LSP] WebSocket connection established')

  // Spawn TypeScript language server
  const lspProcess = spawn('bun', ['run', 'typescript-language-server', '--stdio'], {
    cwd: process.cwd(),
    stdio: ['pipe', 'pipe', 'pipe'],
  })

  console.log('[LSP] TypeScript language server spawned:', lspProcess.pid)

  // Buffer for incoming LSP messages (Content-Length protocol)
  let messageBuffer = ''
  let contentLength = -1

  // Handle data from LSP process
  lspProcess.stdout?.on('data', (data: Buffer) => {
    messageBuffer += data.toString('utf8')

    // Parse LSP messages (Content-Length protocol)
    while (true) {
      // If we don't know the content length yet, try to parse headers
      if (contentLength === -1) {
        const headerEnd = messageBuffer.indexOf('\r\n\r\n')
        if (headerEnd === -1) break // Not enough data for headers

        const headers = messageBuffer.slice(0, headerEnd)
        const match = headers.match(/Content-Length: (\d+)/i)
        if (!match) {
          console.error('[LSP] Invalid message headers:', headers)
          break
        }

        contentLength = parseInt(match[1], 10)
        messageBuffer = messageBuffer.slice(headerEnd + 4) // Remove headers
      }

      // Check if we have the full message body
      if (messageBuffer.length < contentLength) break // Not enough data

      // Extract the message
      const message = messageBuffer.slice(0, contentLength)
      messageBuffer = messageBuffer.slice(contentLength)
      contentLength = -1

      // Send to WebSocket
      try {
        client.send(message)
      } catch (err) {
        console.error('[LSP] Failed to send to WebSocket:', err)
      }
    }
  })

  // Handle errors from LSP process
  lspProcess.stderr?.on('data', (data: Buffer) => {
    const errorMsg = data.toString('utf8').trim()
    if (errorMsg) {
      console.error('[LSP Server Error]:', errorMsg)
    }
  })

  // Handle LSP process exit
  lspProcess.on('exit', (code) => {
    console.log(`[LSP] Language server exited with code ${code}`)
    try {
      client.close()
    } catch {
      // Socket might already be closed
    }
  })

  // Handle WebSocket messages from client
  client.on('message', (data) => {
    const message = data.toString()

    // Send to LSP process with Content-Length header
    const content = Buffer.from(message, 'utf8')
    const header = `Content-Length: ${content.length}\r\n\r\n`

    try {
      lspProcess.stdin?.write(header)
      lspProcess.stdin?.write(content)
    } catch (err) {
      console.error('[LSP] Failed to write to LSP process:', err)
    }
  })

  // Handle WebSocket close
  client.on('close', () => {
    console.log('[LSP] WebSocket connection closed')
    try {
      lspProcess.kill()
    } catch {
      // Process might already be dead
    }
  })

  // Handle WebSocket errors
  client.on('error', (err) => {
    console.error('[LSP] WebSocket error:', err)
    try {
      lspProcess.kill()
    } catch {
      // Process might already be dead
    }
  })
}
