import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, X } from "lucide-react";
import useNotifyStore, { type ToastType } from "../lib/notify";

const STYLES: Record<ToastType, string> = {
  error: "bg-red-500/15 border-red-500/30 text-red-200",
  success: "bg-green-500/15 border-green-500/30 text-green-200",
};

const ICONS: Record<ToastType, typeof AlertCircle> = {
  error: AlertCircle,
  success: CheckCircle2,
};

export default function Toaster() {
  const { toasts, remove } = useNotifyStore();

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => {
          const Icon = ICONS[t.type];
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className={`flex items-start gap-2 px-3 py-2.5 rounded-xl border backdrop-blur-md shadow-lg pointer-events-auto ${STYLES[t.type]}`}
            >
              <Icon size={16} className="mt-0.5 shrink-0" />
              <p className="text-sm flex-1 leading-snug">{t.message}</p>
              <button
                onClick={() => remove(t.id)}
                className="text-current/60 hover:text-current shrink-0"
                aria-label="Fermer"
              >
                <X size={14} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
