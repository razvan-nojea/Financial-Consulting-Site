import { beforeEach, describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import { useActivityCookies } from "./use-activity-cookies";

function clearCookies() {
  document.cookie.split(";").forEach((c) => {
    const name = c.trim().split("=")[0];
    document.cookie = `${name}=; max-age=0; path=/`;
  });
}

describe("useActivityCookies", () => {
  beforeEach(() => {
    clearCookies();
  });

  it("trackPageVisit stores the last page and increments visit count", () => {
    const { result } = renderHook(() => useActivityCookies());

    result.current.trackPageVisit("/cont");
    expect(result.current.getLastPage()).toBe("/cont");
    expect(result.current.getVisitCount()).toBe(1);

    result.current.trackPageVisit("/cont/programari");
    expect(result.current.getLastPage()).toBe("/cont/programari");
    expect(result.current.getVisitCount()).toBe(2);
  });

  it("trackFilterTab persists and retrieves the active filter tab", () => {
    const { result } = renderHook(() => useActivityCookies());

    result.current.trackFilterTab("confirmed");
    expect(result.current.getSavedFilterTab()).toBe("confirmed");
  });

  it("trackStatsSearch persists a non-empty search query", () => {
    const { result } = renderHook(() => useActivityCookies());

    result.current.trackStatsSearch("Coaching");
    expect(result.current.getSavedStatsSearch()).toBe("Coaching");
  });

  it("trackStatsSearch does not persist an empty string", () => {
    const { result } = renderHook(() => useActivityCookies());

    result.current.trackStatsSearch("initial");
    result.current.trackStatsSearch("");
    // empty string should not overwrite existing value
    expect(result.current.getSavedStatsSearch()).toBe("initial");
  });

  it("returns null for cookies that have never been set", () => {
    const { result } = renderHook(() => useActivityCookies());

    expect(result.current.getLastPage()).toBeNull();
    expect(result.current.getSavedFilterTab()).toBeNull();
    expect(result.current.getSavedStatsSearch()).toBeNull();
    expect(result.current.getVisitCount()).toBe(0);
  });
});
