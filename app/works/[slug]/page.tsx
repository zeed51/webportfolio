"use client";

import { Inter } from "next/font/google";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import "../../globals.css";

import { WORK_REELS } from "../data";
import { detectLanguage, Language } from "../../lib/language";
import { NAV_LABELS } from "../../lib/translations";
import { WORK_ITEM_LABELS, WorkItemId } from "../../lib/workLabels";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
});

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/* ===== CAROUSEL (вертикальні 9:16 рілзи) ===== */

const CENTER_WIDTH_RATIO = 0.36;
const CENTER_WIDTH_MAX = 480;
const SPACING_RATIO = 0.92;
const SCALE_FALLOFF = 0.4;
const SCALE_MIN = 0.55;
const ACTIVE_THRESHOLD = 0.5;

const MOBILE_SCALE_MAX = 1;
const MOBILE_SCALE_MIN = 0.7;

/* ===== DOTS: положення крапок відносно нижнього краю відео ===== */

// відступ від нижнього краю відео до крапок (px)
const DOTS_GAP_PX = 18;

// у скільки разів візуально зменшене відео в центрі (keyframes у CSS):
// reel-scale-mobile → 0.9, featured-scale-mobile → 1
const CAROUSEL_DOTS_VIDEO_SCALE = 0.9;
const FEATURED_DOTS_VIDEO_SCALE = 1;

// мінімальний відступ крапок від низу екрана (px)
const DOTS_BOTTOM_SAFE_PX = 16;

function useDotsTop(
  enabled: boolean,
  slotRefs: React.MutableRefObject<(HTMLDivElement | null)[]>,
  videoScale: number
) {
  const [top, setTop] = useState<number | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const measure = () => {
      const slot = slotRefs.current.find(Boolean);
      if (!slot) return;

      // центр слота по вертикалі не змінюється від scale-анімації,
      // offsetHeight — висота без transform, тому низ рахуємо від центру
      const rect = slot.getBoundingClientRect();
      const centerY = rect.top + rect.height / 2;
      const videoBottom = centerY + (slot.offsetHeight * videoScale) / 2;

      const maxTop = window.innerHeight - DOTS_BOTTOM_SAFE_PX;
      setTop(Math.round(Math.min(videoBottom + DOTS_GAP_PX, maxTop)));
    };

    measure();
    const t = setTimeout(measure, 150);

    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);
    window.visualViewport?.addEventListener("resize", measure);

    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
      window.visualViewport?.removeEventListener("resize", measure);
    };
  }, [enabled, slotRefs, videoScale]);

  return top;
}

function CarouselView({
  videos,
  muted,
  volume,
  onAutoplayBlocked,
}: {
  videos: string[];
  muted: boolean;
  volume: number;
  onAutoplayBlocked: () => void;
}) {
  const trackRef = useRef<HTMLElement>(null);
  const slotRefs = useRef<(HTMLDivElement | null)[]>([]);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  const [isMobile, setIsMobile] = useState<boolean | null>(null);
  const [mobileActiveIndex, setMobileActiveIndex] = useState(0);
  const mobileTrackRef = useRef<HTMLElement>(null);
  const mobileSlotRefs = useRef<(HTMLDivElement | null)[]>([]);

  const dotsTop = useDotsTop(
    isMobile === true,
    mobileSlotRefs,
    CAROUSEL_DOTS_VIDEO_SCALE
  );

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 800px)");
    const apply = () => setIsMobile(mq.matches);

    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  // ручна пауза користувачем: доки індекс тут — автоплей його не чіпає
  const manualPauseRef = useRef<Set<number>>(new Set());
  const [flash, setFlash] = useState<{ index: number; type: "play" | "pause" } | null>(null);

  useEffect(() => {
    if (!flash) return;
    const timer = setTimeout(() => setFlash(null), 500);
    return () => clearTimeout(timer);
  }, [flash]);

  const togglePlay = (index: number, video: HTMLVideoElement | null) => {
    if (!video) return;

    if (video.paused) {
      manualPauseRef.current.delete(index);
      video.play().catch(() => {});
      setFlash({ index, type: "play" });
    } else {
      manualPauseRef.current.add(index);
      video.pause();
      setFlash({ index, type: "pause" });
    }
  };

  const handleFullscreen = (e: React.MouseEvent, video: HTMLVideoElement | null) => {
    e.stopPropagation();
    if (!video) return;

    const anyVideo = video as HTMLVideoElement & {
      webkitEnterFullscreen?: () => void;
      webkitRequestFullscreen?: () => void;
    };

    if (video.requestFullscreen) {
      video.requestFullscreen().catch(() => {});
    } else if (anyVideo.webkitEnterFullscreen) {
      anyVideo.webkitEnterFullscreen();
    } else if (anyVideo.webkitRequestFullscreen) {
      anyVideo.webkitRequestFullscreen();
    }
  };

  // активна крапка = відео, найближче до центру екрана
  useEffect(() => {
    if (isMobile !== true) return;

    const container = trackRef.current;
    if (!container) return;

    const updateActive = () => {
      const center = container.scrollLeft + container.clientWidth / 2;
      let closest = 0;
      let minDist = Infinity;

      mobileSlotRefs.current.forEach((slot, i) => {
        if (!slot) return;
        const slotCenter = slot.offsetLeft + slot.offsetWidth / 2;
        const dist = Math.abs(slotCenter - center);
        if (dist < minDist) {
          minDist = dist;
          closest = i;
        }
      });

      setMobileActiveIndex(closest);
    };

    updateActive();
    container.addEventListener("scroll", updateActive, { passive: true });

    return () => container.removeEventListener("scroll", updateActive);
  }, [isMobile, videos]);

  // при вході: короткий "підглядаючий" скрол вліво і назад
  useEffect(() => {
    if (isMobile !== true) return;

    const container = trackRef.current;
    if (!container) return;

    const slot = container.querySelector<HTMLElement>(".reel-slot-mobile");
    if (!slot) return;

    const PEEK_FRACTION = 0.35; // яку частку рілзу прокрутити
    const DELAY_MS = 700;       // пауза перед стартом
    const MOVE_MS = 700;        // тривалість руху в один бік
    const HOLD_MS = 150;        // зупинка в крайній точці

    const distance = slot.offsetWidth * PEEK_FRACTION;

    let cancelled = false;
    let rafId = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];

    const ease = (t: number) =>
      t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

    const animate = (from: number, to: number, done: () => void) => {
      const start = performance.now();

      const step = (now: number) => {
        if (cancelled) return;

        const t = Math.min(1, (now - start) / MOVE_MS);
        container.scrollLeft = from + (to - from) * ease(t);

        if (t < 1) {
          rafId = requestAnimationFrame(step);
        } else {
          done();
        }
      };

      rafId = requestAnimationFrame(step);
    };

    const finish = () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      timers.forEach(clearTimeout);
      container.style.scrollSnapType = "";
      container.removeEventListener("touchstart", finish);
    };

    // якщо людина торкнулась екрана — одразу зупиняємо анімацію
    container.addEventListener("touchstart", finish, { passive: true });

    timers.push(
      setTimeout(() => {
        if (cancelled) return;

        // на час анімації вимикаємо snap, інакше він "тягне" назад
        container.style.scrollSnapType = "none";

        animate(0, distance, () => {
          timers.push(
            setTimeout(() => {
              if (cancelled) return;
              animate(distance, 0, () => {
                container.style.scrollSnapType = "";
                container.removeEventListener("touchstart", finish);
              });
            }, HOLD_MS)
          );
        });
      }, DELAY_MS)
    );

    return finish;
  }, [isMobile]);

  useEffect(() => {
    videoRefs.current.forEach((video) => {
      if (video) {
        video.muted = muted;
        video.volume = volume;
      }
    });
  }, [muted, volume]);

  useEffect(() => {
    if (isMobile !== false) return;

    const track = trackRef.current;
    if (!track) return;

    const scrollToIndex = (index: number) => {
      const rect = track.getBoundingClientRect();
      const vh = window.innerHeight;
      const scrollableDistance = rect.height - vh;

      if (scrollableDistance <= 0) return;

      const absoluteTrackTop = window.scrollY + rect.top;
      const targetY =
        absoluteTrackTop +
        scrollableDistance * (index / (videos.length - 1));

      window.scrollTo({ top: targetY, behavior: "smooth" });
    };

    const update = () => {
      const vh = window.innerHeight;
      const vw = window.innerWidth;

      const rect = track.getBoundingClientRect();
      const scrollableDistance = rect.height - vh;

      const rawProgress =
        scrollableDistance > 0 ? clamp01(-rect.top / scrollableDistance) : 0;

      const progress = rawProgress * (videos.length - 1);

      const centerWidth = Math.min(vw * CENTER_WIDTH_RATIO, CENTER_WIDTH_MAX);
      const centerHeight = (centerWidth / 9) * 16;
      const spacing = centerWidth * SPACING_RATIO;

      videos.forEach((_, i) => {
        const slot = slotRefs.current[i];
        const video = videoRefs.current[i];

        if (!slot) return;

        const offset = i - progress;
        const absOffset = Math.abs(offset);

        const scale = Math.max(SCALE_MIN, 1 - absOffset * SCALE_FALLOFF);
        const opacity = clamp01(1 - Math.max(absOffset - 1, 0) * 2);
        const translateX = offset * spacing;
        const zIndex = Math.round(100 - absOffset * 10);

        slot.style.width = `${centerWidth}px`;
        slot.style.height = `${centerHeight}px`;
        slot.style.transform = `translate(-50%, -50%) translateX(${translateX}px) scale(${scale})`;
        slot.style.opacity = String(opacity);
        slot.style.zIndex = String(zIndex);
        slot.style.cursor = absOffset < ACTIVE_THRESHOLD ? "default" : "pointer";

slot.onclick = () => {
  if (document.fullscreenElement) return;

  if (absOffset >= ACTIVE_THRESHOLD) {
    scrollToIndex(i);
  } else {
    togglePlay(i, video);
  }
};

        if (!video) return;

        if (absOffset < ACTIVE_THRESHOLD) {
          if (video.paused && !manualPauseRef.current.has(i)) {
            video.play().catch(() => {
              video.muted = true;
              onAutoplayBlocked();
              video.play().catch(() => {});
            });
          }
        } else {
          if (!video.paused) {
            video.pause();
          }
          manualPauseRef.current.delete(i);
        }
      });
    };

    update();

    window.addEventListener("scroll", update);
    window.addEventListener("resize", update);

    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [videos, isMobile]);


  // мобільний горизонтальний скрол: автовідтворення того відео,
  // яке зараз найбільше в полі зору всередині горизонтального контейнера
  useEffect(() => {
    if (!isMobile) return;

    const container = trackRef.current;
    if (!container) return;

    const tryPlay = (video: HTMLVideoElement, index: number) => {
      if (manualPauseRef.current.has(index)) return;
      if (!video.paused) return;
      video.play().catch(() => {
        // не міняємо глобальний React-стан muted тут — інакше
        // після першого дотику (unlockAudio в ReelPage) React
        // одразу перезапише video.muted назад в true на
        // наступному рендері. Просто мутуємо DOM ЛОКАЛЬНО,
        // щоб автоплей технічно стартував, а не блокувався.
        video.muted = true;
        video.play().catch(() => {});
      });
    };

    // форсуємо першу спробу відразу, не чекаючи колбек обсервера —
    // на мобільних буває затримка/гонка між рендером відео і observe()
    const firstVideo = videoRefs.current[0];
    if (firstVideo) tryPlay(firstVideo, 0);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target as HTMLVideoElement;
          const index = videoRefs.current.indexOf(video);

          if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
            tryPlay(video, index);
          } else if (!video.paused) {
            video.pause();
            manualPauseRef.current.delete(index);
          }
        });
      },
      { root: container, threshold: [0, 0.6, 1] }
    );

    videoRefs.current.forEach((video) => {
      if (video) observer.observe(video);
    });

    return () => observer.disconnect();
  }, [isMobile, videos, onAutoplayBlocked]);

  if (isMobile === null) return null;

  if (isMobile) {
    return (
      <>
        <section className="reel-track-mobile" ref={trackRef}>
          {videos.map((src, i) => (
            <div
              key={src}
              className="reel-slot-mobile"
              ref={(el) => {
                mobileSlotRefs.current[i] = el;
              }}
              onClick={() => togglePlay(i, videoRefs.current[i])}
            >
              <video
                ref={(el) => {
                  videoRefs.current[i] = el;
                }}
                className="reel-video-mobile"
                src={src}
                muted={muted}
                loop
                playsInline
              />

              {flash?.index === i && (
                <span className="reel-flash-icon" key={`${flash.type}-${i}`}>
                  {flash.type === "pause" ? (
                    <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                      <rect x="6" y="5" width="4" height="14" rx="1" />
                      <rect x="14" y="5" width="4" height="14" rx="1" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                      <path d="M7 5L19 12L7 19V5Z" />
                    </svg>
                  )}
                </span>
              )}

              <button
                type="button"
                className="reel-fullscreen-btn"
                onClick={(e) => handleFullscreen(e, videoRefs.current[i])}
                aria-label="На весь екран"
              >
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M4 9V4H9M20 9V4H15M4 15V20H9M20 15V20H15"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          ))}
        </section>

        <div
          className="reel-dots"
          aria-hidden="true"
          style={{
            top: dotsTop ?? undefined,
            bottom: "auto",
            opacity: dotsTop === null ? 0 : 1,
          }}
        >
          {videos.map((_, i) => (
            <span
              key={i}
              className={`reel-dot ${
                i === mobileActiveIndex ? "reel-dot-active" : ""
              }`}
            />
          ))}
        </div>
      </>
    );
  }

  return (
    <section
      className="reel-track"
      ref={trackRef}
      style={{ height: `${videos.length * 100}vh` }}
    >
      <div className="reel-sticky">
        <div className="reel-stage">
          {videos.map((src, i) => (
            <div
              key={src}
              className="reel-slot"
              ref={(el) => {
                slotRefs.current[i] = el;
              }}
            >
              <video
                ref={(el) => {
                  videoRefs.current[i] = el;
                }}
                className="reel-video"
                src={src}
                muted={muted}
                loop
                playsInline
              />

              {flash?.index === i && (
                <span className="reel-flash-icon" key={`${flash.type}-${i}`}>
                  {flash.type === "pause" ? (
                    <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                      <rect x="6" y="5" width="4" height="14" rx="1" />
                      <rect x="14" y="5" width="4" height="14" rx="1" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                      <path d="M7 5L19 12L7 19V5Z" />
                    </svg>
                  )}
                </span>
              )}

              <button
                type="button"
                className="reel-fullscreen-btn"
                onClick={(e) => handleFullscreen(e, videoRefs.current[i])}
                aria-label="На весь екран"
              >
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M4 9V4H9M20 9V4H15M4 15V20H9M20 15V20H15"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ===== FEATURED (16:9 карусель, головне відео зсунуте вліво) ===== */

const FEATURED_WIDTH_RATIO = 0.5;
const FEATURED_WIDTH_MAX = 760;

const FEATURED_SPACING_RATIO = 1.2;
const FEATURED_SCALE_FALLOFF = 0.35;
const FEATURED_SCALE_MIN = 0.55;
const FEATURED_ACTIVE_SCALE_BOOST = 1.5;
const FEATURED_ACTIVE_THRESHOLD = 0.5;
const FEATURED_CENTER_OFFSET_RATIO = -0.16;

function FeaturedView({
  videos,
  muted,
  volume,
  onAutoplayBlocked,
}: {
  videos: (string | null)[];
  muted: boolean;
  volume: number;
  onAutoplayBlocked: () => void;
}) {
  const trackRef = useRef<HTMLElement>(null);
  const slotRefs = useRef<(HTMLDivElement | null)[]>([]);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  const manualPauseRef = useRef<Set<number>>(new Set());
  const [flash, setFlash] = useState<{ index: number; type: "play" | "pause" } | null>(null);

  const [isMobile, setIsMobile] = useState(false);
  const [mobileActiveIndex, setMobileActiveIndex] = useState(0);
  const mobileSlotRefs = useRef<(HTMLDivElement | null)[]>([]);

  const dotsTop = useDotsTop(
    isMobile,
    mobileSlotRefs,
    FEATURED_DOTS_VIDEO_SCALE
  );

  useEffect(() => {
    setIsMobile(window.innerWidth <= 800);
  }, []);

  // активна крапка = відео, найближче до центру екрана
  useEffect(() => {
    if (!isMobile) return;

    const container = trackRef.current;
    if (!container) return;

    const updateActive = () => {
      const center = container.scrollLeft + container.clientWidth / 2;
      let closest = 0;
      let minDist = Infinity;

      mobileSlotRefs.current.forEach((slot, i) => {
        if (!slot) return;
        const slotCenter = slot.offsetLeft + slot.offsetWidth / 2;
        const dist = Math.abs(slotCenter - center);
        if (dist < minDist) {
          minDist = dist;
          closest = i;
        }
      });

      setMobileActiveIndex(closest);
    };

    updateActive();
    container.addEventListener("scroll", updateActive, { passive: true });

    return () => container.removeEventListener("scroll", updateActive);
  }, [isMobile, videos]);

  // при вході: короткий "підглядаючий" скрол вліво і назад
  useEffect(() => {
    if (!isMobile) return;

    const container = trackRef.current;
    if (!container) return;

    const slot = container.querySelector<HTMLElement>(".featured-slot-mobile");
    if (!slot) return;

    const PEEK_FRACTION = 0.35;
    const DELAY_MS = 700;
    const MOVE_MS = 700;
    const HOLD_MS = 150;

    const distance = slot.offsetWidth * PEEK_FRACTION;

    let cancelled = false;
    let rafId = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];

    const ease = (t: number) =>
      t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

    const animate = (from: number, to: number, done: () => void) => {
      const start = performance.now();

      const step = (now: number) => {
        if (cancelled) return;

        const t = Math.min(1, (now - start) / MOVE_MS);
        container.scrollLeft = from + (to - from) * ease(t);

        if (t < 1) {
          rafId = requestAnimationFrame(step);
        } else {
          done();
        }
      };

      rafId = requestAnimationFrame(step);
    };

    const finish = () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      timers.forEach(clearTimeout);
      container.style.scrollSnapType = "";
      container.removeEventListener("touchstart", finish);
    };

    container.addEventListener("touchstart", finish, { passive: true });

    timers.push(
      setTimeout(() => {
        if (cancelled) return;

        container.style.scrollSnapType = "none";

        animate(0, distance, () => {
          timers.push(
            setTimeout(() => {
              if (cancelled) return;
              animate(distance, 0, () => {
                container.style.scrollSnapType = "";
                container.removeEventListener("touchstart", finish);
              });
            }, HOLD_MS)
          );
        });
      }, DELAY_MS)
    );

    return finish;
  }, [isMobile]);

  useEffect(() => {
    if (!flash) return;
    const timer = setTimeout(() => setFlash(null), 500);
    return () => clearTimeout(timer);
  }, [flash]);

  const togglePlay = (index: number, video: HTMLVideoElement | null) => {
    if (!video) return;

    if (video.paused) {
      manualPauseRef.current.delete(index);
      video.play().catch(() => {});
      setFlash({ index, type: "play" });
    } else {
      manualPauseRef.current.add(index);
      video.pause();
      setFlash({ index, type: "pause" });
    }
  };

  const handleFullscreen = (e: React.MouseEvent, video: HTMLVideoElement | null) => {
    e.stopPropagation();
    if (!video) return;

    const anyVideo = video as HTMLVideoElement & {
      webkitEnterFullscreen?: () => void;
      webkitRequestFullscreen?: () => void;
    };

    if (video.requestFullscreen) {
      video.requestFullscreen().catch(() => {});
    } else if (anyVideo.webkitEnterFullscreen) {
      anyVideo.webkitEnterFullscreen();
    } else if (anyVideo.webkitRequestFullscreen) {
      anyVideo.webkitRequestFullscreen();
    }
  };

  useEffect(() => {
    videoRefs.current.forEach((video) => {
      if (video) {
        video.muted = muted;
        video.volume = volume;
      }
    });
  }, [muted, volume]);

  // мобільний горизонтальний feed — точна копія reel-track-mobile
  // (окремий горизонтальний scroll-snap контейнер, autoplay через IO)
  useEffect(() => {
    if (!isMobile) return;

    const container = trackRef.current;
    if (!container) return;

    const tryPlay = (video: HTMLVideoElement, index: number) => {
      if (manualPauseRef.current.has(index)) return;
      if (!video.paused) return;
      video.play().catch(() => {
        video.muted = true;
        video.play().catch(() => {});
      });
    };

    const firstVideo = videoRefs.current[0];
    if (firstVideo) tryPlay(firstVideo, 0);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target as HTMLVideoElement;
          const index = videoRefs.current.indexOf(video);

          if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
            tryPlay(video, index);
          } else if (!video.paused) {
            video.pause();
            manualPauseRef.current.delete(index);
          }
        });
      },
      { root: container, threshold: [0, 0.6, 1] }
    );

    videoRefs.current.forEach((video) => {
      if (video) observer.observe(video);
    });

    return () => observer.disconnect();
  }, [isMobile, videos]);

  // десктопний scroll-based coverflow
  useEffect(() => {
    if (isMobile) return;

    const track = trackRef.current;
    if (!track) return;

    const scrollToIndex = (index: number) => {
      const rect = track.getBoundingClientRect();
      const vh = window.innerHeight;
      const scrollableDistance = rect.height - vh;

      if (scrollableDistance <= 0) return;

      const absoluteTrackTop = window.scrollY + rect.top;
      const targetY =
        absoluteTrackTop +
        scrollableDistance * (index / (videos.length - 1));

      window.scrollTo({ top: targetY, behavior: "smooth" });
    };

    const update = () => {
      const vh = window.innerHeight;
      const vw = window.innerWidth;

      const rect = track.getBoundingClientRect();
      const scrollableDistance = rect.height - vh;

      const rawProgress =
        scrollableDistance > 0 ? clamp01(-rect.top / scrollableDistance) : 0;

      const progress = rawProgress * (videos.length - 1);

      const centerWidth = Math.min(vw * FEATURED_WIDTH_RATIO, FEATURED_WIDTH_MAX);
      const centerHeight = (centerWidth / 16) * 9;
      const spacing = centerWidth * FEATURED_SPACING_RATIO;
      const centerOffset = vw * FEATURED_CENTER_OFFSET_RATIO;

      videos.forEach((_, i) => {
        const slot = slotRefs.current[i];
        const video = videoRefs.current[i];

        if (!slot) return;

        const offset = i - progress;
        const absOffset = Math.abs(offset);

        const baseScale = Math.max(FEATURED_SCALE_MIN, 1 - absOffset * FEATURED_SCALE_FALLOFF);
        const activeBoost = Math.max(0, 1 - absOffset) * (FEATURED_ACTIVE_SCALE_BOOST - 1);
        const scale = baseScale + activeBoost;

        const opacity = clamp01(1 - Math.max(absOffset - 1.2, 0) * 2);
        const translateX = offset * spacing + centerOffset;
        const zIndex = Math.round(100 - absOffset * 10);

        slot.style.width = `${centerWidth}px`;
        slot.style.height = `${centerHeight}px`;
        slot.style.transform = `translate(-50%, -50%) translateX(${translateX}px) scale(${scale})`;
        slot.style.opacity = String(opacity);
        slot.style.zIndex = String(zIndex);
        slot.style.cursor = absOffset < FEATURED_ACTIVE_THRESHOLD ? "default" : "pointer";

        slot.onclick = () => {
          if (document.fullscreenElement) return;

          if (absOffset >= FEATURED_ACTIVE_THRESHOLD) {
            scrollToIndex(i);
          } else {
            togglePlay(i, video);
          }
        };

        if (!video) return;

        if (absOffset < FEATURED_ACTIVE_THRESHOLD) {
          if (video.paused && !manualPauseRef.current.has(i)) {
            video.play().catch(() => {
              video.muted = true;
              onAutoplayBlocked();
              video.play().catch(() => {});
            });
          }
        } else {
          if (!video.paused) {
            video.pause();
          }
          manualPauseRef.current.delete(i);
        }
      });
    };

    update();

    window.addEventListener("scroll", update);
    window.addEventListener("resize", update);

    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [videos, isMobile]);

  if (isMobile) {
    return (
      <>
        <section className="featured-track-mobile" ref={trackRef}>
          {videos.map((src, i) => (
            <div
              key={i}
              className="featured-slot-mobile"
              ref={(el) => {
                mobileSlotRefs.current[i] = el;
              }}
              onClick={() => togglePlay(i, videoRefs.current[i])}
            >
              {src ? (
                  <>
                    <video
                      ref={(el) => {
                        videoRefs.current[i] = el;
                      }}
                      className="featured-video"
                      src={src}
                      muted={muted}
                      loop
                      playsInline
                    />

                    {flash?.index === i && (
                      <span className="reel-flash-icon" key={`${flash.type}-${i}`}>
                        {flash.type === "pause" ? (
                          <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                            <rect x="6" y="5" width="4" height="14" rx="1" />
                            <rect x="14" y="5" width="4" height="14" rx="1" />
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                            <path d="M7 5L19 12L7 19V5Z" />
                          </svg>
                        )}
                      </span>
                    )}

                    <button
                      type="button"
                      className="reel-fullscreen-btn"
                      onClick={(e) => handleFullscreen(e, videoRefs.current[i])}
                      aria-label="На весь екран"
                    >
                      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path
                          d="M4 9V4H9M20 9V4H15M4 15V20H9M20 15V20H15"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  </>
              ) : (
                <div className="featured-soon">SOON</div>
              )}
            </div>
          ))}
        </section>

        <div
          className="reel-dots"
          aria-hidden="true"
          style={{
            top: dotsTop ?? undefined,
            bottom: "auto",
            opacity: dotsTop === null ? 0 : 1,
          }}
        >
          {videos.map((_, i) => (
            <span
              key={i}
              className={`reel-dot ${
                i === mobileActiveIndex ? "reel-dot-active" : ""
              }`}
            />
          ))}
        </div>
      </>
    );
  }

  return (
    <section
      className="reel-track"
      ref={trackRef}
      style={{ height: `${videos.length * 100}vh` }}
    >
      <div className="reel-sticky">
        <div className="reel-stage">
          {videos.map((src, i) => (
            <div
              key={i}
              className="featured-slot"
              ref={(el) => {
                slotRefs.current[i] = el;
              }}
            >
              {src ? (
                <>
                  <video
                    ref={(el) => {
                      videoRefs.current[i] = el;
                    }}
                    className="featured-video"
                    src={src}
                    muted={muted}
                    loop
                    playsInline
                  />

                  {flash?.index === i && (
                    <span className="reel-flash-icon" key={`${flash.type}-${i}`}>
                      {flash.type === "pause" ? (
                        <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                          <rect x="6" y="5" width="4" height="14" rx="1" />
                          <rect x="14" y="5" width="4" height="14" rx="1" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                          <path d="M7 5L19 12L7 19V5Z" />
                        </svg>
                      )}
                    </span>
                  )}

                  <button
                    type="button"
                    className="reel-fullscreen-btn"
                    onClick={(e) => handleFullscreen(e, videoRefs.current[i])}
                    aria-label="На весь екран"
                  >
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M4 9V4H9M20 9V4H15M4 15V20H9M20 15V20H15"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </>
              ) : (
                <div className="featured-soon">SOON</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ===== POSTER: рух по діагоналі справа-зверху вниз-ліворуч,
   з м'яким 3D-поворотом кожної картки під час руху ===== */

const POSTER_HEIGHT_RATIO = 0.82;
const POSTER_HEIGHT_MAX = 820;
const POSTER_ASPECT = 5 / 7;

// відстань між сусідніми постерами вздовж діагоналі (px)
const POSTER_SPACING = 820;

// наскільки далеко в глибину (px) йде постер, що не в фокусі
const POSTER_DEPTH_STEP = 220;

// м'який поворот навколо вертикальної осі під час руху (град) —
// невеликий, щоб виглядало як "трохи завертає", а не coverflow-флип
const POSTER_ROTATE_DEG = 30;

const POSTER_ACTIVE_THRESHOLD = 0.5;

// напрямок і сила зсуву постерів по горизонталі та вертикалі
// відносно offset (позиції від активного постера).
// Додатнє значення POSTER_SHIFT_X -> постери з offset > 0 йдуть праворуч.
// Додатнє значення POSTER_SHIFT_Y -> постери з offset > 0 йдуть вниз.
const POSTER_SHIFT_X = 0.95;
const POSTER_SHIFT_Y = -0.35;

// скільки постерів зліва і справа від активного тримати підвантаженими
// (0 = тільки активний, 1 = активний + сусід з кожного боку, і т.д.)
const POSTER_LOAD_RANGE = 1;

// наскільки зменшується постер, який вже "пройдений" (offset < 0,
// тобто вже проскролений і йде далі за екран).
// POSTER_PASSED_SCALE_FALLOFF — швидкість зменшення на одиницю offset,
// POSTER_PASSED_SCALE_MIN — мінімальний масштаб, менше якого не стискається.
const POSTER_PASSED_SCALE_FALLOFF = 0.50;
const POSTER_PASSED_SCALE_MIN = 0.5;

function PosterView({ images }: { images: (string | null)[] }) {
  const trackRef = useRef<HTMLElement>(null);
  const slotRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [activeIndex, setActiveIndex] = useState(0);
  const activeIndexRef = useRef(0);

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 800);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const mobileTrackRef = useRef<HTMLElement>(null);
  const mobileSlotRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [mobileActiveIndex, setMobileActiveIndex] = useState(0);
  const [zoomedIndex, setZoomedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!isMobile) return;

    const container = mobileTrackRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.intersectionRatio > 0.6) {
            const index = mobileSlotRefs.current.indexOf(
              entry.target as HTMLDivElement
            );
            if (index !== -1) setMobileActiveIndex(index);
          }
        });
      },
      { root: container, threshold: [0, 0.6, 1] }
    );

    mobileSlotRefs.current.forEach((slot) => {
      if (slot) observer.observe(slot);
    });

    return () => observer.disconnect();
  }, [isMobile, images]);

  useEffect(() => {
    setZoomedIndex(null);
  }, [mobileActiveIndex]);

  const handleMobilePosterClick = (index: number) => {
    const slot = mobileSlotRefs.current[index];
    if (!slot) return;

    const rect = slot.getBoundingClientRect();
    const centerX = window.innerWidth / 2;
    const slotCenterX = rect.left + rect.width / 2;
    const isCentered = Math.abs(slotCenterX - centerX) < rect.width * 0.15;

    if (isCentered) {
      setZoomedIndex((z) => (z === index ? null : index));
      return;
    }

    setZoomedIndex(null);
    slot.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  };

       useEffect(() => {
    if (isMobile) return;

    const track = trackRef.current;
    if (!track) return;

    const scrollToIndex = (index: number) => {
      const rect = track.getBoundingClientRect();
      const vh = window.innerHeight;
      const scrollableDistance = rect.height - vh;

      if (scrollableDistance <= 0) return;

      const absoluteTrackTop = window.scrollY + rect.top;
      const targetY =
        absoluteTrackTop +
        scrollableDistance * (index / (images.length - 1));

      window.scrollTo({ top: targetY, behavior: "smooth" });
    };

    let ticking = false;
    let rafId: number | null = null;

    const update = () => {
      const vh = window.innerHeight;

      const rect = track.getBoundingClientRect();
      const scrollableDistance = rect.height - vh;

      const rawProgress =
        scrollableDistance > 0 ? clamp01(-rect.top / scrollableDistance) : 0;

      const progress = rawProgress * (images.length - 1);

      const posterHeight = Math.min(vh * POSTER_HEIGHT_RATIO, POSTER_HEIGHT_MAX);
      const posterWidth = posterHeight * POSTER_ASPECT;

      const newActiveIndex = Math.round(progress);
      if (newActiveIndex !== activeIndexRef.current) {
        activeIndexRef.current = newActiveIndex;
        setActiveIndex(newActiveIndex);
      }

      images.forEach((_, i) => {
        const slot = slotRefs.current[i];
        if (!slot) return;

        const offset = i - progress;
        const absOffset = Math.abs(offset);

        const x = POSTER_SHIFT_X * offset * POSTER_SPACING;
        const y = POSTER_SHIFT_Y * offset * POSTER_SPACING;
        const z = -absOffset * POSTER_DEPTH_STEP;

        const rotateY = -offset * POSTER_ROTATE_DEG;

        const passedScale =
          offset < 0
            ? Math.max(POSTER_PASSED_SCALE_MIN, 1 - absOffset * POSTER_PASSED_SCALE_FALLOFF)
            : 1;

        const zIndex = Math.round(100 - absOffset * 10);

        slot.style.width = `${posterWidth}px`;
        slot.style.height = `${posterHeight}px`;

        slot.style.transform = `
          translate(-50%, -50%)
          rotateY(${rotateY}deg)
          translate3d(${x}px, ${y}px, ${z}px)
          scale(${passedScale})
        `;

        slot.style.zIndex = String(zIndex);
        slot.style.cursor = absOffset < POSTER_ACTIVE_THRESHOLD ? "default" : "pointer";

        slot.onclick = () => {
          if (absOffset >= POSTER_ACTIVE_THRESHOLD) scrollToIndex(i);
        };
      });

      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        rafId = requestAnimationFrame(update);
      }
    };

    update();

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
    }, [images, isMobile]);

  if (isMobile) {
    return (
      <section className="poster-track-mobile" ref={mobileTrackRef}>
        {images.map((src, i) => (
          <div
            key={i}
            className={`poster-slot-mobile ${
              zoomedIndex === i ? "poster-slot-mobile-front" : ""
            }`}
            ref={(el) => {
              mobileSlotRefs.current[i] = el;
            }}
            onClick={() => handleMobilePosterClick(i)}
          >
            <div
              className={`poster-slot-mobile-inner ${
                zoomedIndex === i ? "poster-slot-mobile-zoomed" : ""
              }`}
            >
              {src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="poster-img" src={src} alt="" />
              ) : (
                <div className="featured-soon">SOON</div>
              )}
            </div>
          </div>
        ))}
      </section>
    );
  }

  return (
    <section
      className="reel-track"
      ref={trackRef}
      style={{ height: `${images.length * 100}vh` }}
    >
      <div className="reel-sticky">
        <div className="poster-stage">
          {images.map((src, i) => {
            const isInLoadRange = Math.abs(i - activeIndex) <= POSTER_LOAD_RANGE;

            if (!isInLoadRange) {
              return (
                <div
                  key={i}
                  className="poster-slot"
                  ref={(el) => {
                    slotRefs.current[i] = el;
                  }}
                  style={{ visibility: "hidden" }}
                />
              );
            }

            return (
              <div
                key={i}
                className="poster-slot"
                ref={(el) => {
                  slotRefs.current[i] = el;
                }}
              >
                {src ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="poster-img" src={src} alt="" />
                ) : (
                  <div className="featured-soon">SOON</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ===== GRID (соцмережі 4:5, поява рядами по черзі, знизу вверх) ===== */

const GRID_ITEM_STAGGER_MS = 120;
const GRID_ROW_THRESHOLD = 0.2;
const GRID_ROOT_MARGIN = "0px 0px 0px 0px";

function GridView({
  images,
  columns,
  aspect,
}: {
  images: (string | null)[];
  columns: number;
  aspect: string;
}) {
  const rows: (string | null)[][] = [];
  for (let i = 0; i < images.length; i += columns) {
    rows.push(images.slice(i, i + columns));
  }

  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [revealedRows, setRevealedRows] = useState<boolean[]>(() =>
    rows.map(() => false)
  );

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 800);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const [zoomedSrc, setZoomedSrc] = useState<string | null>(null);

  const handleImageClick = (src: string | null) => {
    if (!isMobile || !src) return;
    setZoomedSrc((current) => (current === src ? null : src));
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          const index = Number((entry.target as HTMLElement).dataset.rowIndex);

          setRevealedRows((prev) => {
            if (prev[index]) return prev;
            const next = [...prev];
            next[index] = true;
            return next;
          });

          observer.unobserve(entry.target);
        });
      },
      { threshold: GRID_ROW_THRESHOLD, rootMargin: GRID_ROOT_MARGIN }
    );

    rowRefs.current.forEach((row) => {
      if (row) observer.observe(row);
    });

    return () => observer.disconnect();
  }, [rows.length]);

  return (
    <section className="grid-section">
      {rows.map((row, rowIndex) => (
        <div
          key={rowIndex}
          className="grid-row"
          data-row-index={rowIndex}
          ref={(el) => {
            rowRefs.current[rowIndex] = el;
          }}
          style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
        >
          {row.map((src, colIndex) => (
            <div
              key={colIndex}
              className={`grid-item ${
                revealedRows[rowIndex] ? "grid-item-revealed" : ""
              }`}
              style={{
                transitionDelay: `${colIndex * GRID_ITEM_STAGGER_MS}ms`,
                aspectRatio: aspect,
              }}
              onClick={() => handleImageClick(src)}
            >
              {src ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className="grid-img" src={src} alt="" loading="lazy" />

                  {isMobile && (
                    <span className="grid-item-expand-icon">
                      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path
                          d="M4 9V4H9M20 9V4H15M4 15V20H9M20 15V20H15"
                          stroke="currentColor"
                          strokeWidth="2.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  )}
                </>
              ) : (
                <div className="featured-soon">SOON</div>
              )}
            </div>
          ))}
        </div>
      ))}

      {zoomedSrc && (
        <div
          className="grid-zoom-overlay"
          onClick={() => setZoomedSrc(null)}
        >
          <div className="grid-zoom-frame" style={{ aspectRatio: aspect }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="grid-zoom-img" src={zoomedSrc} alt="" />
          </div>
        </div>
      )}
    </section>
  );
}

/* ===== ІКОНКА ЗВУКУ + ПОВЗУНОК ГУЧНОСТІ ===== */

function SoundToggle({
  muted,
  volume,
  onToggle,
  onVolumeChange,
}: {
  muted: boolean;
  volume: number;
  onToggle: () => void;
  onVolumeChange: (v: number) => void;
}) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(window.innerWidth <= 800);
  }, []);

  const [hovering, setHovering] = useState(false);

  return (
    <div
      className="sound-control"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      {!isMobile && (
        <div className={`volume-slider ${hovering ? "volume-slider-visible" : ""}`}>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => onVolumeChange(Number(e.target.value))}
            className="volume-slider-input"
            style={
              { "--volume-percent": `${volume * 100}%` } as React.CSSProperties
            }
          />
        </div>
      )}

      <button
        type="button"
        className="sound-toggle"
        onClick={onToggle}
        aria-label={muted ? "Увімкнути звук" : "Вимкнути звук"}
      >
        {muted ? (
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M4 9V15H8L13 20V4L8 9H4Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M17 9L21 15M21 9L17 15"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M4 9V15H8L13 20V4L8 9H4Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M16.5 8.5C17.5 9.5 18 10.7 18 12C18 13.3 17.5 14.5 16.5 15.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M19 6C20.5 7.5 21.3 9.6 21.3 12C21.3 14.4 20.5 16.5 19 18"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>
    </div>
  );
}

/* ===== СТОРІНКА ===== */

export default function ReelPage() {
  const params = useParams<{ slug: string }>();
  const work = WORK_REELS[params.slug];
  const router = useRouter();

  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);

  const [language, setLanguage] = useState<Language>("ua");

  useEffect(() => {
    setLanguage(detectLanguage());
  }, []);

  const title =
    WORK_ITEM_LABELS[params.slug as WorkItemId]?.[language] ?? work?.title;

  // браузери блокують автоплей зі звуком без взаємодії користувача —
  // тому ловимо ПЕРШИЙ дотик/клік/скрол на сторінці й вмикаємо звук
  // через React-стан (не напряму через DOM, інакше React перезапише
  // його назад на наступному рендері)
  useEffect(() => {
    const unlockAudio = () => {
      setMuted(false);
    };

    window.addEventListener("pointerdown", unlockAudio, { once: true });
    window.addEventListener("touchstart", unlockAudio, { once: true });
    window.addEventListener("scroll", unlockAudio, { once: true, passive: true });

    return () => {
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("touchstart", unlockAudio);
      window.removeEventListener("scroll", unlockAudio);
    };
  }, []);

  if (!work) {
    return (
      <main className={`${inter.variable} reel-page`}>
        <div className="reel-missing">
          <p>{NAV_LABELS[language].notFound}</p>
          <button type="button" onClick={() => router.back()} className="reel-back">
            <span className="reel-back-icon">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M19 12H5M5 12L12 19M5 12L12 5"
                  stroke="#171717"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            {NAV_LABELS[language].back}
            <span className="reel-back-full">{NAV_LABELS[language].backToWorks}</span>
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className={`${inter.variable} reel-page`}>
      <header className="reel-header">
        <div className="reel-header-left">
          <Link href="/" className="reel-logo">
            <span className="reel-logo-dot"></span>
            IHOR VASIAKIN
          </Link>

          <button type="button" onClick={() => router.back()} className="reel-back">
            <span className="reel-back-icon">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M19 12H5M5 12L12 19M5 12L12 5"
                  stroke="#171717"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            {NAV_LABELS[language].back}
            <span className="reel-back-full">{NAV_LABELS[language].backToWorks}</span>
          </button>
        </div>

        <span className="reel-title">{title}</span>
      </header>

      {work.layout !== "poster" && work.layout !== "grid" && (
        <SoundToggle
          muted={muted}
          volume={volume}
          onToggle={() => setMuted((m) => !m)}
          onVolumeChange={(v) => {
            setVolume(v);
            if (v > 0 && muted) setMuted(false);
            if (v === 0 && !muted) setMuted(true);
          }}
        />
      )}

      {work.layout === "carousel" && (
        <CarouselView
          videos={work.videos as string[]}
          muted={muted}
          volume={volume}
          onAutoplayBlocked={() => {}}
        />
      )}

      {work.layout === "featured" && (
        <FeaturedView
          videos={work.videos as (string | null)[]}
          muted={muted}
          volume={volume}
          onAutoplayBlocked={() => setMuted(true)}
        />
      )}

      {work.layout === "poster" && (
        <PosterView images={work.images as (string | null)[]} />
      )}

      {work.layout === "grid" && (
        <GridView
          images={work.images as (string | null)[]}
          columns={work.gridColumns ?? 3}
          aspect={work.gridAspect ?? "1 / 1"}
        />
      )}
    </main>
  );
}