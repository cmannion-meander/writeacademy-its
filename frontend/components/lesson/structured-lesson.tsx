"use client";

import { Fragment, useState, useEffect, useRef, useMemo } from "react";
import {
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RotateCcw,
  Save,
  MessageSquare,
  Palette,
  BookOpen,
  Download,
  Check,
  PenLine,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { API_HEADERS } from "@/lib/api-client";
import type {
  GibbsModule,
  GibbsPhase,
  StructuredLessonData,
  CraftBlock,
  StudentProfile,
  ReadingListBook,
} from "@/lib/types";

// ─── Step types ────────────────────────────────────────────────────────────────

type LessonStep = GibbsPhase | "reading_list";

// ─── Phase metadata ────────────────────────────────────────────────────────────

const PHASE_META: Record<
  GibbsPhase,
  {
    label: string;
    number: string;
    bgClass: string;
    textClass: string;
    borderClass: string;
    lightBg: string;
  }
> = {
  description: {
    label: "Description",
    number: "01",
    bgClass: "bg-[#5dade2]",
    textClass: "text-[#5dade2]",
    borderClass: "border-[#5dade2]",
    lightBg: "bg-[#eaf5fc]",
  },
  feelings: {
    label: "Feelings",
    number: "02",
    bgClass: "bg-[#a78bfa]",
    textClass: "text-[#a78bfa]",
    borderClass: "border-[#a78bfa]",
    lightBg: "bg-[#f3f0ff]",
  },
  evaluation: {
    label: "Evaluation",
    number: "03",
    bgClass: "bg-[#F59E42]",
    textClass: "text-[#F59E42]",
    borderClass: "border-[#F59E42]",
    lightBg: "bg-[#fef3e2]",
  },
  analysis: {
    label: "Analysis",
    number: "04",
    bgClass: "bg-[#fb923c]",
    textClass: "text-[#fb923c]",
    borderClass: "border-[#fb923c]",
    lightBg: "bg-[#fff7ed]",
  },
  conclusion: {
    label: "Conclusion",
    number: "05",
    bgClass: "bg-[#82d4bb]",
    textClass: "text-[#82d4bb]",
    borderClass: "border-[#82d4bb]",
    lightBg: "bg-[#f0fdf8]",
  },
  action_plan: {
    label: "Action Plan",
    number: "06",
    bgClass: "bg-[#f472b6]",
    textClass: "text-[#f472b6]",
    borderClass: "border-[#f472b6]",
    lightBg: "bg-[#fff0f7]",
  },
};

const READING_LIST_META = {
  label: "Reading List",
  number: "07",
  bgClass: "bg-[#6366f1]",
  textClass: "text-[#6366f1]",
  borderClass: "border-[#6366f1]",
  lightBg: "bg-[#eef2ff]",
};

function getStepMeta(step: LessonStep) {
  if (step === "reading_list") return READING_LIST_META;
  return PHASE_META[step];
}

const STEP_DESCRIPTIONS: Record<LessonStep, string> = {
  description: "What this technique is",
  feelings: "Why it connects emotionally",
  evaluation: "What works — and what doesn't",
  analysis: "The mechanics, step by step",
  conclusion: "Key takeaways to remember",
  action_plan: "Your writing practice",
  reading_list: "Books to deepen your learning",
};

const PHASE_ORDER: GibbsPhase[] = [
  "description",
  "feelings",
  "evaluation",
  "analysis",
  "conclusion",
  "action_plan",
];

// ─── Inline markdown ──────────────────────────────────────────────────────────

function inlineMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(
      /`(.*?)`/g,
      '<code class="bg-gray-100 px-1 rounded text-sm font-mono">$1</code>'
    );
}

// ─── Markdown renderer (line-by-line for reliability) ─────────────────────────

function RenderMarkdown({ content }: { content: string }) {
  const lines = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const nodes: React.ReactNode[] = [];
  let i = 0;
  let keyIdx = 0;

  while (i < lines.length) {
    const t = lines[i].trim();
    if (!t) {
      i++;
      continue;
    }

    if (t.startsWith("### ")) {
      nodes.push(
        <h4 key={keyIdx++} className="text-sm font-semibold text-gray-800 mt-4 mb-1.5">
          {t.slice(4)}
        </h4>
      );
      i++;
      continue;
    }

    if (t.startsWith("## ")) {
      nodes.push(
        <h3 key={keyIdx++} className="text-base font-bold text-gray-900 mt-5 mb-2">
          {t.slice(3)}
        </h3>
      );
      i++;
      continue;
    }

    if (t.startsWith("# ")) {
      nodes.push(
        <h2 key={keyIdx++} className="text-lg font-bold text-gray-900 mt-5 mb-2">
          {t.slice(2)}
        </h2>
      );
      i++;
      continue;
    }

    // Bullet list — collect consecutive items
    if (t.match(/^[-*•]\s/)) {
      const items: string[] = [];
      while (i < lines.length) {
        const lt = lines[i].trim();
        if (lt.match(/^[-*•]\s/)) {
          items.push(lt.replace(/^[-*•]\s/, ""));
          i++;
        } else if (!lt) {
          i++;
          break;
        } else {
          break;
        }
      }
      nodes.push(
        <ul key={keyIdx++} className="my-3 space-y-2 pl-1">
          {items.map((item, j) => (
            <li key={j} className="flex gap-2.5 text-[15px] text-gray-700 leading-relaxed">
              <span className="mt-[9px] w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0" />
              <span dangerouslySetInnerHTML={{ __html: inlineMarkdown(item) }} />
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Numbered list — collect consecutive items
    if (t.match(/^\d+[.)]\s/)) {
      const items: string[] = [];
      while (i < lines.length) {
        const lt = lines[i].trim();
        if (lt.match(/^\d+[.)]\s/)) {
          items.push(lt.replace(/^\d+[.)]\s/, ""));
          i++;
        } else if (!lt) {
          i++;
          break;
        } else {
          break;
        }
      }
      nodes.push(
        <ol key={keyIdx++} className="my-3 space-y-2 list-decimal list-outside pl-5">
          {items.map((item, j) => (
            <li
              key={j}
              className="text-[15px] text-gray-700 leading-relaxed pl-1"
              dangerouslySetInnerHTML={{ __html: inlineMarkdown(item) }}
            />
          ))}
        </ol>
      );
      continue;
    }

    // Regular paragraph — collect consecutive non-special lines
    const paras: string[] = [];
    while (i < lines.length) {
      const lt = lines[i].trim();
      if (!lt) {
        i++;
        break;
      }
      if (lt.startsWith("#") || lt.match(/^[-*•]\s/) || lt.match(/^\d+[.)]\s/)) {
        break;
      }
      paras.push(lt);
      i++;
    }
    if (paras.length > 0) {
      nodes.push(
        <p
          key={keyIdx++}
          className="text-[15px] text-gray-700 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: inlineMarkdown(paras.join(" ")) }}
        />
      );
    }
  }

  return <div className="space-y-3">{nodes}</div>;
}

// ─── CraftBlock renderer ───────────────────────────────────────────────────────

function CraftBlockRenderer({ block }: { block: CraftBlock }) {
  switch (block.type) {
    case "text":
      return <RenderMarkdown content={block.content} />;
    case "passage":
      return (
        <blockquote className="rounded-xl bg-amber-50 border-l-4 border-[#F59E42] px-5 py-4 text-gray-800 text-[15px] leading-relaxed italic">
          {block.content}
        </blockquote>
      );
    case "annotation":
      return (
        <div className="rounded-lg bg-blue-50/60 border-l-4 border-[#5dade2] pl-4 pr-4 py-3 text-[14px] leading-relaxed">
          <RenderMarkdown content={block.content} />
        </div>
      );
    case "prompt":
      // Handled inline in WritingWorkshopPanel
      return null;
    default:
      return null;
  }
}

// ─── Reading List Panel ────────────────────────────────────────────────────────

function ReadingListPanel({
  books,
  lessonId,
}: {
  books: ReadingListBook[];
  lessonId: string;
}) {
  const storageKey = `wa_reading_${lessonId}`;
  const [readSet, setReadSet] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) setReadSet(new Set(JSON.parse(saved) as string[]));
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  function toggleRead(title: string) {
    setReadSet((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      localStorage.setItem(storageKey, JSON.stringify([...next]));
      return next;
    });
  }

  function downloadCSV() {
    const header = "Title,Author,Exclusive Shelf,Date Added\n";
    const today = new Date().toISOString().split("T")[0].replace(/-/g, "/");
    const rows = books
      .map(
        (b) =>
          `"${b.title.replace(/"/g, '""')}","${b.author.replace(/"/g, '""')}","to-read","${today}"`
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "writeacademy-reading-list.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (books.length === 0) return null;

  const readCount = books.filter((b) => readSet.has(b.title)).length;

  return (
    <div className="rounded-2xl border border-[#6366f1]/20 overflow-hidden">
      {/* Header */}
      <div className="bg-[#eef2ff] border-b border-[#6366f1]/15 px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BookOpen className="h-4 w-4 text-[#6366f1]" />
          <div>
            <span className="text-sm font-bold text-gray-800">Your Reading List</span>
            <span className="text-xs text-gray-500 ml-2">
              {readCount}/{books.length} read
            </span>
          </div>
          {/* Progress track */}
          <div className="hidden sm:block w-20 h-1.5 rounded-full bg-[#6366f1]/20 overflow-hidden">
            <div
              className="h-full bg-[#6366f1] rounded-full transition-all duration-500"
              style={{
                width: `${books.length ? (readCount / books.length) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
        <button
          onClick={downloadCSV}
          className="flex items-center gap-1.5 rounded-lg bg-[#6366f1] px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors"
        >
          <Download className="h-3 w-3" />
          StoryGraph export
        </button>
      </div>

      {/* Book checklist */}
      <div className="divide-y divide-gray-100 bg-white">
        {books.map((book, i) => {
          const isRead = readSet.has(book.title);
          return (
            <button
              key={i}
              onClick={() => toggleRead(book.title)}
              className={`w-full flex items-start gap-4 px-5 py-4 text-left transition-colors group ${
                isRead ? "bg-[#f5f5ff]" : "hover:bg-gray-50/80"
              }`}
            >
              {/* Checkbox */}
              <div
                className={`mt-0.5 shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                  isRead
                    ? "bg-[#6366f1] border-[#6366f1]"
                    : "border-gray-300 group-hover:border-[#6366f1]"
                }`}
              >
                {isRead && <Check className="h-3 w-3 text-white" />}
              </div>

              {/* Book info */}
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-semibold leading-snug transition-colors ${
                    isRead ? "text-gray-400 line-through" : "text-gray-900"
                  }`}
                >
                  {book.title}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {book.author}
                  {book.year ? ` · ${book.year}` : ""}
                </p>
                {book.why && (
                  <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                    {book.why}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="bg-gray-50 px-5 py-3 border-t border-gray-100">
        <p className="text-xs text-gray-400">
          StoryGraph: Menu → Import → Goodreads CSV → upload the exported file
        </p>
      </div>
    </div>
  );
}

// ─── Writing Workshop Panel ────────────────────────────────────────────────────

interface WritingWorkshopPanelProps {
  craftBlocks: CraftBlock[];
  backendUrl: string;
  lessonId: string;
  craftTechnique: string;
}

function WritingWorkshopPanel({
  craftBlocks,
  backendUrl,
  lessonId,
  craftTechnique,
}: WritingWorkshopPanelProps) {
  const writingPrompt =
    [...craftBlocks].reverse().find((b) => b.type === "prompt")?.content ?? "";
  const coachBlocks = craftBlocks.filter((b) => b.type !== "prompt");

  const [draft, setDraft] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved">("idle");
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [vizImageUrl, setVizImageUrl] = useState<string | null>(null);
  const [vizLoading, setVizLoading] = useState(false);
  const [vizError, setVizError] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(`wa_draft_${lessonId}`);
    if (saved) setDraft(saved);
  }, [lessonId]);

  function handleSave() {
    localStorage.setItem(`wa_draft_${lessonId}`, draft);
    localStorage.setItem(`wa_complete_${lessonId}`, "true");
    setSaveStatus("saved");
    window.dispatchEvent(
      new CustomEvent("wa_lesson_saved", { detail: { lessonId } })
    );
    setTimeout(() => setSaveStatus("idle"), 2000);
  }

  async function handleFeedback() {
    if (!draft.trim()) return;
    setFeedbackText("");
    setFeedbackError(null);
    setFeedbackLoading(true);
    try {
      const res = await fetch(`${backendUrl}/feedback`, {
        method: "POST",
        headers: API_HEADERS,
        body: JSON.stringify({
          draft_text: draft,
          writing_prompt: writingPrompt,
          craft_technique: craftTechnique,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { detail?: string }).detail ?? `${res.status}`);
      }
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const block = JSON.parse(trimmed) as { type: string; content: string };
            if (block.type === "text")
              setFeedbackText((prev) => prev + block.content);
            else if (block.type === "error") setFeedbackError(block.content);
          } catch {
            /* skip malformed */
          }
        }
      }
    } catch (err) {
      setFeedbackError(err instanceof Error ? err.message : "Feedback failed");
    } finally {
      setFeedbackLoading(false);
    }
  }

  async function handleVisualize() {
    if (!draft.trim()) return;
    setVizImageUrl(null);
    setVizError(null);
    setVizLoading(true);
    try {
      const res = await fetch(`${backendUrl}/visualize`, {
        method: "POST",
        headers: API_HEADERS,
        body: JSON.stringify({ prompt: draft }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { detail?: string }).detail ?? `${res.status}`);
      }
      const blob = await res.blob();
      setVizImageUrl(URL.createObjectURL(blob));
    } catch (err) {
      setVizError(err instanceof Error ? err.message : "Visualization failed");
    } finally {
      setVizLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-[#f472b6]/25 overflow-hidden shadow-sm mt-6">
      {/* ── Craft Coach: context, passage, annotation ── */}
      {coachBlocks.length > 0 && (
        <div className="bg-[#fdf5fb] px-6 py-6 border-b border-[#f472b6]/15">
          <div className="flex items-center gap-2 mb-5">
            <Sparkles className="h-3.5 w-3.5 text-[#f472b6]" />
            <span className="text-xs font-bold text-[#f472b6] uppercase tracking-widest">
              Craft Coach
            </span>
            <span className="text-xs text-gray-400 ml-1">
              · Powered by Google Gemini
            </span>
          </div>
          <div className="space-y-5">
            {coachBlocks.map((block, i) => (
              <CraftBlockRenderer key={i} block={block} />
            ))}
          </div>
        </div>
      )}

      {/* ── Your Turn: prompt + draft ── */}
      <div className="bg-white px-6 py-6">
        {writingPrompt && (
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-5 h-5 rounded-full bg-[#f472b6] flex items-center justify-center shrink-0">
                <PenLine className="h-3 w-3 text-white" />
              </div>
              <span className="text-sm font-bold text-gray-900">Your Turn</span>
            </div>
            <div className="rounded-xl bg-[#fff8fc] border border-[#f472b6]/20 px-5 py-4">
              <p className="text-[15px] text-gray-700 leading-relaxed">
                {writingPrompt}
              </p>
            </div>
          </div>
        )}

        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Write your draft here…"
          rows={8}
          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-[15px] text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#f472b6]/30 focus:border-[#f472b6]/40 focus:bg-white resize-y transition-all leading-relaxed"
        />

        <div className="flex items-center gap-2.5 mt-4 flex-wrap">
          <button
            onClick={handleSave}
            disabled={!draft.trim()}
            className="flex items-center gap-2 rounded-lg bg-[#f472b6] px-4 py-2 text-sm font-semibold text-white hover:bg-pink-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {saveStatus === "saved" ? (
              <Check className="h-4 w-4" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saveStatus === "saved" ? "Saved!" : "Save"}
          </button>

          <button
            onClick={handleFeedback}
            disabled={!draft.trim() || feedbackLoading}
            className="flex items-center gap-2 rounded-lg bg-[#a78bfa] px-4 py-2 text-sm font-semibold text-white hover:bg-violet-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {feedbackLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MessageSquare className="h-4 w-4" />
            )}
            {feedbackLoading ? "Reading…" : "Get Feedback"}
          </button>

          <button
            onClick={handleVisualize}
            disabled={!draft.trim() || vizLoading}
            className="flex items-center gap-2 rounded-lg bg-[#5dade2] px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {vizLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Palette className="h-4 w-4" />
            )}
            {vizLoading ? "Illustrating…" : "Visualize"}
          </button>
        </div>
      </div>

      {/* ── Feedback stream ── */}
      {(feedbackText || feedbackLoading) && (
        <div className="border-t border-[#a78bfa]/15 bg-[#f9f7ff] px-6 py-5">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="h-4 w-4 text-[#a78bfa]" />
            <span className="text-sm font-bold text-gray-800">Feedback</span>
            {feedbackLoading && (
              <span className="flex items-center gap-1.5 text-xs text-[#a78bfa]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#a78bfa] animate-pulse inline-block" />
                Reading your draft…
              </span>
            )}
          </div>
          <p className="text-[15px] text-gray-700 leading-relaxed whitespace-pre-wrap">
            {feedbackText}
          </p>
          {feedbackError && (
            <p className="text-sm text-red-600 mt-2">{feedbackError}</p>
          )}
        </div>
      )}

      {/* ── Visualization ── */}
      {(vizImageUrl || vizError) && (
        <div className="border-t border-gray-100 bg-white px-6 py-5">
          {vizError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {vizError}
            </div>
          )}
          {vizImageUrl && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={vizImageUrl}
                alt="Gemini-generated scene illustration"
                className="rounded-xl w-full max-w-lg border border-gray-200 shadow-sm"
              />
              <p className="text-xs text-gray-400 mt-2">
                AI-generated illustration · Powered by Google Gemini
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Loading skeleton ──────────────────────────────────────────────────────────

function LoadingSkeleton({ craftTechnique }: { craftTechnique: string }) {
  return (
    <div className="animate-pulse">
      <div className="flex items-start mb-10 gap-1">
        {PHASE_ORDER.map((_, i) => (
          <Fragment key={i}>
            <div className="flex flex-col items-center shrink-0">
              <div className="w-10 h-10 rounded-full bg-gray-200" />
              <div className="mt-2 h-2 bg-gray-100 rounded w-14 hidden sm:block" />
            </div>
            {i < PHASE_ORDER.length - 1 && (
              <div className="h-0.5 w-6 rounded-full bg-gray-100 mt-5 shrink-0" />
            )}
          </Fragment>
        ))}
      </div>
      <div className="space-y-4">
        <div className="h-5 bg-gray-200 rounded-lg w-2/5" />
        <div className="space-y-2.5 mt-2">
          <div className="h-4 bg-gray-100 rounded w-full" />
          <div className="h-4 bg-gray-100 rounded w-[95%]" />
          <div className="h-4 bg-gray-100 rounded w-4/5" />
        </div>
        <div className="h-24 bg-gray-100 rounded-xl w-full" />
        <div className="space-y-2.5">
          <div className="h-4 bg-gray-100 rounded w-full" />
          <div className="h-4 bg-gray-100 rounded w-3/4" />
        </div>
      </div>
      <p className="text-xs text-gray-400 mt-8 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-[#F59E42] animate-pulse inline-block" />
        Generating your personalised{" "}
        <strong className="text-gray-600">{craftTechnique}</strong> lesson with Gemini…
      </p>
    </div>
  );
}

// ─── Phase stepper ─────────────────────────────────────────────────────────────

function PhasesStepper({
  steps,
  modules,
  currentStep,
  onSelect,
}: {
  steps: LessonStep[];
  modules: GibbsModule[];
  currentStep: LessonStep;
  onSelect: (step: LessonStep) => void;
}) {
  const currentIndex = steps.indexOf(currentStep);

  return (
    <div className="flex items-start mb-8 overflow-x-auto pb-2">
      {steps.map((step, i) => {
        const meta = getStepMeta(step);
        // A phase is available if it has a module; the reading_list step is always available
        const isAvailable =
          step === "reading_list"
            ? true
            : !!modules.find((m) => m.phase === step);
        const isActive = step === currentStep;
        const isPast = i < currentIndex;

        return (
          <Fragment key={step}>
            {/* Step circle + label */}
            <div className="flex flex-col items-center shrink-0">
              <button
                onClick={() => isAvailable && onSelect(step)}
                disabled={!isAvailable}
                aria-label={`Step ${i + 1}: ${meta.label}`}
                className={[
                  "w-10 h-10 rounded-full text-sm font-bold border-2 flex items-center justify-center transition-all",
                  isActive
                    ? `${meta.bgClass} text-white border-transparent shadow-md scale-110`
                    : isPast
                    ? `bg-white ${meta.borderClass} ${meta.textClass} hover:scale-105 cursor-pointer`
                    : isAvailable
                    ? `bg-white ${meta.borderClass} ${meta.textClass} hover:scale-105 cursor-pointer`
                    : "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed",
                ].join(" ")}
              >
                {isPast ? <Check className="h-3.5 w-3.5" /> : meta.number}
              </button>
              <span
                className={`mt-2 text-[10px] font-semibold leading-tight text-center hidden sm:block transition-colors ${
                  isActive ? meta.textClass : "text-gray-400"
                }`}
                style={{ width: "52px" }}
              >
                {meta.label}
              </span>
            </div>

            {/* Connector line */}
            {i < steps.length - 1 && (
              <div
                className={`h-0.5 shrink-0 mx-0.5 mt-5 rounded-full transition-colors ${
                  i < currentIndex ? meta.bgClass : "bg-gray-200"
                }`}
                // Narrower connectors to fit 7 steps
                style={{ width: "clamp(8px, 2.5vw, 28px)" }}
              />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

interface StructuredLessonProps {
  lessonId: string;
  lessonTitle: string;
  lessonContent: string;
  craftTechnique: string;
  craftContext?: string;
  student: StudentProfile;
}

export function StructuredLesson({
  lessonId,
  lessonTitle,
  lessonContent,
  craftTechnique,
  craftContext = "",
  student,
}: StructuredLessonProps) {
  const [lessonData, setLessonData] = useState<StructuredLessonData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<LessonStep>("description");

  const backendUrl =
    process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8123";

  async function loadLesson() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${backendUrl}/structure-lesson`, {
        method: "POST",
        headers: API_HEADERS,
        body: JSON.stringify({
          lesson_id: lessonId,
          lesson_title: lessonTitle,
          lesson_content: lessonContent,
          craft_technique: craftTechnique,
          craft_context: craftContext,
          student,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          (data as { detail?: string }).detail ?? `Backend error ${res.status}`
        );
      }
      const data: StructuredLessonData = await res.json();
      setLessonData(data);
      setCurrentStep("description");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLesson();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId]);

  // Build the full step list — 6 Gibbs phases + optional Reading List (7th)
  const hasReadingList = (lessonData?.reading_list?.length ?? 0) > 0;
  const allSteps: LessonStep[] = hasReadingList
    ? [...PHASE_ORDER, "reading_list"]
    : [...PHASE_ORDER];

  const currentStepIndex = allSteps.indexOf(currentStep);
  const stepMeta = getStepMeta(currentStep);

  const currentModule =
    currentStep !== "reading_list"
      ? lessonData?.modules.find((m) => m.phase === currentStep)
      : null;

  return (
    <section className="mt-8">
      {/* ── Section label ── */}
      <div className="flex items-center gap-2 mb-5">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100">
          <Sparkles className="h-3.5 w-3.5 text-[#F59E42]" />
          <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">
            AI Craft Coach
          </span>
        </div>
        {!loading && lessonData && (
          <span className="text-xs text-gray-500 font-medium">
            {craftTechnique}
          </span>
        )}
        <span className="text-xs text-gray-400 ml-auto hidden sm:inline">
          Powered by Google Gemini
        </span>
      </div>

      {/* ── Main card ── */}
      <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm">
        {/* Phase-color stripe */}
        {lessonData && !loading && (
          <div className={`h-1 ${stepMeta.bgClass} transition-all duration-300`} />
        )}

        <div className="p-6 sm:p-8">
          {/* Loading */}
          {loading && <LoadingSkeleton craftTechnique={craftTechnique} />}

          {/* Error */}
          {!loading && error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-red-700 mb-0.5">
                  Generation failed
                </p>
                <p className="text-xs text-red-500">{error}</p>
              </div>
              <button
                onClick={loadLesson}
                className="flex items-center gap-1.5 shrink-0 rounded-lg bg-red-600 text-white px-3 py-2 text-xs font-semibold hover:bg-red-700 transition-colors"
              >
                <RotateCcw className="h-3 w-3" /> Retry
              </button>
            </div>
          )}

          {/* Loaded */}
          {!loading && lessonData && (
            <>
              <PhasesStepper
                steps={allSteps}
                modules={lessonData.modules}
                currentStep={currentStep}
                onSelect={setCurrentStep}
              />

              {/* ── Reading List step ── */}
              {currentStep === "reading_list" && lessonData.reading_list && (
                <div key="reading_list">
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="text-xs font-bold uppercase tracking-widest text-[#6366f1]">
                      Reading List
                    </span>
                    <span className="text-xs text-gray-400 hidden sm:inline">
                      {STEP_DESCRIPTIONS.reading_list}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2 leading-snug">
                    Your Recommended Reading
                  </h2>
                  <p className="text-[15px] text-gray-500 mb-6 leading-relaxed">
                    These books will deepen what you&apos;ve learned. Check them
                    off as you read them — your progress is saved automatically.
                  </p>
                  <ReadingListPanel
                    books={lessonData.reading_list}
                    lessonId={lessonId}
                  />
                </div>
              )}

              {/* ── Gibbs phase step ── */}
              {currentStep !== "reading_list" && currentModule && (
                <div key={currentStep}>
                  {/* Phase label */}
                  <div className="flex items-baseline gap-2 mb-3">
                    <span
                      className={`text-xs font-bold uppercase tracking-widest ${stepMeta.textClass}`}
                    >
                      {stepMeta.label}
                    </span>
                    <span className="text-xs text-gray-400 hidden sm:inline">
                      {STEP_DESCRIPTIONS[currentStep]}
                    </span>
                  </div>

                  {/* Module title */}
                  <h2 className="text-xl font-bold text-gray-900 mb-5 leading-snug">
                    {currentModule.title}
                  </h2>

                  {/* Module content */}
                  <RenderMarkdown content={currentModule.content} />

                  {/* Infographic — Analysis phase */}
                  {currentModule.image_base64 &&
                    currentModule.phase !== "action_plan" && (
                      <div className="mt-6">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={currentModule.image_base64}
                          alt={`${stepMeta.label} infographic`}
                          className="rounded-xl w-full max-w-2xl border border-gray-200 shadow-sm"
                        />
                        <p className="text-xs text-gray-400 mt-2">
                          AI-generated infographic · Powered by Google Gemini
                        </p>
                      </div>
                    )}

                  {/* Action Plan: illustration + Writing Workshop */}
                  {currentModule.phase === "action_plan" && (
                    <>
                      {currentModule.image_base64 && (
                        <div className="mt-6">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={currentModule.image_base64}
                            alt="Writing exercise illustration"
                            className="rounded-xl w-full max-w-lg border border-gray-200 shadow-sm"
                          />
                          <p className="text-xs text-gray-400 mt-2">
                            AI-generated illustration · Powered by Google Gemini
                          </p>
                        </div>
                      )}
                      <WritingWorkshopPanel
                        craftBlocks={lessonData.craft_blocks}
                        backendUrl={backendUrl}
                        lessonId={lessonId}
                        craftTechnique={craftTechnique}
                      />
                    </>
                  )}
                </div>
              )}

              {/* ── Step navigation ── */}
              <div className="flex items-center justify-between mt-10 pt-5 border-t border-gray-100">
                <button
                  onClick={() => setCurrentStep(allSteps[currentStepIndex - 1])}
                  disabled={currentStepIndex === 0}
                  className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 disabled:opacity-0 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                  {currentStepIndex > 0
                    ? getStepMeta(allSteps[currentStepIndex - 1]).label
                    : ""}
                </button>

                <span className="text-xs text-gray-400 tabular-nums">
                  {currentStepIndex + 1} / {allSteps.length}
                </span>

                {currentStepIndex < allSteps.length - 1 ? (
                  <button
                    onClick={() =>
                      setCurrentStep(allSteps[currentStepIndex + 1])
                    }
                    className={`flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-all hover:scale-105 active:scale-95 shadow-sm ${
                      getStepMeta(allSteps[currentStepIndex + 1]).bgClass
                    }`}
                  >
                    {getStepMeta(allSteps[currentStepIndex + 1]).label}
                    <ChevronRight className="h-4 w-4" />
                  </button>
                ) : (
                  <div />
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
