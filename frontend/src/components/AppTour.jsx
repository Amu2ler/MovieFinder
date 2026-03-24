import React, { useEffect, useState } from "react";
import Joyride, { STATUS } from "react-joyride";
import useStore from "../store/useStore";

const STEPS = [
  {
    target: "#tour-header",
    title: "Bienvenue sur MovieFinder 🎬",
    content:
      "MovieFinder te recommande des films personnalisés grâce à un moteur hybride (contenu + collaboratif). Ce tour rapide te présente les fonctionnalités clés.",
    placement: "bottom",
    disableBeacon: true,
  },
  {
    target: "#tour-swipe-card",
    title: "Swipe pour noter",
    content:
      "Glisse la carte à droite pour aimer un film, à gauche pour le passer. Plus tu interagis, plus les recommandations s'affinent.",
    placement: "top",
  },
  {
    target: "#tour-swipe-buttons",
    title: "Boutons d'action",
    content:
      "❌ Ignorer · ❓ Pourquoi ce film ? · ❤️ Aimer. Le bouton \"?\" t'explique pourquoi ce film t'est recommandé.",
    placement: "top",
  },
  {
    target: "#tour-filter-btn",
    title: "Filtres & préférences",
    content:
      "Filtre par plateforme de streaming (Netflix, Prime, Disney+…) et bannis définitivement des réalisateurs ou acteurs.",
    placement: "bottom",
  },
  {
    target: "#tour-liked-sidebar",
    title: "Tes films aimés",
    content:
      "Tous les films que tu aimes apparaissent ici, groupés par genre. Tu peux les glisser dans ta liste à voir ou déjà vu.",
    placement: "right",
  },
  {
    target: "#tour-watchlist",
    title: "Ta liste",
    content:
      'Organise tes films en "À voir" et "Déjà vu". Pour les films vus, attribue une note de 1 à 10. Tu peux aussi ajouter des films manuellement.',
    placement: "left",
  },
  {
    target: "#tour-help-btn",
    title: "Revoir ce guide",
    content: "Clique sur ce bouton à tout moment pour revoir le tour des fonctionnalités.",
    placement: "bottom",
  },
];

const joyrideStyles = {
  options: {
    primaryColor: "#7c3aed",
    backgroundColor: "#13131f",
    textColor: "#cbd5e1",
    arrowColor: "#13131f",
    overlayColor: "rgba(0,0,0,0.55)",
    zIndex: 10000,
  },
  tooltip: {
    borderRadius: 14,
    padding: "20px 24px",
    border: "1px solid rgba(255,255,255,0.07)",
  },
  tooltipTitle: {
    color: "#f1f5f9",
    fontSize: 15,
    fontWeight: 700,
    marginBottom: 8,
  },
  tooltipContent: {
    fontSize: 13.5,
    lineHeight: 1.6,
    color: "#94a3b8",
  },
  buttonNext: {
    backgroundColor: "#7c3aed",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    padding: "8px 16px",
  },
  buttonBack: {
    color: "#64748b",
    fontSize: 13,
    marginRight: 8,
  },
  buttonSkip: {
    color: "#475569",
    fontSize: 13,
  },
};

export default function AppTour({ run, onFinish }) {
  const { tourCompleted, setTourCompleted } = useStore();
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!tourCompleted) {
      // small delay so DOM elements are mounted
      const t = setTimeout(() => setStarted(true), 600);
      return () => clearTimeout(t);
    }
  }, [tourCompleted]);

  const active = run !== undefined ? run : started;

  const handleCallback = (data) => {
    const { status } = data;
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      setTourCompleted();
      setStarted(false);
      onFinish?.();
    }
  };

  return (
    <Joyride
      steps={STEPS}
      run={active}
      continuous
      showSkipButton
      showProgress
      scrollToFirstStep
      disableOverlayClose
      styles={joyrideStyles}
      locale={{
        back: "Précédent",
        close: "Fermer",
        last: "Terminer",
        next: "Suivant",
        skip: "Passer",
      }}
      callback={handleCallback}
    />
  );
}
