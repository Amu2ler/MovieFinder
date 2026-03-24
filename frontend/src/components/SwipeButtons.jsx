import React from "react";
import { motion } from "framer-motion";
import { X, Heart, HelpCircle } from "lucide-react";

export default function SwipeButtons({ onLike, onDislike, onWhyThis, disabled }) {
  return (
    <div className="flex items-center justify-center gap-8 mt-6">
      {/* Dislike */}
      <motion.button
        whileTap={{ scale: 0.88 }}
        whileHover={{ scale: 1.08 }}
        onClick={onDislike}
        disabled={disabled}
        className="w-[4.5rem] h-[4.5rem] rounded-full bg-[#12121e] border-2 border-red-500/50 flex items-center justify-center shadow-lg hover:border-red-400 hover:bg-red-500/10 hover:shadow-red-500/20 hover:shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        aria-label="Ignorer"
      >
        <X size={26} className="text-red-400" />
      </motion.button>

      {/* Why this? */}
      <motion.button
        whileTap={{ scale: 0.88 }}
        whileHover={{ scale: 1.08 }}
        onClick={onWhyThis}
        disabled={disabled}
        className="w-12 h-12 rounded-full bg-[#12121e] border border-white/15 flex items-center justify-center hover:border-white/30 hover:bg-white/5 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        aria-label="Pourquoi ce film?"
        title="Pourquoi ce film?"
      >
        <HelpCircle size={18} className="text-slate-400" />
      </motion.button>

      {/* Like */}
      <motion.button
        whileTap={{ scale: 0.88 }}
        whileHover={{ scale: 1.08 }}
        onClick={onLike}
        disabled={disabled}
        className="w-[4.5rem] h-[4.5rem] rounded-full bg-[#12121e] border-2 border-green-500/50 flex items-center justify-center shadow-lg hover:border-green-400 hover:bg-green-500/10 hover:shadow-green-500/20 hover:shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        aria-label="J'aime"
      >
        <Heart size={26} className="text-green-400" />
      </motion.button>
    </div>
  );
}
