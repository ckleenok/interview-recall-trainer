import { useCallback, useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import type { AppStorage } from "../types/interview";
import { createInitialStorage, loadStorage, saveStorage } from "../utils/storage";
import { isSupabaseConfigured, supabase } from "../utils/supabaseClient";

type SyncStatus = "local" | "signed-out" | "loading" | "saving" | "synced" | "error";

export interface StorageSyncState {
  enabled: boolean;
  signedIn: boolean;
  email?: string;
  status: SyncStatus;
  message: string;
  signIn: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

interface CloudProgressRow {
  storage: AppStorage;
  updated_at: string;
}

function fallbackStorage(value: unknown): AppStorage {
  if (!value || typeof value !== "object") return createInitialStorage();
  return value as AppStorage;
}

export function useSyncedStorage() {
  const [storage, setStorage] = useState<AppStorage>(() => loadStorage());
  const [session, setSession] = useState<Session | null>(null);
  const [cloudReady, setCloudReady] = useState(false);
  const [status, setStatus] = useState<SyncStatus>(isSupabaseConfigured ? "loading" : "local");
  const [message, setMessage] = useState(
    isSupabaseConfigured ? "Supabase 연결 확인 중" : "Supabase 환경 변수가 없어 이 기기 저장만 사용 중",
  );
  const loadingRemoteRef = useRef(false);

  useEffect(() => {
    saveStorage(storage);
  }, [storage]);

  useEffect(() => {
    if (!supabase) return;

    let cancelled = false;
    supabase.auth.getSession().then(({ data, error }) => {
      if (cancelled) return;
      if (error) {
        setStatus("error");
        setMessage(error.message);
        return;
      }
      setSession(data.session);
      setStatus(data.session ? "loading" : "signed-out");
      setMessage(data.session ? "클라우드 기록을 불러오는 중" : "로그인하면 여러 기기에서 progress가 동기화됩니다");
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setCloudReady(false);
      setStatus(nextSession ? "loading" : "signed-out");
      setMessage(nextSession ? "클라우드 기록을 불러오는 중" : "로그인하면 여러 기기에서 progress가 동기화됩니다");
    });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!supabase || !session?.user) {
      setCloudReady(false);
      return;
    }
    const client = supabase;

    let cancelled = false;
    loadingRemoteRef.current = true;
    setStatus("loading");
    setMessage("클라우드 기록을 불러오는 중");

    client
      .from("interview_progress")
      .select("storage, updated_at")
      .eq("user_id", session.user.id)
      .maybeSingle<CloudProgressRow>()
      .then(async ({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setStatus("error");
          setMessage(error.message);
          loadingRemoteRef.current = false;
          return;
        }

        if (data?.storage) {
          setStorage(fallbackStorage(data.storage));
        } else {
          const { error: uploadError } = await client.from("interview_progress").upsert({
            user_id: session.user.id,
            storage,
            updated_at: new Date().toISOString(),
          });
          if (uploadError) {
            setStatus("error");
            setMessage(uploadError.message);
            loadingRemoteRef.current = false;
            return;
          }
        }

        loadingRemoteRef.current = false;
        setCloudReady(true);
        setStatus("synced");
        setMessage("클라우드 동기화 완료");
      });

    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  useEffect(() => {
    if (!supabase || !session?.user || !cloudReady || loadingRemoteRef.current) return;
    const client = supabase;

    setStatus("saving");
    setMessage("클라우드에 저장 중");
    const timeout = window.setTimeout(() => {
      client
        .from("interview_progress")
        .upsert({
          user_id: session.user.id,
          storage,
          updated_at: new Date().toISOString(),
        })
        .then(({ error }) => {
          if (error) {
            setStatus("error");
            setMessage(error.message);
            return;
          }
          setStatus("synced");
          setMessage("클라우드 동기화 완료");
        });
    }, 650);

    return () => window.clearTimeout(timeout);
  }, [cloudReady, session?.user?.id, storage]);

  const signIn = useCallback(async (email: string) => {
    if (!supabase) return;
    const redirectTo = window.location.origin + window.location.pathname;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo,
      },
    });
    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }
    setStatus("signed-out");
    setMessage("이메일로 보낸 로그인 링크를 확인하세요");
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }
    setSession(null);
    setCloudReady(false);
    setStatus("signed-out");
    setMessage("로그아웃했습니다. 이 기기 저장은 계속 남아 있습니다");
  }, []);

  const syncState: StorageSyncState = {
    enabled: isSupabaseConfigured,
    signedIn: Boolean(session?.user),
    email: session?.user.email ?? undefined,
    status,
    message,
    signIn,
    signOut,
  };

  return [storage, setStorage, syncState] as const;
}
