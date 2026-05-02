import { motion, type HTMLMotionProps } from "framer-motion";
import { posterPlaceholder } from "../lib/posterPlaceholder";
import type { Movie } from "../api/types";

const PLATFORM_COLORS: Record<string, string> = {
  Netflix: "bg-red-800/80 border-red-700/50",
  "Prime Video": "bg-blue-800/80 border-blue-700/50",
  "Disney+": "bg-blue-700/80 border-blue-600/50",
  "HBO Max": "bg-purple-800/80 border-purple-700/50",
  Mubi: "bg-amber-800/80 border-amber-700/50",
  Peacock: "bg-green-800/80 border-green-700/50",
  "Paramount+": "bg-sky-700/80 border-sky-600/50",
  Criterion: "bg-zinc-700/80 border-zinc-600/50",
};

export type OverlayState = "like" | "dislike" | null;

interface MovieCardProps {
  movie: Movie;
  style?: HTMLMotionProps<"div">["style"];
  dragProps?: Partial<HTMLMotionProps<"div">>;
  overlayState?: OverlayState;
}

export default function MovieCard({ movie, style, dragProps, overlayState }: MovieCardProps) {
  const poster = movie.poster_url || posterPlaceholder(movie.title);

  return (
    <motion.div className="absolute inset-0 select-none" style={style} {...dragProps}>
      <div
        className={`
          h-full flex flex-col rounded-2xl overflow-hidden shadow-2xl bg-[#12121e] border border-white/8
          ${overlayState === "like" ? "card-like" : ""}
          ${overlayState === "dislike" ? "card-dislike" : ""}
        `}
      >
        <div className="relative flex-1 min-h-0">
          <img
            src={poster}
            alt={movie.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              const img = e.currentTarget;
              img.onerror = null;
              img.src = posterPlaceholder(movie.title);
            }}
          />

          {overlayState === "like" && (
            <div className="absolute top-5 left-5 bg-green-500/90 backdrop-blur-sm text-white font-bold text-xl px-4 py-1.5 rounded-lg rotate-[-14deg] border border-green-400/60 shadow-lg tracking-wide">
              LIKE
            </div>
          )}
          {overlayState === "dislike" && (
            <div className="absolute top-5 right-5 bg-red-500/90 backdrop-blur-sm text-white font-bold text-xl px-4 py-1.5 rounded-lg rotate-[14deg] border border-red-400/60 shadow-lg tracking-wide">
              NOPE
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-[#12121e] via-[#12121e]/40 to-transparent" />
        </div>

        <div className="px-5 pb-5 pt-3 shrink-0">
          <div className="flex items-start justify-between gap-3 mb-1">
            <h2 className="text-2xl font-bold text-white leading-tight tracking-tight">
              {movie.title}
            </h2>
            <span className="text-amber-400 font-semibold text-base shrink-0 mt-1 flex items-center gap-1">
              ★ {movie.avg_rating.toFixed(1)}
            </span>
          </div>

          <p className="text-slate-400 text-base mb-3">
            {movie.year} · {movie.director}
          </p>

          <div className="flex flex-wrap gap-1.5 mb-3">
            {movie.genres.slice(0, 3).map((g) => (
              <span
                key={g}
                className="px-3 py-0.5 bg-white/8 backdrop-blur-sm border border-white/10 rounded-full text-sm text-slate-300"
              >
                {g}
              </span>
            ))}
          </div>

          <p className="text-slate-400 text-sm leading-relaxed line-clamp-3">{movie.synopsis}</p>

          {movie.streaming_platforms.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {movie.streaming_platforms.map((p) => (
                <span
                  key={p}
                  className={`px-2.5 py-0.5 rounded-md text-xs text-white font-semibold border ${
                    PLATFORM_COLORS[p] || "bg-slate-700/80 border-slate-600/50"
                  }`}
                >
                  {p}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
