import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility helpers for frontend class-name and embed-state checks.
 *
 * Responsibilities:
 * - compose conditional class values with `clsx`
 * - resolve Tailwind class conflicts with `tailwind-merge`
 * - expose iframe detection for embed-aware UI behavior
 */

/**
 * Merge conditional class values into a single Tailwind-safe class string.
 *
 * @param {...(string|string[]|Object)} inputs
 * @returns {string}
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Whether the current window is running inside an iframe.
 *
 * @type {boolean}
 */
export const isIframe = window.self !== window.top;
