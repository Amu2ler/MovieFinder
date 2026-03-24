import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import useStore from "./store/useStore";
import { createUser } from "./api/client";
import Onboarding from "./pages/Onboarding";
import Feed from "./pages/Feed";

function App() {
  const { userId, onboardingComplete, setUser } = useStore();

  // Auto-create anonymous user on first visit
  useEffect(() => {
    if (!userId) {
      createUser().then(setUser).catch(console.error);
    }
  }, [userId, setUser]);

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Initialisation…</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
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
    </BrowserRouter>
  );
}

export default App;
