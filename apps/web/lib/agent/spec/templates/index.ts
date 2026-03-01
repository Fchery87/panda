/**
 * Spec Templates Index - Mode-specific specification generators
 *
 * Exports all template generators for different agent modes:
 * - build: Full implementation specs
 * - code: Change-scoped specs
 * - architect: Design specs
 * - debug: Diagnostic specs
 * - review: Quality assessment specs
 */

export { generateBuildSpec } from './build'
export { generateCodeSpec } from './code'
export { generateArchitectSpec } from './architect'
export { generateDebugSpec } from './debug'
export { generateReviewSpec } from './review'
