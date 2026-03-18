// apps/web/app/api/lsp/route.ts
import { spawn } from 'node:child_process'
import { Socket } from 'node:net'

export const dynamic = 'force-dynamic'

/**
 * WebSocket handler for Language Server Protocol
 * Spawns typescript-language-server and proxies messages between WebSocket and LSP process
 */
export async function SOCKET(socket: Socket) {
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
        socket.write(message)
      } catch (err) {
        console.error('[LSP] Failed to write to WebSocket:', err)
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
      socket.end()
    } catch {
      // Socket might already be closed
    }
  })

  // Handle WebSocket data
  socket.on('data', (data: Buffer) => {
    const message = data.toString('utf8')

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
  socket.on('close', () => {
    console.log('[LSP] WebSocket connection closed')
    try {
      lspProcess.kill()
    } catch {
      // Process might already be dead
    }
  })

  // Handle WebSocket errors
  socket.on('error', (err) => {
    console.error('[LSP] WebSocket error:', err)
    try {
      lspProcess.kill()
    } catch {
      // Process might already be dead
    }
  })
}
