"use client";

import { useState } from "react";
import { Sparkles, ChevronDown, Loader2 } from "lucide-react";
import type { CraftBlock } from "@/lib/types";

interface CraftCoachProps {
  defaultTechnique?: string;
  defaultContext?: string;
}

export function CraftCoach({
  defaultTechnique = "",
  defaultContext = "",
}: CraftCoachProps) {
  const [technique, setTechnique] = useState(defaultTechnique);
  const [context, setContext] = useState(defaultContext);
  const [blocks, setBlocks] = useState<CraftBlock[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  const backendUrl =
    process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8123";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBlocks([]);
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`${backendUrl}/craft-demo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          craft_technique: technique,
          context,
          api_key: "devkey123", // TODO: replace with session-based auth before production
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`${res.status}: ${text}`);
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
            const block = JSON.parse(trimmed) as CraftBlock;
            setBlocks((prev) => [...prev, block]);
          } catch {
            /* skip malformed */
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setBlocks([]);
    setError(null);
    setTechnique(defaultTechnique);
    setContext(defaultContext);
  }

  return (
    <section className="border border-gray-200 rounded-xl overflow-hidden mt-12">
      {/* Panel header */}
      <div className="bg-[#F59E42] px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Sparkles className="h-5 w-5 text-white" />
          <div>
            <h2 className="font-bold text-white text-base leading-none">
              Craft Coach
            </h2>
            <p className="text-xs text-orange-100 mt-0.5">
              Powered by Google Gemini
            </p>
          </div>
        </div>
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="text-white opacity-80 hover:opacity-100"
          aria-label={collapsed ? "Expand" : "Collapse"}
        >
          <ChevronDown
            className={`h-5 w-5 transition-transform ${collapsed ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      {!collapsed && (
        <div className="p-5 bg-white">
          {/* Intro text */}
          <p className="text-sm text-gray-600 mb-5">
            See this lesson's craft technique in action. Gemini will generate
            an annotated example passage and a personalised writing prompt — just
            for you.
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3 mb-6">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wide">
                Craft technique
              </label>
              <input
                type="text"
                value={technique}
                onChange={(e) => setTechnique(e.target.value)}
                placeholder="e.g. simplicity and repetition"
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F59E42] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wide">
                Context{" "}
                <span className="text-gray-400 font-normal normal-case">
                  (optional)
                </span>
              </label>
              <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="Any genre, age group, or scenario…"
                rows={2}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F59E42] focus:border-transparent resize-none"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 rounded-lg bg-[#F59E42] px-5 py-2 text-sm font-semibold text-white hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? "Generating…" : "Show me this in action"}
              </button>
              {blocks.length > 0 && !loading && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-sm text-gray-500 hover:text-gray-800 underline"
                >
                  Reset
                </button>
              )}
            </div>
          </form>

          {/* Error */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mb-4">
              {error}
            </div>
          )}

          {/* Loading placeholder */}
          {loading && blocks.length === 0 && (
            <div className="space-y-3">
              <div className="h-4 bg-gray-100 rounded animate-pulse w-3/4" />
              <div className="h-4 bg-gray-100 rounded animate-pulse w-full" />
              <div className="h-4 bg-gray-100 rounded animate-pulse w-5/6" />
            </div>
          )}

          {/* Streamed blocks */}
          {blocks.length > 0 && (
            <div className="space-y-4 border-t border-gray-100 pt-5">
              {blocks.map((block, i) => (
                <CraftBlockRenderer key={i} block={block} />
              ))}
              {loading && (
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <span className="w-2 h-2 rounded-full bg-[#F59E42] animate-pulse inline-block" />
                  More coming…
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function CraftBlockRenderer({ block }: { block: CraftBlock }) {
  switch (block.type) {
    case "text":
      return (
        <p className="text-sm text-gray-700 leading-relaxed">{block.content}</p>
      );

    case "passage":
      return (
        <blockquote className="rounded-lg bg-[#fef3e2] border-l-4 border-[#F59E42] px-5 py-4 text-gray-800 text-sm leading-relaxed italic">
          {block.content}
        </blockquote>
      );

    case "annotation":
      return (
        <div className="border-l-4 border-gray-300 pl-4 text-gray-500 text-sm italic leading-relaxed">
          {block.content}
        </div>
      );

    case "prompt":
      return (
        <div className="rounded-lg bg-[#f0fdf8] border border-[#82d4bb] px-5 py-4">
          <p className="text-xs font-bold text-[#6bc4a6] uppercase tracking-wide mb-2">
            Your turn:
          </p>
          <p className="text-sm text-gray-700 leading-relaxed">{block.content}</p>
        </div>
      );

    default:
      return null;
  }
}
