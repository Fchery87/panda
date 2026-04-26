import type { WebContainer } from '@webcontainer/api'

export interface ContainerCommand {
  command: string
  args: string[]
}

export interface ContainerCommandResult {
  stdout: string
  stderr: string
  exitCode: number
}

export function normalizeContainerCommand(commandLine: string): ContainerCommand {
  const [command = '', ...args] = commandLine.trim().split(/\s+/u).filter(Boolean)

  if (command === 'bun') {
    if (args[0] === 'run' && args[1]) {
      return { command: 'npm', args: ['run', ...args.slice(1)] }
    }
    if (args[0] === 'install') {
      return { command: 'npm', args: ['install', ...args.slice(1)] }
    }
    return { command: 'npm', args }
  }

  return { command, args }
}

export async function spawnInContainer(
  instance: WebContainer,
  commandLine: string,
  options: { onOutput?: (chunk: string) => void } = {}
): Promise<ContainerCommandResult> {
  const { command, args } = normalizeContainerCommand(commandLine)
  const process = await instance.spawn(command, args)
  let output = ''

  const outputDone = process.output.pipeTo(
    new WritableStream<string>({
      write(chunk) {
        output += chunk
        options.onOutput?.(chunk)
      },
    })
  )

  const exitCode = await process.exit
  await outputDone.catch(() => undefined)

  return {
    stdout: output,
    stderr: exitCode === 0 ? '' : output,
    exitCode,
  }
}
