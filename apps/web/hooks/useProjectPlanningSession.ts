'use client'

import { useMemo } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { getCurrentPlanningQuestion } from '@/lib/planning/question-engine'
import type { GeneratedPlanArtifact, PlanningAnswer, PlanningQuestion } from '@/lib/planning/types'

export type ProjectPlanningSessionRecord = {
  sessionId: string
  chatId: Id<'chats'>
  status: string
  questions: PlanningQuestion[]
  answers: PlanningAnswer[]
  generatedPlan?: GeneratedPlanArtifact
} | null

type PlanningExecutionState = 'executing' | 'completed' | 'failed' | 'partial'

type ProjectPlanningSessionMutations = {
  startIntake: (args: { chatId: Id<'chats'>; questions: PlanningQuestion[] }) => Promise<unknown>
  answerQuestion: (args: {
    sessionId: string
    questionId: string
    selectedOptionId?: string
    freeformValue?: string
    source: 'suggestion' | 'freeform'
  }) => Promise<unknown>
  acceptPlan: (args: { sessionId: string }) => Promise<unknown>
  markExecutionState: (args: {
    sessionId: string
    state: PlanningExecutionState
    runId?: Id<'agentRuns'>
  }) => Promise<unknown>
  clearIntake: (args: { sessionId: string }) => Promise<unknown>
}

export function deriveProjectPlanningSessionState(session: ProjectPlanningSessionRecord) {
  const generatedPlan = session?.generatedPlan ?? null
  const currentQuestion = session
    ? getCurrentPlanningQuestion({
        questions: session.questions,
        answers: session.answers,
      })
    : null

  return {
    session,
    currentQuestion,
    generatedPlan,
    isIntakeActive: session?.status === 'intake',
    isGeneratingPlan: session?.status === 'generating',
    canApprove: generatedPlan?.status === 'ready_for_review',
    canBuild:
      session?.status === 'accepted' ||
      session?.status === 'executing' ||
      session?.status === 'partial' ||
      session?.status === 'failed' ||
      session?.status === 'completed' ||
      generatedPlan?.status === 'accepted' ||
      generatedPlan?.status === 'executing' ||
      generatedPlan?.status === 'failed' ||
      generatedPlan?.status === 'completed',
  }
}

export function createProjectPlanningSessionActions(args: {
  activeChatId: Id<'chats'> | null
  sessionId: string | null
  mutations: ProjectPlanningSessionMutations
}) {
  const { activeChatId, sessionId, mutations } = args

  return {
    startIntakeForChat(chatId: Id<'chats'>, questions: PlanningQuestion[]) {
      return mutations.startIntake({
        chatId,
        questions,
      })
    },
    startIntake(questions: PlanningQuestion[]) {
      if (!activeChatId) {
        throw new Error('Cannot start planning intake without an active chat')
      }

      return this.startIntakeForChat(activeChatId, questions)
    },
    answerQuestion(answer: {
      questionId: string
      selectedOptionId?: string
      freeformValue?: string
      source: 'suggestion' | 'freeform'
    }) {
      if (!sessionId) {
        throw new Error('Cannot answer a planning question without an active session')
      }

      return mutations.answerQuestion({
        sessionId,
        ...answer,
      })
    },
    acceptPlan() {
      if (!sessionId) {
        throw new Error('Cannot accept a plan without an active planning session')
      }

      return mutations.acceptPlan({ sessionId })
    },
    markExecutionState(args: {
      sessionId?: string
      state: PlanningExecutionState
      runId?: Id<'agentRuns'>
    }) {
      const targetSessionId = args.sessionId ?? sessionId
      if (!targetSessionId) {
        throw new Error('Cannot mark planning execution without an active planning session')
      }

      return mutations.markExecutionState({
        state: args.state,
        runId: args.runId,
        sessionId: targetSessionId,
      })
    },
    clearIntake() {
      if (!sessionId) {
        throw new Error('Cannot clear planning intake without an active planning session')
      }

      return mutations.clearIntake({ sessionId })
    },
  }
}

export function useProjectPlanningSession(args: { activeChatId: Id<'chats'> | null }) {
  const { activeChatId } = args
  const session = useQuery(
    api.planningSessions.getActiveByChat,
    activeChatId ? { chatId: activeChatId } : 'skip'
  ) as ProjectPlanningSessionRecord
  const startIntakeMutation = useMutation(api.planningSessions.startIntake)
  const answerQuestionMutation = useMutation(api.planningSessions.answerQuestion)
  const acceptPlanMutation = useMutation(api.planningSessions.acceptPlan)
  const markExecutionStateMutation = useMutation(api.planningSessions.markExecutionState)
  const clearIntakeMutation = useMutation(api.planningSessions.clearIntake)

  const state = useMemo(() => deriveProjectPlanningSessionState(session), [session])

  const actions = useMemo(
    () =>
      createProjectPlanningSessionActions({
        activeChatId,
        sessionId: session?.sessionId ?? null,
        mutations: {
          startIntake: startIntakeMutation,
          answerQuestion: answerQuestionMutation,
          acceptPlan: acceptPlanMutation,
          markExecutionState: markExecutionStateMutation,
          clearIntake: clearIntakeMutation,
        },
      }),
    [
      acceptPlanMutation,
      activeChatId,
      answerQuestionMutation,
      clearIntakeMutation,
      markExecutionStateMutation,
      session?.sessionId,
      startIntakeMutation,
    ]
  )

  return {
    ...state,
    ...actions,
  }
}
