"use client";

import { useEffect } from "react";

export default function ViewportVignette() {
  useEffect(() => {
    const vv = window.visualViewport;

    const update = () => {
      const height = vv ? vv.height : window.innerHeight;
      document.documentElement.style.setProperty("--vv-height", `${height}px`);
    };

    update();

    // Safari іноді не встигає перерахувати fixed-елементи одразу
    // після завантаження сторінки, якщо скрол не на нулі —
    // тому дублюємо виклик на кількох кадрах і подіях
    requestAnimationFrame(() => {
      requestAnimationFrame(update);
    });

    const timers = [
      setTimeout(update, 50),
      setTimeout(update, 150),
      setTimeout(update, 400),
      setTimeout(update, 1000),
    ];

    vv?.addEventListener("resize", update);
    vv?.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("orientationchange", update);
    window.addEventListener("pageshow", update);

    return () => {
      timers.forEach(clearTimeout);
      vv?.removeEventListener("resize", update);
      vv?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update);
      window.removeEventListener("orientationchange", update);
      window.removeEventListener("pageshow", update);
    };
  }, []);

  return <div className="frame-vignette" aria-hidden="true" />;
}