import { notFound } from "next/navigation";
import { TopNav } from "@/components/layout/top-nav";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { Footer } from "@/components/layout/footer";
import { ModuleSidebar } from "@/components/lesson/module-sidebar";
import { StructuredLesson } from "@/components/lesson/structured-lesson";
import { mockCourses } from "@/lib/mock-data";
import { fetchLiveCourse } from "@/lib/lms-api";
import type { Course, StudentProfile } from "@/lib/types";
import { ClipboardList } from "lucide-react";

// ITS Student Model — default profile for the demo
const DEFAULT_STUDENT: StudentProfile = {
  name: "Student",
  level: "beginner",
  genre_preference: "children's picture books",
  learning_style: "visual",
  tone_preference: "warm and encouraging",
};

interface PageProps {
  params: Promise<{ courseSlug: string; lessonId: string }>;
}

async function getCourse(courseSlug: string): Promise<Course | undefined> {
  if (courseSlug === "write-storybooks-for-children") {
    try {
      return await fetchLiveCourse();
    } catch (err) {
      console.warn("LMS API unavailable, falling back to mock data:", err);
    }
  }
  return mockCourses.find((c) => c.slug === courseSlug);
}

// Minimal markdown renderer — used only for article lessons without a craft technique
function renderContentFallback(content: string) {
  return content
    .split("\n\n")
    .filter((p) => p.trim())
    .map((para, i) => {
      const t = para.trim();
      const h1 = t.match(/^#\s+(.+)$/m);
      if (h1)
        return (
          <h2 key={i} className="text-xl font-bold text-gray-900 mt-6 mb-2">
            {h1[1]}
          </h2>
        );
      const h2 = t.match(/^##\s+(.+)$/m);
      if (h2)
        return (
          <h3 key={i} className="text-lg font-semibold text-gray-800 mt-4 mb-2">
            {h2[1]}
          </h3>
        );
      const text = t
        .replace(/\*\*(.*?)\*\*/g, "$1")
        .replace(/\*(.*?)\*/g, "$1")
        .replace(/`(.*?)`/g, "$1");
      return (
        <p key={i} className="mb-4 text-gray-800 leading-relaxed text-[15px]">
          {text}
        </p>
      );
    });
}

export default async function LessonPage({ params }: PageProps) {
  const { courseSlug, lessonId } = await params;
  const course = await getCourse(courseSlug);

  if (!course) notFound();

  let lesson = null;
  for (const section of course.sections) {
    const found = section.lessons.find((l) => l.id === lessonId);
    if (found) {
      lesson = found;
      break;
    }
  }

  if (!lesson) notFound();

  return (
    <div className="min-h-screen flex flex-col">
      <TopNav />

      <div className="flex flex-1">
        {/* Left nav — WA black sidebar */}
        <aside className="hidden lg:block w-[180px] bg-black text-white shrink-0">
          <SidebarNav />
        </aside>

        {/* Module sidebar — lesson / progress nav */}
        <aside className="hidden lg:block w-72 shrink-0 border-r border-gray-200">
          <ModuleSidebar course={course} />
        </aside>

        {/* Main content */}
        <main className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 px-8 py-10 max-w-3xl w-full mx-auto lg:mx-0">
            {/* Breadcrumb */}
            <p className="text-[11px] font-semibold text-gray-400 mb-2 uppercase tracking-widest">
              {course.sections.find((s) =>
                s.lessons.some((l) => l.id === lessonId)
              )?.title}
            </p>

            {/* Lesson title */}
            <h1 className="text-2xl font-bold text-gray-900 mb-1 leading-snug">
              {lesson.title}
            </h1>
            <div className="h-0.5 w-12 bg-[#F59E42] rounded-full mt-4 mb-6" />

            {/* Lesson content — ITS Structured Lesson or fallback renderer */}
            {lesson.type === "article" && lesson.craftTechnique && lesson.content && (
              <StructuredLesson
                lessonId={lesson.id}
                lessonTitle={lesson.title}
                lessonContent={lesson.content}
                craftTechnique={lesson.craftTechnique}
                craftContext={lesson.craftContext ?? ""}
                student={DEFAULT_STUDENT}
              />
            )}

            {lesson.type === "article" && !lesson.craftTechnique && lesson.content && (
              <div className="prose prose-gray max-w-none">
                {renderContentFallback(lesson.content)}
              </div>
            )}

            {lesson.type === "quiz" && (
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-6 flex items-start gap-4">
                <ClipboardList className="h-6 w-6 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <h2 className="font-semibold text-blue-900 mb-1">
                    Module Test
                  </h2>
                  <p className="text-sm text-blue-700 mb-4">
                    Complete all questions to test your knowledge of this
                    module. You must complete the test in one sitting.
                  </p>
                  <button className="rounded-lg bg-black text-white px-6 py-2 text-sm font-semibold hover:bg-gray-800 transition-colors">
                    Start Test
                  </button>
                </div>
              </div>
            )}

            {/* Bottom lesson nav */}
            <LessonNav course={course} currentLessonId={lessonId} />
          </div>

          <Footer />
        </main>
      </div>
    </div>
  );
}

function LessonNav({
  course,
  currentLessonId,
}: {
  course: Course;
  currentLessonId: string;
}) {
  const allLessons = course.sections.flatMap((s) => s.lessons);
  const currentIndex = allLessons.findIndex((l) => l.id === currentLessonId);
  const prev = allLessons[currentIndex - 1];
  const next = allLessons[currentIndex + 1];

  return (
    <div className="flex items-center justify-between mt-16 pt-6 border-t border-gray-200">
      {prev ? (
        <a
          href={`/learn/${course.slug}/${prev.id}`}
          className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1"
        >
          ← {prev.title}
        </a>
      ) : (
        <div />
      )}
      {next ? (
        <a
          href={`/learn/${course.slug}/${next.id}`}
          className="rounded-lg bg-black text-white px-5 py-2 text-sm font-semibold hover:bg-gray-800 transition-colors"
        >
          Next: {next.title} →
        </a>
      ) : (
        <div />
      )}
    </div>
  );
}
