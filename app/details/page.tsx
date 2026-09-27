"use client";

import { Inter, Libre_Bodoni } from "next/font/google";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import "../globals.css";
import Link from "next/link";
import { detectLanguage, saveLanguage, Language } from "../lib/language";
import { NAV_LABELS } from "../lib/translations";
import LanguageToggle from "../components/LanguageToggle";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
});

const libreBodoni = Libre_Bodoni({
  subsets: ["latin", "cyrillic"],
  variable: "--font-libre-bodoni",
  style: ["normal", "italic"],
});

const DETAILS_TEXT = {
  ua: [
    "Мене звати Ігор, я графічний та моушн-дизайнер. Маю профільну вищу освіту бакалавра за спеціальністю “Комп’ютерний дизайн”",
    "У своїй роботі я використовую Photoshop, Illustrator, After Effects, Premiere Pro, InDesign та Blender. Створюю постери, контент для соціальних мереж, YouTube-обкладинки, рекламні та цифрові матеріали, відео, моушн-графіку й інші візуальні рішення.",
    "Для мене дизайн — це поєднання ідеї, форми та способу її подачі. Тому я постійно експериментую з новими інструментами й техніками, розширюю свої навички та шукаю цікаві способи вирішувати візуальні задачі.",
  ],
  eng: [
    "Hi, I’m Ihor, a graphic and motion designer. I hold a bachelor’s degree in Computer Design",
    "In my work I use Photoshop, Illustrator, After Effects, Premiere Pro, InDesign and Blender. I create posters, social media content, YouTube thumbnails, ad and digital materials, video, motion graphics and other visual solutions.",
    "For me, design is a combination of idea, form and the way it’s presented. That’s why I constantly experiment with new tools and techniques, expand my skills and look for interesting ways to solve visual problems.",
  ],
};

const DETAILS_NOTE = {
  ua: (
    <>
      <span className="details-note-line1">Якщо ви зацікавлені у співпраці —</span>{" "}
      <Link href="/#contact">зв’яжіться зі мною</Link>.
    </>
  ),
  eng: (
    <>
      <span className="details-note-line1">If you’re interested in working together —</span>{" "}
      <Link href="/#contact">get in touch</Link>.
    </>
  ),
};



const SOFTWARE_ICONS = [
  { name: "After Effects", src: "images/icons/ae.png" },
  { name: "Premiere Pro", src: "images/icons/pr.png" },
  { name: "Photoshop", src: "images/icons/ps.png" },
  { name: "Illustrator", src: "images/icons/ai.png" },
  { name: "InDesign", src: "images/icons/id.png" },
  { name: "Blender", src: "images/icons/blender.png" },
];

function DetailsContent() {
  const [language, setLanguage] = useState<Language>("ua");
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const fromQuery = searchParams.get("lang");

    if (fromQuery === "ua" || fromQuery === "eng") {
      // прийшли з кнопки "ДЕТАЛІ" на сторінці about — беремо мову звідти
      setLanguage(fromQuery);
      saveLanguage(fromQuery);
    } else {
      // прямий заход на /details — беремо збережений вибір або мову браузера
      setLanguage(detectLanguage());
    }
  }, [searchParams]);

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    saveLanguage(lang);
  };

  const toggleLanguage = () => {
    handleLanguageChange(language === "ua" ? "eng" : "ua");
  };

  return (
    <main className={`${inter.variable} ${libreBodoni.variable} details-page`}>
      <div className="details-topbar-bg" aria-hidden="true" />

      <header className="header details-header">
        <Link href="/" className="logo">
          <span className="logo-dot"></span>
          IHOR VASIAKIN
        </Link>

        <nav className="navigation">
          <Link href="/#works">{NAV_LABELS[language].works}</Link>
          <Link href="/details">{NAV_LABELS[language].about}</Link>
          <Link href="/#contact" className="contact-button">
            {NAV_LABELS[language].contact}
          </Link>
          <LanguageToggle language={language} onToggle={toggleLanguage} />
        </nav>
      </header>

      <LanguageToggle
        language={language}
        onToggle={toggleLanguage}
        className="details-lang-toggle-mobile"
      />

<button
  type="button"
  onClick={() => router.back()}
  className="details-back"
>
  <span className="details-back-icon">
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M19 12H5M5 12L12 19M5 12L12 5"
        stroke="#171717"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </span>
  {NAV_LABELS[language].back}
</button>

      <section className="details-intro">
        <div className="details-text">
          {DETAILS_TEXT[language].map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>

        <div className="details-contact-note">
          <span>{DETAILS_NOTE[language]}</span>
        </div>
      </section>

 <section className="details-stats">
  <div className="details-years">
    <span className="details-years-number">5+</span>
    <span className="details-years-label">YEARS</span>
  </div>

  <div className="details-education">
    HIGHER
    <br />
    EDUCATION
  </div>

  <div className="details-software">
    <div className="details-software-row">
      {SOFTWARE_ICONS.slice(0, 3).map((icon) => (
        <span key={icon.name} className="details-software-icon">
          <img src={icon.src} alt={icon.name} />
        </span>
      ))}
    </div>
    <div className="details-software-row">
      {SOFTWARE_ICONS.slice(3, 6).map((icon) => (
        <span
          key={icon.name}
          className={`details-software-icon ${
            icon.name === "Blender" ? "details-software-icon-transparent" : ""
          }`}
        >
          <img src={icon.src} alt={icon.name} />
        </span>
      ))}
    </div>
  </div>
</section>
    </main>
  );
}

export default function DetailsPage() {
  return (
    <Suspense fallback={null}>
      <DetailsContent />
    </Suspense>
  );
}