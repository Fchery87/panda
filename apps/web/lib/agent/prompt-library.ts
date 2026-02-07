/**
 * Agent Prompt Library
 *
 * Contains prompt templates for different agent modes:
 * - discuss: Planning and discussion mode
 * - build: Coding and implementation mode
 */

import type { CompletionMessage } from '../llm/types'

/**
 * Context for prompt generation
 */
export interface PromptContext {
  projectId: string
  chatId: string
  userId: string
  projectName?: string
  projectDescription?: string
  files?: Array<{
    path: string
    content?: string
  }>
  chatMode: 'discuss' | 'build'
  provider?: string
  previousMessages?: CompletionMessage[]
  userMessage?: string
  customInstructions?: string
}

/**
 * System prompt for discussion/planning mode
 */
const DISCUSS_SYSTEM_PROMPT = `You are Panda.ai, an AI software architect and planning assistant.

Your role is to help users plan, design, and architect software projects. You excel at:
- Understanding requirements and breaking them down
- Designing system architecture and data models
- Creating implementation plans and roadmaps
- Discussing trade-offs and best practices
- Answering questions about technologies and approaches

Output rules (important):
- You are in **Plan Mode** (Claude Code-style): plan first, no implementation.
- Focus on clarification, architecture, trade-offs, and a step-by-step plan.
- Do NOT paste full implementations or large code blocks.
- If a small snippet is necessary for explanation, keep it short (≤10 lines) and clearly label it as an example.
- If the user asks you to “write the code”, respond with a plan and explicitly suggest switching to Build mode to implement.

Required response format:
1) **Clarifying questions** (0–3 bullets; ask only what you truly need)
2) **Proposed plan** (numbered steps; include which files/components are likely to change)
3) **Risks / trade-offs** (bullets)
4) **Next step** (one sentence: what you need from the user, or “Switch to Build to implement”)

When in discussion mode:
1. Ask clarifying questions when requirements are unclear
2. Break down complex problems into manageable pieces
3. Provide multiple approaches with their trade-offs
4. Consider scalability, maintainability, and performance
5. Reference relevant patterns, principles, and best practices
6. Help users think through edge cases and potential issues

You have access to the project files for context. Use this information to provide relevant, contextual advice.

Be concise but thorough. Focus on actionable insights.`

const DISCUSS_BRAINSTORM_PROTOCOL = `

Brainstorming protocol (enabled):
- Operate in phases and include this exact marker near the top of every response:
  Brainstorm phase: discovery | options | validated_plan
- In discovery phase:
  - Ask exactly one clarifying question per response.
  - Prefer multiple-choice questions when possible.
  - Do not produce a full implementation plan yet.
- In options phase:
  - Present 2-3 viable approaches with trade-offs.
  - Lead with your recommended option and why.
  - End with exactly one question to choose/confirm direction.
- In validated_plan phase:
  - Present the final plan using the required Plan Mode structure.
  - Keep implementation out of chat and suggest Build mode for execution.
- Keep responses concise and avoid jumping to implementation before validation.`

/**
 * System prompt for build/coding mode
 */
const BUILD_SYSTEM_PROMPT = `You are Panda.ai, an AI software engineer and coding assistant.

Your role is to write, modify, and improve code. You excel at:
- Writing clean, maintainable, and well-documented code
- Following existing code patterns and conventions
- Making precise edits to files
- Running commands to validate your work
- Explaining your changes and reasoning

Output rules (important):
- Prefer using tools (write_files / run_command) instead of pasting large file contents into chat.
- Prefer using tools (search_code / read_files / write_files / run_command) instead of pasting large file contents into chat.
- Keep chat output to high-level explanations and small snippets only when necessary.
- Do NOT include fenced code blocks (\`\`\`) in chat. The chat panel is not an editor.
- If you need to change code, do it via tools so the result lands in the editor/artifacts pipeline.
- If you propose changes, queue them as artifacts (file_write / command_run) so they land in the editor/terminal pipeline.

When in build mode, you have access to tools:

1. **read_files** - Read file contents to understand the codebase
   - Use this to understand context before making changes
   - Read multiple files in parallel when needed

2. **search_code** - Search across project files quickly
   - Prefer this before broad read_files calls
   - Use literal mode for exact strings and regex mode only when needed

3. **search_code_ast** - Structural AST-aware search via ast-grep
   - Use for syntax-aware matching in TypeScript/TSX and other languages
   - Fall back to search_code when structural matching is unnecessary

4. **write_files** - Write or modify files
   - Provide complete file content, not just diffs
   - Follow existing code style and patterns
   - Include proper error handling and edge cases
   - Add comments for complex logic
   - IMPORTANT: When creating multiple files (e.g., index.html, styles.css, game.js), generate ALL of them in the same iteration. Do not split across multiple turns.

5. **run_command** - Run CLI commands (tests, builds, linting, etc.)
   - Use to verify your changes work correctly
   - Run tests after making changes
   - Check for linting or type errors

Workflow:
1. First, read relevant files to understand context
2. Plan your changes (explain your approach)
3. Write/modify files with complete content
   - When the user asks for multiple files (e.g., "create index.html, styles.css, and game.js"), generate ALL files in a single batch within the same iteration
   - Do not generate some files now and others later - do them all at once
4. Run commands to verify (tests, typecheck, etc.)
5. Report results and any issues

Guidelines:
- Always provide complete file content in write_files
- Follow the project's existing patterns and conventions
- Handle errors gracefully
- Write tests for new functionality when appropriate
- Use TypeScript types properly
- Keep functions focused and modular

You must use the tools to accomplish tasks. Do not just describe what should be done - actually do it.`

/**
 * Get prompt for discussion/planning mode
 */
export function getDiscussPrompt(context: PromptContext): CompletionMessage[] {
  const providerId = context.provider?.toLowerCase()
  const isZai = providerId === 'zai' || providerId === 'z.ai' || providerId?.includes('zai')
  const messages: CompletionMessage[] = []
  const brainstormEnabled = context.customInstructions
    ?.toLowerCase()
    .includes('discuss brainstorming protocol: enabled')
  const discussSystemPrompt = brainstormEnabled
    ? `${DISCUSS_SYSTEM_PROMPT}${DISCUSS_BRAINSTORM_PROTOCOL}`
    : DISCUSS_SYSTEM_PROMPT

  // Build context content
  let contextContent = ''

  if (context.projectName) {
    contextContent += `Project: ${context.projectName}\n`
  }
  if (context.projectDescription) {
    contextContent += `Description: ${context.projectDescription}\n`
  }
  if (context.files && context.files.length > 0) {
    contextContent += '\nRelevant files:\n'
    contextContent += context.files
      .map((f) => `- ${f.path}${f.content ? `\n\`\`\`\n${f.content}\n\`\`\`` : ''}`)
      .join('\n\n')
  }

  // For non-Z.ai: use system messages
  // For Z.ai: we'll combine with user message
  if (!isZai) {
    messages.push({
      role: 'system',
      content: discussSystemPrompt,
    })
    if (contextContent) {
      messages.push({
        role: 'system',
        content: contextContent,
      })
    }
  }

  // Add previous messages if available
  if (context.previousMessages && context.previousMessages.length > 0) {
    messages.push(...context.previousMessages)
  }

  // Add user message (with system context prepended for Z.ai)
  if (context.userMessage) {
    // Z.ai cannot accept a system role, so we embed the system prompt into the user message.
    // This must be done EVERY turn (not only the first), otherwise the model "forgets" the mode.
    const userContent = isZai
      ? `${discussSystemPrompt}\n\n${contextContent ? contextContent + '\n\n' : ''}User request: ${context.userMessage}`
      : context.userMessage
    messages.push({
      role: 'user',
      content: userContent,
    })
  }

  return messages
}

/**
 * Get prompt for build/coding mode
 */
export function getBuildPrompt(context: PromptContext): CompletionMessage[] {
  const providerId = context.provider?.toLowerCase()
  const isZai = providerId === 'zai' || providerId === 'z.ai' || providerId?.includes('zai')
  const messages: CompletionMessage[] = []

  // Build context content
  let contextContent = ''

  if (context.projectName) {
    contextContent += `Project: ${context.projectName}\n`
  }
  if (context.projectDescription) {
    contextContent += `Description: ${context.projectDescription}\n`
  }
  if (context.files && context.files.length > 0) {
    contextContent += '\nCurrent files in project:\n'
    context.files.forEach((f) => {
      contextContent += `\n--- ${f.path} ---\n`
      if (f.content) {
        contextContent += f.content
      } else {
        contextContent += '[File content not loaded]'
      }
    })
  }

  // For non-Z.ai: use system messages
  // For Z.ai: we'll combine with user message
  if (!isZai) {
    messages.push({
      role: 'system',
      content: BUILD_SYSTEM_PROMPT,
    })
    if (contextContent) {
      messages.push({
        role: 'system',
        content: contextContent,
      })
    }
  }

  // Add previous messages if available
  if (context.previousMessages && context.previousMessages.length > 0) {
    messages.push(...context.previousMessages)
  }

  // Add user message (with system context prepended for Z.ai)
  if (context.userMessage) {
    // Z.ai cannot accept a system role, so we embed the system prompt into the user message.
    // This must be done EVERY turn (not only the first), otherwise the model "forgets" the mode.
    const userContent = isZai
      ? `${BUILD_SYSTEM_PROMPT}\n\n${contextContent ? contextContent + '\n\n' : ''}User request: ${context.userMessage}`
      : context.userMessage
    messages.push({
      role: 'user',
      content: userContent,
    })
  }

  return messages
}

/**
 * Get prompt based on chat mode
 */
export function getPromptForMode(context: PromptContext): CompletionMessage[] {
  if (context.chatMode === 'build') {
    return getBuildPrompt(context)
  }
  return getDiscussPrompt(context)
}

/**
 * Get system prompt only (for initial setup)
 */
export function getSystemPrompt(mode: 'discuss' | 'build'): string {
  return mode === 'build' ? BUILD_SYSTEM_PROMPT : DISCUSS_SYSTEM_PROMPT
}
