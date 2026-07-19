import { DEFAULT_SET_UPDATED_AT, defaultSet } from "../data/defaultSet";
import type {
  AppStorage,
  InterviewQuestion,
  PracticeMode,
  QuestionSet,
  ReadinessLevel,
  SetProgress,
} from "../types/interview";
import { createMigratedAnswerParts, normalizeQuestionType, normalizeQuestionTypeFilter } from "./questionStructure";

const STORAGE_KEY = "interview-recall-trainer";

export function createInitialStorage(): AppStorage {
  return {
    version: 2,
    sets: [defaultSet],
    settings: {
      blankRatio: 40,
      questionTypeFilter: "all",
      lastSetId: defaultSet.id,
      lastMode: "sequential",
    },
    progress: {
      [defaultSet.id]: {
        sequentialIndex: 0,
      },
    },
  };
}

type LegacyQuestion = Partial<InterviewQuestion> & {
  keySentence?: string;
  answer?: string;
  questionType?: string;
};

type LegacyStorage = Partial<Omit<AppStorage, "version" | "sets" | "progress">> & {
  version?: number;
  sets?: Array<Partial<QuestionSet> & { questions?: LegacyQuestion[] }>;
  progress?: Record<string, Partial<SetProgress>>;
  settings?: {
    blankRatio?: number;
    answerDisplayMode?: "cloze" | "structure";
    showKeySentence?: boolean;
    questionTypeFilter?: string;
    lastSetId?: string;
    lastMode?: PracticeMode;
  };
};

function isStoredApp(value: unknown): value is LegacyStorage {
  if (!value || typeof value !== "object") return false;
  const storage = value as LegacyStorage;
  return (storage.version === 1 || storage.version === 2) && Array.isArray(storage.sets) && Boolean(storage.settings);
}

function migrateQuestion(question: LegacyQuestion, fallbackIndex: number): InterviewQuestion {
  const questionType = normalizeQuestionType(question.questionType);
  const migratedParts =
    Array.isArray(question.answerParts) && question.answerParts.length > 0
      ? question.answerParts.slice(0, 3).map((part, index) => ({
          label: createMigratedAnswerParts(questionType)[index]?.label ?? part.label,
          text: part.text ?? "",
        }))
      : createMigratedAnswerParts(questionType, question.answer ?? "");

  while (migratedParts.length < 3) {
    migratedParts.push(createMigratedAnswerParts(questionType)[migratedParts.length]);
  }

  return {
    id: question.id || `q${fallbackIndex + 1}`,
    category: question.category || "일반",
    questionType,
    question: question.question || "질문 없음",
    answerParts: migratedParts,
    keywords: Array.isArray(question.keywords) ? question.keywords : [],
  };
}

function migrateSet(questionSet: Partial<QuestionSet> & { questions?: LegacyQuestion[] }, index: number): QuestionSet {
  const now = new Date().toISOString();
  return {
    id: questionSet.id || `set-${index + 1}`,
    name: questionSet.name || "면접 질문 세트",
    createdAt: questionSet.createdAt || now,
    updatedAt: questionSet.updatedAt || now,
    questions: (questionSet.questions ?? []).map(migrateQuestion),
  };
}

function migrateProgress(progress?: Record<string, Partial<SetProgress>>): Record<string, SetProgress> {
  const result: Record<string, SetProgress> = {};
  for (const [setId, value] of Object.entries(progress ?? {})) {
    result[setId] = {
      sequentialIndex: value.sequentialIndex ?? 0,
      randomOrder: value.randomOrder,
      randomIndex: value.randomIndex,
      reviewOrder: value.reviewOrder,
      reviewIndex: value.reviewIndex,
      readiness: value.readiness as Record<string, ReadinessLevel> | undefined,
      questionStats: value.questionStats,
      dailyStudyCounts: value.dailyStudyCounts,
      dailyStudySeconds: value.dailyStudySeconds,
      lastStudiedAt: value.lastStudiedAt,
    };
  }
  return result;
}

function migrateStorage(storage: LegacyStorage): AppStorage {
  return {
    version: 2,
    sets: (storage.sets ?? []).map(migrateSet),
    settings: {
      blankRatio: storage.settings?.answerDisplayMode === "structure" ? 100 : storage.settings?.blankRatio ?? 40,
      questionTypeFilter: normalizeQuestionTypeFilter(storage.settings?.questionTypeFilter),
      lastSetId: storage.settings?.lastSetId,
      lastMode: storage.settings?.lastMode,
    },
    progress: migrateProgress(storage.progress),
  };
}

function syncBundledDefaultSet(storage: AppStorage): AppStorage {
  const defaultSetIndex = storage.sets.findIndex((questionSet) => questionSet.id === defaultSet.id);
  const currentDefaultSet = storage.sets[defaultSetIndex];
  const needsDefaultSetUpdate =
    !currentDefaultSet ||
    currentDefaultSet.updatedAt !== DEFAULT_SET_UPDATED_AT ||
    currentDefaultSet.questions.length !== defaultSet.questions.length;

  if (!needsDefaultSetUpdate) return storage;

  const sets =
    defaultSetIndex >= 0
      ? storage.sets.map((questionSet) => (questionSet.id === defaultSet.id ? defaultSet : questionSet))
      : [defaultSet, ...storage.sets];

  return {
    ...storage,
    sets,
    settings: {
      ...storage.settings,
      lastSetId: storage.settings.lastSetId ?? defaultSet.id,
    },
    progress: {
      ...storage.progress,
      [defaultSet.id]: {
        sequentialIndex: 0,
      },
    },
  };
}

export function loadStorage(): AppStorage {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialStorage();
    const parsed: unknown = JSON.parse(raw);
    if (!isStoredApp(parsed)) return createInitialStorage();
    const migrated = migrateStorage(parsed);
    return syncBundledDefaultSet({
      ...migrated,
      settings: {
        blankRatio: migrated.settings.blankRatio,
        questionTypeFilter: migrated.settings.questionTypeFilter,
        lastSetId: migrated.settings.lastSetId,
        lastMode: migrated.settings.lastMode,
      },
      progress: migrated.progress,
    });
  } catch {
    return createInitialStorage();
  }
}

export function saveStorage(storage: AppStorage): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(storage));
  } catch {
    // The app remains usable during private-mode or quota failures.
  }
}

export function saveLastSession(storage: AppStorage, setId: string, mode: PracticeMode): AppStorage {
  return {
    ...storage,
    settings: {
      ...storage.settings,
      lastSetId: setId,
      lastMode: mode,
    },
  };
}
