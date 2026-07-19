export type PracticeMode = "sequential" | "random" | "review";
export type QuestionType = "why" | "what" | "how";
export type QuestionTypeFilter = "all" | QuestionType;
export type AnswerDisplayMode = "cloze" | "structure";
export type ReadinessLevel = 1 | 2 | 3 | 4 | 5;

export interface StructuredAnswerPart {
  label: string;
  text: string;
}

export interface InterviewQuestion {
  id: string;
  category: string;
  questionType: QuestionType;
  question: string;
  answerParts: StructuredAnswerPart[];
  keywords: string[];
}

export interface QuestionSet {
  id: string;
  name: string;
  questions: InterviewQuestion[];
  createdAt: string;
  updatedAt: string;
}

export interface QuestionStudyStat {
  studyCount: number;
  lastStudiedAt?: string;
}

export interface SetProgress {
  sequentialIndex: number;
  randomOrder?: string[];
  randomIndex?: number;
  reviewOrder?: string[];
  reviewIndex?: number;
  readiness?: Record<string, ReadinessLevel>;
  questionStats?: Record<string, QuestionStudyStat>;
  dailyStudyCounts?: Record<string, number>;
  lastStudiedAt?: string;
}

export interface AppStorage {
  version: 2;
  sets: QuestionSet[];
  settings: {
    blankRatio: number;
    answerDisplayMode: AnswerDisplayMode;
    questionTypeFilter: QuestionTypeFilter;
    lastSetId?: string;
    lastMode?: PracticeMode;
  };
  progress: Record<string, SetProgress>;
}

export interface ParsedQuestionPreview {
  question: InterviewQuestion;
  errors: string[];
  warnings: string[];
}
