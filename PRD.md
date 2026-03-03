---
title: "WriteAcademy ITS — Product Requirements Document v2.0"
subtitle: "An AI-Powered Intelligent Tutoring System for Creative Writers"
date: "March 2026 | Gemini Live Agent Challenge — Creative Storyteller Category"
---

# 1. Vision & North Star

> **Product Vision:** WriteAcademy transforms any standard writing curriculum into an immersive, story-building experience where the learner's own book takes shape across every session. Powered by Gemini's multimodal capabilities and grounded in the Gibbs Reflective Cycle, it delivers 2x learning velocity in Pomodoro-sized sessions — so adult learners finish their first children's storybook in a single weekend.

**North Star Metric:** Percentage of enrolled learners who complete a publishable illustrated storybook draft within 4 Pomodoro sessions (~2 hours of focused learning).

**The Shift:** From *"complete 9 modules about writing techniques"* to **"build your storybook page by page while mastering craft along the way."**

Today's WriteAcademy teaches writing through structured reflection. V2.0 makes the learner's own story the throughline — every technique learned is immediately applied to their book-in-progress, every AI-generated illustration shows their words coming to life, and every session ends with visible, tangible progress they can hold.

# 2. Design Principles

| Principle | What It Means | How We Measure |
|-----------|--------------|----------------|
| Story Is the Spine | The learner's storybook is the organizing structure, not a course syllabus. Every interaction advances their book. | % of sessions where learner adds/revises a story page |
| Felt Velocity | Learners must feel rapid, visible progress. Inspired by Alpha School's 2.6x growth model. | Time-to-first-illustration < 5 min; pages per session |
| Adaptive Compression | Skip or compress techniques the learner already demonstrates. Respect their time and existing skill. | % of curriculum personalized; avg session length |
| Pomodoro Architecture | Every session is a self-contained 25-minute unit with clear promise, structure, and reward. | Session completion rate; return rate within 48 hours |
| Multimodal Delight | Text, illustrations, and audio interleave seamlessly. The learner sees their words become art. | Illustrations per session; learner satisfaction score |
| Reflective Depth | Gibbs Cycle drives genuine craft understanding, not just content consumption. | Bloom's taxonomy level of reflections (target: Evaluating+) |

# 3. Target User & Problem

## 3.1 Primary Persona

**"Maya" — Aspiring Children's Book Author**

- Age 28-45, creative professional or parent with a story idea
- Has attempted online writing courses before but dropped off at Module 3
- Motivated by the dream of holding a finished book, not by course completion badges
- Available time: 2-4 hours on weekends, not sustained daily commitment
- Learns best by doing, not by reading theory first
- Visually motivated — seeing illustrations of her story would be transformative

## 3.2 Core Problems

| Problem | Current Experience | Target Experience |
|---------|-------------------|-------------------|
| Module fatigue | 63 steps across 9 lessons feels like an obligation | 4 Pomodoro sessions that each produce a visible story page |
| Theory-practice gap | Learn technique, do exercise, move on. Writing never accumulates. | Every exercise directly builds the learner's actual storybook |
| No tangible output | Completed modules, but nothing to show for it | Illustrated storybook PDF exported after each session |
| One-size pacing | Linear progression regardless of existing skill | Adaptive engine skips/compresses mastered techniques |
| Delayed reward | Feedback comes after full lesson completion | AI illustration generated from draft within seconds |
| No pull to return | No emotional hook between sessions | Cliffhanger: next page of YOUR story awaits |

# 4. The Weekend Storybook Experience

> **The Promise:** In one weekend (4 sessions x 25 minutes = ~2 hours of focused work), you will write and illustrate your first children's storybook. Each session teaches you a real craft technique by having you use it in your story.

## 4.1 Session Architecture

Each 25-minute Pomodoro session follows a consistent three-act structure. The Gibbs Reflective Cycle is embedded within each act rather than presented as a separate pedagogical overlay.

| Phase | Duration | What Happens | Gibbs Mapping |
|-------|----------|-------------|---------------|
| Act 1: Wonder | 5 min | Open with a powerful example from published children's literature. Ask: "What did that just do to you?" Surface the technique through feeling before naming it. | Description + Feelings |
| Act 2: Build | 15 min | Technique micro-lesson (adaptive: skip if demonstrated). Learner writes their next story page. AI generates illustration in real-time. | Evaluation + Analysis |
| Act 3: Reflect and Reward | 5 min | Review what was learned. See the illustrated page added to their growing book. Preview next session's story beat. | Conclusion + Action Plan |

## 4.2 Weekend Flow (4 Sessions)

| Session | Story Beat | Craft Technique | Output |
|---------|-----------|----------------|--------|
| Session 1: The Opening | Introduce your character and world | Character voice, setting through senses, opening hooks | Pages 1-3 illustrated |
| Session 2: The Problem | Your character faces a challenge | Conflict, show-don't-tell, emotional resonance | Pages 4-6 illustrated |
| Session 3: The Journey | Character tries, fails, learns | Pacing, repetition patterns, visual storytelling | Pages 7-9 illustrated |
| Session 4: The Resolution | Resolution and final image | Endings, theme, the final page turn | Pages 10-12 + cover + assembled PDF |

After Session 4, the learner exports a complete illustrated storybook PDF — their first book, written and visualized in a single weekend.

# 5. Adaptive Curriculum Engine

The current system delivers all 9 lessons linearly. V2.0 introduces an adaptive layer that personalizes the curriculum based on demonstrated skill, not declared level.

## 5.1 Skill Detection

At onboarding, the learner writes a brief story opening (~150 words). Gemini analyzes this sample across craft dimensions:

| Craft Dimension | Signal Detected | If Strong | If Developing |
|----------------|----------------|-----------|---------------|
| Sensory Detail | Uses sight, sound, touch, taste, smell | Compress Setting lesson to 2-min refresher | Full guided lesson with examples |
| Character Voice | Distinct speech patterns, personality | Skip voice exercise; apply directly to story | Structured voice workshop |
| Show Don't Tell | Emotion conveyed through action/image | Brief reinforcement; advance to conflict | Deep lesson with before/after rewrites |
| Story Structure | Clear beginning, tension, movement | Narrative arc becomes scaffolding only | Explicit three-act walkthrough |
| Visual Thinking | Descriptions that suggest illustrations | Fast-track to illustration integration | Guided exercises |

## 5.2 Adaptive Behaviors

- **Compress:** Reduce a full Gibbs cycle lesson to a 2-minute refresher card with one targeted exercise when the learner already demonstrates the skill.
- **Skip:** Entirely bypass a technique module and apply it directly within the story-building flow.
- **Expand:** If the learner struggles (detected via draft quality analysis), insert an additional guided practice step before continuing the story.
- **Reorder:** Arrange technique lessons to match the natural demands of the learner's story, not the fixed syllabus order.

> **Alpha School Parallel:** Alpha achieves 2.6x growth by never making students sit through material they've mastered. Our adaptive engine applies the same principle: if your opening sample shows strong sensory detail, we don't teach you sensory detail — we use it as a strength to build on.

# 6. Story Assembly Engine (New)

The single biggest architectural addition in v2.0. The Story Assembly Engine manages the learner's evolving storybook as a persistent, structured artifact.

## 6.1 Data Model

| Entity | Fields | Storage |
|--------|--------|---------|
| StoryProject | title, genre, target_age, premise, created_at | Firestore + localStorage fallback |
| StoryPage | page_number, text_draft, revision_history[], technique_applied, illustration_url | Firestore per page document |
| StoryArc | setup_pages, conflict_pages, resolution_pages, current_beat | Computed from StoryPage collection |
| LearnerProfile | skill_levels{}, completed_techniques[], writing_samples[], style_preferences | Firestore user document |
| SessionPlan | session_number, target_pages, techniques_queue[], adaptive_overrides[] | Generated per session by Gemini |

## 6.2 Illustration Pipeline

Illustrations are the emotional reward engine. Every story page the learner writes gets visualized in a consistent art style.

1. Learner completes a story page draft in the Build phase.
2. Frontend sends draft text + story context + style parameters to FastAPI backend.
3. Backend constructs a Gemini image prompt including: draft text, character/world descriptions from prior pages, art style consistency directives.
4. Generated illustration is returned, displayed alongside the draft, and stored in the StoryPage record.
5. Learner can regenerate with feedback (e.g., adjust colors, character expression).

**Target latency:** < 8 seconds from draft submission to illustrated page display.

# 7. Craft Coach (Enhanced)

The existing Writing Workshop evolves into a persistent Craft Coach that operates throughout the story-building process.

## 7.1 Coach Behaviors

| Behavior | Trigger | Example |
|----------|---------|---------|
| Technique Prompt | Learner writing where session technique applies | "This is a great moment to try show-don't-tell. Instead of 'She was sad,' what might her hands be doing?" |
| Growth Mirror | Draft shows improvement over prior pages | "In Page 2 you told us the forest was dark. Here in Page 7, you're making us feel it. Real progress." |
| Gentle Redirect | Draft diverges from story arc | "Your character is exploring something interesting. How might this connect back to her problem?" |
| Skill Insight | Pattern detected across multiple pages | "You naturally use rhythm and repetition — one of the most powerful tools in children's books." |
| Next-Session Hook | Session ends | "Your character just discovered the hidden door. Next session, we find out what's behind it." |

# 8. Writer's Portfolio and Progress

A new top-level view that makes growth tangible and the output feel owned.

## 8.1 Portfolio Components

- **My Storybook:** Visual book preview showing all completed illustrated pages. Tap any page to revise. Export as PDF at any time.
- **Craft Skills Radar:** Spider chart showing proficiency across craft dimensions. Updates after each session based on writing analysis.
- **Growth Timeline:** Side-by-side comparisons of early vs. recent writing, surfaced by Gemini to make improvement visible and motivating.
- **Session History:** Each completed Pomodoro with story pages, techniques practiced, and coach feedback.
- **Reading Shelf:** Curated recommendations that update based on current techniques. StoryGraph CSV export (existing feature).

# 9. Technical Architecture

## 9.1 Updated Stack

| Layer | Current (v1) | Target (v2) | Rationale |
|-------|-------------|-------------|-----------|
| Frontend | Next.js 16, Tailwind v4 | Same + Framer Motion | Visual delight for storybook interactions |
| Backend | FastAPI on Cloud Run | Same + async task queue | Concurrent image gen, session planning |
| AI Text | Gemini 2.5 Flash | Same + structured output | Session planning, skill detection, coaching |
| AI Image | Gemini 2.5 Flash Image | Same + style-consistency layer | Character/world visual consistency |
| Storage | File cache + localStorage | Firestore + Cloud Storage | Persistent cross-device access |
| LMS | Django REST API (read-only) | Same + write-back (JWT) | Institutional deployment support |

## 9.2 Key API Endpoints (New/Modified)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| /onboard | POST | Accept writing sample, run skill detection, create LearnerProfile and StoryProject |
| /session/plan | POST | Generate adaptive session plan based on LearnerProfile + StoryArc |
| /story/page | POST | Save draft, trigger illustration generation, update StoryArc |
| /story/page/illustrate | POST | Generate or regenerate illustration with style consistency |
| /story/export | GET | Assemble illustrated storybook as downloadable PDF |
| /coach/feedback | POST | Stream Craft Coach feedback for current draft in story context |
| /portfolio/growth | GET | Return skill radar data + growth timeline comparisons |
| /structure-lesson | POST | (Existing) Gibbs lesson from LMS content — fallback for non-adaptive paths |

# 10. Hackathon Category Alignment

| Requirement | How WriteAcademy Delivers |
|-------------|--------------------------|
| Multimodal Storytelling | Every session interleaves instruction, written draft, AI illustration, and coach feedback in one cohesive flow. |
| Gemini interleaved output | Generates: session plans (JSON), explanations (text), illustrations (image), coaching (streamed text). |
| Google Cloud hosted | FastAPI on Cloud Run, Firestore, Cloud Storage, Gemini via GenAI SDK. |
| Google GenAI SDK or ADK | All Gemini calls use Google GenAI SDK with structured output mode. |
| Beyond text-in/text-out | Input: writing samples, story context. Output: illustrated pages, skill viz, exportable PDF, adaptive curriculum. |

# 11. Judging Criteria Strategy

## 11.1 Innovation and Multimodal UX (40%)

- Story-as-spine model is genuinely novel — most EdTech AI is Q&A or feedback. This builds a tangible creative artifact.
- Interleaved output is not a gimmick: text, writing, illustration, and coaching flow together because the product demands it.
- Storybook export is the ultimate demo moment — judges see a real illustrated book produced in 25 minutes.

## 11.2 Technical Implementation (30%)

- Adaptive engine: skill detection, session planning, real-time coaching as distinct Gemini-powered modules.
- Illustration style consistency across pages showcases deep prompt engineering.
- Firestore + Cloud Run + Cloud Storage shows genuine Google Cloud native design.

## 11.3 Demo and Presentation (30%)

- Demo: judge watches a 3-page story opening written and illustrated in 5 minutes.
- Architecture diagram maps to ITS research model with Gemini at the tutoring engine.
- Pre-warm all sessions for instant demo interactions.

# 12. MVP Scope for Submission (March 16)

Given the deadline, we define a Hackathon MVP that delivers the core experience shift in ~12 days.

## 12.1 Must Have (P0)

| Feature | Effort | Why P0 |
|---------|--------|--------|
| Story Project creation (title, premise, character) | 1 day | Foundation — story must exist as persistent object |
| Session 1 full flow (Wonder/Build/Reflect) | 2 days | Proves core experience model for judges |
| Inline illustration per story page | 1 day | Emotional reward engine; best demo moment |
| Storybook preview (all pages) | 1 day | Tangible output judges can see |
| PDF export of illustrated storybook | 0.5 day | The takeaway: "I made this in 25 minutes" |
| Onboarding sample + skill detection | 1 day | Shows adaptive intelligence |
| Pre-warmed demo path | 0.5 day | Eliminates latency risk for demo video |
| README + architecture diagram | 0.5 day | First thing judges read |
| Demo video (< 4 min, YouTube) | 1 day | Required submission artifact |
| Cloud deployment proof | 0.5 day | Required submission artifact |

## 12.2 Should Have (P1)

| Feature | Effort | Impact |
|---------|--------|--------|
| Sessions 2-4 full flow | 2 days | Complete weekend experience; stronger narrative |
| Craft Coach real-time feedback | 1 day | Showcases agent sophistication |
| Skill radar in portfolio | 0.5 day | Visual proof of adaptive learning |
| Growth timeline comparisons | 0.5 day | Compelling felt-velocity evidence |
| Firestore persistence | 1 day | Production-grade data layer |

## 12.3 Nice to Have (P2)

- Sessions 2-4 with full adaptive compression logic
- Illustration regeneration with learner feedback
- StoryGraph integration for reading list
- Multi-story support
- Audio narration of storybook pages (Gemini audio)
- Blog post for bonus points (+0.6)
- Infrastructure-as-code deployment (+0.2)

# 13. Risks and Mitigations

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Illustration style inconsistency | High | Style anchor prompt referencing character/world from page 1. Include prior descriptions in each call. |
| First-load latency (20-30s) | High | Pre-warm demo sessions. Concurrent image gen (~8s). Skeleton UI with progress. |
| Adaptive engine complexity | Medium | MVP: skip/compress 2-3 techniques from onboarding. Full reordering is P2. |
| Firestore migration risk | Medium | Dual-write localStorage + Firestore. Fall back if unavailable. |
| PDF assembly quality | Medium | Use pdf-lib. Test with 12-page books. Fallback: image gallery. |
| Gemini rate limits | Low | Cache demo outputs. Live gen only for onboarding + one illustration. |

# 14. Success Metrics

## 14.1 Hackathon Success (March 16)

- Judge understands product in < 60 seconds of demo video
- Demo shows real story written, illustrated, and exported in one session
- Architecture diagram maps to ITS research framework
- Adaptive skill detection visible in onboarding
- All submission requirements met

## 14.2 Product Success (Post-Hackathon)

- 70%+ session 1 to session 4 completion (vs. industry ~15%)
- Median signup-to-storybook: < 3 hours including breaks
- Measurable writing quality improvement S1 to S4
- NPS > 60
- Illustration satisfaction > 80%

# 15. Appendix: Pedagogical Foundation

## 15.1 Gibbs Reflective Cycle

The six-stage framework (Description, Feelings, Evaluation, Analysis, Conclusion, Action Plan) provides the learning depth engine. In v2.0, these stages are embedded within the three-act session structure rather than presented as explicit steps, making reflection feel natural rather than procedural.

## 15.2 ITS Architecture (Yuan and Hu, 2024)

| ITS Component | WriteAcademy Implementation |
|--------------|---------------------------|
| Domain Model | LMS curriculum (Django API) ingested and restructured by Gemini into story-aligned technique modules |
| Student Model | LearnerProfile in Firestore: skill levels, completed techniques, style preferences, story progress |
| Tutoring Engine | Gemini session planner + Craft Coach: adaptive plans, real-time coaching, Gibbs cycle management |
| Interface | Next.js storybook builder with illustrated previews, skill radar, growth timeline, Pomodoro timer |

## 15.3 Alpha School Inspiration

Alpha School demonstrates that adaptive AI + mastery-based learning + deliberate time structure can achieve 2.6x learning velocity. WriteAcademy adapts this for adult creative learners: mastery is measured through writing quality analysis (not test scores), and the Pomodoro reward is a tangible creative artifact (illustrated story page) rather than a progress bar.
