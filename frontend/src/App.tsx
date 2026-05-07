import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import useStore from "./store/useStore";
import Toaster from "./components/Toaster";

const Onboarding = lazy(() => import("./pages/Onboarding"));
const Feed = lazy(() => import("./pages/Feed"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));

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
  const { sessionToken, onboardingComplete } = useStore();

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Suspense fallback={<FullscreenSpinner label="Chargement…" />}>
        <Routes>
          {/* Public */}
          <Route path="/login" element={sessionToken ? <Navigate to="/" replace /> : <Login />} />
          <Route path="/register" element={sessionToken ? <Navigate to="/" replace /> : <Register />} />

          {/* Protected */}
          <Route
            path="/"
            element={
              !sessionToken ? (
                <Navigate to="/login" replace />
              ) : onboardingComplete ? (
                <Navigate to="/feed" replace />
              ) : (
                <Navigate to="/onboarding" replace />
              )
            }
          />
          <Route
            path="/onboarding"
            element={!sessionToken ? <Navigate to="/login" replace /> : <Onboarding />}
          />
          <Route
            path="/feed"
            element={
              !sessionToken ? (
                <Navigate to="/login" replace />
              ) : !onboardingComplete ? (
                <Navigate to="/onboarding" replace />
              ) : (
                <Feed />
              )
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      <Toaster />
    </BrowserRouter>
  );
}
