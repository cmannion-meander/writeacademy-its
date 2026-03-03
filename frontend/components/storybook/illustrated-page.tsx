"use client";

import { useState } from "react";
import { BookOpen, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface IllustratedPageProps {
  pageNumber: number;
  text: string;
  illustrationB64: string;
  title: string;
  onRegenerate?: () => void;
  regenerating?: boolean;
  /** True on first reveal — plays entrance animation */
  isNew?: boolean;
}

/**
 * Full storybook spread: illustration on the left, text on the right.
 * Always renders as a two-page book spread — never stacked vertically.
 * The illustration reveal is the most important UX moment in the app
 * (session-ux.md Rule 1).
 */
export function IllustratedPage({
  pageNumber,
  text,
  illustrationB64,
  title,
  onRegenerate,
  regenerating = false,
  isNew = false,
}: IllustratedPageProps) {
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <div
      className={cn(
        "rounded-2xl overflow-hidden border border-amber-200/60 shadow-lg bg-white",
        isNew && "wa-animate-fade-in"
      )}
    >
      {/*
        Book spread — always two columns, never stacked.
        Left page: illustration (60%). Right page: text (40%).
        Mimics an open picture book lying flat.
      */}
      <div className="grid grid-cols-[3fr_2fr] min-h-[340px]">

        {/* ── Left page: illustration ───────────────────────────────────── */}
        <div className="relative bg-amber-50/40 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={illustrationB64}
            alt={`Illustrated page ${pageNumber} of ${title}`}
            onLoad={() => setImageLoaded(true)}
            className={cn(
              "w-full h-full object-cover transition-opacity duration-700",
              imageLoaded ? "opacity-100" : "opacity-0"
            )}
          />
          {/* Shimmer while image decodes */}
          {!imageLoaded && (
            <div className="absolute inset-0 wa-shimmer" />
          )}

          {/* Page number badge — outer corner */}
          <div className="absolute top-3 left-3 bg-black/40 text-white text-xs font-bold px-2.5 py-1 rounded-full backdrop-blur-sm">
            p. {pageNumber}
          </div>

          {/* Regenerate — bottom-right of illustration */}
          {onRegenerate && (
            <button
              onClick={onRegenerate}
              disabled={regenerating}
              className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-black/40 hover:bg-black/60 text-white text-xs font-medium px-3 py-1.5 rounded-full backdrop-blur-sm transition-colors disabled:opacity-50"
            >
              <RefreshCw className={cn("h-3 w-3", regenerating && "animate-spin")} />
              {regenerating ? "Regenerating…" : "Regenerate"}
            </button>
          )}
        </div>

        {/* ── Right page: text ──────────────────────────────────────────── */}
        <div
          className="flex flex-col justify-between px-7 py-7 bg-[#fffdf8] border-l border-amber-100"
          style={{ boxShadow: "inset 3px 0 6px -3px rgba(0,0,0,0.06)" }} // spine shadow
        >
          {/* Book title — top */}
          <div className="flex items-center gap-2 mb-5">
            <BookOpen className="h-3.5 w-3.5 text-amber-300 shrink-0" />
            <span className="text-xs font-semibold text-amber-400 uppercase tracking-widest truncate">
              {title}
            </span>
          </div>

          {/* Story text — large, picture-book style */}
          <p className="text-lg text-gray-800 leading-snug flex-1 font-serif whitespace-pre-wrap">
            {text}
          </p>

          {/* Page number — outer bottom corner */}
          <p className="text-xs text-gray-300 mt-5 text-right tabular-nums">
            — {pageNumber} —
          </p>
        </div>

      </div>
    </div>
  );
}

/** Skeleton placeholder used while the page is loading */
export function IllustratedPageSkeleton({ pageNumber }: { pageNumber: number }) {
  return (
    <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm bg-white">
      <div className="grid grid-cols-[3fr_2fr] min-h-[340px]">
        <div className="wa-shimmer" />
        <div className="p-8 space-y-3 border-l border-gray-100 bg-[#fffdf8]">
          <div className="h-3 wa-shimmer rounded w-1/3" />
          <div className="h-5 wa-shimmer rounded w-full" />
          <div className="h-5 wa-shimmer rounded w-[90%]" />
          <div className="h-5 wa-shimmer rounded w-4/5" />
          <p className="text-xs text-gray-300 pt-4">Generating page {pageNumber}…</p>
        </div>
      </div>
    </div>
  );
}
