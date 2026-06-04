const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${MAX_AGE}; SameSite=Lax`;
}

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/** Cookies used to persist user activity and preferences across sessions. */
export function useActivityCookies() {
  return {
    /** Call on every route change to remember where the user was last. */
    trackPageVisit(path: string) {
      setCookie("cf_last_page", path);
      const visits = parseInt(getCookie("cf_visit_count") ?? "0", 10);
      setCookie("cf_visit_count", String(visits + 1));
    },

    /** Persist the active filter tab on the appointments page. */
    trackFilterTab(tab: string) {
      setCookie("cf_filter_tab", tab);
    },

    /** Persist statistics page search query. */
    trackStatsSearch(query: string) {
      if (query) setCookie("cf_stats_search", query);
    },

    /** Read back the last page the user visited. */
    getLastPage(): string | null {
      return getCookie("cf_last_page");
    },

    /** Read back the preferred filter tab. */
    getSavedFilterTab(): string | null {
      return getCookie("cf_filter_tab");
    },

    /** Read back the stats search preference. */
    getSavedStatsSearch(): string | null {
      return getCookie("cf_stats_search");
    },

    /** Total number of page visits across sessions. */
    getVisitCount(): number {
      return parseInt(getCookie("cf_visit_count") ?? "0", 10);
    },
  };
}
