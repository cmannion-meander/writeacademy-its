/**
 * WriteAcademy v2.0 — localStorage persistence helpers.
 * Mirrors the dual-write pattern from skills/story-data-model.md.
 * localStorage is always written; Firestore is attempted when available (P1).
 */

import {
  WA_UID_KEY,
  WA_STORY_ID_KEY,
  WA_SESSION_KEY,
  type StoryProject,
  type StoryPage,
  type SessionPlan,
  type OnboardingResult,
} from "./types";

// ─── UID (persists across sessions) ──────────────────────────────────────────

export function getOrCreateUid(): string {
  if (typeof window === "undefined") return "";
  let uid = localStorage.getItem(WA_UID_KEY);
  if (!uid) {
    const rand = Math.random().toString(36).slice(2, 10);
    uid = `${rand}-${Date.now().toString(36)}`;
    localStorage.setItem(WA_UID_KEY, uid);
  }
  return uid;
}

export function getUid(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(WA_UID_KEY);
}

// ─── Story project ────────────────────────────────────────────────────────────

export function saveStory(story: StoryProject): void {
  localStorage.setItem(WA_STORY_ID_KEY, story.story_id);
  localStorage.setItem(`wa_story_${story.story_id}`, JSON.stringify(story));
}

export function loadStory(storyId: string): StoryProject | null {
  const raw = localStorage.getItem(`wa_story_${storyId}`);
  return raw ? (JSON.parse(raw) as StoryProject) : null;
}

export function getCurrentStoryId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(WA_STORY_ID_KEY);
}

// ─── Pages (drafts — saved immediately for safety) ────────────────────────────

export function saveDraft(storyId: string, pageNumber: number, draft: string): void {
  localStorage.setItem(`wa_draft_${storyId}_p${pageNumber}`, draft);
}

export function loadDraft(storyId: string, pageNumber: number): string {
  return localStorage.getItem(`wa_draft_${storyId}_p${pageNumber}`) ?? "";
}

export function savePageIllustration(
  storyId: string,
  pageNumber: number,
  b64: string
): void {
  try {
    localStorage.setItem(`wa_illus_${storyId}_p${pageNumber}`, b64);
  } catch {
    // localStorage quota exceeded — illustration is already persisted on the backend server.
    // Silently ignore; the app continues normally.
  }
}

export function loadPageIllustration(
  storyId: string,
  pageNumber: number
): string | null {
  return localStorage.getItem(`wa_illus_${storyId}_p${pageNumber}`);
}

// ─── Session plan ─────────────────────────────────────────────────────────────

export function saveSessionPlan(storyId: string, sessionNumber: number, plan: SessionPlan): void {
  localStorage.setItem(`wa_plan_${storyId}_s${sessionNumber}`, JSON.stringify(plan));
}

export function loadSessionPlan(storyId: string, sessionNumber: number): SessionPlan | null {
  const raw = localStorage.getItem(`wa_plan_${storyId}_s${sessionNumber}`);
  return raw ? (JSON.parse(raw) as SessionPlan) : null;
}

export function saveCurrentSession(n: number): void {
  localStorage.setItem(WA_SESSION_KEY, String(n));
}

export function loadCurrentSession(): number {
  return parseInt(localStorage.getItem(WA_SESSION_KEY) ?? "1", 10);
}

// ─── Onboarding result (full, for resume) ────────────────────────────────────

export function saveOnboardingResult(result: OnboardingResult): void {
  saveStory(result.story);
  localStorage.setItem(`wa_profile_${result.uid}`, JSON.stringify(result.profile));
  if (result.session_plan) {
    saveSessionPlan(result.story.story_id, 1, result.session_plan);
  }
}

// ─── Session resume check ─────────────────────────────────────────────────────

export function hasActiveSession(): boolean {
  if (typeof window === "undefined") return false;
  const uid = getUid();
  const storyId = getCurrentStoryId();
  return !!(uid && storyId);
}
