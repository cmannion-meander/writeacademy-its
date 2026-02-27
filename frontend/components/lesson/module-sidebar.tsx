"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, CheckCircle2, Circle, ClipboardList } from "lucide-react";
import type { Course, Section } from "@/lib/types";

interface ModuleSidebarProps {
  course: Course;
}

export function ModuleSidebar({ course }: ModuleSidebarProps) {
  const pathname = usePathname();
  const completedCount = course.sections
    .flatMap((s) => s.lessons)
    .filter((l) => l.isComplete).length;
  const totalCount = course.sections.flatMap((s) => s.lessons).length;
  const pct = Math.round((completedCount / totalCount) * 100);

  return (
    <div className="h-full bg-white border-r border-gray-200 flex flex-col">
      {/* Orange header */}
      <div className="bg-[#F59E42] text-black p-4">
        <h2 className="font-bold text-base mb-3 leading-tight">{course.title}</h2>
        <div className="space-y-1">
          <div className="h-2 rounded-full bg-orange-300 overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs font-semibold">{pct}% COMPLETE</p>
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
}: {
  section: Section;
  courseSlug: string;
  pathname: string;
}) {
  const hasActive = section.lessons.some((l) =>
    pathname.includes(l.id)
  );
  const [open, setOpen] = useState(hasActive || section.id === "s1");

  return (
    <div className="border-b border-gray-200">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-800 hover:bg-gray-50 text-left"
      >
        <span>{section.title}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-gray-400 shrink-0 transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <ul className="py-1">
          {section.lessons.map((lesson) => {
            const isActive = pathname.includes(lesson.id);
            return (
              <li key={lesson.id}>
                <Link
                  href={`/learn/${courseSlug}/${lesson.id}`}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5 text-sm transition-colors",
                    isActive
                      ? "bg-orange-50 text-[#F59E42] font-medium border-r-2 border-[#F59E42]"
                      : "text-gray-700 hover:bg-gray-50"
                  )}
                >
                  {lesson.isComplete ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-[#82d4bb]" />
                  ) : lesson.type === "quiz" ? (
                    <ClipboardList className="h-4 w-4 shrink-0 text-gray-400" />
                  ) : (
                    <Circle className="h-4 w-4 shrink-0 text-gray-300" />
                  )}
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
