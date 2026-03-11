import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import useStore from '../store/useStore'
import { addHate } from '../api/client'

const PLATFORMS = ['Netflix', 'Prime Video', 'Disney+', 'HBO Max', 'Mubi', 'Peacock', 'Paramount+']

export default function FilterPanel({ onClose }) {
  const {
    userId,
    platformFilter,
    setPlatformFilter,
    bannedDirectors,
    bannedActors,
    addBannedDirector,
    addBannedActor,
  } = useStore()

  const [hateInput, setHateInput] = useState('')
  const [hateType, setHateType] = useState('director')
  const [hateError, setHateError] = useState('')

  const togglePlatform = (platform) => {
    if (platformFilter.includes(platform)) {
      setPlatformFilter(platformFilter.filter((p) => p !== platform))
    } else {
      setPlatformFilter([...platformFilter, platform])
    }
  }

  const handleAddHate = async () => {
    const name = hateInput.trim()
    if (!name) return
    setHateError('')
    try {
      await addHate(userId, hateType, name)
      if (hateType === 'director') addBannedDirector(name)
      else addBannedActor(name)
      setHateInput('')
    } catch {
      setHateError("Erreur lors de l'ajout. Réessaie.")
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-start justify-end"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

        <motion.div
          className="relative h-full w-80 bg-[#0e0e1c] border-l border-white/8 p-6 overflow-y-auto"
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-white font-bold text-lg tracking-tight">Filtres</h2>
            <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
              <X size={18} />
            </button>
          </div>

          {/* Platform filter */}
          <section className="mb-8">
            <h3 className="text-slate-500 text-xs uppercase tracking-widest mb-3">
              Plateformes de streaming
            </h3>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => (
                <button
                  key={p}
                  onClick={() => togglePlatform(p)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    platformFilter.includes(p)
                      ? 'bg-brand-500 border-brand-500 text-white font-medium'
                      : 'bg-transparent border-white/15 text-slate-400 hover:border-white/30 hover:text-white'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            {platformFilter.length > 0 && (
              <button
                onClick={() => setPlatformFilter([])}
                className="mt-3 text-xs text-slate-600 hover:text-slate-400 transition-colors"
              >
                Tout effacer
              </button>
            )}
          </section>

          {/* Hate mode */}
          <section>
            <h3 className="text-slate-500 text-xs uppercase tracking-widest mb-3">
              Bannir définitivement
            </h3>

            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setHateType('director')}
                className={`flex-1 py-1.5 rounded-lg text-sm transition-colors ${
                  hateType === 'director'
                    ? 'bg-brand-500 text-white font-medium'
                    : 'bg-white/5 text-slate-400 hover:bg-white/10'
                }`}
              >
                Réalisateur
              </button>
              <button
                onClick={() => setHateType('actor')}
                className={`flex-1 py-1.5 rounded-lg text-sm transition-colors ${
                  hateType === 'actor'
                    ? 'bg-brand-500 text-white font-medium'
                    : 'bg-white/5 text-slate-400 hover:bg-white/10'
                }`}
              >
                Acteur
              </button>
            </div>

            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={hateInput}
                onChange={(e) => setHateInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddHate()}
                placeholder={hateType === 'director' ? 'Ex: Michael Bay' : 'Ex: Vin Diesel'}
                className="flex-1 bg-[#080810] border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-brand-500 transition-colors"
              />
              <button
                onClick={handleAddHate}
                className="px-4 py-2 bg-brand-500 hover:bg-brand-600 rounded-xl text-white text-sm font-medium transition-colors"
              >
                +
              </button>
            </div>

            {hateError && <p className="text-red-400 text-xs mb-3">{hateError}</p>}

            {bannedDirectors.length > 0 && (
              <div className="mb-3">
                <p className="text-xs text-slate-600 mb-2 uppercase tracking-wider">Réalisateurs bannis</p>
                <div className="flex flex-wrap gap-1.5">
                  {bannedDirectors.map((d) => (
                    <span key={d} className="px-2.5 py-0.5 bg-red-500/15 text-red-400 border border-red-500/20 rounded-full text-xs">
                      {d}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {bannedActors.length > 0 && (
              <div>
                <p className="text-xs text-slate-600 mb-2 uppercase tracking-wider">Acteurs bannis</p>
                <div className="flex flex-wrap gap-1.5">
                  {bannedActors.map((a) => (
                    <span key={a} className="px-2.5 py-0.5 bg-red-500/15 text-red-400 border border-red-500/20 rounded-full text-xs">
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
