import type { Course, Section, Lesson } from "./types";

const LMS_BASE = "http://meander-backend.azurewebsites.net/api/writeacademy";

// Section 1 "Introduction" UUID from the live LMS API
const SECTION_1_ID = "56efbf0e-a12a-4467-893a-82cce5bf8057";

// ITS enrichment: craft technique + context keyed by lesson slug
const CRAFT_TECHNIQUE_MAP: Record<
  string,
  { craftTechnique: string; craftContext: string }
> = {
  intro: {
    craftTechnique: "purposeful openings",
    craftContext:
      "Writing the opening of a children's storybook that immediately signals tone, audience, and promise",
  },
  "brainstorming-ideas": {
    craftTechnique: "generative ideation",
    craftContext:
      "Exploring and expanding original concept ideas for a children's storybook",
  },
};

interface LmsLesson {
  id: string;
  section: string;
  course_id: string;
  title: string;
  slug: string;
  lesson_type: "concept" | "writing_prompt";
  order: number;
  article_content: string;
  content: string;
  content_format: string;
  image_url: string;
  video_url: string;
}

interface LmsSection {
  id: string;
  course: string;
  title: string;
  order: number;
  lessons: LmsLesson[];
}

function mapLmsLesson(lmsLesson: LmsLesson, index: number): Lesson {
  const content = lmsLesson.article_content || lmsLesson.content;
  // Use mapped craft fields; fall back to lesson title for any content lesson so ITS always renders
  const craftFields =
    CRAFT_TECHNIQUE_MAP[lmsLesson.slug] ??
    (content
      ? {
          craftTechnique: lmsLesson.title,
          craftContext: `Children's storybook writing: ${lmsLesson.title}`,
        }
      : {});
  return {
    id: `l${index + 1}`,
    title: lmsLesson.title,
    type: "article",
    isComplete: false,
    content,
    ...craftFields,
  };
}

export async function fetchLiveCourse(): Promise<Course> {
  const res = await fetch(`${LMS_BASE}/sections/${SECTION_1_ID}/`, {
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    throw new Error(`LMS API returned ${res.status}`);
  }

  const section: LmsSection = await res.json();

  const sortedLessons = [...section.lessons].sort((a, b) => a.order - b.order);

  const mappedSection: Section = {
    id: "s1",
    title: section.title,
    lessons: sortedLessons.map(mapLmsLesson),
  };

  return {
    id: section.course,
    slug: "write-storybooks-for-children",
    title: "Write Storybooks For Children",
    description:
      "A practical guide to writing compelling stories for young readers.",
    progress: 0,
    totalSteps: mappedSection.lessons.length,
    enrollmentStatus: "enrolled",
    sections: [mappedSection],
  };
}
