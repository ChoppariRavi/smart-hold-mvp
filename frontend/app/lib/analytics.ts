// frontend/src/lib/analytics.ts

type EventProps = Record<string, string | number | boolean>;

declare global {
  interface Window {
    plausible?: (eventName: string, options?: { props?: EventProps }) => void;
    umami?: {
      track: (eventName: string, data?: EventProps) => void;
    };
  }
}

export function trackEvent(eventName: string, props?: EventProps) {
  if (typeof window === "undefined") return;

  // Plausible
  if (typeof window.plausible === "function") {
    window.plausible(eventName, { props });
  }

  // Umami fallback
  if (window.umami && typeof window.umami.track === "function") {
    window.umami.track(eventName, props);
  }
}