/**
 * Agent Prompt Library
 * 
 * Contains prompt templates for different agent modes:
 * - discuss: Planning and discussion mode
 * - build: Coding and implementation mode
 */

import type { CompletionMessage } from '../llm/types';

/**
 * Context for prompt generation
 */
export interface PromptContext {
  projectName: string;
  projectDescription?: string;
  files?: Array<{
    path: string;
    content?: string;
  }>;
  chatMode: 'discuss' | 'build';
  previousMessages?: CompletionMessage[];
  userMessage: string;
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

When in discussion mode:
1. Ask clarifying questions when requirements are unclear
2. Break down complex problems into manageable pieces
3. Provide multiple approaches with their trade-offs
4. Consider scalability, maintainability, and performance
5. Reference relevant patterns, principles, and best practices
6. Help users think through edge cases and potential issues

You have access to the project files for context. Use this information to provide relevant, contextual advice.

Be concise but thorough. Focus on actionable insights.`;

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

When in build mode, you have access to tools:

1. **read_files** - Read file contents to understand the codebase
   - Use this to understand context before making changes
   - Read multiple files in parallel when needed

2. **write_files** - Write or modify files
   - Provide complete file content, not just diffs
   - Follow existing code style and patterns
   - Include proper error handling and edge cases
   - Add comments for complex logic

3. **run_command** - Run CLI commands (tests, builds, linting, etc.)
   - Use to verify your changes work correctly
   - Run tests after making changes
   - Check for linting or type errors

Workflow:
1. First, read relevant files to understand context
2. Plan your changes (explain your approach)
3. Write/modify files with complete content
4. Run commands to verify (tests, typecheck, etc.)
5. Report results and any issues

Guidelines:
- Always provide complete file content in write_files
- Follow the project's existing patterns and conventions
- Handle errors gracefully
- Write tests for new functionality when appropriate
- Use TypeScript types properly
- Keep functions focused and modular

You must use the tools to accomplish tasks. Do not just describe what should be done - actually do it.`;

/**
 * Get prompt for discussion/planning mode
 */
export function getDiscussPrompt(context: PromptContext): CompletionMessage[] {
  const messages: CompletionMessage[] = [
    {
      role: 'system',
      content: DISCUSS_SYSTEM_PROMPT,
    },
  ];

  // Add project context
  let projectContext = `Project: ${context.projectName}`;
  if (context.projectDescription) {
    projectContext += `\nDescription: ${context.projectDescription}`;
  }

  // Add file context if available
  if (context.files && context.files.length > 0) {
    projectContext += '\n\nRelevant files:\n';
    projectContext += context.files
      .map((f) => `- ${f.path}${f.content ? `\n\`\`\`\n${f.content}\n\`\`\`` : ''}`)
      .join('\n\n');
  }

  messages.push({
    role: 'system',
    content: projectContext,
  });

  // Add previous messages if available
  if (context.previousMessages && context.previousMessages.length > 0) {
    messages.push(...context.previousMessages);
  }

  // Add user message
  messages.push({
    role: 'user',
    content: context.userMessage,
  });

  return messages;
}

/**
 * Get prompt for build/coding mode
 */
export function getBuildPrompt(context: PromptContext): CompletionMessage[] {
  const messages: CompletionMessage[] = [
    {
      role: 'system',
      content: BUILD_SYSTEM_PROMPT,
    },
  ];

  // Add project context
  let projectContext = `Project: ${context.projectName}`;
  if (context.projectDescription) {
    projectContext += `\nDescription: ${context.projectDescription}`;
  }

  // Add file context if available
  if (context.files && context.files.length > 0) {
    projectContext += '\n\nCurrent files in project:\n';
    context.files.forEach((f) => {
      projectContext += `\n--- ${f.path} ---\n`;
      if (f.content) {
        projectContext += f.content;
      } else {
        projectContext += '[File content not loaded]';
      }
    });
  }

  messages.push({
    role: 'system',
    content: projectContext,
  });

  // Add previous messages if available
  if (context.previousMessages && context.previousMessages.length > 0) {
    messages.push(...context.previousMessages);
  }

  // Add user message
  messages.push({
    role: 'user',
    content: context.userMessage,
  });

  return messages;
}

/**
 * Get prompt based on chat mode
 */
export function getPromptForMode(context: PromptContext): CompletionMessage[] {
  if (context.chatMode === 'build') {
    return getBuildPrompt(context);
  }
  return getDiscussPrompt(context);
}

/**
 * Get system prompt only (for initial setup)
 */
export function getSystemPrompt(mode: 'discuss' | 'build'): string {
  return mode === 'build' ? BUILD_SYSTEM_PROMPT : DISCUSS_SYSTEM_PROMPT;
}
