# WriteAcademy ITS v2.0 Kickoff

## Context

Read these files in order before doing anything:

1. CLAUDE.md - Project overview and key decisions
2. docs/PRD.md - Full product requirements document
3. skills/gemini-patterns.md - Gemini API patterns
4. skills/story-data-model.md - Data model and persistence
5. skills/session-ux.md - Frontend session UX flow
6. skills/project-conventions.md - Structure, naming, deployment

## What Exists

The v1 codebase has:
- Next.js 16 frontend with Tailwind v4 and App Router
- FastAPI backend calling Gemini 2.5 Flash for Gibbs Reflective Cycle lessons
- Django LMS API integration (read-only, Section 1 of course)
- Writing Workshop with Gemini feedback and illustration generation
- 7-step Gibbs stepper UI
- File-cached lessons (lesson_cache/) for instant reload
- localStorage for student progress

## What We Are Building

Transform from module-based learning into a story-first experience where the learner writes and illustrates their own children storybook across 4 Pomodoro sessions (~2 hours total).

Core shift: from complete 9 lessons to build your storybook page by page while learning craft along the way.

## Task: Scaffold v2.0 Architecture

Do the following in order:

### Step 1: Understand existing codebase
Read current project structure, frontend pages, backend routes, existing Gemini integration. Identify reuse vs rebuild. Do NOT delete existing functionality.

### Step 2: Add new data models
Create backend/models/schemas.py with Pydantic models from skills/story-data-model.md: StoryProject, StoryPage, LearnerProfile, SessionRecord, SessionPlan, SkillAssessment, OnboardingResult.

### Step 3: Create onboarding endpoint
POST /onboard - accepts writing sample, calls Gemini structured output to assess 5 craft dimensions, returns OnboardingResult. Follow gemini-patterns.md Pattern 1. Use file/localStorage persistence for now.

### Step 4: Create session plan endpoint
POST /session/plan - takes learner profile + story arc, generates adaptive SessionPlan via Gemini structured output. Includes techniques (full/compress/skip), Wonder prompt, Build instructions, Reflect preview. Follow gemini-patterns.md Pattern 4.

### Step 5: Create story page endpoints
POST /story/page - save draft, trigger illustration generation.
POST /story/page/illustrate - generate/regenerate illustration with style anchor pattern (gemini-patterns.md Pattern 3). Save illustrations locally for now.

### Step 6: Build onboarding frontend
New route: welcome then story setup (title, character, premise) then writing sample then skill assessment then personalized plan then begin session. Follow session-ux.md onboarding flow. Wire to /onboard endpoint.

### Step 7: Build Session 1 frontend (Wonder/Build/Reflect)
Implement 3-act structure from session-ux.md:
- Wonder: example passage, feeling question, technique reveal
- Build: writing area, save triggers illustration, show illustrated page
- Reflect: pages written, growth moment, next-session hook, export button
Wire to /session/plan, /story/page, /story/page/illustrate.

### Step 8: PDF export
GET /story/export - assemble pages with illustrations into book PDF. Illustration on one side, text on the other. Use reportlab or fpdf2.

### Verify demo flow
Start app, onboard, write 3 pages in Session 1, see illustrations, export PDF. This is the demo video flow.

## Constraints

- Deadline: March 16, 2026. Optimize for demo impact.
- Keep existing Gibbs system working as fallback.
- Illustration latency matters. Use concurrent generation. Pre-warm demo content.
- Illustrated page reveal is the most important UX moment.
- Style consistency across illustrations is critical (style anchor pattern).
