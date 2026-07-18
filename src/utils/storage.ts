import { DEFAULT_SET_UPDATED_AT, defaultSet } from "../data/defaultSet";
import type { AppStorage, PracticeMode } from "../types/interview";

const STORAGE_KEY = "interview-recall-trainer";

export function createInitialStorage(): AppStorage {
  return {
    version: 1,
    sets: [defaultSet],
    settings: {
      blankRatio: 40,
      showKeySentence: true,
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

function isAppStorage(value: unknown): value is AppStorage {
  if (!value || typeof value !== "object") return false;
  const storage = value as Partial<AppStorage>;
  return storage.version === 1 && Array.isArray(storage.sets) && Boolean(storage.settings);
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
    if (!isAppStorage(parsed)) return createInitialStorage();
    return syncBundledDefaultSet({
      ...parsed,
      settings: {
        blankRatio: parsed.settings.blankRatio ?? 40,
        showKeySentence: parsed.settings.showKeySentence ?? true,
        lastSetId: parsed.settings.lastSetId,
        lastMode: parsed.settings.lastMode,
      },
      progress: parsed.progress ?? {},
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
