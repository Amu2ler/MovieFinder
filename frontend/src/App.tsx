import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import useStore from "./store/useStore";
import { createUser } from "./api/client";
import Toaster from "./components/Toaster";
import { notifyError } from "./lib/notify";

// Code-split the pages: each becomes its own JS chunk loaded on demand.
// AppTour (react-joyride) is a large dep used only inside Feed — keeping it
// behind the lazy boundary shaves off the initial bundle for first-time users.
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Feed = lazy(() => import("./pages/Feed"));

function FullscreenSpinner({ label }: { label: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 text-sm">{label}</p>
      </div>
    </div>
  );
}

export default function App() {
  const { userId, onboardingComplete, setUser } = useStore();

  useEffect(() => {
    if (!userId) {
      createUser()
        .then(setUser)
        .catch(() => notifyError("Impossible d'initialiser ta session. Vérifie le serveur."));
    }
  }, [userId, setUser]);

  if (!userId) {
    return (
      <>
        <FullscreenSpinner label="Initialisation…" />
        <Toaster />
      </>
    );
  }

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Suspense fallback={<FullscreenSpinner label="Chargement…" />}>
        <Routes>
          <Route
            path="/"
            element={
              onboardingComplete ? (
                <Navigate to="/feed" replace />
              ) : (
                <Navigate to="/onboarding" replace />
              )
            }
          />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route
            path="/feed"
            element={onboardingComplete ? <Feed /> : <Navigate to="/onboarding" replace />}
          />
        </Routes>
      </Suspense>
      <Toaster />
    </BrowserRouter>
  );
}
