# Panda Workbench Layout Strategy

## Goal

Redefine Panda Web as an AI app builder for a broader audience that still
delivers a developer-grade workbench. The product should become easier to
understand, visually calmer, and structurally more competitive with leading AI
coding platforms without sacrificing Panda's differentiator: spec-native guided
building.

## Product Positioning

Panda should be positioned as:

- External/product framing: AI app builder
- Internal/workspace interaction model: spec-native AI IDE

This is a deliberate split.

The marketing promise should stay broad:

- tell Panda what to build
- iterate with AI
- ship working apps

The workspace should stay disciplined:

- the editor/workbench is primary
- the AI rail is persistent but secondary
- preview is contextual, not permanent
- specs, plans, artifacts, and run inspection are structured review systems, not
  competing primary panes

## Core Diagnosis

Panda currently underperforms not because it lacks features, but because it
lacks hierarchy.

Today the interface treats too many surfaces as primary at once:

- editor
- chat
- preview
- terminal
- plan
- spec
- artifacts
- history
- source control

This causes four product problems:

1. The workspace is cognitively noisy.
2. Navigation concepts overlap and compete.
3. Some advanced systems appear more important than the user's actual work.
4. The product reads like a dashboard of tools instead of one coherent building
   environment.

## Strategic Decision Set

### Decision 1: Primary Workspace Identity

Panda should be editor-first.

This is the strongest choice because it:

- supports broad users after the initial prompt
- preserves developer trust
- gives Panda a stable product spine
- avoids collapsing into a generic prompt-to-app tool

### Decision 2: Desktop Layout

Desktop should use this hierarchy:

- Primary: center workbench/editor
- Secondary: persistent right AI rail
- Contextual: preview
- Structured review: specs, plans, artifacts, run inspector

This means the desktop should feel like:

- a modern IDE shell
- with a permanently available AI collaborator
- with formal workflow tools available on demand

### Decision 3: Preview

Remove preview as a permanent peer panel.

Preview should not remain:

- a right-panel tab
- a sidebar primary destination
- a mobile primary destination
- a nested preview/artifacts micro-workspace

Preview should become:

- an on-demand surface
- available only when a runnable app exists
- launchable from explicit actions such as Open Preview, View Running App, or
  Open Local URL
- optionally docked temporarily as split view in the workbench

This turns preview into a validation surface instead of a competing workspace.

### Decision 4: Chat

Chat should remain persistently visible on desktop, but in a reduced and calmer
right rail.

The right rail should contain:

- conversation history in the current thread
- chat input/composer
- model/mode controls
- immediate inline approvals when needed

The right rail should not be overloaded with every advanced system.

### Decision 5: Structured Review Systems

The following should move out of the default chat stream and into explicit
structured review surfaces:

- plan editing/review
- formal spec review
- artifact review/apply queues
- run progress deep inspection
- evals and memory bank management

These should be opened intentionally as drawers, overlays, or dedicated
inspector tabs, not live in the default conversational pane.

## Recommended Information Architecture

### Desktop

#### Top Bar

Keep:

- project breadcrumb
- sidebar toggle
- project-level actions
- run status indicator

Reduce:

- visual noise
- duplicated action entry points

The top bar should answer:

- where am I
- what project is this
- is the agent currently doing something

#### Left Rail

Keep the icon rail.

Do not move to a permanently wide left nav yet.

Rationale:

- the rail is compact and IDE-compatible
- it works for expert users
- it preserves horizontal space for the editor

But simplify destinations.

Recommended left rail destinations:

- Explorer
- Search
- Conversations
- Specs
- Terminal
- Source Control

Remove or demote:

- New Chat as a top-level rail destination Use a button inside Conversations or
  in the chat rail instead.
- Preview as a rail destination It becomes contextual.

#### Center Workspace

This becomes the unquestioned primary area.

Recommended center workspace responsibilities:

- file tree/flyout content
- code editor
- open tabs
- timeline or activity history for the selected file/chat
- terminal expansion
- contextual split preview when requested

The user should never be unsure that this is the place where work happens.

#### Right AI Rail

The right rail becomes an AI collaborator panel, not a multi-tool hub.

Recommended responsibilities:

- message list
- chat input
- mode/model controls
- lightweight inline alerts/approvals

Remove from default right-rail view:

- full preview
- large plan editing surfaces
- full artifact management

Those should open in contextual review layers.

### Mobile

Mobile should not attempt to mirror desktop.

Recommended mobile model:

- one primary active workspace at a time
- explicit bottom navigation for:
  - Work
  - Chat
  - Review

Where:

- Work = editor/files/terminal
- Chat = conversation/composer
- Review = plan/spec/artifact/run-review surface

Preview should be launched from Work or Review when available, not occupy a
permanent primary tab.

## Competitive Benchmark

### Cursor / Windsurf

Strengths:

- editor-first coherence
- clear assistant placement
- stronger workspace maturity
- less navigation ambiguity

Panda should copy:

- primary/secondary pane clarity
- smaller number of always-visible top-level surfaces

Panda should not copy:

- pure developer-only framing

### Replit AI / Firebase Studio

Strengths:

- clearer end-to-end build/run/deploy story
- more obvious “build something that runs” loop

Panda should copy:

- explicit runtime continuity
- stronger preview/deploy lifecycle

Panda should not copy:

- app-builder-first workspace if it undermines editor usefulness

### Bolt.new / Lovable / v0

Strengths:

- immediate clarity
- low cognitive load
- obvious value proposition

Panda should copy:

- first-run simplicity
- clear preview/run affordances

Panda should not copy:

- prompt-first workspace dominance

## Panda's Competitive Wedge

Panda's moat should be:

- spec-native building
- guided approvals
- structured agent execution
- artifact review instead of opaque generation
- developer-grade editor plus broad-user onboarding

This is stronger than trying to out-Bolt Bolt or out-v0 v0.

The correct strategic lane is:

AI builder for broad users, powered by a serious workbench.

## What Should Change First

### Phase 1: Remove Layout Ambiguity

1. Remove preview as a permanent right-panel tab.
2. Remove preview as a permanent left-rail destination.
3. Re-scope the right rail to chat + lightweight approvals only.
4. Make the center editor/workbench visually dominant.

### Phase 2: Re-home Review Systems

1. Move plan/spec/artifact/run detail into a Review surface.
2. Keep inline approval nudges in chat, but open structured review on demand.
3. Turn the current inspector into a dedicated review center instead of a
   generalized sidecar.

### Phase 3: Make Runtime Real

1. Wire preview to an actual runtime URL lifecycle.
2. Make Open Preview appear only when valid.
3. Add clear run state:
   - building
   - running
   - failed
   - last successful preview

### Phase 4: Make Source Control Honest

1. Either upgrade the current panel toward real source-control workflows
2. Or rename/reframe it as Change History until it earns the source-control
   label

### Phase 5: Simplify Mobile

1. Replace duplicated mobile shells with one bottom-nav model
2. Stop mirroring desktop navigation exactly
3. Move structured review into a distinct mobile Review destination

## Feature and Layout Truths

These principles should govern implementation:

- If a surface is always visible, it must be central to the user's daily
  workflow.
- If a CTA is visible, it must always do something real.
- If a feature is contextual, it should not occupy permanent layout space.
- If a system is formal, it should not be disguised as casual chat content.
- If Panda claims to be an AI builder, runtime and preview must be reliable.
- If Panda claims to be developer-grade, the editor must remain the product
  center.

## Proposed Desktop Layout

### Base Frame

- Top bar: project context + run state + core actions
- Left rail: compact navigation
- Center: editor/workbench
- Right rail: chat

### Contextual Layers

- Review drawer: plan/spec/artifacts/run details
- Split preview: temporary and user-invoked
- Modal/share flows: isolated, not layout-bearing

## Proposed Success Criteria

The redesign is successful when:

- a new user can identify the primary work area in under 5 seconds
- preview is only shown when real and actionable
- no feature exists as both a primary destination and a nested sub-panel
- desktop navigation can be explained in one sentence
- mobile navigation can be explained in one sentence
- Panda's spec workflow feels like a differentiator, not overhead

## Recommendation Summary

Strong recommendations:

- Make Panda editor-first.
- Keep chat always visible on desktop, but make it secondary.
- Eliminate the permanent preview panel.
- Reframe preview as on-demand contextual validation.
- Keep the icon rail, but simplify destinations.
- Pull formal review systems out of the default chat surface.
- Lean harder into specs as the core moat.

## Next Step

Create an implementation plan for:

1. removing permanent preview from desktop and mobile shell
2. defining the new Review surface
3. simplifying left-rail destinations
4. resizing and simplifying the chat rail
5. wiring real runtime preview state into the workbench
