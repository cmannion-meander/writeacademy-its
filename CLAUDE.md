# WriteAcademy ITS — Claude Code Instructions

## Project Overview

WriteAcademy is an AI-powered Intelligent Tutoring System that teaches creative writing through a story-first, Pomodoro-paced experience. Learners write and illustrate a children's storybook across 4 sessions (~2 hours total). Built for the Gemini Live Agent Challenge (Creative Storyteller category).

Tech: Next.js 16 frontend, FastAPI backend on Google Cloud Run, Gemini 2.5 Flash for text and image generation, Firestore for persistence.

## Skills (read before working)

Before starting any task, read the relevant skill file:

- **gemini-patterns.md** — Gemini API calls: structured output, streaming, image generation, style consistency. Read this for ANY backend AI work.
- **story-data-model.md** — Pydantic models, Firestore schema, Cloud Storage for illustrations, localStorage fallback. Read this for ANY data/persistence work.
- **session-ux.md** — Frontend session flow: onboarding, Wonder/Build/Reflect phases, timer, storybook preview. Read this for ANY frontend work.
- **project-conventions.md** — Project structure, naming, API patterns, deployment, testing. Read this for orientation on ANY task.

## Current State (as of March 3, 2026)

Working: Core ITS loop with Gibbs Reflective Cycle, 9-lesson structure, Writing Workshop with Gemini feedback, illustration generation from drafts, file-cached lessons.

Building toward: Story-first experience where lessons are embedded in storybook creation, adaptive curriculum from skill detection, Pomodoro session architecture, portfolio with growth tracking.

## Key Decisions

1. Story is the organizing structure, not the syllabus. Every feature should advance the learner's book.
2. Gibbs cycle is embedded in the 3-act session (Wonder=Description+Feelings, Build=Evaluation+Analysis, Reflect=Conclusion+ActionPlan), not shown as explicit steps.
3. Illustrations are the emotional reward. Latency matters enormously. Use concurrent generation and caching.
4. Adaptive engine MVP: skip/compress based on onboarding writing sample. Full reordering is post-submission.
5. Dual-write localStorage + Firestore. localStorage is always written. Firestore is attempted.

## Submission Deadline

March 16, 2026 at 5:00 PM Pacific. Every feature decision should be filtered through: does this make the demo video more compelling?
