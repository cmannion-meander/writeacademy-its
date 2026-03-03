"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ChevronRight, ArrowLeft, Sparkles, Star } from "lucide-react";
import { LoadingPainter } from "@/components/common/loading-painter";
import { API_HEADERS } from "@/lib/api-client";
import { getOrCreateUid, saveOnboardingResult, seedDemoData } from "@/lib/storage";
import { cn } from "@/lib/utils";
import type { OnboardingResult, SkillAssessment, SessionPlan } from "@/lib/types";

type Step = 1 | 2 | 3 | 4 | 5;

interface FormData {
  displayName: string;
  storyTitle: string;
  characterName: string;
  premise: string;
  characterDescription: string;
  worldDescription: string;
  targetAge: string;
  writingSample: string;
}

const TARGET_AGES = [
  { value: "3-5", label: "3–5 years (picture book)" },
  { value: "5-7", label: "5–7 years (early reader)" },
  { value: "6-8", label: "6–8 years (illustrated chapter)" },
  { value: "8-10", label: "8–10 years (chapter book)" },
];

const SKILL_COLORS: Record<string, string> = {
  not_assessed: "bg-gray-100 text-gray-500",
  developing:   "bg-amber-100 text-amber-700",
  competent:    "bg-blue-100 text-blue-700",
  strong:       "bg-green-100 text-green-700",
};

const SKILL_LABELS: Record<string, string> = {
  sensory_detail:  "Sensory Detail",
  character_voice: "Character Voice",
  show_dont_tell:  "Show, Don't Tell",
  story_structure: "Story Structure",
  visual_thinking: "Visual Thinking",
};

const LEVEL_LABELS: Record<string, string> = {
  not_assessed: "Not yet assessed",
  developing:   "Developing",
  competent:    "Competent",
  strong:       "Strong",
};

// ─── Step progress dots ────────────────────────────────────────────────────────

function ProgressDots({ step }: { step: Step }) {
  const TOTAL_VISIBLE = 3; // Steps 1–3 shown; 4 is loading, 5 is result
  return (
    <div className="flex items-center gap-2">
      {[1, 2, 3].map(n => (
        <div
          key={n}
          className={cn(
            "h-2 rounded-full transition-all duration-300",
            step >= n
              ? "w-6 bg-[#F59E42]"
              : "w-2 bg-gray-200"
          )}
        />
      ))}
    </div>
  );
}

// ─── Reusable field ────────────────────────────────────────────────────────────

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-semibold text-gray-700">{label}</label>
      {hint && <p className="text-xs text-gray-400">{hint}</p>}
      {children}
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F59E42] focus:border-transparent transition-shadow";

// ─── Main component ────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8123";

  const [step, setStep] = useState<Step>(1);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OnboardingResult | null>(null);
  const [demoLoading, setDemoLoading] = useState(false);

  const [form, setForm] = useState<FormData>({
    displayName:          "",
    storyTitle:           "",
    characterName:        "",
    premise:              "",
    characterDescription: "",
    worldDescription:     "",
    targetAge:            "5-7",
    writingSample:        "",
  });

  function set(field: keyof FormData) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value }));
  }

  function goBack() {
    if (step > 1 && step < 4) setStep((step - 1) as Step);
  }

  // Step 1 → 2
  function handleStep1() {
    if (!form.displayName.trim()) return;
    setStep(2);
  }

  // Step 2 → 3
  function handleStep2() {
    const { storyTitle, characterName, premise, characterDescription, worldDescription } = form;
    if (!storyTitle.trim() || !characterName.trim() || !premise.trim() || !characterDescription.trim() || !worldDescription.trim()) {
      setError("Please fill in all fields.");
      return;
    }
    setError(null);
    setStep(3);
  }

  // Step 3 → 4 (POST /onboard)
  async function handleStep3() {
    if (form.writingSample.trim().split(/\s+/).length < 20) {
      setError("Please write at least 20 words so we can personalise your experience.");
      return;
    }
    setError(null);
    setStep(4); // show loading

    const uid = getOrCreateUid();
    try {
      const resp = await fetch(`${backendUrl}/onboard`, {
        method: "POST",
        headers: API_HEADERS,
        body: JSON.stringify({
          uid,
          display_name:          form.displayName,
          writing_sample:        form.writingSample,
          story_title:           form.storyTitle,
          character_name:        form.characterName,
          character_description: form.characterDescription,
          world_description:     form.worldDescription,
          premise:               form.premise,
          target_age:            form.targetAge,
        }),
      });

      if (!resp.ok) {
        const detail = await resp.json().catch(() => ({ detail: resp.statusText }));
        throw new Error(detail.detail ?? resp.statusText);
      }

      const data: OnboardingResult = await resp.json();
      saveOnboardingResult(data);
      setResult(data);
      setStep(5);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      setStep(3);
    }
  }

  function handleBeginSession() {
    router.push("/session");
  }

  async function handleDemoMode() {
    setDemoLoading(true);
    setError(null);
    try {
      const resp = await fetch(`${backendUrl}/demo/seed`);
      if (!resp.ok) {
        const detail = await resp.json().catch(() => ({ detail: resp.statusText }));
        throw new Error(detail.detail ?? resp.statusText);
      }
      const data = await resp.json() as {
        onboarding: OnboardingResult;
        session_plans: Record<string, SessionPlan>;
        pages: { page_number: number; text_draft: string }[];
      };
      seedDemoData(data);
      router.push("/session");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Demo mode failed. Is the backend running?");
      setDemoLoading(false);
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fef3e2] to-white flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-4 max-w-2xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <Image src="/logo-transparent.png" alt="WriteAcademy" width={28} height={24} className="h-6 w-auto" />
          <span className="font-bold text-gray-800 text-sm tracking-tight">WriteAcademy</span>
        </div>
        {step >= 2 && step <= 3 && (
          <ProgressDots step={step} />
        )}
      </header>

      {/* Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        <div className="w-full max-w-lg">

          {/* ── Step 1: Welcome ────────────────────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-8 wa-animate-fade-up">
              <div className="text-center space-y-3">
                <div className="inline-flex items-center gap-2 bg-amber-100 rounded-full px-3 py-1.5 mb-2">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  <span className="text-xs font-bold text-amber-700 uppercase tracking-wide">
                    Gemini Creative Storyteller
                  </span>
                </div>
                <h1 className="text-3xl font-bold text-gray-900 leading-tight">
                  Write your first<br />illustrated storybook.
                </h1>
                <p className="text-gray-500 text-sm leading-relaxed max-w-sm mx-auto">
                  Four short sessions. One complete book. Personalised to how you write.
                </p>
              </div>

              {error && step === 1 && (
                <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
              )}

              {/* Name input */}
              <div className="space-y-3">
                <Field label="What should we call you?" hint="Your first name or pen name">
                  <input
                    type="text"
                    className={inputClass}
                    placeholder="e.g. Maya"
                    value={form.displayName}
                    onChange={set("displayName")}
                    onKeyDown={e => e.key === "Enter" && handleStep1()}
                    autoFocus
                  />
                </Field>
              </div>

              <button
                onClick={handleStep1}
                disabled={!form.displayName.trim()}
                className="w-full flex items-center justify-center gap-2 bg-[#F59E42] hover:bg-amber-500 disabled:opacity-40 text-white font-bold py-4 rounded-2xl text-sm transition-all hover:scale-[1.01] active:scale-[0.99] shadow-md shadow-amber-200"
              >
                Let's begin
                <ChevronRight className="h-4 w-4" />
              </button>

              {/* Social proof */}
              <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400">
                <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                <span>Takes about 5 minutes to set up · No account needed</span>
              </div>

              {/* Demo mode */}
              <div className="pt-2 border-t border-gray-100">
                <button
                  onClick={handleDemoMode}
                  disabled={demoLoading}
                  className="w-full flex items-center justify-center gap-2 text-sm text-gray-400 hover:text-gray-600 py-2 transition-colors disabled:opacity-50"
                >
                  {demoLoading ? "Loading demo…" : "Skip to demo with a pre-written story"}
                </button>
              </div>
            </div>
          )}

          {/* ── Step 2: Story Setup ─────────────────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-6 wa-animate-fade-up">
              <div className="space-y-1">
                <button
                  onClick={goBack}
                  className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 mb-4"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back
                </button>
                <h2 className="text-2xl font-bold text-gray-900">
                  Tell us about your story, {form.displayName}.
                </h2>
                <p className="text-sm text-gray-500">
                  This becomes your storybook — make it yours.
                </p>
              </div>

              {error && (
                <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
              )}

              <div className="space-y-4">
                <Field label="Story title" hint="What will your book be called?">
                  <input
                    type="text"
                    className={inputClass}
                    placeholder="e.g. The Last Sky Whale"
                    value={form.storyTitle}
                    onChange={set("storyTitle")}
                  />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Main character name">
                    <input
                      type="text"
                      className={inputClass}
                      placeholder="e.g. Mira"
                      value={form.characterName}
                      onChange={set("characterName")}
                    />
                  </Field>
                  <Field label="Target age">
                    <select
                      className={inputClass}
                      value={form.targetAge}
                      onChange={set("targetAge")}
                    >
                      {TARGET_AGES.map(a => (
                        <option key={a.value} value={a.value}>{a.label}</option>
                      ))}
                    </select>
                  </Field>
                </div>

                <Field
                  label="One-sentence premise"
                  hint="Who wants what, and what's in the way?"
                >
                  <input
                    type="text"
                    className={inputClass}
                    placeholder="e.g. A lonely sky whale must find her voice before the last song fades."
                    value={form.premise}
                    onChange={set("premise")}
                  />
                </Field>

                <Field
                  label="Describe your main character"
                  hint="Age, personality, what makes them special"
                >
                  <textarea
                    className={cn(inputClass, "resize-none")}
                    rows={2}
                    placeholder="e.g. Mira is eight years old, curious and a little shy, with wild curly hair and paint-stained fingers."
                    value={form.characterDescription}
                    onChange={set("characterDescription")}
                  />
                </Field>

                <Field
                  label="Describe your story world"
                  hint="Where and when does the story happen?"
                >
                  <textarea
                    className={cn(inputClass, "resize-none")}
                    rows={2}
                    placeholder="e.g. A floating archipelago of cloud islands, where every island has its own colour and weather."
                    value={form.worldDescription}
                    onChange={set("worldDescription")}
                  />
                </Field>
              </div>

              <button
                onClick={handleStep2}
                className="w-full flex items-center justify-center gap-2 bg-[#F59E42] hover:bg-amber-500 text-white font-bold py-4 rounded-2xl text-sm transition-all hover:scale-[1.01] active:scale-[0.99] shadow-md shadow-amber-200"
              >
                Next — my writing sample
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* ── Step 3: Writing Sample ──────────────────────────────────────── */}
          {step === 3 && (
            <div className="space-y-6 wa-animate-fade-up">
              <div>
                <button
                  onClick={goBack}
                  className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 mb-4"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back
                </button>
                <h2 className="text-2xl font-bold text-gray-900">
                  Show us how you write.
                </h2>
                <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                  Write the opening of <em>{form.storyTitle}</em> — just a paragraph or two.
                  Don&apos;t overthink it. This helps us personalise every session to your level.
                </p>
              </div>

              {/* Prompt card */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <p className="text-xs font-semibold text-amber-700 mb-1">Writing prompt</p>
                <p className="text-sm text-amber-900 leading-relaxed italic">
                  Where does your story begin? Set the scene. Introduce {form.characterName || "your character"}.
                  What do they see, hear, or feel in this first moment?
                </p>
              </div>

              {error && (
                <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
              )}

              <Field
                label="Your opening paragraph"
                hint={`${form.writingSample.trim().split(/\s+/).filter(Boolean).length} words — aim for 80–200`}
              >
                <textarea
                  className={cn(inputClass, "resize-none leading-relaxed")}
                  rows={8}
                  placeholder="Start writing here…"
                  value={form.writingSample}
                  onChange={set("writingSample")}
                  autoFocus
                />
              </Field>

              <button
                onClick={handleStep3}
                disabled={form.writingSample.trim().split(/\s+/).filter(Boolean).length < 20}
                className="w-full flex items-center justify-center gap-2 bg-[#F59E42] hover:bg-amber-500 disabled:opacity-40 text-white font-bold py-4 rounded-2xl text-sm transition-all hover:scale-[1.01] active:scale-[0.99] shadow-md shadow-amber-200"
              >
                Analyse my writing
                <Sparkles className="h-4 w-4" />
              </button>
              <p className="text-center text-xs text-gray-400">
                Takes about 15 seconds · Powered by Gemini 2.5 Flash
              </p>
            </div>
          )}

          {/* ── Step 4: Analysing (loading) ─────────────────────────────────── */}
          {step === 4 && (
            <div className="text-center space-y-2 wa-animate-fade-in">
              <LoadingPainter
                message="Reading your writing…"
                subMessage="Crafting your personalised story plan"
                size="lg"
              />
              <p className="text-xs text-gray-400">
                Gemini is assessing your storytelling strengths
              </p>
            </div>
          )}

          {/* ── Step 5: Plan reveal ──────────────────────────────────────────── */}
          {step === 5 && result && (
            <div className="space-y-6 wa-animate-fade-up">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-2 bg-green-100 px-3 py-1.5 rounded-full">
                  <Star className="h-3.5 w-3.5 text-green-600 fill-green-400" />
                  <span className="text-xs font-bold text-green-700 uppercase tracking-wide">
                    Your plan is ready
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {form.displayName}, here&apos;s your storybook journey.
                </h2>
                <p className="text-sm text-gray-500">
                  We assessed 5 craft dimensions. Every session adapts to your strengths.
                </p>
              </div>

              {/* Skills grid */}
              <div className="grid grid-cols-1 gap-2">
                {result.skills.map(skill => (
                  <SkillBadge key={skill.dimension} skill={skill} />
                ))}
              </div>

              {/* Session 1 plan card */}
              {result.session_plan && (
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl px-5 py-4 space-y-3">
                  <div>
                    <p className="text-xs font-bold text-amber-600 uppercase tracking-wide mb-1">
                      Session 1 · {result.session_plan.title}
                    </p>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {result.session_plan.story_beat}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {result.session_plan.techniques
                      .filter(t => t.mode !== "skip")
                      .map(t => (
                        <span
                          key={t.name}
                          className="text-xs bg-white border border-amber-200 text-amber-700 rounded-full px-3 py-1 font-medium"
                        >
                          {t.name.replace(/_/g, " ")}
                        </span>
                      ))}
                  </div>
                  <p className="text-xs text-gray-500">
                    Pages to write: {result.session_plan.target_pages.join(", ")} of 12
                  </p>
                </div>
              )}

              <button
                onClick={handleBeginSession}
                className="w-full flex items-center justify-center gap-2 bg-[#F59E42] hover:bg-amber-500 text-white font-bold py-4 rounded-2xl text-sm transition-all hover:scale-[1.01] active:scale-[0.99] shadow-md shadow-amber-200"
              >
                Begin Session 1
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// ─── Skill badge component ─────────────────────────────────────────────────────

function SkillBadge({ skill }: { skill: SkillAssessment }) {
  const colorClass = SKILL_COLORS[skill.level] ?? "bg-gray-100 text-gray-500";
  const label = SKILL_LABELS[skill.dimension] ?? skill.dimension.replace(/_/g, " ");
  const levelLabel = LEVEL_LABELS[skill.level] ?? skill.level;

  return (
    <div className="flex items-start gap-3 bg-white rounded-xl border border-gray-100 px-4 py-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-gray-800">{label}</span>
          <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", colorClass)}>
            {levelLabel}
          </span>
        </div>
        {skill.evidence && (
          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed line-clamp-2">
            {skill.evidence}
          </p>
        )}
      </div>
    </div>
  );
}
