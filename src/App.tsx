import { useEffect, useMemo, useState } from "react";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { HomePage } from "./pages/HomePage";
import { ImportPage } from "./pages/ImportPage";
import { PracticePage } from "./pages/PracticePage";
import type { PracticeMode } from "./types/interview";

type Route =
  | { screen: "home" }
  | { screen: "import" }
  | { screen: "practice"; setId: string; mode: PracticeMode; start: "resume" | "new" };

function parseRoute(): Route {
  const hash = window.location.hash.replace(/^#\/?/, "");
  const [screen, query = ""] = hash.split("?");
  const params = new URLSearchParams(query);

  if (screen === "import") return { screen: "import" };
  if (screen === "practice") {
    const setId = params.get("setId") ?? "";
    const modeParam = params.get("mode");
    const mode: PracticeMode =
      modeParam === "random" || modeParam === "review" || modeParam === "spaced" ? modeParam : "sequential";
    const start = params.get("start") === "new" ? "new" : "resume";
    return { screen: "practice", setId, mode, start };
  }
  return { screen: "home" };
}

function routeToHash(route: Route): string {
  if (route.screen === "home") return "#/";
  if (route.screen === "import") return "#/import";
  const params = new URLSearchParams({ setId: route.setId, mode: route.mode, start: route.start });
  return `#/practice?${params.toString()}`;
}

export function App() {
  const [storage, setStorage] = useLocalStorage();
  const [route, setRoute] = useState<Route>(() => parseRoute());

  useEffect(() => {
    const onHashChange = () => setRoute(parseRoute());
    window.addEventListener("hashchange", onHashChange);
    if (!window.location.hash) window.history.replaceState(null, "", "#/");
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  function navigate(nextRoute: Route) {
    window.location.hash = routeToHash(nextRoute);
    setRoute(nextRoute);
  }

  const activeSet = useMemo(() => {
    if (route.screen !== "practice") return undefined;
    return storage.sets.find((questionSet) => questionSet.id === route.setId) ?? storage.sets[0];
  }, [route, storage.sets]);

  if (route.screen === "import") {
    return <ImportPage setStorage={setStorage} onCancel={() => navigate({ screen: "home" })} onSaved={() => navigate({ screen: "home" })} />;
  }

  if (route.screen === "practice" && activeSet) {
    return (
      <PracticePage
        key={`${activeSet.id}-${route.mode}-${route.start}`}
        storage={storage}
        setStorage={setStorage}
        questionSet={activeSet}
        mode={route.mode}
        start={route.start}
        onHome={() => navigate({ screen: "home" })}
      />
    );
  }

  return (
    <HomePage
      storage={storage}
      setStorage={setStorage}
      onImport={() => navigate({ screen: "import" })}
      onStart={(setId, mode, start) => navigate({ screen: "practice", setId, mode, start })}
    />
  );
}
