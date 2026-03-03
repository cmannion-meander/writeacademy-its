"use client";

interface MdTextProps {
  children: string;
  className?: string;
}

/**
 * Minimal inline Markdown renderer for Gemini-generated text.
 * Handles: **bold**, *italic*, and newlines (→ <br />).
 * Does NOT handle headings, lists, or code.
 */
export function MdText({ children, className }: MdTextProps) {
  const lines = children.split("\n");
  return (
    <span className={className}>
      {lines.map((line, i) => (
        <span key={i}>
          <InlineLine text={line} />
          {i < lines.length - 1 && <br />}
        </span>
      ))}
    </span>
  );
}

function InlineLine({ text }: { text: string }) {
  // Split on **bold** and *italic* tokens
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith("*") && part.endsWith("*")) {
          return <em key={i}>{part.slice(1, -1)}</em>;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
