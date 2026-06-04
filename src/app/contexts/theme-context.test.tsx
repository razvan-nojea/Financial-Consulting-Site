import React from "react";
import { renderHook, act } from "@testing-library/react";
import { ThemeProvider, useTheme } from "./theme-context";
import { describe, expect, it, beforeEach, vi } from "vitest";

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock matchMedia
const matchMediaMock = vi.fn();
Object.defineProperty(window, 'matchMedia', {
  value: matchMediaMock
});

function wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

describe("theme-context", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mocks
    localStorageMock.getItem.mockReturnValue(null);
    localStorageMock.setItem.mockImplementation(() => {});
    matchMediaMock.mockReturnValue({ matches: false });
    
    // Clear document classes
    document.documentElement.className = '';
  });

  it("should initialize with light theme by default", () => {
    const { result } = renderHook(() => useTheme(), { wrapper });

    expect(result.current.theme).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("should initialize with stored theme from localStorage", () => {
    localStorageMock.getItem.mockReturnValue("dark");

    const { result } = renderHook(() => useTheme(), { wrapper });

    expect(result.current.theme).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("should initialize with dark theme when system prefers dark", () => {
    matchMediaMock.mockReturnValue({ matches: true });

    const { result } = renderHook(() => useTheme(), { wrapper });

    expect(result.current.theme).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("should toggle from light to dark", () => {
    const { result } = renderHook(() => useTheme(), { wrapper });

    expect(result.current.theme).toBe("light");

    act(() => {
      result.current.toggleTheme();
    });

    expect(result.current.theme).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(localStorageMock.setItem).toHaveBeenCalledWith("theme", "dark");
  });

  it("should toggle from dark to light", () => {
    localStorageMock.getItem.mockReturnValue("dark");

    const { result } = renderHook(() => useTheme(), { wrapper });

    expect(result.current.theme).toBe("dark");

    act(() => {
      result.current.toggleTheme();
    });

    expect(result.current.theme).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(localStorageMock.setItem).toHaveBeenCalledWith("theme", "light");
  });

  it("should apply dark class to document when theme is dark", () => {
    const { result } = renderHook(() => useTheme(), { wrapper });

    act(() => {
      result.current.toggleTheme();
    });

    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("should remove dark class from document when theme is light", () => {
    localStorageMock.getItem.mockReturnValue("dark");

    const { result } = renderHook(() => useTheme(), { wrapper });

    act(() => {
      result.current.toggleTheme();
    });

    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("should store theme in localStorage when changed", () => {
    const { result } = renderHook(() => useTheme(), { wrapper });

    act(() => {
      result.current.toggleTheme();
    });

    expect(localStorageMock.setItem).toHaveBeenCalledWith("theme", "dark");
  });

  it("should throw error when useTheme is used outside provider", () => {
    expect(() => {
      renderHook(() => useTheme());
    }).toThrow("useTheme must be used within a ThemeProvider");
  });
});