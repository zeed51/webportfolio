"use client";

import {
  Inter,
  Libre_Bodoni,
} from "next/font/google";

import {
  Fragment,
  useEffect,
  useRef,
  useState,
} from "react";

import "./globals.css";

import SkullScene from "./components/SkullScene";

import Link from "next/link";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
});

const libreBodoni = Libre_Bodoni({
  subsets: ["latin", "cyrillic"],
  variable: "--font-libre-bodoni",
  style: ["normal", "italic"],
});

const ABOUT_TEXT = {
  eng: "Hi, I'm Ihor, a graphic and motion designer creating visual identities, motion, and digital content, combining strong composition, typography, and animation to bring ideas to life.",
  ua: "Привіт, я Ігор, графічний та моушн-дизайнер, що створює візуальні айдентики, моушн та цифровий контент, поєднуючи сильну композицію, типографіку та анімацію, щоб втілювати ідеї в життя.",
};

const CONTACT_TEXT = {
  eng: {
    title: "LET’S WORK TOGETHER",
    subtitle: "Available for freelance. Ukraine / Worldwide.",
    email: "email: zeedchrist@gmail.com",
    telegram: "telegram: @yaqrutoy",
  },
  ua: {
    title: "ПРАЦЮЙМО РАЗОМ",
    subtitle: "Доступний для фрилансу. Україна / Весь світ.",
    email: "пошта: zeedchrist@gmail.com",
    telegram: "телеграм: @yaqrutoy",
  },
};

const FADE_START = 0.7;
const FADE_END = 0.3;

const TEXT_GRAY: [number, number, number] = [111, 111, 111];
const TEXT_WHITE: [number, number, number] = [243, 241, 235];

const COLOR_SCROLL_PORTION = 0.7;

// затримка (мс) між моментом, коли останній рядок став білим,
// і появою кнопки "ДЕТАЛІ"
// пауза (мс) між зупинкою сторінки і появою кнопки
const DETAILS_DELAY_MS = 0;


// на якому прогресі побіління (0–1) сторінка зупиняється.
// менше значення = кнопка з'являється раніше
// (але останній рядок ще не встигне повністю побіліти)
const DETAILS_TRIGGER = 0.999;

// якщо повернутись вгору нижче цього прогресу, кнопка ховається
// і при наступному доскролі з'явиться знову
const DETAILS_HIDE_BELOW = 0.5;

const DETAILS_LABEL = {
  eng: "DETAILS",
  ua: "ДЕТАЛІ",
};

const IHOR_STRIP_COUNT = 40;

const WORK_MARQUEE_COUNT = 30;

// прозорість напису WORK WORK WORK (0–1)
const WORK_MARQUEE_OPACITY = 0.05;

import {
  WORK_TABS,
  TAB_LABELS,
  WORK_ITEMS,
  WORK_ITEM_LABELS,
} from "./lib/workLabels";


const SQUISH_DURATION = 340;

/* ===== Налаштування відео-reveal ===== */

// частка ширини екрана для "маленького" стану відео
const VIDEO_SMALL_WIDTH_RATIO = 0.34;

// жорстка верхня межа ширини в маленькому стані (px)
const VIDEO_MAX_SMALL_WIDTH = 520;

// відступ зверху в маленькому стані (px)
const VIDEO_SMALL_TOP = 40;

// радіус заокруглення в маленькому стані (px), 0 у розгорнутому
const VIDEO_SMALL_RADIUS = 24;

const VIDEO_EARLY_LEAD_RATIO = 1;

// перемикач для дебагу: true — показує фонове відео в works-section,
// false — вимикає його (щоб глянути секцію без відео)
const SHOW_WORKS_BG_VIDEO = false;

// true — показує салатову доріжку IHOR між ABOUT і відео,
// false — ховає її
const SHOW_IHOR_STRIP = false;
// хаотичний зелений "liquid" фон у works-section


const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

const mixColor = (t: number) => {
  const r = Math.round(TEXT_GRAY[0] + (TEXT_WHITE[0] - TEXT_GRAY[0]) * t);
  const g = Math.round(TEXT_GRAY[1] + (TEXT_WHITE[1] - TEXT_GRAY[1]) * t);
  const b = Math.round(TEXT_GRAY[2] + (TEXT_WHITE[2] - TEXT_GRAY[2]) * t);
  return `rgb(${r}, ${g}, ${b})`;
};

import { detectLanguage, saveLanguage, Language } from "./lib/language";
import { NAV_LABELS } from "./lib/translations";
import LanguageToggle from "./components/LanguageToggle";

export default function Home() {
  const [language, setLanguage] = useState<Language>("ua");

useEffect(() => {
  setLanguage(detectLanguage());
}, []);

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    saveLanguage(lang);
  };

  const toggleLanguage = () => {
    handleLanguageChange(language === "ua" ? "eng" : "ua");
  };
  const [isAbout, setIsAbout] = useState(false);
  const [isLightWorks, setIsLightWorks] = useState(false);
  const [switchHintVisible, setSwitchHintVisible] = useState(true);

  const [workTab, setWorkTab] = useState<WorkTab>("motion");
  const [pill, setPill] = useState({ left: 0, width: 0 });
  const [squish, setSquish] = useState(false);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);


    const videoSectionRef = useRef<HTMLElement>(null);
  const marqueeRightRef = useRef<HTMLDivElement>(null);
  const worksElRef = useRef<HTMLElement | null>(null);
  const videoFrameRef = useRef<HTMLDivElement>(null);

   /* ===== ПІДКАЗКА "switch": ховається через 15с ПЕРЕБУВАННЯ на фреймі works ===== */

  useEffect(() => {
    const worksEl = document.getElementById("works");
    worksElRef.current = worksEl;
    if (!worksEl) return;

    let elapsedMs = 0;
    let lastTick: number | null = null;
    let rafId: number | null = null;

    const tick = (now: number) => {
      if (lastTick !== null) {
        elapsedMs += now - lastTick;
      }
      lastTick = now;

      if (elapsedMs >= 8000) {
        setSwitchHintVisible(false);
        return;
      }

      rafId = requestAnimationFrame(tick);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          lastTick = null;
          rafId = requestAnimationFrame(tick);
        } else if (rafId !== null) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
      },
      { threshold: 0.4 }
    );

    observer.observe(worksEl);

    return () => {
      observer.disconnect();
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

  /* ===== HEADER: стан на секції ABOUT ===== */

  useEffect(() => {
    const aboutSection = document.querySelector(".about-section") as HTMLElement | null;
    if (!aboutSection) return;

    const updateHeader = () => {
      const rect = aboutSection.getBoundingClientRect();
      setIsAbout(rect.top <= window.innerHeight * 0.05);

      const marqueeRect = marqueeRightRef.current?.getBoundingClientRect();
      setIsLightWorks(
        workTab === "graphic" && !!marqueeRect && marqueeRect.top <= 40
      );
    };

    updateHeader();

    window.addEventListener("scroll", updateHeader);
    window.addEventListener("resize", updateHeader);

    return () => {
      window.removeEventListener("scroll", updateHeader);
      window.removeEventListener("resize", updateHeader);
    };
  }, [workTab]);

  /* ===== ABOUT: поява й побіління тексту по скролу ===== */

  useEffect(() => {
    const track = document.querySelector(".about-track") as HTMLElement | null;
    const section = document.querySelector(".about-section") as HTMLElement | null;
    const text = document.querySelector(".about-text") as HTMLElement | null;

    if (!track || !section || !text) return;

    let lines: HTMLElement[][] = [];

    const measureLines = () => {
      const words = Array.from(text.querySelectorAll<HTMLElement>(".about-word"));
      const groups = new Map<number, HTMLElement[]>();

      words.forEach((word) => {
        const key = Math.round(word.offsetTop);
        const group = groups.get(key);

        if (group) {
          group.push(word);
        } else {
          groups.set(key, [word]);
        }
      });

      lines = Array.from(groups.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([, group]) => group);
    };

    const detailsLink = text.querySelector<HTMLElement>(".about-details");
    let detailsTimer: ReturnType<typeof setTimeout> | null = null;

    const updateDetails = (progress: number) => {
      if (!detailsLink) return;

      const visible = detailsLink.classList.contains("about-details-visible");

      // текст повністю білий: запускаємо відлік до появи кнопки
      if (progress >= DETAILS_TRIGGER) {
        if (!visible && detailsTimer === null) {
          detailsTimer = setTimeout(() => {
            detailsLink.classList.add("about-details-visible");
            detailsTimer = null;
          }, DETAILS_DELAY_MS);
        }
        return;
      }

      // повернулись назад до завершення: скасовуємо відлік
      if (detailsTimer !== null) {
        clearTimeout(detailsTimer);
        detailsTimer = null;
      }

      // повернулись далеко вгору: ховаємо кнопку
      if (visible && progress < DETAILS_HIDE_BELOW) {
        detailsLink.classList.remove("about-details-visible");
      }
    };

    const FADE_IN_END = 0.95; // частка pin-діапазону, за яку з'являється текст
    const COLOR_START_FADE = 0.01; // з якої частки pin-діапазону починається побіління
    const FADE_IN_LEAD_RATIO = 0.55; // наскільки раніше (у vh) починає з'являтися сірий текст, до пінінгу

    const update = () => {
      const vh = window.innerHeight;
      const sectionRect = section.getBoundingClientRect();

      // 0 — секція щойно запінилась (top === 0)
      // 1 — секція повністю проскролена (top === -(height - vh))
      const pinRange = sectionRect.height - vh;
      const sectionProgress = pinRange > 0 ? clamp01(-sectionRect.top / pinRange) : 0;

      // окремий, "раніший" прогрес тільки для появи тексту:
      // рахуємо ще до того, як top секції дійде до 0
      const fadeLeadPx = vh * FADE_IN_LEAD_RATIO;
      const fadeEntryProgress = clamp01((fadeLeadPx - sectionRect.top) / fadeLeadPx);
      const fadeProgress = pinRange > 0
        ? Math.max(fadeEntryProgress, sectionProgress)
        : fadeEntryProgress;

      const fadeLinear = clamp01(fadeProgress / FADE_IN_END);
      // smoothstep: м'якший старт і м'якше завершення, замість лінійного росту
      const fade = fadeLinear * fadeLinear * (3 - 2 * fadeLinear);
      track.style.setProperty("--about-opacity", String(fade));

      const colorRange = 1 - COLOR_START_FADE;
      const colorProgress = clamp01(
        ((sectionProgress - COLOR_START_FADE) / colorRange) / COLOR_SCROLL_PORTION
      );

      const total = lines.length;

      lines.forEach((words, index) => {
        const lineProgress = clamp01(colorProgress * total - index);
        const color = mixColor(lineProgress);
        words.forEach((word) => {
          word.style.color = color;
        });
      });

      updateDetails(colorProgress);
    };

    const handleResize = () => {
      measureLines();
      update();
    };

    measureLines();
    update();

    window.addEventListener("scroll", update);
    window.addEventListener("resize", handleResize);

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(handleResize);
    }

    return () => {
      if (detailsTimer !== null) clearTimeout(detailsTimer);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", handleResize);
    };
  }, [language]);

  /* ===== WORKS TABS: позиція скляної пігулки ===== */

  useEffect(() => {
    const measurePill = () => {
      const index = WORK_TABS.indexOf(workTab);
      const el = tabRefs.current[index];
      if (!el) return;

      setPill({ left: el.offsetLeft, width: el.offsetWidth });
    };

    measurePill();
    setSquish(true);

    const timer = setTimeout(() => setSquish(false), SQUISH_DURATION);

    window.addEventListener("resize", measurePill);

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(measurePill);
    }

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", measurePill);
    };
  }, [workTab]);

   useEffect(() => {
  const tabFromQuery = new URLSearchParams(window.location.search).get("tab");
  const tabFromStorage = window.sessionStorage.getItem("works-tab");

  if (tabFromQuery === "motion" || tabFromQuery === "graphic") {
    setWorkTab(tabFromQuery);
  } else if (tabFromStorage === "motion" || tabFromStorage === "graphic") {
    // URL не містить таб (наприклад, повернулись назад через router.back()) —
    // беремо останній обраний таб зі сховища
    setWorkTab(tabFromStorage);
  }

  if (window.location.hash !== "#works") return;

  const scrollToWorks = () => {
    const el = document.getElementById("works");
    if (el) el.scrollIntoView({ behavior: "instant" as ScrollBehavior });
  };

  const timer = setTimeout(scrollToWorks, 50);

  return () => clearTimeout(timer);
}, []);
  /* ===== VIDEO REVEAL: маленьке відео -> на весь екран ===== */

  useEffect(() => {
    const section = videoSectionRef.current;
    const frame = videoFrameRef.current;

    if (!section || !frame) return;

const update = () => {
  const rect = section.getBoundingClientRect();
  const vh = window.innerHeight;
  const vw = window.innerWidth;

  const scrollableDistance = rect.height - vh;
  const earlyLead = vh * VIDEO_EARLY_LEAD_RATIO;
  const totalRange = earlyLead + scrollableDistance;

  const progress =
    totalRange > 0
      ? clamp01((earlyLead - rect.top) / totalRange)
      : 0;

  const smallWidth = Math.min(vw * VIDEO_SMALL_WIDTH_RATIO, VIDEO_MAX_SMALL_WIDTH);
  const smallHeight = (smallWidth * 9) / 16;

  // ширина росте максимум до ширини екрана (край-в-край),
  // а не далі — тому кадр ніколи не стає ширшим за телефон
  const width = smallWidth + (vw - smallWidth) * progress;

  // висота рахується від пропорцій відео (16:9), а не тягнеться
  // окремо до vh — інакше кадр наприкінці ставав вищим за свою
  // ширину і виглядав неприродно роздутим
  const height = (width * 9) / 16;

  const top = VIDEO_SMALL_TOP * (1 - progress);
  const radius = VIDEO_SMALL_RADIUS * (1 - progress);

  frame.style.width = `${width}px`;
  frame.style.height = `${height}px`;
  frame.style.top = `${top}px`;
  frame.style.borderRadius = `${radius}px`;
};

    update();

    window.addEventListener("scroll", update);
    window.addEventListener("resize", update);

    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <main className={`${inter.variable} ${libreBodoni.variable} site`}>
      <header className={`header ${isAbout && !isLightWorks ? "header-about" : ""}`}>
        <a href="/" className="logo">
          <span className="logo-dot"></span>
          IHOR VASIAKIN
        </a>

        <nav className="navigation">
          <a href="#works">{NAV_LABELS[language].works}</a>
          <Link href="/details">{NAV_LABELS[language].about}</Link>
          <a href="#contact" className="contact-button">
            {NAV_LABELS[language].contact}
          </a>
          <LanguageToggle language={language} onToggle={toggleLanguage} />
        </nav>
      </header>

      {/* =========================
          HERO
      ========================= */}

      <section className="hero">
        <div className="hero-sticky">
          <div className="skull-wrapper">
            <SkullScene />
          </div>

          <div className="hero-title">
            <h1>IHOR VASIAKIN</h1>
            <div className="hero-subtitle">
              motion &amp; graphic
              <br />
              designer
            </div>
          </div>
        </div>
      </section>

      {/* =========================
          ABOUT
      ========================= */}

      <div className="about-track">
        <section id="about" className="about-section">
          <div className="about-content">
            <p className={`about-text ${language === "ua" ? "about-text-ua" : ""}`}>
              {ABOUT_TEXT[language].split(" ").map((word, i) => (
                <Fragment key={`${language}-${i}`}>
                  <span className="about-word">{word}</span>{" "}
                </Fragment>
              ))}
              <span className="about-details-anchor">
                <Link href={`/details?lang=${language}`} className="about-details">
                  {DETAILS_LABEL[language]}
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M7 17L17 7M17 7H8M17 7V16"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </Link>
              </span>
            </p>
          </div>
        </section>
      </div>

      {/* =========================
          IHOR STRIP
      ========================= */}

      {SHOW_IHOR_STRIP && (
        <div className="ihor-strip" aria-hidden="true">
          <div className="ihor-strip-inner">
            <div className="ihor-strip-group">
              {Array.from({ length: IHOR_STRIP_COUNT }).map((_, i) => (
                <span key={i}>IHOR</span>
              ))}
            </div>
            <div className="ihor-strip-group">
              {Array.from({ length: IHOR_STRIP_COUNT }).map((_, i) => (
                <span key={i}>IHOR</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =========================
          VIDEO REVEAL
      ========================= */}

      <section className="video-section" ref={videoSectionRef}>
        <div className="video-sticky">
          <div className="video-frame" ref={videoFrameRef}>
            <video
              className="video-el"
              src="/videos/showreel.mp4"
              autoPlay
              muted
              loop
              playsInline
            />
          </div>
        </div>
      </section>

      <div
        ref={marqueeRightRef}
        className={`work-marquee work-marquee-right ${workTab === "graphic" ? "work-marquee-light" : ""}`}
        style={{ "--work-marquee-opacity": WORK_MARQUEE_OPACITY } as React.CSSProperties}
        aria-hidden="true"
      >
        <div className="work-marquee-inner" key={`right-${language}`}>
          <div className="work-marquee-group">
            {Array.from({ length: WORK_MARQUEE_COUNT }).map((_, i) => (
              <span key={i}>{NAV_LABELS[language].works}</span>
            ))}
          </div>
          <div className="work-marquee-group">
            {Array.from({ length: WORK_MARQUEE_COUNT }).map((_, i) => (
              <span key={i}>{NAV_LABELS[language].works}</span>
            ))}
          </div>
        </div>
      </div>

      <div
        className={`work-marquee work-marquee-left ${workTab === "graphic" ? "work-marquee-light" : ""}`}
        style={{ "--work-marquee-opacity": WORK_MARQUEE_OPACITY } as React.CSSProperties}
        aria-hidden="true"
      >
        <div className="work-marquee-inner" key={`left-${language}`}>
          <div className="work-marquee-group">
            {Array.from({ length: WORK_MARQUEE_COUNT }).map((_, i) => (
              <span key={i}>{NAV_LABELS[language].works}</span>
            ))}
          </div>
          <div className="work-marquee-group">
            {Array.from({ length: WORK_MARQUEE_COUNT }).map((_, i) => (
              <span key={i}>{NAV_LABELS[language].works}</span>
            ))}
          </div>
        </div>
      </div>

      <section
        id="works"
        className={`works-section ${workTab === "graphic" ? "works-light" : ""}`}
      >

        {SHOW_WORKS_BG_VIDEO && (
          <video
            className="works-bg-video"
            src="/videos/showreel.mp4"
            autoPlay
            muted
            loop
            playsInline
          />
        )}

        <div className="glass-tabs">
          <span
            className={`glass-pill ${squish ? "glass-pill-squish" : ""}`}
            style={{ left: pill.left, width: pill.width }}
          />

          {WORK_TABS.map((tab, i) => (
            <button
              key={tab}
              type="button"
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              className={`glass-tab ${workTab === tab ? "glass-tab-active" : ""}`}
              onClick={() => {
                setWorkTab(tab);
                window.sessionStorage.setItem("works-tab", tab);
              }}
            >
              {TAB_LABELS[tab][language]}
            </button>
          ))}

          <div
            className={`works-note works-note-switch ${
              switchHintVisible ? "" : "works-note-switch-hidden"
            }`}
            aria-hidden="true"
          >
            <svg viewBox="0 0 70 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M2 2Q35 24 68 2M4 6.6L2 2L7 2.5M66 6.6L68 2L63 2.5"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>{NAV_LABELS[language].switchHint}</span>
          </div>
        </div>

        <div className="works-list">
          {WORK_ITEMS[workTab].map((id) => {
            const href = `/works/${id}`;

            return (
              <Link key={id} href={href} className="works-item">
                <span className="works-item-title">
                  {WORK_ITEM_LABELS[id][language]}
                </span>
                <svg
                  className="works-item-arrow"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M7 17L17 7M17 7H8M17 7V16"
                    stroke="currentColor"
                    strokeWidth="1"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>
            );
          })}
        </div>
      </section>

      {/* =========================
          CONTACT
      ========================= */}

      <section id="contact" className="contact-section">
        <h2 className={`contact-title ${language === "ua" ? "contact-title-ua" : ""}`}>
          {CONTACT_TEXT[language].title}
        </h2>
        <p className="contact-subtitle">
          {CONTACT_TEXT[language].subtitle}
        </p>

        <div className="contact-links">
   <a href="mailto:zeedchrist@gmail.com">{CONTACT_TEXT[language].email}</a>
  <a href="https://t.me/yaqrutoy" target="_blank" rel="noopener noreferrer">
    {CONTACT_TEXT[language].telegram}
  </a>
</div>

        <div className="contact-ihor" aria-hidden="true">
          IHOR
        </div>
      </section>
    </main>
  );
}