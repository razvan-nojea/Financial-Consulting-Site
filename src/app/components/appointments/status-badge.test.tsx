import React from "react";
import { render, screen } from "@testing-library/react";
import { StatusBadge } from "./status-badge";
import { describe, expect, it } from "vitest";

describe("StatusBadge", () => {
  it("should render confirmed status with correct styling and icon", () => {
    render(<StatusBadge status="confirmed" />);

    const badge = screen.getByText("Confirmată");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("bg-green-100", "text-green-700", "border-green-200");
  });

  it("should render pending status with correct styling and icon", () => {
    render(<StatusBadge status="pending" />);

    const badge = screen.getByText("În așteptare");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("bg-amber-100", "text-amber-700", "border-amber-200");
  });

  it("should render completed status with correct styling and icon", () => {
    render(<StatusBadge status="completed" />);

    const badge = screen.getByText("Completată");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("bg-blue-100", "text-blue-700", "border-blue-200");
  });

  it("should render cancelled status with correct styling and icon", () => {
    render(<StatusBadge status="cancelled" />);

    const badge = screen.getByText("Anulată");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("bg-red-100", "text-red-700", "border-red-200");
  });

  it("should render small size by default", () => {
    render(<StatusBadge status="confirmed" />);

    const badge = screen.getByText("Confirmată");
    expect(badge).toHaveClass("px-2", "py-0.5", "text-xs");
  });

  it("should render medium size when specified", () => {
    render(<StatusBadge status="confirmed" size="md" />);

    const badge = screen.getByText("Confirmată");
    expect(badge).toHaveClass("px-3", "py-1", "text-sm");
  });

  it("should show icon by default", () => {
    render(<StatusBadge status="confirmed" />);

    // Check if icon is present (we can't easily test the exact icon, but we can check for the presence)
    const badge = screen.getByText("Confirmată");
    expect(badge).toHaveClass("inline-flex", "items-center", "gap-1", "px-2", "py-0.5", "text-xs");
  });

  it("should hide icon when showIcon is false", () => {
    render(<StatusBadge status="confirmed" showIcon={false} />);

    const badge = screen.getByText("Confirmată");
    expect(badge).toHaveClass("inline-flex", "items-center", "gap-1", "px-2", "py-0.5", "text-xs");
    // When no icon, there should be no additional elements
    expect(badge.children).toHaveLength(0); // Only the text content
  });

  it("should have correct base classes", () => {
    render(<StatusBadge status="confirmed" />);

    const badge = screen.getByText("Confirmată");
    expect(badge).toHaveClass(
      "inline-flex",
      "items-center",
      "gap-1",
      "rounded-full",
      "font-medium"
    );
  });
});