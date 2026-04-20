import type { EvalScenario } from './evals'

export type EvalTemplate =
  | 'ask-smoke-exact'
  | 'ask-smoke-contains'
  | 'architect-plan-regex'
  | 'code-readonly-regression'

export function createEvalTemplateScenarios(template: EvalTemplate): EvalScenario[] {
  switch (template) {
    case 'ask-smoke-exact':
      return [
        {
          id: `tmpl-${Date.now()}-ask-exact`,
          name: 'Ask mode exact response smoke',
          input: 'Reply with exactly: PANDA_EVAL_OK',
          mode: 'ask',
          prompt: 'Reply with exactly: PANDA_EVAL_OK',
          expected: 'PANDA_EVAL_OK',
          tags: ['template', 'smoke', 'ask', 'exact'],
        } as EvalScenario,
      ]
    case 'ask-smoke-contains':
      return [
        {
          id: `tmpl-${Date.now()}-ask-contains`,
          name: 'Ask mode contains keyword smoke',
          input: 'Explain what this project does in one short sentence.',
          mode: 'ask',
          prompt: 'Explain what this project does in one short sentence.',
          expected: 'panda',
          tags: ['template', 'smoke', 'ask', 'contains'],
        } as EvalScenario,
      ]
    case 'architect-plan-regex':
      return [
        {
          id: `tmpl-${Date.now()}-architect-plan`,
          name: 'Architect response resembles structured plan',
          input: 'Give a 3-step plan to add logging to the app.',
          mode: 'plan',
          prompt: 'Give a 3-step plan to add logging to the app.',
          expected: '(?s)(1\\.|- ).*(2\\.|- ).*(3\\.|- )',
          tags: ['template', 'architect', 'regex', 'plan'],
        } as EvalScenario,
      ]
    case 'code-readonly-regression':
      return [
        {
          id: `tmpl-${Date.now()}-code-readonly`,
          name: 'Code mode read-only eval should still analyze without writes',
          input: 'Find where run progress events are rendered and summarize the component path.',
          mode: 'code',
          prompt: 'Find where run progress events are rendered and summarize the component path.',
          expected: 'RunProgressPanel',
          tags: ['template', 'code', 'read-only', 'contains'],
        } as EvalScenario,
      ]
    default:
      return []
  }
}
