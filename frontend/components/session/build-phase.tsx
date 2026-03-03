"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronDown, ChevronUp, Save, BookOpen, ChevronRight, Pencil } from "lucide-react";
import { LoadingPainter } from "@/components/common/loading-painter";
import { MdText } from "@/components/common/md-text";
import { IllustratedPage } from "@/components/storybook/illustrated-page";
import { API_HEADERS } from "@/lib/api-client";
import { saveDraft, loadDraft } from "@/lib/storage";
import { cn } from "@/lib/utils";
import type { SessionPlan, StoryProject, StoryPage } from "@/lib/types";

interface BuildPhaseProps {
  plan: SessionPlan;
  story: StoryProject;
  uid: string;
  completedPages: StoryPage[];
  onPageComplete: (page: StoryPage & { illustration_b64?: string }) => void;
  onAllPagesComplete: () => void;
}

/**
 * Page-specific micro-hints that give each page a concrete story-structure goal.
 * These are additive to the session's build_instructions.
 */
const PAGE_HINTS: Record<number, string> = {
  1:  "Open your world — where are we, and who is your character right now?",
  2:  "Show your character's ordinary life — what do they love, wish for, or fear?",
  3:  "Something changes — the small spark that starts the whole adventure.",
  4:  "The journey begins — your character takes their first brave step.",
  5:  "A problem appears — something goes wrong or harder than expected.",
  6:  "A discovery or helper — something (or someone) shifts the story.",
  7:  "The hardest moment — your character must make a real choice.",
  8:  "Everything is at stake — the tension is at its highest.",
  9:  "The turning point — your character finally acts.",
  10: "Things begin to change — what's different now?",
  11: "Coming home — your character returns, but they're not the same.",
  12: "The ending — a new normal, a quiet hope, a new beginning.",
};

const WORD_TARGET = { min: 20, ideal: 40, max: 60 };

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function WordCountIndicator({ count }: { count: number }) {
  const { min, ideal, max } = WORD_TARGET;
  let color = "text-gray-400";
  let label = `${count} words · aim for ${ideal}–${max}`;

  if (count >= min && count <= max) {
    color = "text-green-500";
    label = `${count} words · good length`;
  } else if (count > max) {
    color = "text-amber-500";
    label = `${count} words · try trimming for picture-book pace`;
  } else if (count > 0) {
    color = "text-gray-400";
    label = `${count} words · keep going`;
  } else {
    label = `Aim for ${ideal}–${max} words (2–3 sentences)`;
  }

  return (
    <span className={cn("text-xs tabular-nums transition-colors", color)}>
      {label}
    </span>
  );
}

/**
 * Act 2: Build (15 min)
 * Per session-ux.md: write story pages, trigger illustration, reveal illustrated spread.
 * "The illustrated page reveal is the most important UX moment. Never rush it."
 *
 * Illustrations are kept in React state only — not localStorage.
 * localStorage has a ~5 MB quota; a single PNG can be 300–600 KB.
 * The backend persists illustrations to disk and is the source of truth.
 */
export function BuildPhase({
  plan,
  story,
  uid,
  completedPages,
  onPageComplete,
  onAllPagesComplete,
}: BuildPhaseProps) {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8123";

  // Index into plan.target_pages
  const [pageIdx, setPageIdx] = useState(() => {
    const completedNums = new Set(completedPages.map(p => p.page_number));
    const firstPending = plan.target_pages.findIndex(n => !completedNums.has(n));
    return firstPending >= 0 ? firstPending : 0;
  });

  const currentPageNum = plan.target_pages[pageIdx];
  const isLastPage = pageIdx === plan.target_pages.length - 1;
  const totalPages = plan.target_pages.length;

  const [draft, setDraft] = useState(() => loadDraft(story.story_id, currentPageNum));
  const [saving, setSaving] = useState(false);
  const [illustrating, setIllustrating] = useState(false);
  // Illustration kept in state only — not cached in localStorage (quota)
  const [illustration, setIllustration] = useState<string | null>(null);
  const [illustrationFailed, setIllustrationFailed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [priorExpanded, setPriorExpanded] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [adjustmentOpen, setAdjustmentOpen] = useState(false);
  const [adjustmentText, setAdjustmentText] = useState("");

  const autoSaveRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-save draft text every 30s (text is tiny — always fits in localStorage)
  useEffect(() => {
    autoSaveRef.current = setInterval(() => {
      if (draft.trim()) saveDraft(story.story_id, currentPageNum, draft);
    }, 30_000);
    return () => {
      if (autoSaveRef.current) clearInterval(autoSaveRef.current);
    };
  }, [draft, story.story_id, currentPageNum]);

  // Load draft text when page changes; reset illustration state
  useEffect(() => {
    setDraft(loadDraft(story.story_id, currentPageNum));
    setIllustration(null);
    setIllustrationFailed(false);
    setError(null);
    setAdjustmentOpen(false);
    setAdjustmentText("");
  }, [currentPageNum, story.story_id]);

  // ─── Save then illustrate ────────────────────────────────────────────────────

  const handleSaveAndIllustrate = useCallback(async () => {
    if (!draft.trim()) return;
    setError(null);
    setIllustrationFailed(false);
    setSaving(true);

    // 1. Persist draft text immediately
    saveDraft(story.story_id, currentPageNum, draft);
    try {
      await fetch(`${backendUrl}/story/page`, {
        method: "POST",
        headers: API_HEADERS,
        body: JSON.stringify({
          uid,
          story_id: story.story_id,
          page_number: currentPageNum,
          text_draft: draft,
          technique_applied: plan.techniques[0]?.name ?? null,
        }),
      });
    } catch {
      // Local draft already saved — non-fatal
    }
    setSaving(false);

    // 2. Generate illustration (~8–15s)
    setIllustrating(true);
    try {
      const res = await fetch(`${backendUrl}/story/page/illustrate`, {
        method: "POST",
        headers: API_HEADERS,
        body: JSON.stringify({
          uid,
          story_id: story.story_id,
          page_number: currentPageNum,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { detail?: string }).detail ?? `${res.status}`);
      }
      const data = await res.json() as { illustration_b64: string };
      setIllustration(data.illustration_b64);
      onPageComplete({
        page_number: currentPageNum,
        text_draft: draft,
        illustration_b64: data.illustration_b64,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Illustration failed");
      setIllustrationFailed(true);
      // Save draft progress even on illustration failure
      saveDraft(story.story_id, currentPageNum, draft);
    } finally {
      setIllustrating(false);
    }
  }, [draft, uid, story, currentPageNum, plan.techniques, backendUrl, onPageComplete]);

  // ─── Skip illustration and continue ─────────────────────────────────────────

  const handleSkipAndContinue = useCallback(() => {
    // Mark page complete without an illustration — the book spread just shows text
    onPageComplete({
      page_number: currentPageNum,
      text_draft: draft,
      illustration_b64: undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    handleNextPage();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPageNum, draft, onPageComplete]);

  // ─── Regenerate (optionally with targeted adjustment notes) ─────────────────

  const handleRegenerate = useCallback(async (adjustmentNotes?: string) => {
    if (regenerating) return;
    setRegenerating(true);
    setError(null);
    try {
      const body: Record<string, unknown> = { uid, story_id: story.story_id, page_number: currentPageNum };
      if (adjustmentNotes?.trim()) body.adjustment_notes = adjustmentNotes.trim();
      const res = await fetch(`${backendUrl}/story/page/illustrate`, {
        method: "POST",
        headers: API_HEADERS,
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json() as { illustration_b64: string };
      setIllustration(data.illustration_b64);
      setAdjustmentOpen(false);
      setAdjustmentText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Regeneration failed");
    } finally {
      setRegenerating(false);
    }
  }, [regenerating, uid, story, currentPageNum, backendUrl]);

  // ─── Page navigation ─────────────────────────────────────────────────────────

  const handleNextPage = useCallback(() => {
    if (pageIdx < plan.target_pages.length - 1) {
      setPageIdx(i => i + 1);
      setIllustration(null);
      setIllustrationFailed(false);
    } else {
      onAllPagesComplete();
    }
  }, [pageIdx, plan.target_pages.length, onAllPagesComplete]);

  // ─── Derived values ──────────────────────────────────────────────────────────

  const wc = wordCount(draft);
  // Use Gemini-generated page-specific prompt when available; fall back to static hints
  const pagePrompt = plan.page_prompts?.[pageIdx] || PAGE_HINTS[currentPageNum] || plan.build_instructions;
  const showIllustration = illustration !== null && !illustrating;
  const showWriting = !showIllustration && !illustrating;

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 wa-animate-fade-up">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="max-w-2xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-gray-100 px-3 py-1.5 rounded-full">
            <BookOpen className="h-3.5 w-3.5 text-gray-500" />
            <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">
              Write · Page {currentPageNum}
            </span>
          </div>
          {/* Page progress dots */}
          <div className="flex gap-1.5 ml-1">
            {plan.target_pages.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "w-2 h-2 rounded-full transition-colors",
                  i < pageIdx ? "bg-green-400" : i === pageIdx ? "bg-[#F59E42]" : "bg-gray-200"
                )}
              />
            ))}
          </div>
        </div>
        <span className="text-xs text-gray-400">{pageIdx + 1} of {totalPages} pages</span>
      </div>

      {/* ── Prior pages (collapsible) ──────────────────────────────────────── */}
      {completedPages.length > 0 && (
        <div className="max-w-2xl mx-auto border border-gray-100 rounded-xl overflow-hidden">
          <button
            onClick={() => setPriorExpanded(e => !e)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <span className="font-medium">
              Your story so far ({completedPages.length} page{completedPages.length !== 1 ? "s" : ""})
            </span>
            {priorExpanded
              ? <ChevronUp className="h-4 w-4 text-gray-400" />
              : <ChevronDown className="h-4 w-4 text-gray-400" />}
          </button>
          {priorExpanded && (
            <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3 bg-gray-50/50">
              {completedPages.map(p => (
                <div key={p.page_number}>
                  <p className="text-xs font-semibold text-gray-400 mb-1">Page {p.page_number}</p>
                  <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">{p.text_draft}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Writing area ───────────────────────────────────────────────────── */}
      {showWriting && (
        <div className="max-w-2xl mx-auto space-y-4">
          {/* Writing prompts */}
          <div className="bg-amber-50/60 border border-amber-200 rounded-2xl px-5 py-4 space-y-2">
            <p className="text-xs font-bold text-amber-600 uppercase tracking-widest">
              Page {currentPageNum} prompt
            </p>
            <p className="text-sm font-medium text-amber-900 leading-relaxed">
              <MdText>{pagePrompt}</MdText>
            </p>
          </div>

          {/* Textarea */}
          <div className="relative">
            <textarea
              value={draft}
              onChange={e => setDraft(e.target.value)}
              placeholder="Start writing here… keep it short — 2 or 3 vivid sentences is perfect for a picture book page."
              rows={7}
              className="w-full rounded-2xl border border-gray-200 bg-white px-5 py-4 text-base text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-300/50 focus:border-amber-300 resize-none leading-relaxed transition-all shadow-sm font-serif"
              autoFocus
            />
            <div className="absolute bottom-3 right-4">
              <WordCountIndicator count={wc} />
            </div>
          </div>

          {/* Error + skip on failure */}
          {illustrationFailed && error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 space-y-2">
              <p className="text-sm text-red-700 font-medium">Illustration failed</p>
              <p className="text-xs text-red-600">{error}</p>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleSaveAndIllustrate}
                  className="text-xs font-semibold px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors"
                >
                  Try again
                </button>
                <button
                  onClick={handleSkipAndContinue}
                  className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-lg transition-colors"
                >
                  Skip illustration, continue
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {!illustrationFailed && (
            <button
              onClick={handleSaveAndIllustrate}
              disabled={!draft.trim() || saving || illustrating}
              className="w-full flex items-center justify-center gap-2 bg-[#F59E42] hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-2xl text-base transition-all hover:scale-[1.01] active:scale-[0.99] shadow-md shadow-amber-200"
            >
              <Save className="h-5 w-5" />
              {saving ? "Saving…" : "Save & Illustrate"}
            </button>
          )}
          <p className="text-xs text-center text-gray-400">
            2–3 sentences is perfect · draft auto-saves every 30 s
          </p>
        </div>
      )}

      {/* ── Illustration loading ────────────────────────────────────────────── */}
      {illustrating && (
        <div className="max-w-2xl mx-auto rounded-2xl border border-amber-200 bg-amber-50/40 overflow-hidden">
          <LoadingPainter
            size="lg"
            message="Bringing your words to life…"
            subMessage="This takes about 10–15 seconds. Your writing is already saved."
          />
        </div>
      )}

      {/* ── Illustrated spread ─────────────────────────────────────────────── */}
      {showIllustration && (
        <div className="space-y-4">
          {/* Widen beyond 2xl for the book spread to breathe */}
          <div className="max-w-3xl mx-auto">
            <IllustratedPage
              pageNumber={currentPageNum}
              text={draft}
              illustrationB64={illustration!}
              title={story.title}
              onRegenerate={() => handleRegenerate()}
              regenerating={regenerating}
              isNew
            />
          </div>

          {error && !illustrationFailed && (
            <p className="max-w-3xl mx-auto text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              {error}
            </p>
          )}

          {/* ── Adjustment panel — request targeted changes ────────────────── */}
          <div className="max-w-3xl mx-auto">
            <button
              onClick={() => setAdjustmentOpen(o => !o)}
              className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-800 transition-colors"
            >
              <Pencil className="h-3.5 w-3.5" />
              {adjustmentOpen ? "Cancel" : "Request a change to this illustration"}
            </button>

            {adjustmentOpen && (
              <div className="mt-3 bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
                <p className="text-xs text-gray-500">
                  Describe the specific change you want — e.g. "give Lily red hair", "add a golden key in her hand", "make the scene night-time".
                </p>
                <textarea
                  value={adjustmentText}
                  onChange={e => setAdjustmentText(e.target.value)}
                  placeholder="What would you like to change?"
                  rows={2}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-300/50 resize-none"
                />
                <button
                  onClick={() => handleRegenerate(adjustmentText)}
                  disabled={!adjustmentText.trim() || regenerating}
                  className="flex items-center gap-2 bg-[#F59E42] hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
                >
                  {regenerating ? "Applying…" : "Apply change"}
                </button>
              </div>
            )}
          </div>

          <div className="max-w-3xl mx-auto">
            <button
              onClick={handleNextPage}
              className="w-full flex items-center justify-center gap-2 bg-[#F59E42] hover:bg-amber-500 text-white font-bold py-4 px-6 rounded-2xl text-base transition-all hover:scale-[1.01] active:scale-[0.99] shadow-md shadow-amber-200"
            >
              {isLastPage
                ? "Finish writing →"
                : `Write page ${plan.target_pages[pageIdx + 1]} →`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
