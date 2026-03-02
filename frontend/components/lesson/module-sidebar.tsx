"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, CheckCircle2, Circle, ClipboardList } from "lucide-react";
import type { Course, Section } from "@/lib/types";

interface ModuleSidebarProps {
  course: Course;
}

export function ModuleSidebar({ course }: ModuleSidebarProps) {
  const pathname = usePathname();

  // Track locally-saved lesson completions via localStorage
  const [localComplete, setLocalComplete] = useState<Set<string>>(new Set());

  useEffect(() => {
    const completed = new Set<string>();
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("wa_complete_") && localStorage.getItem(key) === "true") {
        completed.add(key.replace("wa_complete_", ""));
      }
    }
    setLocalComplete(completed);

    const handler = (e: Event) => {
      const { lessonId } = (e as CustomEvent<{ lessonId: string }>).detail;
      setLocalComplete((prev) => new Set([...prev, lessonId]));
    };
    window.addEventListener("wa_lesson_saved", handler);
    return () => window.removeEventListener("wa_lesson_saved", handler);
  }, []);

  const allLessons = course.sections.flatMap((s) => s.lessons);
  const completedCount = allLessons.filter(
    (l) => l.isComplete || localComplete.has(l.id)
  ).length;
  const totalCount = allLessons.length;
  const pct = Math.round((completedCount / totalCount) * 100);

  return (
    <div className="h-full bg-white border-r border-gray-200 flex flex-col">
      {/* Orange header */}
      <div className="bg-[#F59E42] text-black px-4 py-5">
        <h2 className="font-bold text-sm mb-4 leading-snug">{course.title}</h2>
        <div className="space-y-1.5">
          <div className="h-2 rounded-full bg-black/15 overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold tracking-wide">{pct}% complete</p>
            <p className="text-xs font-medium opacity-80">
              {completedCount}/{totalCount}
            </p>
          </div>
        </div>
      </div>

      {/* Module accordion */}
      <div className="flex-1 overflow-y-auto">
        {course.sections.map((section) => (
          <SectionAccordion
            key={section.id}
            section={section}
            courseSlug={course.slug}
            pathname={pathname}
            localComplete={localComplete}
          />
        ))}
      </div>
    </div>
  );
}

function SectionAccordion({
  section,
  courseSlug,
  pathname,
  localComplete,
}: {
  section: Section;
  courseSlug: string;
  pathname: string;
  localComplete: Set<string>;
}) {
  const hasActive = section.lessons.some((l) => pathname.includes(l.id));
  const [open, setOpen] = useState(hasActive || section.id === "s1");

  const sectionCompleted = section.lessons.filter(
    (l) => l.isComplete || localComplete.has(l.id)
  ).length;

  return (
    <div className="border-b border-gray-100">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50/80 text-left transition-colors"
      >
        <div className="flex-1 min-w-0 mr-2">
          <p className="text-xs font-semibold text-gray-800 leading-snug truncate">
            {section.title}
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">
            {sectionCompleted}/{section.lessons.length} lessons
          </p>
        </div>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-gray-400 shrink-0 transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <ul className="pb-1">
          {section.lessons.map((lesson) => {
            const isActive = pathname.includes(lesson.id);
            const isComplete = lesson.isComplete || localComplete.has(lesson.id);
            return (
              <li key={lesson.id}>
                <Link
                  href={`/learn/${courseSlug}/${lesson.id}`}
                  className={cn(
                    "flex items-start gap-2.5 px-4 py-2.5 text-xs transition-colors",
                    isActive
                      ? "bg-orange-50 text-[#F59E42] font-semibold border-r-2 border-[#F59E42]"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  <span className="mt-0.5 shrink-0">
                    {isComplete ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-[#82d4bb]" />
                    ) : lesson.type === "quiz" ? (
                      <ClipboardList className="h-3.5 w-3.5 text-gray-400" />
                    ) : (
                      <Circle className="h-3.5 w-3.5 text-gray-300" />
                    )}
                  </span>
                  <span className="leading-snug">{lesson.title}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
