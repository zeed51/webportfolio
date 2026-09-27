import { Language } from "./language";

type NavLabels = {
  works: string;
  about: string;
  contact: string;
  back: string;
  backToWorks: string;
  notFound: string;
  switchHint: string;
};

export const NAV_LABELS: Record<Language, NavLabels> = {
  ua: {
    works: "РОБОТИ",
    about: "ПРО МЕНЕ",
    contact: "ЗВ’ЯЗОК",
    back: "НАЗАД",
    backToWorks: " ДО РОБІТ",
    notFound: "Роботу не знайдено.",
    switchHint: "перемкнути",
  },
  eng: {
    works: "WORKS",
    about: "ABOUT",
    contact: "CONTACT",
    back: "BACK",
    backToWorks: " TO WORKS",
    notFound: "Work not found.",
    switchHint: "switch",
  },
};