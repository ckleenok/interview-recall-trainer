import { useState } from "react";
import type { StorageSyncState } from "../hooks/useSyncedStorage";

interface SyncPanelProps {
  sync: StorageSyncState;
}

export function SyncPanel({ sync }: SyncPanelProps) {
  const [busy, setBusy] = useState(false);

  async function refresh() {
    setBusy(true);
    await sync.pullNow();
    setBusy(false);
  }

  return (
    <section className="syncPanel" aria-label="클라우드 동기화">
      <div>
        <p className="syncTitle">Progress 동기화</p>
        <p className="syncMessage">{sync.message}</p>
      </div>
      {!sync.enabled ? (
        <p className="syncHint">Supabase 환경 변수를 설정하면 모든 기기에서 같은 progress를 봅니다.</p>
      ) : (
        <div className="syncActions">
          <span className="syncAccount">공용 progress</span>
          <button className="ghost" type="button" onClick={refresh} disabled={busy || sync.status === "loading"}>
            새로고침
          </button>
        </div>
      )}
    </section>
  );
}
