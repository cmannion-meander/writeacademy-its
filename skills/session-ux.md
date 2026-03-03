# Session UX Patterns

## When to Use
Building the frontend session flow: onboarding, 3-act Pomodoro (Wonder/Build/Reflect), storybook preview, portfolio.

## Session State Machine

```typescript
type SessionPhase = "onboarding" | "wonder" | "build" | "reflect" | "complete";

interface SessionState {
  phase: SessionPhase;
  sessionNumber: number;       // 1-4
  technique: string;
  targetPages: number[];
  currentPageIndex: number;
  timer: { started: number; duration: number };
  storyContext: { title: string; pagesCompleted: StoryPage[]; currentDraft: string };
}
```

## Phase Transitions

```
onboarding -> wonder -> build -> reflect -> (next session or complete)
                                   |
                                   v (if more pages this session)
                                 build
```

## Act 1: Wonder (5 min)

Lead with feeling, not explanation. Show a powerful example, ask how it made the learner feel, then reveal the technique.

UX rules:
- Never open with "Today we learn about X." Open with an example.
- The feeling question is not optional. It grounds the Gibbs cycle.
- Technique reveal should feel like an aha moment.
- Soft 5-minute guideline, not hard cutoff.

## Act 2: Build (15 min)

Write story pages applying the technique. Illustration as reward.

Flow per page:
1. Show writing prompt + prior pages for context (collapsible)
2. Writing textarea with Craft Coach available (collapsible sidebar)
3. On save: trigger illustration generation
4. Show illustrated page (THE REWARD MOMENT - full-width storybook spread)

UX rules:
- Illustration loading must be delightful, not anxious. Use painting animation, not spinner.
- Craft Coach is available but not intrusive.
- Auto-save drafts every 30 seconds to localStorage.

## Act 3: Reflect and Reward (5 min)

Show all pages written as mini-book spread. Show growth comparison if detected. Next-session hook referencing learner's actual plot.

UX rules:
- Show the book growing. Page count is primary progress signal.
- Growth Mirror only when Gemini detects genuine improvement.
- Next-session hook must be story-specific, not generic.
- Always offer PDF export. Partial book is still worth downloading.

## Onboarding Flow (< 5 min)

1. Welcome: "Write your first storybook this weekend"
2. Story setup: title, character name, one-sentence premise
3. Writing sample: opening paragraph (~150 words)
4. Skill assessment (Gemini, show brief loading)
5. Personalized plan reveal: show full/compress/skip per technique
6. Begin Session 1

## Pomodoro Timer

- Subtle display (top-right), not dominant
- Warning at 2 min left: gentle color shift, no interruption
- Overtime: "Take your time" message, never force-stop
- Pauses during illustration generation

## Storybook Preview

Show pages as visual book spread: illustration one side, text the other.
12 slots total. Completed pages are tappable for revision. Empty pages show dotted outlines.
Use Framer Motion for page-turn animations.

## Key Rules

1. Illustrated page reveal is the most important UX moment. Never rush it.
2. Never raw loading spinners. Use thematic animations (paintbrush, pencil).
3. Story context always accessible but never dominant.
4. Auto-save everything. Learner should never lose work.
5. Desktop is primary writing experience. Mobile-responsive but secondary.
6. PDF export must look like a real book: illustration + text spread.
