"use client";

import { useState, useCallback, useEffect } from "react";
import { ChevronLeft, ChevronRight, X, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StoryPage } from "@/lib/types";

interface StorybookViewerProps {
  title: string;
  authorName: string;
  pages: (StoryPage & { illustration_b64?: string })[];
  onClose: () => void;
}

/**
 * Full storybook viewer with page-turn animations.
 * Cover → content pages (illustration left, text right) → back cover.
 * Navigation via buttons + keyboard arrows.
 */
export function StorybookViewer({
  title,
  authorName,
  pages,
  onClose,
}: StorybookViewerProps) {
  // Page 0 = cover, 1..N = content, N+1 = back cover
  const totalSpreads = pages.length + 2;
  const [currentSpread, setCurrentSpread] = useState(0);
  const [flipDir, setFlipDir] = useState<"enter" | "exit" | null>(null);

  const goNext = useCallback(() => {
    if (currentSpread >= totalSpreads - 1) return;
    setFlipDir("exit");
    setTimeout(() => {
      setCurrentSpread(s => s + 1);
      setFlipDir("enter");
      setTimeout(() => setFlipDir(null), 350);
    }, 200);
  }, [currentSpread, totalSpreads]);

  const goPrev = useCallback(() => {
    if (currentSpread <= 0) return;
    setFlipDir("exit");
    setTimeout(() => {
      setCurrentSpread(s => s - 1);
      setFlipDir("enter");
      setTimeout(() => setFlipDir(null), 350);
    }, 200);
  }, [currentSpread]);

  // Keyboard navigation
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === " ") goNext();
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [goNext, goPrev, onClose]);

  const isCover = currentSpread === 0;
  const isBackCover = currentSpread === totalSpreads - 1;
  const contentPage = !isCover && !isBackCover ? pages[currentSpread - 1] : null;

  const flipClass = flipDir === "exit"
    ? "wa-flip-exit"
    : flipDir === "enter"
    ? "wa-flip-enter"
    : "";

  return (
    <div className="w-full space-y-4 wa-animate-fade-up">
      {/* Close + page counter */}
      <div className="flex items-center justify-between">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <X className="h-4 w-4" />
          Close book
        </button>
        <span className="text-xs text-gray-400 tabular-nums">
          {currentSpread + 1} of {totalSpreads}
        </span>
      </div>

      {/* Book container */}
      <div className="storybook-page relative">
        <div
          className={cn(
            "rounded-2xl overflow-hidden border border-amber-200/60 shadow-xl bg-white min-h-[400px]",
            flipClass
          )}
        >
          {/* Cover */}
          {isCover && (
            <div className="flex flex-col items-center justify-center min-h-[400px] bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 px-8 py-12 text-center">
              <BookOpen className="h-12 w-12 text-amber-400 mb-6" />
              <h1 className="text-3xl font-bold text-gray-900 font-serif leading-tight mb-3">
                {title}
              </h1>
              <p className="text-base text-gray-500">
                Written and illustrated by
              </p>
              <p className="text-lg font-semibold text-gray-700 mt-1">
                {authorName}
              </p>
              <div className="mt-8 flex items-center gap-2 text-xs text-amber-500">
                <span>A WriteAcademy Storybook</span>
              </div>
            </div>
          )}

          {/* Content page — storybook spread */}
          {contentPage && (
            <div className="flex flex-col min-h-[480px]">
              {/* Top: illustration — fills generously */}
              <div className="relative bg-amber-50/40 overflow-hidden">
                {contentPage.illustration_b64 ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={contentPage.illustration_b64}
                    alt={`Page ${contentPage.page_number}`}
                    className="w-full aspect-[16/10] object-cover"
                  />
                ) : (
                  <div className="w-full aspect-[16/10] flex items-center justify-center bg-amber-50">
                    <BookOpen className="h-12 w-12 text-amber-200" />
                  </div>
                )}
              </div>

              {/* Bottom: text — children's book typography */}
              <div
                className="flex-1 flex flex-col justify-center px-10 py-8 bg-[#fffdf8]"
                style={{ boxShadow: "inset 0 3px 6px -3px rgba(0,0,0,0.04)" }}
              >
                <p className="text-xl md:text-2xl text-gray-800 leading-relaxed font-serif whitespace-pre-wrap text-center">
                  {contentPage.text_draft}
                </p>
                <p className="text-xs text-amber-300 mt-6 text-center tabular-nums tracking-wider">
                  — {contentPage.page_number} —
                </p>
              </div>
            </div>
          )}

          {/* Back cover */}
          {isBackCover && (
            <div className="flex flex-col items-center justify-center min-h-[400px] bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 px-8 py-12 text-center">
              <p className="text-4xl font-serif font-bold text-gray-800 mb-4">
                The End
              </p>
              <div className="w-16 h-0.5 bg-amber-300 rounded-full mb-6" />
              <p className="text-sm text-gray-500 mb-1">
                {title}
              </p>
              <p className="text-xs text-gray-400">
                by {authorName}
              </p>
              <div className="mt-8 text-xs text-amber-400">
                Made with WriteAcademy
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={goPrev}
          disabled={currentSpread === 0}
          className="flex items-center justify-center h-10 w-10 rounded-full border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        {/* Spread dots */}
        <div className="flex gap-1.5">
          {Array.from({ length: totalSpreads }).map((_, i) => (
            <button
              key={i}
              onClick={() => {
                setFlipDir("exit");
                setTimeout(() => {
                  setCurrentSpread(i);
                  setFlipDir("enter");
                  setTimeout(() => setFlipDir(null), 350);
                }, 200);
              }}
              className={cn(
                "h-2 rounded-full transition-all",
                i === currentSpread
                  ? "w-6 bg-amber-400"
                  : "w-2 bg-gray-200 hover:bg-gray-300"
              )}
            />
          ))}
        </div>

        <button
          onClick={goNext}
          disabled={currentSpread === totalSpreads - 1}
          className="flex items-center justify-center h-10 w-10 rounded-full border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
