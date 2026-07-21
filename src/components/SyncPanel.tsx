import { useState } from "react";
import type { StorageSyncState } from "../hooks/useSyncedStorage";

interface SyncPanelProps {
  sync: StorageSyncState;
}

export function SyncPanel({ sync }: SyncPanelProps) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    await sync.signIn(email.trim());
    setBusy(false);
  }

  async function signOut() {
    setBusy(true);
    await sync.signOut();
    setBusy(false);
  }

  return (
    <section className="syncPanel" aria-label="클라우드 동기화">
      <div>
        <p className="syncTitle">Progress 동기화</p>
        <p className="syncMessage">{sync.message}</p>
      </div>
      {!sync.enabled ? (
        <p className="syncHint">Supabase 환경 변수를 설정하면 여러 기기 동기화가 켜집니다.</p>
      ) : sync.signedIn ? (
        <div className="syncActions">
          <span className="syncAccount">{sync.email}</span>
          <button className="ghost" type="button" onClick={signOut} disabled={busy}>
            로그아웃
          </button>
        </div>
      ) : (
        <form className="syncForm" onSubmit={submit}>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="email@example.com"
            aria-label="로그인 이메일"
          />
          <button type="submit" disabled={busy || !email.trim()}>
            이메일 로그인
          </button>
        </form>
      )}
    </section>
  );
}
