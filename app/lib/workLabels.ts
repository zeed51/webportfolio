import { Language } from "./language";

export const WORK_TABS = ["motion", "graphic"] as const;

export type WorkTab = (typeof WORK_TABS)[number];

export const TAB_LABELS: Record<WorkTab, Record<Language, string>> = {
  motion: { ua: "моушн", eng: "motion" },
  graphic: { ua: "графіка", eng: "graphic" },
};

export type WorkItemId =
  | "short-video-editing"
  | "youtube-teaser"
  | "kinetic-typography"
  | "poster-design"
  | "social-media-design"
  | "youtube-thumbnail-design"
  | "amazon-design";

export const WORK_ITEMS: Record<WorkTab, WorkItemId[]> = {
  motion: ["short-video-editing", "youtube-teaser", "kinetic-typography"],
  graphic: [
    "poster-design",
    "social-media-design",
    "youtube-thumbnail-design",
    "amazon-design",
  ],
};

export const WORK_ITEM_LABELS: Record<WorkItemId, Record<Language, string>> = {
  "short-video-editing": {
    ua: "МОНТАЖ КОРОТКИХ ВІДЕО",
    eng: "SHORT VIDEO EDITING",
  },
  "youtube-teaser": { ua: "YOUTUBE ТИЗЕР", eng: "YOUTUBE TEASER" },
  "kinetic-typography": {
    ua: "КІНЕТИЧНА ТИПОГРАФІКА",
    eng: "KINETIC TYPOGRAPHY",
  },
  "poster-design": { ua: "ДИЗАЙН ПОСТЕРІВ", eng: "POSTER DESIGN" },
  "social-media-design": {
    ua: "ДИЗАЙН ДЛЯ СОЦМЕРЕЖ",
    eng: "SOCIAL MEDIA DESIGN",
  },
  "youtube-thumbnail-design": {
    ua: "ДИЗАЙН YOUTUBE-ОБКЛАДИНОК",
    eng: "YOUTUBE THUMBNAIL DESIGN",
  },
    "amazon-design": { ua: "ДИЗАЙН\nДЛЯ AMAZON", eng: "AMAZON DESIGN" },
};