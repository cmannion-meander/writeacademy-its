import { notFound } from "next/navigation";
import { TopNav } from "@/components/layout/top-nav";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { Footer } from "@/components/layout/footer";
import { ModuleSidebar } from "@/components/lesson/module-sidebar";
import { CraftCoach } from "@/components/lesson/craft-coach";
import { mockCourses } from "@/lib/mock-data";
import { ClipboardList } from "lucide-react";

interface PageProps {
  params: Promise<{ courseSlug: string; lessonId: string }>;
}

export default async function LessonPage({ params }: PageProps) {
  const { courseSlug, lessonId } = await params;
  const course = mockCourses.find((c) => c.slug === courseSlug);

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
          <div className="flex-1 px-8 py-10 max-w-4xl">
            {/* Breadcrumb */}
            <p className="text-xs text-gray-400 mb-1 uppercase tracking-wide">
              {course.sections.find((s) =>
                s.lessons.some((l) => l.id === lessonId)
              )?.title}
            </p>

            {/* Lesson title */}
            <h1 className="text-2xl font-bold text-gray-900 mb-6 leading-snug">
              {lesson.title}
            </h1>

            {/* Lesson content */}
            {lesson.type === "article" && lesson.content && (
              <div className="prose prose-gray max-w-none">
                {lesson.content.split("\n\n").map((para, i) => (
                  <p key={i} className="mb-4 text-gray-800 leading-relaxed text-[15px]">
                    {para}
                  </p>
                ))}
              </div>
            )}

            {lesson.type === "quiz" && (
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-6 flex items-start gap-4">
                <ClipboardList className="h-6 w-6 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <h2 className="font-semibold text-blue-900 mb-1">Module Test</h2>
                  <p className="text-sm text-blue-700 mb-4">
                    Complete all questions to test your knowledge of this module.
                    You must complete the test in one sitting.
                  </p>
                  <button className="rounded-lg bg-black text-white px-6 py-2 text-sm font-semibold hover:bg-gray-800 transition-colors">
                    Start Test
                  </button>
                </div>
              </div>
            )}

            {/* ITS Craft Coach — only for article lessons with a technique */}
            {lesson.type === "article" && lesson.craftTechnique && (
              <CraftCoach
                defaultTechnique={lesson.craftTechnique}
                defaultContext={lesson.craftContext}
              />
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
  course: (typeof mockCourses)[0];
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
