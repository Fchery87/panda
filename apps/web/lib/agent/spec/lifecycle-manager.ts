import type { LLMProvider } from '../../llm/types'
import type { ClassificationContext, ClassificationResult } from './classifier'
import type { SpecGenerationContext, SpecGenerationResult, SpecEngine } from './engine'
import type { ValidationResult } from './validator'
import type { SpecVerificationReport } from './verifier'
import type { FormalSpecification, SpecEngineConfig, VerificationResult } from './types'

export interface SpecLifecycleManager {
  isEnabled(): boolean
  getConfig(): SpecEngineConfig
  setProvider(provider: LLMProvider): void
  classify(message: string, context?: ClassificationContext): Promise<ClassificationResult>
  generate(
    userMessage: string,
    context: SpecGenerationContext,
    tier: SpecGenerationResult['tier']
  ): Promise<SpecGenerationResult>
  validate(spec: FormalSpecification): Promise<ValidationResult>
  refine(
    spec: FormalSpecification,
    errors: ValidationResult['errors']
  ): Promise<FormalSpecification>
  verify(
    spec: FormalSpecification,
    executionResults: {
      filesModified?: string[]
      commandsRun?: string[]
      errors?: string[]
      output?: string
    }
  ): Promise<SpecVerificationReport>
  approve(spec: FormalSpecification): FormalSpecification
  markExecuting(spec: FormalSpecification): FormalSpecification
  markVerified(
    spec: FormalSpecification,
    verificationResults: VerificationResult[]
  ): FormalSpecification
  markFailed(spec: FormalSpecification, failureReason: string): FormalSpecification
}

export class DefaultSpecLifecycleManager implements SpecLifecycleManager {
  constructor(private readonly engine: SpecEngine) {}

  isEnabled(): boolean {
    return this.engine.isEnabled()
  }

  getConfig(): SpecEngineConfig {
    return this.engine.getConfig()
  }

  setProvider(provider: LLMProvider): void {
    this.engine.setProvider(provider)
  }

  classify(message: string, context?: ClassificationContext): Promise<ClassificationResult> {
    return this.engine.classify(message, context)
  }

  generate(
    userMessage: string,
    context: SpecGenerationContext,
    tier: SpecGenerationResult['tier']
  ): Promise<SpecGenerationResult> {
    return this.engine.generate(userMessage, context, tier)
  }

  validate(spec: FormalSpecification): Promise<ValidationResult> {
    return this.engine.validate(spec)
  }

  refine(
    spec: FormalSpecification,
    errors: ValidationResult['errors']
  ): Promise<FormalSpecification> {
    return this.engine.refine(spec, errors)
  }

  verify(
    spec: FormalSpecification,
    executionResults: {
      filesModified?: string[]
      commandsRun?: string[]
      errors?: string[]
      output?: string
    }
  ): Promise<SpecVerificationReport> {
    return this.engine.verify(spec, executionResults)
  }

  approve(spec: FormalSpecification): FormalSpecification {
    return this.engine.approve(spec)
  }

  markExecuting(spec: FormalSpecification): FormalSpecification {
    return this.engine.markExecuting(spec)
  }

  markVerified(
    spec: FormalSpecification,
    verificationResults: VerificationResult[]
  ): FormalSpecification {
    return this.engine.markVerified(spec, verificationResults)
  }

  markFailed(spec: FormalSpecification, failureReason: string): FormalSpecification {
    return this.engine.markFailed(spec, failureReason)
  }
}
