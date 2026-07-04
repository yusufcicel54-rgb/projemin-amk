/**
 * Google Analytics Helper Utility
 * Loads gtag.js dynamically if a Measurement ID is configured.
 */

declare global {
  interface Window {
    dataLayer: any[];
    gtag?: (...args: any[]) => void;
  }
}

const GA_MEASUREMENT_ID = (import.meta as any).env?.VITE_GA_MEASUREMENT_ID || 'G-NBSKZSF35W';

/**
 * Dynamically initializes Google Analytics on the client side
 */
export function initGA() {
  if (!GA_MEASUREMENT_ID) {
    console.log('Google Analytics: No VITE_GA_MEASUREMENT_ID specified. Analytics tracking skipped.');
    return;
  }

  try {
    // 1. Create and inject the gtag.js script tag
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    document.head.appendChild(script);

    // 2. Initialize dataLayer and gtag function
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
      window.dataLayer.push(arguments);
    };

    // 3. Configure defaults
    window.gtag('js', new Date());
    window.gtag('config', GA_MEASUREMENT_ID, {
      page_path: window.location.pathname,
      send_page_view: true,
    });

    console.log(`Google Analytics: Initialized successfully with ID: ${GA_MEASUREMENT_ID}`);
  } catch (error) {
    console.error('Google Analytics: Failed to initialize gtag.js', error);
  }
}

/**
 * Tracks a custom event in Google Analytics
 * @param action Event action name (e.g. 'click_button')
 * @param category Event category (e.g. 'Interaction')
 * @param label Event label (e.g. 'Omniverse Crack Button')
 * @param value Optional numeric value associated with the event
 */
export function trackEvent(action: string, category: string, label?: string, value?: number) {
  if (typeof window !== 'undefined' && window.gtag && GA_MEASUREMENT_ID) {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  }
}

/**
 * Tracks a page view event explicitly
 * @param path The path of the page viewed
 */
export function trackPageView(path: string) {
  if (typeof window !== 'undefined' && window.gtag && GA_MEASUREMENT_ID) {
    window.gtag('config', GA_MEASUREMENT_ID, {
      page_path: path,
    });
  }
}
