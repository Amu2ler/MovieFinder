import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Heart } from 'lucide-react'
import { getOnboardingMovies, sendInteraction } from '../api/client'
import useStore from '../store/useStore'

const POSTER_PLACEHOLDER = (title) => {
  const initials = title
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
  const safeTitle = title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600" viewBox="0 0 400 600"><rect width="400" height="600" fill="#12121e"/><text x="50%" y="45%" font-family="sans-serif" font-size="80" font-weight="bold" fill="#c49a2e" text-anchor="middle" dominant-baseline="middle">${initials}</text><text x="50%" y="62%" font-family="sans-serif" font-size="18" fill="#6b7280" text-anchor="middle" dominant-baseline="middle">${safeTitle}</text></svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

export default function Onboarding() {
  const navigate = useNavigate()
  const { userId, setOnboardingComplete } = useStore()

  const [movies, setMovies] = useState([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [sending, setSending] = useState(false)
  const [direction, setDirection] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    getOnboardingMovies()
      .then(setMovies)
      .catch(() => setError('Impossible de charger les films. Lance le backend (uvicorn).'))
      .finally(() => setLoading(false))
  }, [])

  const total = movies.length
  const movie = movies[currentIdx]
  const progress = total > 0 ? (currentIdx / total) * 100 : 0

  const handleAction = async (action) => {
    if (sending || !movie) return
    setSending(true)
    setDirection(action)

    try {
      await sendInteraction(userId, movie.id, action)
    } catch {
      // non-blocking
    }

    await new Promise((r) => setTimeout(r, 400))

    if (currentIdx + 1 >= total) {
      setOnboardingComplete()
      navigate('/feed')
    } else {
      setCurrentIdx((i) => i + 1)
      setDirection(null)
    }

    setSending(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#080810]">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#080810]">
        <div className="text-center max-w-sm">
          <p className="text-red-400 mb-4">{error}</p>
          <code className="text-xs text-slate-600 block">
            cd backend && uvicorn main:app --reload
          </code>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center px-4 pt-8 pb-6 bg-[#080810]">
      {/* Header */}
      <div className="w-full max-w-md mb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Movie<span className="text-brand-400">Finder</span>
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">Calibration de votre profil</p>
          </div>
          <span className="text-slate-500 text-sm tabular-nums">
            {currentIdx + 1} / {total}
          </span>
        </div>
        {/* Progress bar */}
        <div className="w-full h-0.5 bg-white/8 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-brand-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </div>

      {/* Card */}
      <div className="w-full max-w-md relative" style={{ height: 580 }}>
        <AnimatePresence mode="wait">
          {movie && (
            <motion.div
              key={movie.id}
              className="absolute inset-0"
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{
                opacity: 1,
                scale: 1,
                y: 0,
                x: direction === 'like' ? 60 : direction === 'dislike' ? -60 : 0,
                rotate: direction === 'like' ? 8 : direction === 'dislike' ? -8 : 0,
              }}
              exit={{ opacity: 0, scale: 0.88, y: -20 }}
              transition={{ duration: 0.35 }}
            >
              <div
                className={`
                  h-full rounded-2xl overflow-hidden bg-[#12121e] border shadow-2xl flex flex-col
                  ${direction === 'like'
                    ? 'border-green-500/60 shadow-green-500/10'
                    : direction === 'dislike'
                    ? 'border-red-500/60 shadow-red-500/10'
                    : 'border-white/6'}
                `}
              >
                {/* Poster */}
                <div className="relative flex-1 min-h-0 overflow-hidden">
                  <img
                    src={movie.poster_url || POSTER_PLACEHOLDER(movie.title)}
                    alt={movie.title}
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.onerror = null; e.target.src = POSTER_PLACEHOLDER(movie.title) }}
                  />
                  {direction === 'like' && (
                    <div className="absolute top-5 left-5 bg-green-500/90 backdrop-blur-sm text-white font-bold text-xl px-3 py-1.5 rounded-lg rotate-[-12deg] border border-green-400/60">
                      LIKE
                    </div>
                  )}
                  {direction === 'dislike' && (
                    <div className="absolute top-5 right-5 bg-red-500/90 backdrop-blur-sm text-white font-bold text-xl px-3 py-1.5 rounded-lg rotate-[12deg] border border-red-400/60">
                      NOPE
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#12121e] via-[#12121e]/40 to-transparent" />
                </div>

                {/* Info */}
                <div className="px-5 pb-4 pt-3">
                  <h2 className="text-xl font-bold text-white tracking-tight">{movie.title}</h2>
                  <p className="text-slate-400 text-sm mt-0.5 mb-2">
                    {movie.year} · {movie.director} · <span className="text-amber-400">★ {movie.avg_rating.toFixed(1)}</span>
                  </p>
                  <p className="text-slate-500 text-sm line-clamp-2 leading-relaxed">{movie.synopsis}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Buttons */}
      <div className="flex items-center gap-8 mt-6">
        <motion.button
          whileTap={{ scale: 0.88 }}
          whileHover={{ scale: 1.08 }}
          onClick={() => handleAction('dislike')}
          disabled={sending}
          className="w-[4.5rem] h-[4.5rem] rounded-full bg-[#12121e] border-2 border-red-500/50 flex items-center justify-center shadow-lg hover:border-red-400 hover:bg-red-500/10 transition-all disabled:opacity-40"
          aria-label="Ignorer"
        >
          <X size={26} className="text-red-400" />
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.88 }}
          whileHover={{ scale: 1.08 }}
          onClick={() => handleAction('like')}
          disabled={sending}
          className="w-[4.5rem] h-[4.5rem] rounded-full bg-[#12121e] border-2 border-green-500/50 flex items-center justify-center shadow-lg hover:border-green-400 hover:bg-green-500/10 transition-all disabled:opacity-40"
          aria-label="J'aime"
        >
          <Heart size={26} className="text-green-400" />
        </motion.button>
      </div>

      <p className="text-slate-700 text-xs mt-5 text-center max-w-xs leading-relaxed">
        Aimez ou ignorez chaque film pour calibrer votre profil.
        Plus de précision = meilleures recommandations.
      </p>
    </div>
  )
}
