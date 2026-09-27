"use client";

import { useEffect, useRef, useState } from "react";

/*
  Scroll-driven "паспорт" — ОДНЕ перегортання.

  COVER (закрита обкладинка, весь екран) перегортається
  навколо нижнього краю (rotateX, корінець знизу) один раз,
  розкриваючи PAGE 1 (весь екран) під нею.

  Логіка відкривання не змінена.
*/

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function smoothstep(
  t: number,
  edge0: number,
  edge1: number
) {
  const x = clamp01((t - edge0) / (edge1 - edge0));
  return x * x * (3 - 2 * x);
}

export default function PassportScroll() {
  const sectionRef = useRef<HTMLElement>(null);
  const coverRef = useRef<HTMLDivElement>(null);
  const coverShadowRef = useRef<HTMLDivElement>(null);

  const progressTarget = useRef(0);
  const progressCurrent = useRef(0);

  const [language, setLanguage] = useState<"ua" | "eng">("ua");

  useEffect(() => {
    const updateTarget = () => {
      const el = sectionRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;

      const scrollableDistance = el.offsetHeight - vh;

      if (scrollableDistance <= 0) {
        progressTarget.current = 0;
        return;
      }

      const scrolled = -rect.top;

      progressTarget.current = clamp01(
        scrolled / scrollableDistance
      );
    };

    let rafId: number;

    const applyProgress = (p: number) => {
      /*
        До COVER_START — обкладинка нерухомо закрита.
        COVER_START..COVER_END — поворот 0° → -180°.
        Після COVER_END — сторінка повністю відкрита.
      */

      const COVER_START = 0.15;
      const COVER_END = 0.65;

      const coverProgress = smoothstep(
        p,
        COVER_START,
        COVER_END
      );

      const coverAngle = lerp(
        0,
        -180,
        coverProgress
      );

      if (coverRef.current) {
        coverRef.current.style.transform =
          `rotateX(${coverAngle}deg)`;
      }

      const shadowOpacity = Math.sin(
        clamp01(coverProgress) * Math.PI
      );

      if (coverShadowRef.current) {
        coverShadowRef.current.style.opacity = String(
          shadowOpacity * 0.5
        );
      }
    };

    const tick = () => {
      updateTarget();

      progressCurrent.current +=
        (progressTarget.current -
          progressCurrent.current) *
        0.18;

      applyProgress(progressCurrent.current);

      rafId = requestAnimationFrame(tick);
    };

    updateTarget();
    rafId = requestAnimationFrame(tick);

    window.addEventListener(
      "resize",
      updateTarget
    );

    return () => {
      cancelAnimationFrame(rafId);

      window.removeEventListener(
        "resize",
        updateTarget
      );
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="passport-scroll"
    >
      <div className="passport-sticky">
        <div className="passport-frame">

          {/* =========================================
              PAGE 1 - ABOUT
             ========================================= */}

          <div className="passport-page passport-page--1">

            <div className="passport-about-content">

              {/* LANGUAGE SWITCH */}

              <button
                type="button"
                className="passport-about-language"
                aria-label="Switch language"
                onClick={() =>
                  setLanguage((current) =>
                    current === "ua"
                      ? "eng"
                      : "ua"
                  )
                }
              >
                <span
                  className={
                    language === "ua"
                      ? "active"
                      : ""
                  }
                >
                  ua
                </span>

                <span
                  className={
                    language === "eng"
                      ? "active"
                      : ""
                  }
                >
                  eng
                </span>
              </button>


              {/* TEXT */}

              <div className="passport-about-copy">

                {language === "ua" ? (
                  <>
                    <p>
                      Я графічний та моушн-дизайнер,
                      зосереджений на створенні сильних
                      візуальних айдентик, моушн-дизайну
                      та цифрових проєктів.
                    </p>

                    <p>
                      Я працюю з графічним дизайном,
                      моушн-дизайном та візуальним напрямом,
                      поєднуючи композицію, типографіку
                      й анімацію для створення чітких
                      та запам’ятовуваних візуальних рішень.
                    </p>

                    <p>
                      Маю вищу освіту за спеціальністю
                      «Комп’ютерний дизайн» та досвід
                      у фриланс-проєктах, цифровому
                      контенті й поліграфії.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      I’m a graphic and motion designer,
                      focused on creating strong visual
                      identities, motion design and
                      digital projects.
                    </p>

                    <p>
                      I work across graphic design,
                      motion design and visual direction,
                      combining composition, typography
                      and animation to create clear
                      and memorable visual solutions.
                    </p>

                    <p>
                      I have a higher education degree
                      in Computer Design and experience
                      in freelance projects, digital
                      content and print design.
                    </p>
                  </>
                )}

              </div>


              {/* DIVIDER + AVAILABILITY (лишаються в текстовій колонці) */}

              <div className="passport-about-divider" />

              <p className="passport-about-availability">
                {language === "ua"
                  ? "Відкритий до фриланс-проєктів та співпраці по всьому світу."
                  : "Available for freelance projects and collaborations worldwide."}
              </p>

            </div>


            {/* IHOR — окремо від текстової колонки, приклеєний
                до нижнього-правого кута ВСЬОГО екрана */}

            <div className="passport-about-name">
              <span>IHOR</span>
            </div>

          </div>


          {/* =========================================
              COVER
             ========================================= */}

          <div
            ref={coverRef}
            className="passport-page passport-page--cover"
          >

            <div className="passport-page-content">

              <span className="passport-cover-title">
                PASSPORT
              </span>

              <span className="passport-cover-sub">
                ПАСПОРТ
              </span>

            </div>

            <div
              ref={coverShadowRef}
              className="passport-page-fold-shadow"
            />

          </div>

        </div>
      </div>
    </section>
  );
}