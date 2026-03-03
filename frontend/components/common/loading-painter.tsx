"use client";

import { Paintbrush2 } from "lucide-react";

interface LoadingPainterProps {
  message?: string;
  subMessage?: string;
  size?: "sm" | "md" | "lg";
}

/**
 * Thematic loading animation for illustration generation.
 * Per session-ux.md: "Never raw loading spinners. Use thematic animations (paintbrush, pencil)."
 */
export function LoadingPainter({
  message = "Bringing your words to life…",
  subMessage,
  size = "md",
}: LoadingPainterProps) {
  const iconSize = size === "sm" ? "h-6 w-6" : size === "lg" ? "h-12 w-12" : "h-9 w-9";
  const ringSize = size === "sm" ? "w-14 h-14" : size === "lg" ? "w-28 h-28" : "w-20 h-20";
  const textSize = size === "sm" ? "text-xs" : size === "lg" ? "text-base" : "text-sm";
  const py = size === "sm" ? "py-6" : size === "lg" ? "py-20" : "py-14";

  return (
    <div className={`flex flex-col items-center justify-center ${py} gap-5 select-none`}>
      <div className="relative flex items-center justify-center">
        {/* Pulsing outer ring */}
        <div
          className={`absolute ${ringSize} rounded-full border-2 border-amber-300 wa-animate-pulse-ring`}
        />
        {/* Icon container */}
        <div
          className={`relative ${ringSize} rounded-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center shadow-sm`}
        >
          <Paintbrush2
            className={`${iconSize} text-[#F59E42] wa-animate-paint`}
            strokeWidth={1.5}
          />
        </div>
      </div>

      <div className="text-center space-y-1">
        <p className={`${textSize} font-semibold text-gray-600`}>{message}</p>
        {subMessage && (
          <p className="text-xs text-gray-400">{subMessage}</p>
        )}
      </div>

      {/* Shimmer bar for visual rhythm */}
      <div className="w-40 h-1 rounded-full wa-shimmer" />
    </div>
  );
}

/** Inline spinner for smaller contexts (buttons, etc.) */
export function InlineSpinner({ className = "" }: { className?: string }) {
  return (
    <div
      className={`w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin ${className}`}
    />
  );
}
