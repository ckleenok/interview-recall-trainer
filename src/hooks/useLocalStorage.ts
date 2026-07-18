import { useEffect, useState } from "react";
import type { AppStorage } from "../types/interview";
import { loadStorage, saveStorage } from "../utils/storage";

export function useLocalStorage() {
  const [storage, setStorage] = useState<AppStorage>(() => loadStorage());

  useEffect(() => {
    saveStorage(storage);
  }, [storage]);

  return [storage, setStorage] as const;
}
