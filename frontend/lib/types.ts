export interface Course {
  id: string;
  slug: string;
  title: string;
  description: string;
  heroImage?: string;
  progress: number;
  totalSteps: number;
  enrollmentStatus: "enrolled" | "not-enrolled";
  sections: Section[];
}

export interface Section {
  id: string;
  title: string;
  lessons: Lesson[];
}

export interface Lesson {
  id: string;
  title: string;
  type: "video" | "article" | "quiz";
  duration?: string;
  isComplete: boolean;
  content?: string;
  craftTechnique?: string; // ITS: pre-filled technique for Craft Coach
  craftContext?: string;   // ITS: extra context hint for Gemini
}

export interface CraftBlock {
  type: "text" | "passage" | "annotation" | "prompt";
  content: string;
}

// ITS Student Model — describes the learner for personalisation
export interface StudentProfile {
  name: string;
  level: "beginner" | "intermediate" | "advanced";
  genre_preference: string;
  learning_style: "visual" | "reading/writing" | "auditory" | "kinesthetic";
  tone_preference: string;
}

// Gibbs Reflective Cycle phase identifier
export type GibbsPhase =
  | "description"
  | "feelings"
  | "evaluation"
  | "analysis"
  | "conclusion"
  | "action_plan";

// A single Gibbs module returned by /structure-lesson
export interface GibbsModule {
  phase: GibbsPhase;
  title: string;
  content: string;          // markdown prose
  image_base64: string | null;  // "data:image/png;base64,..." or null
}

// A book from an AI-extracted reading list
export interface ReadingListBook {
  title: string;
  author: string;
  year?: string;
  why: string;  // one sentence on why it's recommended
}

// Full structured lesson response from /structure-lesson
export interface StructuredLessonData {
  lesson_id: string;
  modules: GibbsModule[];
  craft_blocks: CraftBlock[];
  reading_list?: ReadingListBook[];  // present when lesson contains book recommendations
}
