"use client";

import { useState } from "react";

type BlockType = "text" | "passage" | "annotation" | "prompt";

interface Block {
  type: BlockType;
  content: string;
}

export default function CraftDemoPage() {
  const [technique, setTechnique] = useState("suspense");
  const [context, setContext] = useState("");
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

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
          api_key: "devkey123",
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
            const block: Block = JSON.parse(trimmed);
            setBlocks((prev) => [...prev, block]);
          } catch {
            // skip malformed lines
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-stone-50 text-stone-900">
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight mb-1">
            WriteAcademy
          </h1>
          <p className="text-stone-500 text-sm">
            Craft Coach &mdash; learn by seeing technique in action
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 mb-10">
          <div>
            <label
              htmlFor="technique"
              className="block text-sm font-medium mb-1"
            >
              Craft technique
            </label>
            <input
              id="technique"
              type="text"
              value={technique}
              onChange={(e) => setTechnique(e.target.value)}
              placeholder="e.g. suspense, show don't tell, subtext…"
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              required
            />
          </div>

          <div>
            <label
              htmlFor="context"
              className="block text-sm font-medium mb-1"
            >
              Context{" "}
              <span className="text-stone-400 font-normal">(optional)</span>
            </label>
            <textarea
              id="context"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Any genre, setting, or scenario you'd like the example to use…"
              rows={3}
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-amber-500 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Generating…" : "Show me this in action"}
          </button>
        </form>

        {/* Loading state */}
        {loading && blocks.length === 0 && (
          <div className="flex items-center gap-2 text-stone-400 text-sm">
            <span className="inline-block w-3 h-3 rounded-full bg-amber-400 animate-pulse" />
            Streaming response…
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Streamed blocks */}
        {blocks.length > 0 && (
          <div className="space-y-5">
            {blocks.map((block, i) => (
              <BlockRenderer key={i} block={block} />
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-stone-400 text-sm">
                <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                More coming…
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

function BlockRenderer({ block }: { block: Block }) {
  switch (block.type) {
    case "text":
      return (
        <p className="text-stone-700 leading-relaxed text-sm">{block.content}</p>
      );

    case "passage":
      return (
        <blockquote className="rounded-lg bg-amber-50 border-l-4 border-amber-400 px-5 py-4 text-stone-800 text-sm leading-relaxed italic">
          {block.content}
        </blockquote>
      );

    case "annotation":
      return (
        <div className="border-l-4 border-stone-300 pl-4 text-stone-500 text-sm italic leading-relaxed">
          {block.content}
        </div>
      );

    case "prompt":
      return (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-5 py-4">
          <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-2">
            Your turn:
          </p>
          <p className="text-stone-700 text-sm leading-relaxed">{block.content}</p>
        </div>
      );

    default:
      return null;
  }
}
