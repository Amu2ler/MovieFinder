import { motion, AnimatePresence } from "framer-motion";
import { Film, X } from "lucide-react";
import type { WhyThisResponse } from "../api/types";

interface WhyThisModalProps {
  data: WhyThisResponse | null;
  onClose: () => void;
}

export default function WhyThisModal({ data, onClose }: WhyThisModalProps) {
  if (!data) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />

        <motion.div
          className="relative bg-[#0e0e1c] border border-white/8 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
        >
          <div className="flex items-start justify-between gap-3 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-brand-500/15 border border-brand-500/25 flex items-center justify-center shrink-0">
                <Film size={17} className="text-brand-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-widest mb-0.5">
                  Pourquoi ce film ?
                </p>
                <h3 className="text-white font-semibold leading-tight">{data.movie_title}</h3>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-600 hover:text-slate-400 transition-colors shrink-0 mt-0.5"
            >
              <X size={18} />
            </button>
          </div>

          <ul className="space-y-3">
            {data.reasons.map((reason, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center text-xs font-semibold shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <p className="text-slate-300 text-sm leading-relaxed">{reason}</p>
              </li>
            ))}
          </ul>

          <button
            onClick={onClose}
            className="mt-5 w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-sm transition-colors border border-white/5"
          >
            Fermer
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
