---
version: alpha
name: Panda Ink & Paper
description: An editorial, anti-vibe-coded design system for Panda — near-pure neutrals with a signature red-ink accent, on the record.
colors:
  # ── Neutrals · light (near-pure white, whisper of cool, hue ≈ 255) ──
  light-background: "#F9FAFB"
  light-card: "#FEFEFF"
  light-foreground: "#202224"
  light-muted-foreground: "#67696C"
  light-border: "#DFE1E4"
  light-input: "#D2D5D9"
  light-surface-0: "#F9FAFB"
  light-surface-1: "#FEFEFF"
  light-surface-2: "#F2F3F5"
  light-surface-3: "#E7E9EC"
  light-accent-wash: "#FAEDEB"
  # ── Neutrals · dark (near-pure black, whisper of cool) ──
  dark-background: "#07080A"
  dark-card: "#0D0E11"
  dark-foreground: "#E6E8EA"
  dark-muted-foreground: "#96989C"
  dark-border: "#242729"
  dark-input: "#2C2F33"
  dark-surface-0: "#07080A"
  dark-surface-1: "#0D0E11"
  dark-surface-2: "#141619"
  dark-surface-3: "#1C1F22"
  dark-accent-wash: "#3A1B19"
  # ── Signature · Oxblood (red ink) ──
  oxblood: "#880B16"
  oxblood-bright: "#D55851"
  oxblood-deep: "#6F000E"
  # ── Ink (the brand red; ink-deep is the near-black agent island) ──
  ink: "#880B16"
  ink-deep: "#101214"
  # ── Secondary · Teal (verified evidence only) ──
  teal: "#00635F"
  teal-bright: "#54B1A6"
  # ── Semantic ──
  success: "#00635F"
  warning: "#D79628"
  error: "#DB2C2B"
  info: "#00635F"
  on-primary: "#FEFEFF"
  ring: "#880B16"
typography:
  display:
    fontFamily: Bricolage Grotesque
    fontSize: 3.5rem
    fontWeight: 600
    lineHeight: 1.04
    letterSpacing: -0.02em
  h1:
    fontFamily: Bricolage Grotesque
    fontSize: 2.25rem
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: -0.015em
  h2:
    fontFamily: Bricolage Grotesque
    fontSize: 1.5rem
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: -0.01em
  h3:
    fontFamily: Schibsted Grotesk
    fontSize: 1.125rem
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: Schibsted Grotesk
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.6
  body-sm:
    fontFamily: Schibsted Grotesk
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.55
  caption:
    fontFamily: Schibsted Grotesk
    fontSize: 0.75rem
    fontWeight: 400
    lineHeight: 1.4
  label:
    fontFamily: Schibsted Grotesk
    fontSize: 0.6875rem
    fontWeight: 600
    lineHeight: 1
    letterSpacing: 0.07em
  mono:
    fontFamily: Geist Mono
    fontSize: 0.8125rem
    fontWeight: 400
    lineHeight: 1.5
rounded:
  none: 0px
  sm: 8px
  md: 12px
  lg: 16px
  pill: 9999px
spacing:
  0: 0px
  1: 4px
  2: 8px
  3: 12px
  4: 16px
  5: 20px
  6: 24px
  8: 32px
  10: 40px
  12: 48px
  16: 64px
components:
  button-primary:
    backgroundColor: "{colors.oxblood}"
    textColor: "{colors.on-primary}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.pill}"
    padding: 10px 18px
  button-primary-hover:
    backgroundColor: "{colors.oxblood-deep}"
    textColor: "{colors.on-primary}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.pill}"
    padding: 10px 18px
  button-primary-dark:
    backgroundColor: "{colors.oxblood-bright}"
    textColor: "{colors.dark-background}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.pill}"
    padding: 10px 18px
  button-secondary:
    backgroundColor: "{colors.light-surface-2}"
    textColor: "{colors.light-foreground}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.pill}"
    padding: 10px 18px
  button-ghost:
    backgroundColor: transparent
    textColor: "{colors.light-muted-foreground}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.pill}"
    padding: 8px 14px
  input:
    backgroundColor: "{colors.light-card}"
    textColor: "{colors.light-foreground}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: 9px 12px
  focus-ring:
    backgroundColor: transparent
    textColor: "{colors.oxblood}"
    rounded: "{rounded.md}"
  chip:
    backgroundColor: "{colors.light-accent-wash}"
    textColor: "{colors.oxblood}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: 4px 10px
  card:
    backgroundColor: "{colors.light-card}"
    textColor: "{colors.light-foreground}"
    rounded: "{rounded.lg}"
    padding: 24px
  nav-link-active:
    backgroundColor: transparent
    textColor: "{colors.oxblood}"
    typography: "{typography.body-sm}"
  badge-verified:
    backgroundColor: "{colors.light-card}"
    textColor: "{colors.teal}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: 3px 9px
---

# Panda — Ink & Paper (Red Ink) Design System

## Overview

Panda is a spec-native, agentic IDE: the human writes intent, the agent executes it on the
record. This system makes that relationship visible through a single editorial metaphor —
**red ink on paper**. Historically, red ink is the color of edits, corrections, and marginalia:
exactly what an agent does to a codebase. It is warm, deliberate, and unmistakably *authored*.

The neutrals are near-pure white and near-pure black with only a whisper of cool, so the
product reads as crisp and modern rather than beige or muddy. The single signature accent —
oxblood `#880B16` — carries every primary action and brand beat. Teal is reserved strictly for
verified run evidence. **Two anti-patterns define what this system must never become:** it must
never drift into the cool blue/purple/indigo "AI gradient" palette, and it must never use
color-tinted glow shadows — both are the loudest "vibe-coded" tells and are forbidden here.

## Colors

Neutrals are near-pure with a whisper of cool (OKLCH hue ≈ 255, chroma ≈ 0.002–0.006). This
is the sweet spot between pure `#FFF`/`#000` (which can be harsh and cause text halation) and
the warm-tinted neutrals that read as dated beige. The faint cool bias signals "techy and
premium" without committing the system to a blue palette. Light canvas is `#F9FAFB` with
raised cards at `#FEFEFF`; dark canvas is `#07080A` with cards at `#0D0E11`.

`oxblood` `#880B16` is the signature. It sits entirely outside the contaminated
indigo→violet→pink AI palette and reads as deliberately chosen rather than defaulted. Anchored
at OKLCH `0.40 0.155 25`, it clears WCAG AA in both directions — ~5.2:1 as white text on the
fill and ~5.1:1 as oxblood text on the near-white canvas — while staying vivid. On black the
lifted `oxblood-bright` `#D55851` achieves ~6.1:1 (AA+). `teal` `#00635F` is the **only** secondary color, reserved for verified evidence
(passing checks, saved receipts, healthy runtimes) — the warm-primary / cool-secondary pairing
is an intentional complementary balance, and it preserves Panda's "on the record" signal.
`error` `#DB2C2B` is a brighter, higher-chroma red than oxblood; it shares a hue family but
never appears in the same context, so "alarm" stays distinct from "signature."

## Typography

The stack was chosen to be distinctive, not defaulted — the model-default **Inter-as-display
is the single most recognizable AI typography tell, and it is forbidden here.** Display and
headings use **Bricolage Grotesque**, a characterful variable grotesque with tight optical
sizing; body and UI use **Schibsted Grotesk**, a warm humanist grotesk that stays readable at
small sizes while carrying personality. **Geist Mono** is used *only* for genuine machine text:
code, file paths, commands, and receipts.

The scale is editorial: a large fluid display (clamp-based on the hero), tight tracking on
headings (`-0.02em` to `-0.01em`), comfortable 1.6 line-height for body. Sentence case
everywhere in product chrome — no uppercase-mono "SaaS label" stamps. Labels are the sole
exception (small, semibold, `0.07em` tracking), used sparingly for section eyebrows and status.

## Layout

Spacing follows a 4px base rhythm (`4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48 / 64`). Density
is comfortable rather than cramped — Panda is a workspace people inhabit for long sessions, so
air around dense panels prevents fatigue. Containers are centered with responsive gutters.
Depth in layout comes from **tone and hairline borders**, not from heavy shadow — surfaces step
through a four-step elevation ladder (`surface-0` canvas → `surface-3` overlay) by changing
lightness, which keeps the interface structured without visual noise.

## Elevation & Depth

This is the dimension most vibe-coded designs get wrong, so it is governed strictly.
**Shadows are neutral, never color-tinted** — purple/violet card glows are the second-strongest
AI premium tell, and they are banned. In light mode, depth uses a subtle neutral grey diffusion
(`oklch(20% 0.005 255 / α)`); in dark mode and inside `.ink-panel`, shadows are pure black
(`oklch(0% 0 0 / α)`). There is one light source, top-down. Quiet hairline borders
(`light-border` `#DFE1E4` / `dark-border` `#242729`) do the structural work of separating
regions; shadows are reserved for genuinely floating surfaces (popovers, dialogs, the run
receipt). The result is depth that recedes, letting content and the oxblood accent lead.

## Shapes

A 12px base radius (`--radius`) anchors the system. Cards and panels use `lg` (16px); inputs
and small surfaces use `md` (12px). **Pill radius (`9999px`) is intentionally constrained to
buttons, chips, badges, and avatars only** — applying `rounded-full` to cards and inputs is the
"iOS-tutorial reflex" and is forbidden. Sharp corners (`0px`) appear only where the metaphor
demands it: code blocks, terminals, and diff gutters. The radius vocabulary is fixed and small
on purpose — a component never invents its own corner radius.

## Components

The **primary button** is a solid oxblood pill with white text — oxblood is *the* action color,
so the primary control is unmistakably Panda (`button-primary`, hover darkens to
`oxblood-deep`; in dark mode it lifts to `oxblood-bright` with near-black text). Secondary and
ghost buttons recede into the neutral surface so a region never offers two competing actions.
Chips use a pale oxblood wash (`light-accent-wash`) with oxblood text for "agent attention"
states; `badge-verified` is the single teal surface, marking completed runs and passing checks.
Focus is always an oxblood ring (`ring`), never a blue browser default. Inputs are bordered,
12px-radius, surface-1 fills — never pill-shaped. Every component references tokens by name;
no component hardcodes a hex or a raw OKLCH value.

## Do's and Don'ts

**Do**
- Use semantic tokens (`text-oxblood`, `bg-teal`, `text-muted-foreground`) — never raw hex or
  raw `oklch()` in a component.
- Reserve oxblood for one primary action per region; let everything else recede into neutrals.
- Use teal **only** for verified evidence (passing checks, saved receipts, healthy status).
- Keep shadows neutral; let hairline borders structure the layout.
- Write sentence-case copy with plain verbs naming what the user controls.
- Test text contrast in **both** themes (WCAG AA minimum, AAA for body where feasible).

**Don'ts**
- **No blue, purple, indigo, violet, fuchsia, or pink anywhere** — these are the AI palette.
  Gradients on text or heroes are forbidden.
- No color-tinted glow shadows (purple/violet card glows are banned).
- No `rounded-full` on cards, inputs, or panels — pills are for buttons, chips, badges, avatars.
- No warm beige neutrals; the canvas is near-pure white/black with a whisper of cool.
- No Inter as a display face, no emoji as icons (use 1.5–2px-stroke inline SVG with `currentColor`).
- No arbitrary one-off radii or z-indexes — inherit component radii and the z-scale tokens.
