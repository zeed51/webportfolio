"use client";

import { Language } from "../lib/language";

export default function LanguageToggle({
  language,
  onToggle,
  className = "",
}: {
  language: Language;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={`lang-globe ${className}`}
      onClick={onToggle}
      aria-label={
        language === "ua" ? "Switch to English" : "Переключити на українську"
      }
    >
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
        <ellipse cx="12" cy="12" rx="4" ry="9" stroke="currentColor" strokeWidth="1.6" />
        <path d="M3 12H21" stroke="currentColor" strokeWidth="1.6" />
        <path d="M4.5 7.5H19.5" stroke="currentColor" strokeWidth="1.6" />
        <path d="M4.5 16.5H19.5" stroke="currentColor" strokeWidth="1.6" />
      </svg>
      <span className="lang-globe-label">{language.toUpperCase()}</span>
    </button>
  );
}