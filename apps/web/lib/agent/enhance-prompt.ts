/**
 * Enhance Prompt Module
 *
 * Provides prompt enhancement functionality for rewriting user prompts
 * into clearer, more specific, and actionable prompts.
 *
 * @file apps/web/lib/agent/enhance-prompt.ts
 */

/**
 * Enhancement prompt template
 * Uses PROMPT_PLACEHOLDER as the insertion point for the user's prompt
 */
export const ENHANCE_PROMPT_TEMPLATE = `Rewrite the following user prompt to be clearer, more specific, and more actionable for an AI coding assistant. Preserve the user's intent exactly. Clarify wording that is already present. Do not add inferred implementation scope, tools, files, systems, or technical tasks the user did not provide. If missing context matters, include that missing context as an explicit question or prerequisite. Return ONLY the enhanced prompt, no explanations.

User prompt:
PROMPT_PLACEHOLDER`

/**
 * System prompt for the enhancement LLM
 */
export const ENHANCE_SYSTEM_PROMPT = `You are a prompt improvement assistant. Your task is to rewrite user prompts to be clearer, more specific, and more actionable for an AI coding assistant. 

Guidelines:
- Preserve the user's intent exactly
- Clarify wording that is already present
- Do not add inferred implementation scope, tools, files, systems, or technical tasks the user did not provide
- If important context is missing, expose it as an explicit question or prerequisite
- Return ONLY the enhanced prompt, no explanations, no markdown code blocks
- Keep the enhanced prompt concise but comprehensive`

/**
 * Clean markdown fences from LLM response
 * Removes triple backticks, single backticks, and trims whitespace
 */
export function cleanMarkdownFences(text: string): string {
  // Remove triple backtick code blocks with optional language identifier
  let cleaned = text.replace(/```[\w]*\n?/g, '').replace(/```$/g, '')

  // Remove single backtick wrapping
  cleaned = cleaned.replace(/^`([^`]*)`$/g, '$1')

  // Trim whitespace
  return cleaned.trim()
}

/**
 * Build the enhancement prompt by inserting user input into template
 */
export function buildEnhancementPrompt(userInput: string): string {
  return ENHANCE_PROMPT_TEMPLATE.replace('PROMPT_PLACEHOLDER', userInput)
}
