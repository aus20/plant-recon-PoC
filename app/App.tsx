import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { StatusBar, StyleSheet, View } from "react-native";
import { colors } from "./src/theme.ts";
import { HomeScreen } from "./src/components/HomeScreen.tsx";
import { CaptureScreen } from "./src/components/CaptureScreen.tsx";
import { LoadingScreen } from "./src/components/LoadingScreen.tsx";
import { ResultCard } from "./src/components/ResultCard.tsx";
import { ErrorScreen } from "./src/components/ErrorScreen.tsx";
import { identify, type Photo } from "./src/services/identify.ts";
import { pickFromLibrary } from "./src/services/pick.ts";
import { addToHistory, listHistory } from "./src/services/history.ts";
import {
  IdentifyError,
  type HistoryEntry,
  type IdentifyErrorCode,
  type IdentifyResponse,
  type IdentifyStage,
  type UiState,
} from "../shared/types.ts";

type Action =
  | { type: "home" }
  | { type: "capture" }
  | { type: "captured"; photo: Photo }
  | { type: "stage"; stage: IdentifyStage }
  | { type: "resolved"; response: IdentifyResponse; imageUri: string }
  | { type: "failed"; code: IdentifyErrorCode };

// Beş durum, ekranda tek seferde biri. Navigasyon kütüphanesi koymadım;
// bu akışta her yol zaten tek yere, home'a çıkıyor.
function reduce(state: UiState, action: Action): UiState {
  switch (action.type) {
    case "home":
      return { kind: "home" };
    case "capture":
      return { kind: "capture" };
    case "captured":
      return { kind: "loading", stage: "uploading", imageUri: action.photo.uri };
    case "stage":
      return state.kind === "loading" ? { ...state, stage: action.stage } : state;
    case "resolved":
      return { kind: "success", response: action.response, imageUri: action.imageUri };
    case "failed":
      return { kind: "error", code: action.code };
  }
}

export default function App() {
  const [state, dispatch] = useReducer(reduce, { kind: "home" });
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const inFlight = useRef<AbortController | null>(null);

  useEffect(() => {
    setHistory(listHistory());
  }, []);

  const run = useCallback(async (photo: Photo) => {
    inFlight.current?.abort();
    const controller = new AbortController();
    inFlight.current = controller;

    dispatch({ type: "captured", photo });

    try {
      const response = await identify(photo, (stage) => dispatch({ type: "stage", stage }), controller.signal);
      if (controller.signal.aborted) return;
      setHistory(addToHistory(response, response.previewUri));
      dispatch({ type: "resolved", response, imageUri: response.previewUri });
    } catch (error) {
      if (controller.signal.aborted) return;
      dispatch({ type: "failed", code: error instanceof IdentifyError ? error.code : "server" });
    }
  }, []);

  const chooseFromLibrary = useCallback(async () => {
    const photo = await pickFromLibrary();
    if (photo) void run(photo);
  }, [run]);

  const goHome = useCallback(() => {
    inFlight.current?.abort();
    dispatch({ type: "home" });
  }, []);

  const openEntry = useCallback((entry: HistoryEntry) => {
    dispatch({ type: "resolved", response: entry.response, imageUri: entry.imageUri });
  }, []);

  return (
    <>
      <StatusBar barStyle="light-content" />
      <View style={styles.root}>
        {state.kind === "home" && (
          <HomeScreen
            history={history}
            onCamera={() => dispatch({ type: "capture" })}
            onLibrary={chooseFromLibrary}
            onOpen={openEntry}
          />
        )}

        {state.kind === "capture" && <CaptureScreen onPhoto={run} onClose={goHome} />}

        {state.kind === "loading" && (
          <LoadingScreen imageUri={state.imageUri} stage={state.stage} onCancel={goHome} />
        )}

        {state.kind === "success" && (
          <ResultCard
            response={state.response}
            imageUri={state.imageUri}
            onReset={() => dispatch({ type: "capture" })}
            onHome={goHome}
          />
        )}

        {state.kind === "error" && (
          <ErrorScreen code={state.code} onRetry={() => dispatch({ type: "capture" })} />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
});
