"use client";

import { useEffect, useState } from "react";

export default function CRTMonitor() {
  const [twitch, setTwitch] = useState(false);

  useEffect(() => {
    let timeout: NodeJS.Timeout;

    const triggerTwitch = () => {
      setTwitch(true);

      setTimeout(() => {
        setTwitch(false);
      }, 70 + Math.random() * 100);

      timeout = setTimeout(
        triggerTwitch,
        2500 + Math.random() * 5000
      );
    };

    timeout = setTimeout(
      triggerTwitch,
      3000 + Math.random() * 4000
    );

    return () => clearTimeout(timeout);
  }, []);

  return (
    <section className="crt-section">
      <div className="crt-monitor">

        {/* SCREEN */}
        <div className={`crt-screen ${twitch ? "crt-twitch" : ""}`}>

          {/* MOVING RGB BACKGROUND */}
          <div className="crt-gradient" />

          {/* SOFT SCREEN GLOW */}
          <div className="crt-glow" />

          {/* TEXT */}
          <div className="crt-content">

            <div className="crt-label">
              IHOR VASIAKIN / ABOUT
            </div>

            <div className="crt-text">
              <p>
                Я графічний та моушн-дизайнер, зосереджений на
                створенні сильних візуальних айдентик,
                моушн-дизайну та цифрових проєктів.
              </p>

              <p>
                Я працюю з графічним дизайном, моушн-дизайном
                та візуальним напрямом, поєднуючи композицію,
                типографіку й анімацію для створення чітких
                та запам’ятовуваних візуальних рішень.
              </p>

              <p>
                Маю вищу освіту за спеціальністю
                «Комп’ютерний дизайн» та досвід у
                фриланс-проєктах, цифровому контенті
                й поліграфії.
              </p>
            </div>

            <div className="crt-cursor">
              _
            </div>

          </div>

          {/* CRT PIXELS */}
          <div className="crt-pixels" />

          {/* SCANLINES */}
          <div className="crt-scanlines" />

          {/* NOISE */}
          <div className="crt-noise" />

          {/* SCREEN VIGNETTE */}
          <div className="crt-vignette" />

        </div>

        {/* MONITOR BODY */}
        <img
          src="/images/monitor.png"
          alt=""
          className="crt-monitor-image"
        />

      </div>
    </section>
  );
}