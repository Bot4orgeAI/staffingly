import { useState, useEffect } from "react";

const MOBILE_BREAKPOINT = 768;

/**
 * Determine whether the current viewport is below the mobile breakpoint.
 *
 * @returns {boolean}
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(undefined);

  useEffect(() => {
    const mediaQueryList = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);

    mediaQueryList.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);

    return () => mediaQueryList.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}
