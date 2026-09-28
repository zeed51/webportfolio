export type WorkReels = {
  title: string;
  category: "motion" | "graphic";
  layout: "carousel" | "featured" | "poster" | "grid";
  // null = слот "SOON", ще немає контенту
  videos?: (string | null)[];
  images?: (string | null)[];
  // тільки для layout: "grid"
  gridColumns?: number;
  gridAspect?: string;
};
export const WORK_REELS: Record<string, WorkReels> = {
  "short-video-editing": {
    title: "Short Video Editing",
    category: "motion",
    layout: "carousel",
    videos: [
      "/videos/reels/short-video-editing-1-compressed.mp4",
      "/videos/reels/short-video-editing-2.mp4",
      "/videos/reels/short-video-editing-3-compressed.mp4",
    ],
  },
  "youtube-teaser": {
    title: "Youtube Teaser",
    category: "motion",
    layout: "featured",
    videos: [
      "/videos/youtube teaser/youtube-teaser-1.mp4",
      null,
    ],
  },
    "kinetic-typography": {
    title: "Kinetic Typography",
    category: "motion",
    layout: "featured",
    videos: [
      "/videos/kinetic/kinetic-typography-1.mp4",
      null,
    ],
  },
    "poster-design": {
    title: "Poster Design",
    category: "graphic",
    layout: "poster",
    images: [
      "/images/posters/poster-1.webp",
      "/images/posters/poster-2.webp",
      "/images/posters/poster-3.webp",
      "/images/posters/poster-4.webp",
      "/images/posters/poster-5.webp",
      "/images/posters/poster-6.webp",
      "/images/posters/poster-7.webp",
      "/images/posters/poster-8.webp",
      "/images/posters/poster-9.webp",
    ],
  },
    "social-media-design": {
    title: "Social Media Design",
    category: "graphic",
    layout: "grid",
    gridColumns: 3,
    gridAspect: "1080 / 1350",
    images: [
      "/images/social/social-1.webp",
      "/images/social/social-2.webp",
      "/images/social/social-3.webp",
      "/images/social/social-4.webp",
      "/images/social/social-5.webp",
      "/images/social/social-6.webp",
      "/images/social/social-7.webp",
      "/images/social/social-8.webp",
      "/images/social/social-9.webp",
    ],
  },
  "youtube-thumbnail-design": {
    title: "Youtube Thumbnail Design",
    category: "graphic",
    layout: "grid",
    gridColumns: 2,
    gridAspect: "16 / 9",
    images: [
      "/images/thumbnails/thumbnail-1.webp",
      "/images/thumbnails/thumbnail-2.webp",
      "/images/thumbnails/thumbnail-3.webp",
      "/images/thumbnails/thumbnail-4.webp",
      "/images/thumbnails/thumbnail-5.webp",
      "/images/thumbnails/thumbnail-6.webp",
      "/images/thumbnails/thumbnail-7.webp",
      "/images/thumbnails/thumbnail-8.webp",
      "/images/thumbnails/thumbnail-9.webp",
      "/images/thumbnails/thumbnail-10.webp",
      "/images/thumbnails/thumbnail-11.webp",
      "/images/thumbnails/thumbnail-12.webp",
      "/images/thumbnails/thumbnail-13.webp",
    ],
  },
    "amazon-design": {
    title: "Amazon Design",
    category: "graphic",
    layout: "grid",
    gridColumns: 2,
    gridAspect: "1 / 1",
    images: [
      "/images/amazon/amazon-1.webp",
      "/images/amazon/amazon-2.webp",
      "/images/amazon/amazon-3.webp",
      "/images/amazon/amazon-4.webp",
    ],
  },
};