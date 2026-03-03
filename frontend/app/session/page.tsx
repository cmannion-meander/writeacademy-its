"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Save, RefreshCw, ArrowLeft, X, RotateCcw } from "lucide-react";
import { WonderPhase } from "@/components/session/wonder-phase";
import { BuildPhase } from "@/components/session/build-phase";
import { ReflectPhase } from "@/components/session/reflect-phase";
import { LoadingPainter } from "@/components/common/loading-painter";
import { API_HEADERS } from "@/lib/api-client";
import {
  getUid,
  getCurrentStoryId,
  loadStory,
  loadProfile,
  loadSessionPlan,
  saveSessionPlan,
  saveCurrentSession,
  loadCurrentSession,
  loadPageIllustration,
  savePageIllustration,
  loadDraft,
  saveDraft,
} from "@/lib/storage";
import type { SessionPlan, StoryProject, StoryPage } from "@/lib/types";

type Phase = "loading" | "wonder" | "build" | "reflect" | "editing" | "next-loading" | "error";

/**
 * Session page — orchestrates the 3-act Pomodoro session:
 * Wonder (5 min) → Build (15 min) → Reflect (5 min)
 * Per session-ux.md and KICKOFF.md Step 7.
 */
export default function SessionPage() {
  const router = useRouter();
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8123";

  const [phase, setPhase] = useState<Phase>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [plan, setPlan] = useState<SessionPlan | null>(null);
  const [story, setStory] = useState<StoryProject | null>(null);
  const [uid, setUid] = useState<string>("");
  const [sessionNumber, setSessionNumber] = useState<number>(1);
  const [completedPages, setCompletedPages] = useState<(StoryPage & { illustration_b64?: string })[]>([]);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [editingPageNumber, setEditingPageNumber] = useState<number | null>(null);
  const [displayName, setDisplayName] = useState<string>("");
  const [editDraft, setEditDraft] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editIllustrating, setEditIllustrating] = useState(false);

  // ─── Initial load ────────────────────────────────────────────────────────────

  useEffect(() => {
    async function init() {
      const storedUid = getUid();
      const storyId = getCurrentStoryId();

      if (!storedUid || !storyId) {
        router.replace("/onboarding");
        return;
      }

      setUid(storedUid);

      const profile = loadProfile(storedUid);
      if (profile?.display_name) setDisplayName(profile.display_name);

      const storedStory = loadStory(storyId);
      if (!storedStory) {
        router.replace("/onboarding");
        return;
      }
      setStory(storedStory);

      const currentSession = loadCurrentSession();
      setSessionNumber(currentSession);

      // Hydrate completed pages from all prior sessions' illustrations
      const allCompletedPages = hydrateCompletedPages(storedStory.story_id, currentSession);
      setCompletedPages(allCompletedPages);

      // Load session plan (localStorage first, then backend)
      let sessionPlan = loadSessionPlan(storyId, currentSession);
      if (!sessionPlan) {
        sessionPlan = await fetchSessionPlan(storedUid, storyId, currentSession);
      }

      if (!sessionPlan) {
        setLoadError("Could not load session plan. Check that the backend is running.");
        setPhase("error");
        return;
      }

      setPlan(sessionPlan);
      setPhase("wonder");
    }

    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  /**
   * Hydrate completed pages from localStorage.
   * Text drafts always load from localStorage (tiny).
   * Illustrations load if available (may be absent if localStorage quota was exceeded).
   */
  function hydrateCompletedPages(storyId: string, _currentSession: number) {
    const pages: (StoryPage & { illustration_b64?: string })[] = [];
    for (let n = 1; n <= 12; n++) {
      const text = loadDraft(storyId, n);
      if (!text) continue; // page not yet written

      // Illustration may be null if localStorage quota was hit — that's fine
      let illus: string | null = null;
      try {
        illus = loadPageIllustration(storyId, n);
      } catch {
        // quota or security error — skip illustration
      }

      pages.push({
        page_number: n,
        text_draft: text,
        illustration_b64: illus ?? undefined,
        created_at: "",
        updated_at: "",
      });
    }
    return pages;
  }

  async function fetchSessionPlan(
    uidParam: string,
    storyId: string,
    sessionNum: number
  ): Promise<SessionPlan | null> {
    try {
      const resp = await fetch(`${backendUrl}/session/plan`, {
        method: "POST",
        headers: API_HEADERS,
        body: JSON.stringify({
          uid: uidParam,
          story_id: storyId,
          session_number: sessionNum,
        }),
      });
      if (!resp.ok) return null;
      const data: SessionPlan = await resp.json();
      saveSessionPlan(storyId, sessionNum, data);
      return data;
    } catch {
      return null;
    }
  }

  // ─── Phase callbacks ──────────────────────────────────────────────────────────

  function handleWonderComplete() {
    setPhase("build");
  }

  function handlePageComplete(page: StoryPage & { illustration_b64?: string }) {
    // Persist illustration to localStorage so hydration stays current
    if (story && page.illustration_b64) {
      savePageIllustration(story.story_id, page.page_number, page.illustration_b64);
    }
    setCompletedPages(prev => {
      const existing = prev.findIndex(p => p.page_number === page.page_number);
      if (existing >= 0) {
        const next = [...prev];
        next[existing] = page;
        return next;
      }
      return [...prev, page].sort((a, b) => a.page_number - b.page_number);
    });
  }

  async function handleAllPagesComplete() {
    // Transition immediately — reflect handles missing illustrations gracefully
    setPhase("reflect");
    if (!story) return;

    // Silently fetch any illustrations the backend has but we lost due to localStorage quota.
    // State update will cause reflect thumbnails to pop in as they arrive.
    const updatedPages = await loadMissingIllustrations(story.story_id, completedPages);
    setCompletedPages(updatedPages);
  }

  /**
   * For each completed page that has no illustration in state, try to fetch it
   * from the backend (GET /story/{uid}/{story_id}/page/{n}).
   * Returns a new array with any newly-fetched illustrations merged in.
   */
  async function loadMissingIllustrations(
    storyId: string,
    pages: (StoryPage & { illustration_b64?: string })[],
  ): Promise<(StoryPage & { illustration_b64?: string })[]> {
    const missing = pages.filter(p => !p.illustration_b64);
    if (missing.length === 0) return pages;

    const fetched = await Promise.allSettled(
      missing.map(async p => {
        const res = await fetch(
          `${backendUrl}/story/${uid}/${storyId}/page/${p.page_number}`,
          { headers: API_HEADERS },
        );
        if (!res.ok) return null;
        const data = await res.json() as StoryPage;
        return data.illustration_b64 ? { page_number: p.page_number, illustration_b64: data.illustration_b64 } : null;
      }),
    );

    // Merge fetched illustrations back into the pages array
    const updates = new Map<number, string>();
    fetched.forEach(r => {
      if (r.status === "fulfilled" && r.value) {
        updates.set(r.value.page_number, r.value.illustration_b64!);
      }
    });

    if (updates.size === 0) return pages;
    return pages.map(p =>
      updates.has(p.page_number) ? { ...p, illustration_b64: updates.get(p.page_number) } : p,
    );
  }

  // ─── Next-session flow ────────────────────────────────────────────────────────

  async function handleNextSession() {
    if (!story || !plan) return;
    const nextSession = sessionNumber + 1;
    if (nextSession > 4) return;

    setPhase("next-loading");

    // Fetch next session plan
    let nextPlan = loadSessionPlan(story.story_id, nextSession);
    if (!nextPlan) {
      nextPlan = await fetchSessionPlan(uid, story.story_id, nextSession);
    }

    if (!nextPlan) {
      setLoadError("Could not generate the next session plan. Please try again.");
      setPhase("error");
      return;
    }

    saveCurrentSession(nextSession);
    setSessionNumber(nextSession);
    setPlan(nextPlan);

    // Hydrate fresh — prior pages from the previous session are still in localStorage
    const hydrated = hydrateCompletedPages(story.story_id, nextSession);
    // Pull any missing illustrations from the backend (localStorage can't hold them all)
    const updated = await loadMissingIllustrations(story.story_id, hydrated);
    setCompletedPages(updated);
    setPhase("wonder");
  }

  // ─── Page editing ──────────────────────────────────────────────────────────────

  const handleEditPage = useCallback((pageNumber: number) => {
    const page = completedPages.find(p => p.page_number === pageNumber);
    if (!page) return;
    setEditingPageNumber(pageNumber);
    setEditDraft(page.text_draft);
    setEditSaving(false);
    setEditIllustrating(false);
    setPhase("editing");
  }, [completedPages]);

  const handleSaveEdit = useCallback(async (reIllustrate: boolean) => {
    if (!story || !uid || editingPageNumber === null) return;
    setEditSaving(true);

    // Save draft locally + to backend
    saveDraft(story.story_id, editingPageNumber, editDraft);
    try {
      await fetch(`${backendUrl}/story/page`, {
        method: "POST",
        headers: API_HEADERS,
        body: JSON.stringify({
          uid,
          story_id: story.story_id,
          page_number: editingPageNumber,
          text_draft: editDraft,
        }),
      });
    } catch { /* local draft saved — non-fatal */ }
    setEditSaving(false);

    // Update completedPages with new text
    const existingPage = completedPages.find(p => p.page_number === editingPageNumber);
    let updatedIllustration = existingPage?.illustration_b64;

    if (reIllustrate) {
      setEditIllustrating(true);
      try {
        const res = await fetch(`${backendUrl}/story/page/illustrate`, {
          method: "POST",
          headers: API_HEADERS,
          body: JSON.stringify({
            uid,
            story_id: story.story_id,
            page_number: editingPageNumber,
          }),
        });
        if (res.ok) {
          const data = await res.json() as { illustration_b64: string };
          updatedIllustration = data.illustration_b64;
        }
      } catch { /* illustration failure — keep existing */ }
      setEditIllustrating(false);
    }

    handlePageComplete({
      page_number: editingPageNumber,
      text_draft: editDraft,
      illustration_b64: updatedIllustration,
      created_at: existingPage?.created_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    setEditingPageNumber(null);
    setPhase("reflect");
  }, [story, uid, editingPageNumber, editDraft, completedPages, backendUrl, handlePageComplete]);

  const handleCancelEdit = useCallback(() => {
    setEditingPageNumber(null);
    setPhase("reflect");
  }, []);

  // ─── PDF export ───────────────────────────────────────────────────────────────

  async function handleExport() {
    if (!story || !uid) return;
    setExporting(true);
    setExportError(null);
    try {
      const resp = await fetch(`${backendUrl}/story/export`, {
        method: "POST",
        headers: API_HEADERS,
        body: JSON.stringify({
          title: story.title,
          author_name: displayName || story.character_name,
          pages: completedPages.map(p => ({
            page_number: p.page_number,
            text_draft: p.text_draft,
            illustration_b64: p.illustration_b64 ?? null,
          })),
        }),
      });
      if (!resp.ok) {
        const detail = await resp.json().catch(() => ({})) as { detail?: string };
        throw new Error(detail.detail ?? `Server error ${resp.status}`);
      }
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${story.title.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setExportError(`PDF export failed: ${msg}. Make sure the backend server is running.`);
      console.error("Export error:", err);
    } finally {
      setExporting(false);
    }
  }

  // ─── Demo reset ─────────────────────────────────────────────────────────────

  function handleReset() {
    if (!confirm("Start a new demo? This clears all saved progress.")) return;
    // Clear all WriteAcademy localStorage keys
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("wa_")) keysToRemove.push(key);
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
    router.replace("/onboarding");
  }

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-white">
      {/* Session header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2.5">
            <Image src="/logo-transparent.png" alt="WriteAcademy" width={28} height={24} className="h-6 w-auto" />
            <div className="flex flex-col">
              <span className="text-xs font-bold text-gray-800 leading-tight">
                {story?.title ?? "Your Storybook"}
              </span>
              <span className="text-xs text-gray-400">
                Session {sessionNumber} of 4
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Phase indicator */}
            {(phase === "wonder" || phase === "build" || phase === "reflect" || phase === "editing") && (
              <PhaseIndicator phase={phase === "editing" ? "reflect" : phase} />
            )}

            {/* Reset demo */}
            <button
              onClick={handleReset}
              className="p-2 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all"
              title="Reset demo"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-3xl mx-auto px-6 py-8">

        {/* Loading state */}
        {phase === "loading" && (
          <div className="flex items-center justify-center py-24">
            <LoadingPainter
              message="Preparing your session…"
              subMessage="Loading your personalised story plan"
              size="lg"
            />
          </div>
        )}

        {/* Next session loading */}
        {phase === "next-loading" && (
          <div className="flex items-center justify-center py-24">
            <LoadingPainter
              message={`Preparing Session ${sessionNumber + 1}…`}
              subMessage="Gemini is crafting your next story beat"
              size="lg"
            />
          </div>
        )}

        {/* Error state */}
        {phase === "error" && (
          <div className="max-w-md mx-auto text-center py-16 space-y-4">
            <p className="text-2xl">😔</p>
            <h2 className="text-lg font-bold text-gray-800">Something went wrong</h2>
            <p className="text-sm text-gray-500">{loadError}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-6 py-2.5 bg-[#F59E42] text-white text-sm font-semibold rounded-xl hover:bg-amber-500 transition-colors"
            >
              Try again
            </button>
          </div>
        )}

        {/* Wonder phase */}
        {phase === "wonder" && plan && story && (
          <WonderPhase
            plan={plan}
            sessionNumber={sessionNumber}
            storyTitle={story.title}
            onComplete={handleWonderComplete}
          />
        )}

        {/* Build phase */}
        {phase === "build" && plan && story && (
          <BuildPhase
            plan={plan}
            story={story}
            uid={uid}
            completedPages={completedPages.filter(p =>
              // Only show pages from previous sessions as "prior" context
              !plan.target_pages.includes(p.page_number)
            )}
            onPageComplete={handlePageComplete}
            onAllPagesComplete={handleAllPagesComplete}
          />
        )}

        {/* Reflect phase */}
        {phase === "reflect" && plan && story && (
          <ReflectPhase
            plan={plan}
            story={story}
            uid={uid}
            authorName={displayName || story.character_name}
            completedPages={completedPages}
            onNextSession={handleNextSession}
            onExport={handleExport}
            onEditPage={handleEditPage}
            exporting={exporting}
            exportError={exportError}
          />
        )}

        {/* Editing phase — edit a single page from reflect */}
        {phase === "editing" && editingPageNumber !== null && story && (
          <div className="max-w-2xl mx-auto space-y-6 wa-animate-fade-up">
            <div className="flex items-center justify-between">
              <button
                onClick={handleCancelEdit}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to overview
              </button>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">
                Editing Page {editingPageNumber}
              </span>
            </div>

            {/* Current illustration */}
            {(() => {
              const currentPage = completedPages.find(p => p.page_number === editingPageNumber);
              return currentPage?.illustration_b64 ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentPage.illustration_b64}
                  alt={`Page ${editingPageNumber}`}
                  className="w-full rounded-2xl border border-amber-200/60 shadow-sm"
                />
              ) : null;
            })()}

            {/* Textarea */}
            <textarea
              value={editDraft}
              onChange={e => setEditDraft(e.target.value)}
              rows={6}
              className="w-full rounded-2xl border border-gray-200 bg-white px-5 py-4 text-base text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-300/50 focus:border-amber-300 resize-none leading-relaxed transition-all shadow-sm font-serif"
            />

            {editIllustrating && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/40 overflow-hidden">
                <LoadingPainter
                  size="lg"
                  message="Re-illustrating your page…"
                  subMessage="This takes about 10–15 seconds."
                />
              </div>
            )}

            {/* Action buttons */}
            {!editIllustrating && (
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => handleSaveEdit(false)}
                  disabled={editSaving || !editDraft.trim()}
                  className="flex-1 flex items-center justify-center gap-2 border-2 border-gray-200 hover:border-gray-300 text-gray-700 font-semibold py-3.5 px-5 rounded-2xl text-sm transition-all hover:bg-gray-50 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {editSaving ? "Saving…" : "Save text only"}
                </button>
                <button
                  onClick={() => handleSaveEdit(true)}
                  disabled={editSaving || !editDraft.trim()}
                  className="flex-[2] flex items-center justify-center gap-2 bg-[#F59E42] hover:bg-amber-500 text-white font-bold py-3.5 px-5 rounded-2xl text-sm transition-all hover:scale-[1.01] active:scale-[0.99] shadow-md shadow-amber-200 disabled:opacity-50"
                >
                  <RefreshCw className="h-4 w-4" />
                  Save & Re-illustrate
                </button>
              </div>
            )}

            <button
              onClick={handleCancelEdit}
              className="w-full flex items-center justify-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 py-2 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
              Cancel
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

// ─── Phase indicator pill ─────────────────────────────────────────────────────

const PHASE_CONFIG = {
  wonder:  { label: "Discover",  color: "bg-indigo-100 text-indigo-700" },
  build:   { label: "Write",     color: "bg-amber-100 text-amber-700" },
  reflect: { label: "Review",    color: "bg-green-100 text-green-700" },
} as const;

function PhaseIndicator({ phase }: { phase: "wonder" | "build" | "reflect" }) {
  const { label, color } = PHASE_CONFIG[phase];
  return (
    <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${color}`}>
      {label}
    </div>
  );
}
