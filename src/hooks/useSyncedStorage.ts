import { useCallback, useEffect, useRef, useState } from "react";
import type { AppStorage, QuestionSet, QuestionStudyStat, SetProgress } from "../types/interview";
import { createInitialStorage, loadStorage, saveStorage } from "../utils/storage";
import { isSupabaseConfigured, supabase } from "../utils/supabaseClient";

type SyncStatus = "local" | "loading" | "saving" | "synced" | "error";

export interface StorageSyncState {
  enabled: boolean;
  status: SyncStatus;
  message: string;
  pullNow: () => Promise<void>;
}

interface SharedProgressRow {
  storage: AppStorage;
  updated_at: string;
}

const SHARED_PROGRESS_ID = "global";

function fallbackStorage(value: unknown): AppStorage {
  if (!value || typeof value !== "object") return createInitialStorage();
  return value as AppStorage;
}

function latestIso(a?: string, b?: string): string | undefined {
  if (!a) return b;
  if (!b) return a;
  return new Date(a).getTime() >= new Date(b).getTime() ? a : b;
}

function newerSet(a: QuestionSet, b: QuestionSet): QuestionSet {
  return new Date(a.updatedAt).getTime() >= new Date(b.updatedAt).getTime() ? a : b;
}

function mergeNumberMapMax(a?: Record<string, number>, b?: Record<string, number>): Record<string, number> | undefined {
  const keys = new Set([...Object.keys(a ?? {}), ...Object.keys(b ?? {})]);
  if (keys.size === 0) return undefined;
  const result: Record<string, number> = {};
  keys.forEach((key) => {
    result[key] = Math.max(a?.[key] ?? 0, b?.[key] ?? 0);
  });
  return result;
}

function mergeQuestionStatsMax(
  a?: Record<string, QuestionStudyStat>,
  b?: Record<string, QuestionStudyStat>,
): Record<string, QuestionStudyStat> | undefined {
  const keys = new Set([...Object.keys(a ?? {}), ...Object.keys(b ?? {})]);
  if (keys.size === 0) return undefined;
  const result: Record<string, QuestionStudyStat> = {};
  keys.forEach((key) => {
    const left = a?.[key];
    const right = b?.[key];
    result[key] = {
      studyCount: Math.max(left?.studyCount ?? 0, right?.studyCount ?? 0),
      lastStudiedAt: latestIso(left?.lastStudiedAt, right?.lastStudiedAt),
    };
  });
  return result;
}

function mergeProgressMax(remote?: SetProgress, local?: SetProgress): SetProgress {
  return {
    sequentialIndex: local?.sequentialIndex ?? remote?.sequentialIndex ?? 0,
    randomOrder: local?.randomOrder ?? remote?.randomOrder,
    randomIndex: local?.randomIndex ?? remote?.randomIndex,
    reviewOrder: local?.reviewOrder ?? remote?.reviewOrder,
    reviewIndex: local?.reviewIndex ?? remote?.reviewIndex,
    readiness: {
      ...(remote?.readiness ?? {}),
      ...(local?.readiness ?? {}),
    },
    questionStats: mergeQuestionStatsMax(remote?.questionStats, local?.questionStats),
    dailyStudyCounts: mergeNumberMapMax(remote?.dailyStudyCounts, local?.dailyStudyCounts),
    dailyStudySeconds: mergeNumberMapMax(remote?.dailyStudySeconds, local?.dailyStudySeconds),
    lastStudiedAt: latestIso(remote?.lastStudiedAt, local?.lastStudiedAt),
  };
}

function mergeStorageMax(remote: AppStorage, local: AppStorage): AppStorage {
  const setMap = new Map<string, QuestionSet>();
  remote.sets.forEach((set) => setMap.set(set.id, set));
  local.sets.forEach((set) => {
    const previous = setMap.get(set.id);
    setMap.set(set.id, previous ? newerSet(previous, set) : set);
  });

  const progressIds = new Set([...Object.keys(remote.progress), ...Object.keys(local.progress)]);
  const progress: AppStorage["progress"] = {};
  progressIds.forEach((setId) => {
    progress[setId] = mergeProgressMax(remote.progress[setId], local.progress[setId]);
  });

  return {
    version: local.version,
    sets: Array.from(setMap.values()),
    settings: {
      ...remote.settings,
      ...local.settings,
    },
    progress,
  };
}

function positiveDelta(current = 0, baseline = 0): number {
  return Math.max(0, current - baseline);
}

function applyNumberMapDelta(
  remote?: Record<string, number>,
  baseline?: Record<string, number>,
  current?: Record<string, number>,
): Record<string, number> | undefined {
  const keys = new Set([...Object.keys(remote ?? {}), ...Object.keys(current ?? {})]);
  if (keys.size === 0) return undefined;
  const result: Record<string, number> = { ...(remote ?? {}) };
  keys.forEach((key) => {
    result[key] = (remote?.[key] ?? 0) + positiveDelta(current?.[key] ?? 0, baseline?.[key] ?? 0);
  });
  return result;
}

function applyQuestionStatsDelta(
  remote?: Record<string, QuestionStudyStat>,
  baseline?: Record<string, QuestionStudyStat>,
  current?: Record<string, QuestionStudyStat>,
): Record<string, QuestionStudyStat> | undefined {
  const keys = new Set([...Object.keys(remote ?? {}), ...Object.keys(current ?? {})]);
  if (keys.size === 0) return undefined;
  const result: Record<string, QuestionStudyStat> = { ...(remote ?? {}) };
  keys.forEach((key) => {
    const remoteStat = remote?.[key];
    const currentStat = current?.[key];
    const baselineStat = baseline?.[key];
    result[key] = {
      studyCount: (remoteStat?.studyCount ?? 0) + positiveDelta(currentStat?.studyCount ?? 0, baselineStat?.studyCount ?? 0),
      lastStudiedAt: latestIso(remoteStat?.lastStudiedAt, currentStat?.lastStudiedAt),
    };
  });
  return result;
}

function applyProgressDelta(remote?: SetProgress, baseline?: SetProgress, current?: SetProgress): SetProgress {
  return {
    sequentialIndex: current?.sequentialIndex ?? remote?.sequentialIndex ?? 0,
    randomOrder: current?.randomOrder ?? remote?.randomOrder,
    randomIndex: current?.randomIndex ?? remote?.randomIndex,
    reviewOrder: current?.reviewOrder ?? remote?.reviewOrder,
    reviewIndex: current?.reviewIndex ?? remote?.reviewIndex,
    readiness: {
      ...(remote?.readiness ?? {}),
      ...(current?.readiness ?? {}),
    },
    questionStats: applyQuestionStatsDelta(remote?.questionStats, baseline?.questionStats, current?.questionStats),
    dailyStudyCounts: applyNumberMapDelta(remote?.dailyStudyCounts, baseline?.dailyStudyCounts, current?.dailyStudyCounts),
    dailyStudySeconds: applyNumberMapDelta(remote?.dailyStudySeconds, baseline?.dailyStudySeconds, current?.dailyStudySeconds),
    lastStudiedAt: latestIso(remote?.lastStudiedAt, current?.lastStudiedAt),
  };
}

function applyStorageDelta(remote: AppStorage, baseline: AppStorage, current: AppStorage): AppStorage {
  const setMap = new Map<string, QuestionSet>();
  remote.sets.forEach((set) => setMap.set(set.id, set));
  current.sets.forEach((set) => {
    const previous = setMap.get(set.id);
    setMap.set(set.id, previous ? newerSet(previous, set) : set);
  });

  const progressIds = new Set([...Object.keys(remote.progress), ...Object.keys(current.progress)]);
  const progress: AppStorage["progress"] = {};
  progressIds.forEach((setId) => {
    progress[setId] = applyProgressDelta(remote.progress[setId], baseline.progress[setId], current.progress[setId]);
  });

  return {
    version: current.version,
    sets: Array.from(setMap.values()),
    settings: {
      ...remote.settings,
      ...current.settings,
    },
    progress,
  };
}

export function useSyncedStorage() {
  const [storage, setStorage] = useState<AppStorage>(() => loadStorage());
  const [cloudReady, setCloudReady] = useState(false);
  const [status, setStatus] = useState<SyncStatus>(isSupabaseConfigured ? "loading" : "local");
  const [message, setMessage] = useState(
    isSupabaseConfigured ? "공용 progress를 불러오는 중" : "Supabase 환경 변수가 없어 이 기기 저장만 사용 중",
  );
  const baselineRef = useRef<AppStorage | null>(null);
  const loadingRemoteRef = useRef(false);

  useEffect(() => {
    saveStorage(storage);
  }, [storage]);

  const pullNow = useCallback(async () => {
    if (!supabase) return;
    loadingRemoteRef.current = true;
    setStatus("loading");
    setMessage("공용 progress를 불러오는 중");

    const { data, error } = await supabase
      .from("interview_shared_progress")
      .select("storage, updated_at")
      .eq("id", SHARED_PROGRESS_ID)
      .maybeSingle<SharedProgressRow>();

    if (error) {
      loadingRemoteRef.current = false;
      setCloudReady(false);
      setStatus("error");
      setMessage(error.message);
      return;
    }

    if (data?.storage) {
      const merged = mergeStorageMax(fallbackStorage(data.storage), loadStorage());
      baselineRef.current = merged;
      setStorage(merged);
      saveStorage(merged);
    } else {
      const initial = loadStorage();
      const { error: uploadError } = await supabase.from("interview_shared_progress").upsert({
        id: SHARED_PROGRESS_ID,
        storage: initial,
        updated_at: new Date().toISOString(),
      });
      if (uploadError) {
        loadingRemoteRef.current = false;
        setCloudReady(false);
        setStatus("error");
        setMessage(uploadError.message);
        return;
      }
      baselineRef.current = initial;
    }

    loadingRemoteRef.current = false;
    setCloudReady(true);
    setStatus("synced");
    setMessage("모든 기기 공용 progress 동기화 완료");
  }, []);

  useEffect(() => {
    if (!supabase) return;
    pullNow();
  }, [pullNow]);

  useEffect(() => {
    if (!supabase || !cloudReady || loadingRemoteRef.current || !baselineRef.current) return;
    const client = supabase;

    setStatus("saving");
    setMessage("변경분을 공용 progress에 저장 중");
    const timeout = window.setTimeout(async () => {
      const { data, error } = await client
        .from("interview_shared_progress")
        .select("storage, updated_at")
        .eq("id", SHARED_PROGRESS_ID)
        .maybeSingle<SharedProgressRow>();

      if (error) {
        setStatus("error");
        setMessage(error.message);
        return;
      }

      const remoteStorage = fallbackStorage(data?.storage);
      const nextStorage = applyStorageDelta(remoteStorage, baselineRef.current as AppStorage, storage);
      const { error: uploadError } = await client.from("interview_shared_progress").upsert({
        id: SHARED_PROGRESS_ID,
        storage: nextStorage,
        updated_at: new Date().toISOString(),
      });

      if (uploadError) {
        setStatus("error");
        setMessage(uploadError.message);
        return;
      }

      baselineRef.current = nextStorage;
      setStorage(nextStorage);
      saveStorage(nextStorage);
      setStatus("synced");
      setMessage("모든 기기 공용 progress 동기화 완료");
    }, 650);

    return () => window.clearTimeout(timeout);
  }, [cloudReady, storage]);

  const syncState: StorageSyncState = {
    enabled: isSupabaseConfigured,
    status,
    message,
    pullNow,
  };

  return [storage, setStorage, syncState] as const;
}
