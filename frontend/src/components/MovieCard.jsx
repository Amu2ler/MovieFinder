import React from 'react'
import { motion } from 'framer-motion'

const PLATFORM_COLORS = {
  'Netflix':      'bg-red-800/80 border-red-700/50',
  'Prime Video':  'bg-blue-800/80 border-blue-700/50',
  'Disney+':      'bg-blue-700/80 border-blue-600/50',
  'HBO Max':      'bg-purple-800/80 border-purple-700/50',
  'Mubi':         'bg-amber-800/80 border-amber-700/50',
  'Peacock':      'bg-green-800/80 border-green-700/50',
  'Paramount+':   'bg-sky-700/80 border-sky-600/50',
  'Criterion':    'bg-zinc-700/80 border-zinc-600/50',
}

const POSTER_PLACEHOLDER = (title) => {
  const initials = title
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
  const safeTitle = title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600" viewBox="0 0 400 600"><rect width="400" height="600" fill="#12121e"/><text x="50%" y="44%" font-family="sans-serif" font-size="80" font-weight="bold" fill="#c49a2e" text-anchor="middle" dominant-baseline="middle">${initials}</text><text x="50%" y="60%" font-family="sans-serif" font-size="17" fill="#6b7280" text-anchor="middle" dominant-baseline="middle">${safeTitle}</text></svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

export default function MovieCard({ movie, style, dragProps, overlayState }) {
  const poster = movie.poster_url || POSTER_PLACEHOLDER(movie.title)

  return (
    <motion.div
      className="absolute inset-0 select-none"
      style={style}
      {...dragProps}
    >
      <div
        className={`
          h-full flex flex-col rounded-2xl overflow-hidden shadow-2xl bg-[#12121e] border border-white/8
          ${overlayState === 'like' ? 'card-like' : ''}
          ${overlayState === 'dislike' ? 'card-dislike' : ''}
        `}
      >
        {/* Poster — remplit l'espace disponible */}
        <div className="relative flex-1 min-h-0">
          <img
            src={poster}
            alt={movie.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.onerror = null
              e.target.src = POSTER_PLACEHOLDER(movie.title)
            }}
          />

          {/* Like / Dislike overlay badges */}
          {overlayState === 'like' && (
            <div className="absolute top-5 left-5 bg-green-500/90 backdrop-blur-sm text-white font-bold text-xl px-4 py-1.5 rounded-lg rotate-[-14deg] border border-green-400/60 shadow-lg tracking-wide">
              LIKE
            </div>
          )}
          {overlayState === 'dislike' && (
            <div className="absolute top-5 right-5 bg-red-500/90 backdrop-blur-sm text-white font-bold text-xl px-4 py-1.5 rounded-lg rotate-[14deg] border border-red-400/60 shadow-lg tracking-wide">
              NOPE
            </div>
          )}

          {/* Gradient overlay — more cinematic */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#12121e] via-[#12121e]/40 to-transparent" />
        </div>

        {/* Info — fixe en bas */}
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

          {/* Genres */}
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

          {/* Synopsis */}
          <p className="text-slate-400 text-sm leading-relaxed line-clamp-3">
            {movie.synopsis}
          </p>

          {/* Platforms */}
          {movie.streaming_platforms.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {movie.streaming_platforms.map((p) => (
                <span
                  key={p}
                  className={`px-2.5 py-0.5 rounded-md text-xs text-white font-semibold border ${
                    PLATFORM_COLORS[p] || 'bg-slate-700/80 border-slate-600/50'
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
  )
}
