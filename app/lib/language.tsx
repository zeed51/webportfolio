export type Language = "ua" | "eng";

const STORAGE_KEY = "site-language";

// визначає мову: спочатку дивиться на збережений вибір користувача (localStorage),
// якщо його нема — дивиться на мову браузера (uk/ru → ua, все інше → eng)
export function detectLanguage(): Language {
  if (typeof window === "undefined") return "ua";

  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "ua" || saved === "eng") return saved;
  } catch (e) {
    console.warn("localStorage read failed:", e);
  }

  try {
    const browserLangs =
      navigator.languages && navigator.languages.length
        ? navigator.languages
        : [navigator.language];

    const isUkRu = browserLangs.some((lang) => {
      const code = lang.toLowerCase();
      return code.startsWith("uk") || code.startsWith("ru");
    });

    return isUkRu ? "ua" : "eng";
  } catch (e) {
    console.warn("language detection failed:", e);
    return "ua";
  }
}

export function saveLanguage(lang: Language) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, lang);
  } catch (e) {
    console.warn("localStorage write failed:", e);
  }
}