"use client";

import { useState, useEffect } from "react";
import { BookOpen, Download, ChevronRight, Star, Pencil, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { API_HEADERS } from "@/lib/api-client";
import { StorybookViewer } from "@/components/storybook/storybook-viewer";
import type { SessionPlan, StoryProject, StoryPage, SessionFeedback } from "@/lib/types";

const GIBBS_COLORS: Record<string, string> = {
  description: "#5dade2",
  feelings: "#a78bfa",
  evaluation: "#F59E42",
  analysis: "#fb923c",
  conclusion: "#82d4bb",
  action_plan: "#f472b6",
};

interface ReflectPhaseProps {
  plan: SessionPlan;
  story: StoryProject;
  uid: string;
  completedPages: (StoryPage & { illustration_b64?: string })[];
  onNextSession: () => void;
  onExport: () => void;
  onEditPage: (pageNumber: number) => void;
  exporting?: boolean;
  exportError?: string | null;
}

/**
 * Act 3: Reflect and Reward (5 min)
 * Shows completed pages with edit buttons, Gibbs-cycle feedback,
 * and an interactive storybook viewer.
 */
export function ReflectPhase({
  plan,
  story,
  uid,
  completedPages,
  onNextSession,
  onExport,
  onEditPage,
  exporting = false,
  exportError = null,
}: ReflectPhaseProps) {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8123";
  const totalPagesInBook = 12;
  const pagesComplete = completedPages.length;

  const [showViewer, setShowViewer] = useState(false);
  const [feedback, setFeedback] = useState<SessionFeedback | null>(null);
  const [feedbackLoading, setFeedbackLoading] = useState(true);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [expandedPhase, setExpandedPhase] = useState<string | null>(null);

  // Fetch Gibbs feedback on mount
  useEffect(() => {
    async function fetchFeedback() {
      try {
        const res = await fetch(`${backendUrl}/coach/session-feedback`, {
          method: "POST",
          headers: API_HEADERS,
          body: JSON.stringify({
            uid,
            story_id: story.story_id,
            session_number: plan.session_number,
          }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: SessionFeedback = await res.json();
        setFeedback(data);
      } catch (err) {
        console.error("Failed to fetch session feedback:", err);
        setFeedbackError("Could not load feedback right now.");
      } finally {
        setFeedbackLoading(false);
      }
    }
    fetchFeedback();
  }, [backendUrl, uid, story.story_id, plan.session_number]);

  // Storybook viewer mode
  if (showViewer) {
    return (
      <div className="max-w-3xl mx-auto wa-animate-fade-up">
        <StorybookViewer
          title={story.title}
          authorName={story.character_name}
          pages={completedPages}
          onClose={() => setShowViewer(false)}
        />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 wa-animate-fade-up">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 bg-green-100 px-3 py-1.5 rounded-full mb-2">
          <Star className="h-3.5 w-3.5 text-green-600 fill-green-400" />
          <span className="text-xs font-bold text-green-700 uppercase tracking-wide">
            Session {plan.session_number} complete
          </span>
        </div>
        <h2 className="text-2xl font-bold text-gray-900">
          Look what you made.
        </h2>
        <p className="text-gray-500 text-sm">
          {pagesComplete} illustrated page{pagesComplete !== 1 ? "s" : ""} added to {story.title}.
        </p>
      </div>

      {/* "Read Your Book" — primary action */}
      {pagesComplete > 0 && (
        <button
          onClick={() => setShowViewer(true)}
          className="w-full flex items-center justify-center gap-2.5 bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-500 hover:to-orange-500 text-white font-bold py-4 px-6 rounded-2xl text-base transition-all hover:scale-[1.01] active:scale-[0.99] shadow-lg shadow-amber-200/50"
        >
          <BookOpen className="h-5 w-5" />
          Read Your Book
        </button>
      )}

      {/* Mini storybook spread — all completed pages */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
          Your storybook — {pagesComplete} of {totalPagesInBook} pages
        </p>

        {/* Book progress bar */}
        <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-400 to-orange-400 rounded-full transition-all duration-700"
            style={{ width: `${(pagesComplete / totalPagesInBook) * 100}%` }}
          />
        </div>

        {/* Illustrated pages grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          {completedPages.map(page => (
            <div
              key={page.page_number}
              className="group relative rounded-xl overflow-hidden border border-amber-100 bg-white shadow-sm"
            >
              {page.illustration_b64 ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={page.illustration_b64}
                  alt={`Page ${page.page_number}`}
                  className="w-full aspect-[4/3] object-cover"
                />
              ) : (
                <div className="w-full aspect-[4/3] bg-amber-50 flex items-center justify-center">
                  <BookOpen className="h-8 w-8 text-amber-200" />
                </div>
              )}
              <div className="px-3 py-2 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-400 mb-0.5">
                    p. {page.page_number}
                  </p>
                  <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                    {page.text_draft}
                  </p>
                </div>
                <button
                  onClick={() => onEditPage(page.page_number)}
                  className="shrink-0 p-1.5 rounded-lg text-gray-300 hover:text-amber-600 hover:bg-amber-50 opacity-0 group-hover:opacity-100 transition-all"
                  title="Edit this page"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}

          {/* Empty slots */}
          {Array.from({ length: Math.max(0, totalPagesInBook - pagesComplete) }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className={cn(
                "rounded-xl border-2 border-dashed border-gray-100 aspect-[4/3] flex items-center justify-center",
                i < 3 && "hidden sm:flex"
              )}
            >
              <p className="text-xs text-gray-300">p. {pagesComplete + i + 1}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Gibbs feedback — "Your Growth" */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
          Your Growth
        </p>

        {feedbackLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="rounded-xl border border-gray-100 p-4">
                <div className="h-4 wa-shimmer rounded w-1/3 mb-2" />
                <div className="h-3 wa-shimmer rounded w-full mb-1.5" />
                <div className="h-3 wa-shimmer rounded w-4/5" />
              </div>
            ))}
          </div>
        )}

        {feedbackError && (
          <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
            <p className="text-xs text-gray-400">{feedbackError}</p>
          </div>
        )}

        {feedback && (
          <div className="space-y-2">
            {/* Overall summary */}
            <div className="rounded-xl bg-green-50 border border-green-100 px-4 py-3 mb-3">
              <p className="text-sm text-green-800 font-medium">{feedback.overall_summary}</p>
            </div>

            {/* Gibbs phase cards */}
            {feedback.phases.map((phase) => {
              const color = GIBBS_COLORS[phase.phase] ?? "#6b7280";
              const isExpanded = expandedPhase === phase.phase;
              return (
                <button
                  key={phase.phase}
                  onClick={() => setExpandedPhase(isExpanded ? null : phase.phase)}
                  className="w-full text-left rounded-xl border border-gray-100 bg-white hover:bg-gray-50/50 transition-colors overflow-hidden"
                >
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div
                      className="w-1 self-stretch rounded-full shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800">{phase.title}</p>
                      {!isExpanded && (
                        <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{phase.content}</p>
                      )}
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-gray-300 shrink-0" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-300 shrink-0" />
                    )}
                  </div>
                  {isExpanded && (
                    <div className="px-4 pb-3 pl-8">
                      <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                        {phase.content}
                      </p>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Next-session hook (story-specific cliffhanger) */}
      {plan.reflect_preview && plan.session_number < 4 && (
        <div className="relative bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl px-6 py-5 overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-100/40 rounded-full -translate-y-8 translate-x-8" />
          <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-2">
            Next session preview
          </p>
          <p className="text-base text-gray-800 leading-relaxed relative z-10">
            {plan.reflect_preview}
          </p>
        </div>
      )}

      {plan.session_number === 4 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-6 py-5 text-center">
          <p className="text-lg font-bold text-amber-800">Your storybook is complete!</p>
          <p className="text-sm text-amber-700 mt-1">
            Export it below to share your illustrated children&apos;s book.
          </p>
        </div>
      )}

      {/* Actions */}
      {exportError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-700">{exportError}</p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={onExport}
          disabled={exporting}
          className="flex-1 flex items-center justify-center gap-2 border-2 border-gray-200 hover:border-gray-300 text-gray-700 font-semibold py-3.5 px-5 rounded-2xl text-sm transition-all hover:bg-gray-50 disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          {exporting ? "Preparing PDF…" : "Export PDF"}
        </button>

        {plan.session_number < 4 && (
          <button
            onClick={onNextSession}
            className="flex-[2] flex items-center justify-center gap-2 bg-[#F59E42] hover:bg-amber-500 text-white font-bold py-3.5 px-5 rounded-2xl text-sm transition-all hover:scale-[1.01] active:scale-[0.99] shadow-md shadow-amber-200"
          >
            Begin Session {plan.session_number + 1}
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
