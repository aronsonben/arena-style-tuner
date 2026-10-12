type EventParams = Record<string, string | number | boolean | undefined>;

/** Fire a GA4 event; no-ops if gtag is blocked or not loaded. */
export const trackEvent = (name: string, params?: EventParams): void => {
  if (process.env.NODE_ENV === 'development') return;
  const gtag = (window as any).gtag;
  if (typeof gtag === 'function') gtag('event', name, params);
};
