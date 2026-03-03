"use client";

import { useState } from "react";
import { ChevronRight, Sparkles } from "lucide-react";
import { MdText } from "@/components/common/md-text";
import type { SessionPlan, TechniqueAdaptation } from "@/lib/types";

interface WonderPhaseProps {
  plan: SessionPlan;
  sessionNumber: number;
  storyTitle: string;
  onComplete: () => void;
}

const TECHNIQUE_LABELS: Record<string, string> = {
  sensory_detail: "Sensory Detail",
  character_voice: "Character Voice",
  show_dont_tell: "Show Don't Tell",
  story_structure: "Story Structure",
  visual_thinking: "Visual Thinking",
};

const MODE_STYLES: Record<string, { label: string; className: string }> = {
  full:     { label: "Learning",  className: "bg-blue-100 text-blue-700" },
  compress: { label: "Refresher", className: "bg-amber-100 text-amber-700" },
  skip:     { label: "Applying",  className: "bg-green-100 text-green-700" },
};

/**
 * Act 1: Wonder (5 min)
 * Per session-ux.md: "Lead with feeling, not explanation.
 * Show a powerful example, ask how it made the learner feel, then reveal the technique."
 * Never opens with "Today we learn X."
 */
export function WonderPhase({ plan, sessionNumber, storyTitle, onComplete }: WonderPhaseProps) {
  const [stage, setStage] = useState<"example" | "question" | "technique">("example");

  const primaryTechnique = plan.techniques.find(t => t.mode === "full") ?? plan.techniques[0];

  return (
    <div className="max-w-2xl mx-auto space-y-8 wa-animate-fade-up">
      {/* Session badge */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-amber-100 px-3 py-1.5 rounded-full">
          <Sparkles className="h-3.5 w-3.5 text-amber-600" />
          <span className="text-xs font-bold text-amber-700 uppercase tracking-wide">
            Session {sessionNumber} · Act 1 of 3
          </span>
        </div>
        <span className="text-sm font-semibold text-gray-500">{plan.title}</span>
      </div>

      {/* Stage 1: The example */}
      {stage === "example" && (
        <div className="space-y-6 wa-animate-fade-up">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
              Read this carefully.
            </p>
            {/* Book-like blockquote — the wonder_example */}
            <blockquote className="relative bg-amber-50/60 border-l-4 border-[#F59E42] rounded-r-2xl px-7 py-6">
              <div className="text-lg md:text-xl text-gray-800 leading-relaxed font-serif italic">
                <MdText>{plan.wonder_example}</MdText>
              </div>
            </blockquote>
          </div>

          <button
            onClick={() => setStage("question")}
            className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors group"
          >
            <span>What did that just do to you?</span>
            <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      )}

      {/* Stage 2: The feeling question */}
      {stage === "question" && (
        <div className="space-y-6 wa-animate-fade-up">
          <blockquote className="bg-amber-50/60 border-l-4 border-[#F59E42] rounded-r-2xl px-7 py-6">
            <p className="text-lg md:text-xl text-gray-800 leading-relaxed font-serif italic">
              <MdText>{plan.wonder_example}</MdText>
            </p>
          </blockquote>

          <div className="bg-white border border-amber-200 rounded-2xl p-6 space-y-3">
            <p className="text-base md:text-lg font-medium text-gray-800 leading-relaxed">
              <MdText>{plan.wonder_prompt}</MdText>
            </p>
            <p className="text-sm text-gray-500">
              Take a moment. You&apos;ll use this feeling in your own writing in a moment.
            </p>
          </div>

          <button
            onClick={() => setStage("technique")}
            className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors group"
          >
            <span>I see it — show me the technique</span>
            <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      )}

      {/* Stage 3: Technique reveal + session plan */}
      {stage === "technique" && (
        <div className="space-y-6 wa-animate-fade-up">
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-6 py-5 border-b border-amber-100">
              <p className="text-xs font-bold text-amber-600 uppercase tracking-widest mb-1">
                Your session plan for "{storyTitle}"
              </p>
              <h2 className="text-xl font-bold text-gray-900">{plan.story_beat}</h2>
            </div>

            {/* Techniques */}
            <div className="px-6 py-5 space-y-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
                Craft techniques
              </p>
              {plan.techniques.map((t: TechniqueAdaptation) => {
                const modeStyle = MODE_STYLES[t.mode] ?? MODE_STYLES.full;
                return (
                  <div key={t.name} className="flex items-start gap-3">
                    <span
                      className={`mt-0.5 shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${modeStyle.className}`}
                    >
                      {modeStyle.label}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">
                        {TECHNIQUE_LABELS[t.name] ?? t.name}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{t.reason}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {primaryTechnique && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-5 py-4">
              <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-1">
                Your focus today
              </p>
              <p className="text-sm text-blue-800">
                <strong>{TECHNIQUE_LABELS[primaryTechnique.name] ?? primaryTechnique.name}</strong>
                {" "}— {primaryTechnique.reason}
              </p>
            </div>
          )}

          <button
            onClick={onComplete}
            className="w-full flex items-center justify-center gap-2 bg-[#F59E42] hover:bg-amber-500 text-white font-bold py-4 px-6 rounded-2xl text-base transition-all hover:scale-[1.01] active:scale-[0.99] shadow-md shadow-amber-200"
          >
            I&apos;m ready to write
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
}
