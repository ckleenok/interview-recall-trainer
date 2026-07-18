export type PracticeMode = "sequential" | "random" | "review";
export type ReadinessLevel = 1 | 2 | 3 | 4 | 5;

export interface InterviewQuestion {
  id: string;
  category: string;
  question: string;
  keySentence: string;
  answer: string;
  keywords: string[];
}

export interface QuestionSet {
  id: string;
  name: string;
  questions: InterviewQuestion[];
  createdAt: string;
  updatedAt: string;
}

export interface SetProgress {
  sequentialIndex: number;
  randomOrder?: string[];
  randomIndex?: number;
  reviewOrder?: string[];
  reviewIndex?: number;
  readiness?: Record<string, ReadinessLevel>;
  lastStudiedAt?: string;
}

export interface AppStorage {
  version: 1;
  sets: QuestionSet[];
  settings: {
    blankRatio: number;
    showKeySentence?: boolean;
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
