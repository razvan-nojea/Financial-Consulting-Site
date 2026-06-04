import { cn } from "./utils";
import { describe, expect, it } from "vitest";

describe("cn utility", () => {
  it("should merge Tailwind classes correctly", () => {
    expect(cn("bg-red-500", "bg-blue-500")).toBe("bg-blue-500");
  });

  it("should handle conflicting classes", () => {
    expect(cn("text-sm text-red-500", "text-lg text-blue-500")).toBe("text-lg text-blue-500");
  });

  it("should handle undefined and null values", () => {
    expect(cn("bg-red-500", undefined, null, "text-white")).toBe("bg-red-500 text-white");
  });

  it("should handle empty strings", () => {
    expect(cn("bg-red-500", "", "text-white")).toBe("bg-red-500 text-white");
  });

  it("should handle arrays of classes", () => {
    expect(cn(["bg-red-500", "text-white"], "text-blue-500")).toBe("bg-red-500 text-blue-500");
  });

  it("should handle complex class combinations", () => {
    expect(cn(
      "flex items-center justify-between",
      "flex-col items-start",
      "p-4 p-2"
    )).toBe("flex justify-between flex-col items-start p-2");
  });

  it("should return empty string for no inputs", () => {
    expect(cn()).toBe("");
  });

  it("should handle single class", () => {
    expect(cn("bg-red-500")).toBe("bg-red-500");
  });

  it("should handle falsy values", () => {
    expect(cn("bg-red-500", false, "text-white", 0)).toBe("bg-red-500 text-white");
  });
});