<!-- SEED: re-run /impeccable document once there's code to capture the actual tokens and components. -->
---
name: Coaching Training Platform
description: A clear, practical, professional training platform for coaches and trainees.
---

# Design System: Coaching Training Platform

## 1. Overview

**Creative North Star: "The Training Desk"**

The system should feel like a bright, organized coaching workspace: practical, legible, and calm under repeated daily use. Trainees need a low-friction surface for workouts, instructions, progress photos, and training summaries. Coaches need denser views for programming, review, and statistics, but the extra detail must arrive through hierarchy, filtering, and progressive disclosure rather than dashboard clutter.

The visual direction is light, structured, and formal-sport. It should borrow the clarity of Apple Fitness, the activity discipline of Garmin Connect, and the product sharpness of Linear without becoming a copy of any of them. It explicitly rejects fitness influencer aesthetics, bodybuilding kitsch, neon motivation, generic SaaS pastel styling, and dark interfaces that make mobile training input harder to read.

**Key Characteristics:**
- Bright surfaces with measured contrast and clear data hierarchy.
- Trainee workflows stay simple, direct, and touch-friendly.
- Coach workflows support density through tables, filters, tabs, and drill-down detail.
- Sport cues are functional, not decorative.
- Motion confirms state changes and progress without becoming theatrical.

## 2. Colors

Use a light 60-30-10 color system: 60% bright neutral surfaces, 30% quiet structural color, 10% decisive accent for action, priority, and progress.

### Primary
- **Primary Action Accent** ([to be resolved during implementation]): Used for primary CTAs, active navigation, key progress moments, and high-signal interactive states. It must stay rare enough to remain meaningful.

### Secondary
- **Structural Sport Tone** ([to be resolved during implementation]): Used for section grouping, coach-side data panels, selected filters, and subtle visual rhythm.

### Neutral
- **Training Surface** ([to be resolved during implementation]): Main app background and large content surfaces.
- **Raised Surface** ([to be resolved during implementation]): Cards, form blocks, routine rows, and mobile workout panels.
- **Readable Ink** ([to be resolved during implementation]): Primary text and high-emphasis numbers.
- **Support Ink** ([to be resolved during implementation]): Secondary labels, metadata, hints, and timestamps.
- **Quiet Line** ([to be resolved during implementation]): Dividers, input borders, row separation, and chart grid lines.

### Named Rules

**The 60-30-10 Rule.** Light neutral surfaces carry the interface, a secondary tone gives structure, and the accent is reserved for actions or information that genuinely needs attention.

**The No Neon Motivation Rule.** Fitness energy must come from clarity, progress, and completion states, never from neon colors, hype gradients, or aggressive dark-mode styling.

## 3. Typography

**Display Font:** [single sans family to be chosen during implementation]
**Body Font:** [same single sans family to be chosen during implementation]
**Label/Mono Font:** [optional numeric or mono face to be chosen during implementation]

**Character:** The typography should be clear, formal, and sport-oriented. It must feel professional and readable, not playful, childish, decorative, or overly branded.

### Hierarchy
- **Display** ([weight to be chosen], [size to be chosen], [line-height to be chosen]): Reserved for top-level app moments such as program titles, onboarding headings, or major coach dashboard summaries.
- **Headline** ([weight to be chosen], [size to be chosen], [line-height to be chosen]): Used for page titles, routine names, client profile headings, and statistics sections.
- **Title** ([weight to be chosen], [size to be chosen], [line-height to be chosen]): Used for cards, workout blocks, exercise rows, and panel headings.
- **Body** ([weight to be chosen], [size to be chosen], [line-height to be chosen]): Used for instructions, descriptions, form labels, summaries, and readable content. Keep long instructional text within a comfortable 65-75 character measure.
- **Label** ([weight to be chosen], [size to be chosen], [letter-spacing to be chosen]): Used for field labels, table headings, chips, metadata, stat captions, and compact controls.

### Named Rules

**The Numbers Stay Calm Rule.** Training numbers can be prominent, but they must not become hero-metric decoration. A weight, RPE, set count, or weekly volume number is useful only when its label, unit, and context are clear.

## 4. Elevation

The system should be mostly flat and layered through tone, spacing, borders, and grouping. Shadows are allowed for active overlays, sticky workout controls, popovers, and focused editing states, but the default app should not rely on heavy card shadows.

### Named Rules

**The Flat Until Needed Rule.** Surfaces are flat by default. Elevation appears only when it clarifies interaction, stacking, or temporary focus.

## 5. Components

Component details will be extracted once implementation exists. The seed direction is below so early screens stay consistent.

### Buttons
- **Shape:** Slightly rounded, practical, and touch-friendly ([exact radius to be chosen]).
- **Primary:** Uses the Primary Action Accent with strong contrast and clear labels.
- **Hover / Focus:** Responsive feedback through color, border, or subtle transform. Focus states must be visible and WCAG AA aligned.
- **Secondary / Ghost / Tertiary:** Used for lower-priority coach controls, filters, and navigation without competing with primary actions.

### Chips
- **Style:** Compact, readable filters for muscle groups, equipment, exercise type, clients, program status, and routine categories.
- **State:** Selected state must be clear without relying on color alone.

### Cards / Containers
- **Corner Style:** Clean and moderate ([exact radius to be chosen]).
- **Background:** Light raised surfaces over the main Training Surface.
- **Shadow Strategy:** Flat by default, with borders and tonal separation before shadows.
- **Internal Padding:** Larger for trainee workout screens, tighter for coach-side tables and dense management views.

### Inputs / Fields
- **Style:** High-readability fields with clear labels, units, and validation states.
- **Focus:** Strong enough for mobile and keyboard users.
- **Error / Disabled:** Errors must explain the correction. Disabled states must remain readable.

### Navigation
- **Style:** Trainee navigation should be simple and action-oriented. Coach navigation can expose more structure through tabs, side navigation, filters, and grouped lists.

## 6. Do's and Don'ts

### Do:
- **Do** use a light 60-30-10 system so the app stays bright, readable, and operational.
- **Do** make trainee workout entry fast, touch-friendly, and forgiving.
- **Do** give coaches dense controls only where the task demands it: programming, review, statistics, and client management.
- **Do** pair every training metric with labels, units, and context.
- **Do** support WCAG AA contrast, reduced motion, and non-color status indicators.

### Don't:
- **Don't** copy Heavycoach branding or visual identity directly.
- **Don't** use fitness influencer aesthetics, bodybuilding kitsch, neon motivation, or hype gradients.
- **Don't** use generic SaaS pastel styling.
- **Don't** default to dark interfaces that make mobile training input harder to read.
- **Don't** hide important coaching detail behind oversimplified UI.
- **Don't** create overloaded dashboards where every stat competes for attention.
