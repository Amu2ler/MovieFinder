import { useCallback, useEffect, useState } from "react";
import { useMotionValue, useTransform, type PanInfo } from "framer-motion";
import { getRecommendations, sendInteraction, getWhyThis } from "../api/client";
import { notifyError } from "../lib/notify";
import useStore from "../store/useStore";
import type {
  InteractionAction,
  RecommendationItem,
  WhyThisResponse,
} from "../api/types";
import type { OverlayState } from "../components/MovieCard";

interface UseFeedOptions {
  /** Called whenever the user *likes* a movie (used to refresh the library). */
  onLike?: () => void;
}

export interface UseFeedResult {
  // ── Data ──────────────────────────────────────────────────────────────
  current: RecommendationItem | undefined;
  nextCard: RecommendationItem | undefined;
  loading: boolean;
  sending: boolean;
  error: string | null;
  likeCount: number;
  overlayState: OverlayState;
  whyData: WhyThisResponse | null;

  // ── Motion values for the swipe card ──────────────────────────────────
  x: ReturnType<typeof useMotionValue<number>>;
  rotate: ReturnType<typeof useTransform<number, number>>;
  cardOpacity: ReturnType<typeof useTransform<number, number>>;

  // ── Actions ───────────────────────────────────────────────────────────
  loadRecs: () => Promise<void>;
  handleAction: (action: InteractionAction) => Promise<void>;
  handleWhyThis: () => Promise<void>;
  handleDrag: (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => void;
  handleDragEnd: (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => void;
  closeWhyData: () => void;
}

/**
 * Owns the swipe feed: queue of recommendations, current index, like/dislike
 * mechanics, "why this?" lookups, and the framer-motion values that drive the
 * card. UI state only — the parent decides where to render it.
 */
export function useFeed({ onLike }: UseFeedOptions = {}): UseFeedResult {
  const { platformFilter } = useStore();

  const [queue, setQueue] = useState<RecommendationItem[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [likeCount, setLikeCount] = useState(0);
  const [overlayState, setOverlayState] = useState<OverlayState>(null);
  const [whyData, setWhyData] = useState<WhyThisResponse | null>(null);

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-18, 18]);
  const cardOpacity = useTransform(x, [-200, -100, 0, 100, 200], [0.4, 1, 1, 1, 0.4]);

  const loadRecs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getRecommendations({ platforms: platformFilter, limit: 20 });
      setQueue(data);
      setCurrentIdx(0);
    } catch {
      setError("Impossible de charger les recommandations.");
    } finally {
      setLoading(false);
    }
  }, [platformFilter]);

  useEffect(() => {
    loadRecs();
  }, [loadRecs]);

  const current = queue[currentIdx];
  const nextCard = queue[currentIdx + 1];

  const handleAction = useCallback(
    async (action: InteractionAction) => {
      if (sending || !current) return;
      setSending(true);
      setOverlayState(action);
      try {
        await sendInteraction(current.movie.id, action);
        if (action === "like") {
          setLikeCount((n) => n + 1);
          onLike?.();
        }
      } catch {
        notifyError("Vote non enregistré.");
      }
      await new Promise((r) => setTimeout(r, 350));
      x.set(0);
      setOverlayState(null);
      if (currentIdx + 1 >= queue.length) {
        await loadRecs();
      } else {
        setCurrentIdx((i) => i + 1);
      }
      setSending(false);
    },
    [sending, current, currentIdx, queue.length, x, loadRecs, onLike]
  );

  const handleWhyThis = useCallback(async () => {
    if (!current) return;
    try {
      const data = await getWhyThis(current.movie.id);
      setWhyData(data);
    } catch {
      setWhyData({
        movie_title: current.movie.title,
        reasons: ["Recommandation basée sur votre profil."],
      });
    }
  }, [current]);

  const handleDragEnd = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const threshold = 100;
      if (info.offset.x > threshold) handleAction("like");
      else if (info.offset.x < -threshold) handleAction("dislike");
      else {
        x.set(0);
        setOverlayState(null);
      }
    },
    [handleAction, x]
  );

  const handleDrag = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (info.offset.x > 60) setOverlayState("like");
      else if (info.offset.x < -60) setOverlayState("dislike");
      else setOverlayState(null);
    },
    []
  );

  const closeWhyData = useCallback(() => setWhyData(null), []);

  return {
    current,
    nextCard,
    loading,
    sending,
    error,
    likeCount,
    overlayState,
    whyData,
    x,
    rotate,
    cardOpacity,
    loadRecs,
    handleAction,
    handleWhyThis,
    handleDrag,
    handleDragEnd,
    closeWhyData,
  };
}
