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
