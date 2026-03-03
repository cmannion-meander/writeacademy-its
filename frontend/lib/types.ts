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

// ─── v2.0 Story-First Types ───────────────────────────────────────────────────

export type SkillLevelValue = "not_assessed" | "developing" | "competent" | "strong";
export type TechniqueMode   = "full" | "compress" | "skip";

export interface SkillAssessment {
  dimension: string;
  level: SkillLevelValue;
  evidence: string;
  recommendation: TechniqueMode;
}

export interface LearnerProfile {
  uid: string;
  display_name: string;
  skill_levels: Record<string, SkillLevelValue>;
  completed_techniques: string[];
  style_preferences: Record<string, string>;
}

export interface StoryProject {
  story_id: string;
  title: string;
  premise: string;
  character_name: string;
  character_description: string;
  world_description: string;
  target_age: string;
  style_anchor?: string;
  character_visual_notes: string[];
  current_session: number;
  created_at: string;
}

export interface StoryPage {
  page_number: number;
  text_draft: string;
  technique_applied?: string;
  illustration_b64?: string;   // "data:image/png;base64,..." — present on single-page GET
  illustration_url?: string;
  created_at: string;
  updated_at: string;
}

export interface TechniqueAdaptation {
  name: string;
  mode: TechniqueMode;
  reason: string;
}

export interface SessionPlan {
  session_number: number;
  title: string;
  story_beat: string;
  target_pages: number[];
  techniques: TechniqueAdaptation[];
  wonder_prompt: string;
  wonder_example: string;
  build_instructions: string;
  page_prompts?: string[];  // one per target page; absent in old cached plans
  reflect_preview: string;
}

export interface OnboardingResult {
  uid: string;
  skills: SkillAssessment[];
  overall_level: string;
  suggested_focus: string;
  story: StoryProject;
  profile: LearnerProfile;
  session_plan?: SessionPlan;
}

// ─── Gibbs Session Feedback ──────────────────────────────────────────────────

export interface GibbsFeedbackPhase {
  phase: string;
  title: string;
  content: string;
}

export interface SessionFeedback {
  session_number: number;
  phases: GibbsFeedbackPhase[];
  overall_summary: string;
}

// localStorage keys
export const WA_UID_KEY        = "wa_uid";
export const WA_STORY_ID_KEY   = "wa_story_id";
export const WA_SESSION_KEY    = "wa_current_session";
