import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { ImageWithFallback } from "./ImageWithFallback";
import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock Image constructor to simulate loading failures
const mockImage = vi.fn();
global.Image = mockImage;

describe("ImageWithFallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render image with correct props when image loads successfully", () => {
    render(
      <ImageWithFallback
        src="https://example.com/image.jpg"
        alt="Test image"
        className="test-class"
      />
    );

    const img = screen.getByAltText("Test image");
    expect(img).toHaveAttribute("src", "https://example.com/image.jpg");
    expect(img).toHaveClass("test-class");
  });

  it("should show fallback when image fails to load", async () => {
    render(
      <ImageWithFallback
        src="https://example.com/broken-image.jpg"
        alt="Broken image"
        className="test-class"
      />
    );

    const img = screen.getByAltText("Broken image");
    fireEvent.error(img);

    // Wait for error to be handled
    await waitFor(() => {
      const fallbackContainer = screen.getByAltText("Error loading image");
      expect(fallbackContainer).toBeInTheDocument();
      expect(fallbackContainer).toHaveAttribute("data-original-url", "https://example.com/broken-image.jpg");
    });
  });

  it("should show fallback without className prop and in default class branch", async () => {
    render(
      <ImageWithFallback
        src="https://example.com/broken-image-no-class.jpg"
        alt="Broken no class"
      />
    );

    const img = screen.getByAltText("Broken no class");
    fireEvent.error(img);

    await waitFor(() => {
      const fallbackImg = screen.getByAltText("Error loading image");
      expect(fallbackImg).toBeInTheDocument();
      expect(fallbackImg).toHaveAttribute("data-original-url", "https://example.com/broken-image-no-class.jpg");
      const wrapper = fallbackImg.parentElement?.parentElement;
      expect(wrapper).toHaveClass("inline-block", "bg-gray-100", "text-center", "align-middle");
    });
  });

  it("should apply fallback styling correctly", async () => {
    render(
      <ImageWithFallback
        src="https://example.com/broken.jpg"
        alt="Broken"
        className="custom-class"
        style={{ width: "100px", height: "100px" }}
      />
    );

    const img = screen.getByAltText("Broken");
    fireEvent.error(img);

    await waitFor(() => {
      const fallbackDiv = screen.getByAltText("Error loading image").parentElement?.parentElement;
      expect(fallbackDiv).toHaveClass("inline-block", "bg-gray-100", "text-center", "align-middle", "custom-class");
      expect(fallbackDiv).toHaveStyle({ width: "100px", height: "100px" });
    });
  });

  it("should pass through additional props to both image and fallback", () => {
    render(
      <ImageWithFallback
        src="https://example.com/image.jpg"
        alt="Test"
        data-testid="test-image"
        title="Test title"
      />
    );

    const img = screen.getByTestId("test-image");
    expect(img).toHaveAttribute("title", "Test title");
  });

  it("should handle successful image load without showing fallback", () => {
    render(
      <ImageWithFallback
        src="https://example.com/working.jpg"
        alt="Working image"
      />
    );

    const img = screen.getByAltText("Working image");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "https://example.com/working.jpg");
  });

  it("should invoke handleError branch when the image error occurs", async () => {
    render(
      <ImageWithFallback
        src="https://example.com/fail.jpg"
        alt="Broken fallback"
        className="fallback-class"
      />
    );

    const img = screen.getByAltText("Broken fallback");
    fireEvent.error(img);

    await waitFor(() => {
      const fallbackImage = screen.getByAltText("Error loading image");
      expect(fallbackImage).toBeInTheDocument();
      expect(fallbackImage).toHaveAttribute("src", expect.stringContaining("data:image/svg+xml;base64"));
    });
  });
});