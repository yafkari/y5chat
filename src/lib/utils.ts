import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { CDN_URL_APPLE } from "./constants";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function emojiToUnicode(str: string) {
  return Array.from(str).map(char =>
    char.codePointAt(0)?.toString(16)
  );
}

export function stringEmojiToImage(icon: string) {
  return `${CDN_URL_APPLE}${emojiToUnicode(icon).join('-')}.png`
}

export function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}