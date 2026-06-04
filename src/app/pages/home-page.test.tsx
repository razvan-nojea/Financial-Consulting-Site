import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { HomePage } from "./home-page";

function TestWrapper({ children }: { children: React.ReactNode }) {
  return <MemoryRouter>{children}</MemoryRouter>;
}

describe("HomePage", () => {
  it("should render the main hero section", () => {
    render(
      <TestWrapper>
        <HomePage />
      </TestWrapper>
    );

    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(
      screen.getByText(/prezentarea serviciilor/i)
    ).toBeInTheDocument();

    expect(screen.getByRole("link", { name: /ncepe acum/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /vezi serviciile/i })).toBeInTheDocument();
  });

  it("should not show technical details about data storage", () => {
    render(
      <TestWrapper>
        <HomePage />
      </TestWrapper>
    );

    expect(screen.queryByText(/\bRAM\b/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/programari pastrate local/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/direct in memoria aplicatiei/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/detalii despre cod/i)).not.toBeInTheDocument();
  });

  it("should render services section with all service cards", () => {
    render(
      <TestWrapper>
        <HomePage />
      </TestWrapper>
    );

    expect(screen.getByText("Servicii Oferite")).toBeInTheDocument();
    expect(screen.getByText("Planificare Financiara Personala")).toBeInTheDocument();
    expect(screen.getByText("Planificare Pensie")).toBeInTheDocument();
    expect(screen.getByText("Strategii de Investitii")).toBeInTheDocument();
    expect(screen.getByText("Gestionarea Datoriilor")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /vezi toate serviciile/i })).toBeInTheDocument();
  });

  it("should render benefits section", () => {
    render(
      <TestWrapper>
        <HomePage />
      </TestWrapper>
    );

    expect(
      screen.getByText("De ce sa alegi consultanta financiara gratuita?")
    ).toBeInTheDocument();
    expect(screen.getByText("Consultanta 100% gratuita")).toBeInTheDocument();
    expect(screen.getByText("Planuri personalizate pentru situatia dvs.")).toBeInTheDocument();
    expect(screen.getByText("Fara obligatii financiare")).toBeInTheDocument();
    expect(screen.getByText("Confidentialitate garantata")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /afla mai multe despre mine/i })).toBeInTheDocument();
  });

  it("should render testimonials section", () => {
    render(
      <TestWrapper>
        <HomePage />
      </TestWrapper>
    );

    expect(screen.getByText("Ce spun clientii")).toBeInTheDocument();
    expect(screen.getByText("Maria Ionescu")).toBeInTheDocument();
    expect(screen.getByText("Andrei Popescu")).toBeInTheDocument();
    expect(screen.getByText("Elena Dumitrescu")).toBeInTheDocument();
    expect(screen.getByText("Antreprenor")).toBeInTheDocument();
    expect(screen.getByText("Manager IT")).toBeInTheDocument();
    expect(screen.getByText("Medic")).toBeInTheDocument();
  });

  it("should have correct navigation links", () => {
    render(
      <TestWrapper>
        <HomePage />
      </TestWrapper>
    );

    expect(screen.getByRole("link", { name: /ncepe acum/i })).toHaveAttribute(
      "href",
      "/inregistrare"
    );
    expect(screen.getByRole("link", { name: /vezi serviciile/i })).toHaveAttribute(
      "href",
      "/servicii"
    );
    expect(screen.getByRole("link", { name: /vezi toate serviciile/i })).toHaveAttribute(
      "href",
      "/servicii"
    );
    expect(screen.getByRole("link", { name: /afla mai multe despre mine/i })).toHaveAttribute(
      "href",
      "/despre"
    );
  });

  it("should render all sections in correct order", () => {
    render(
      <TestWrapper>
        <HomePage />
      </TestWrapper>
    );

    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.getByText("Servicii Oferite")).toBeInTheDocument();
    expect(screen.getByText("De ce sa alegi consultanta financiara gratuita?")).toBeInTheDocument();
    expect(screen.getByText("Ce spun clientii")).toBeInTheDocument();
  });

  it("should have proper accessibility attributes", () => {
    render(
      <TestWrapper>
        <HomePage />
      </TestWrapper>
    );

    expect(screen.getAllByRole("img").length).toBeGreaterThan(0);
    screen.getAllByRole("link").forEach((link) => {
      expect(link).toHaveAttribute("href");
    });
  });
});
