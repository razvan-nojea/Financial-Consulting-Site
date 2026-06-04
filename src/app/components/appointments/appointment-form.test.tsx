import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { AppointmentForm } from "./appointment-form";

describe("AppointmentForm", () => {
  it("shows validation errors on submit with empty required fields", async () => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();

    render(<AppointmentForm onSubmit={onSubmit} onCancel={onCancel} />);

    const submitButton = screen.getByRole("button", { name: /adaugă programare/i });
    fireEvent.click(submitButton);

    expect(await screen.findByText(/serviciul este obligatoriu/i)).toBeInTheDocument();
    expect(await screen.findByText(/data este obligatorie/i)).toBeInTheDocument();
    expect(await screen.findByText(/ora este obligatorie/i)).toBeInTheDocument();
    expect(await screen.findByText(/numele este obligatoriu/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits successfully with valid data", async () => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();

    render(<AppointmentForm onSubmit={onSubmit} onCancel={onCancel} />);

    // Fill required fields
    // Service - use first combobox (index 0)
    const comboboxes = screen.getAllByRole("combobox");
    const serviceTrigger = comboboxes[0];
    fireEvent.click(serviceTrigger);
    
    // Wait for dropdown to open and select the option
    await waitFor(() => {
      const serviceOptions = screen.getAllByText("Planificare Financiară Personală");
      // The last one should be the visible dropdown option
      fireEvent.click(serviceOptions[serviceOptions.length - 1]);
    });

    // Date - find the date input by its type attribute
    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: "2026-12-25" } });

    // Time - use second combobox (index 1)
    const timeTrigger = comboboxes[1];
    fireEvent.click(timeTrigger);
    
    // Wait for time dropdown and select option
    await waitFor(() => {
      const timeOptions = screen.getAllByText("10:00");
      fireEvent.click(timeOptions[timeOptions.length - 1]);
    });

    // Client Name
    const nameInput = screen.getByPlaceholderText(/ion popescu/i);
    fireEvent.change(nameInput, { target: { value: "Ion Popescu" } });

    // Phone
    const phoneInput = screen.getByPlaceholderText(/0722 123 456/i);
    fireEvent.change(phoneInput, { target: { value: "0722123456" } });

    const submitButton = screen.getByRole("button", { name: /adaugă programare/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        service: "Planificare Financiară Personală",
        date: "2026-12-25",
        time: "10:00",
        status: "pending",
        clientName: "Ion Popescu",
        phone: "0722123456",
        notes: ""
      });
    });
  });

  it("shows field validation errors when fields are touched", async () => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();

    render(<AppointmentForm onSubmit={onSubmit} onCancel={onCancel} />);

    const nameInput = screen.getByPlaceholderText(/ion popescu/i);

    // Enter invalid data (empty name)
    fireEvent.change(nameInput, { target: { value: "" } });
    // Blur to mark as touched
    fireEvent.blur(nameInput);

    expect(await screen.findByText(/numele este obligatoriu/i)).toBeInTheDocument();
  });

  it("shows status field in edit mode and submits updated status", async () => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();

    render(
      <AppointmentForm
        isNew={false}
        initialData={{
          service: "Planificare Financiară Personală",
          date: "2026-12-25",
          time: "10:00",
          status: "pending",
          clientName: "Ion Popescu",
          phone: "0722123456",
          notes: ""
        }}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />
    );

    expect(screen.getByText(/status/i)).toBeInTheDocument();

    const comboboxes = screen.getAllByRole("combobox");
    const statusTrigger = comboboxes[2];
    fireEvent.click(statusTrigger);

    await waitFor(() => {
      const completedOptions = screen.getAllByText("Completată");
      fireEvent.click(completedOptions[completedOptions.length - 1]);
    });

    const submitButton = screen.getByRole("button", { name: /salvează modificările/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        service: "Planificare Financiară Personală",
        date: "2026-12-25",
        time: "10:00",
        status: "completed",
        clientName: "Ion Popescu",
        phone: "0722123456",
        notes: ""
      });
    });
  });

  it("engages onBlur, inputClass error state and onCancel", async () => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();

    render(<AppointmentForm onSubmit={onSubmit} onCancel={onCancel} />);

    const nameInput = screen.getByPlaceholderText(/ion popescu/i);
    const phoneInput = screen.getByPlaceholderText(/0722 123 456/i);
    const notesInput = screen.getByPlaceholderText(/mențiuni speciale/i);
    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;

    fireEvent.change(nameInput, { target: { value: "" } });
    fireEvent.blur(nameInput);

    fireEvent.change(phoneInput, { target: { value: "" } });
    fireEvent.blur(phoneInput);

    fireEvent.change(notesInput, { target: { value: "note" } });
    fireEvent.blur(notesInput);

    fireEvent.blur(dateInput);

    await waitFor(() => {
      expect(screen.getByText(/numele este obligatoriu/i)).toBeInTheDocument();
      expect(nameInput).toHaveClass("border-red-500");
    });

    const cancelButton = screen.getByRole("button", { name: /anulează/i });
    fireEvent.click(cancelButton);
    expect(onCancel).toHaveBeenCalled();
  });
  
  it("sets min date when isNew is true", () => {
    render(<AppointmentForm onSubmit={vi.fn()} onCancel={vi.fn()} />);

    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    const today = new Date().toISOString().split("T")[0];
    expect(dateInput).toHaveAttribute("min", today);
  });

  it("runs all field updates and submits in edit mode", async () => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();

    render(
      <AppointmentForm
        isNew={false}
        initialData={{
          service: "Planificare Financiară Personală",
          date: "2026-12-25",
          time: "09:00",
          status: "pending",
          clientName: "Ion Popescu",
          phone: "0722123456",
          notes: "Teste"
        }}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />
    );

    const comboboxes = screen.getAllByRole("combobox");
    fireEvent.click(comboboxes[0]);
    await waitFor(() => {
      const options = screen.getAllByText("Coaching Bugetar");
      fireEvent.click(options[options.length - 1]);
    });

    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: "2026-12-26" } });

    fireEvent.click(comboboxes[1]);
    await waitFor(() => {
      const options = screen.getAllByText("11:00");
      fireEvent.click(options[options.length - 1]);
    });

    const nameInput = screen.getByPlaceholderText(/ion popescu/i);
    fireEvent.change(nameInput, { target: { value: "Mihai Ionescu" } });

    const phoneInput = screen.getByPlaceholderText(/0722 123 456/i);
    fireEvent.change(phoneInput, { target: { value: "0733123456" } });

    const notesInput = screen.getByPlaceholderText(/mențiuni speciale/i);
    fireEvent.change(notesInput, { target: { value: "Edit note" } });

    fireEvent.click(comboboxes[2]);
    await waitFor(() => {
      const options = screen.getAllByText("Confirmată");
      fireEvent.click(options[options.length - 1]);
    });

    const submitButton = screen.getByRole("button", { name: /salvează modificările/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        service: "Coaching Bugetar",
        date: "2026-12-26",
        time: "11:00",
        status: "confirmed",
        clientName: "Mihai Ionescu",
        phone: "0733123456",
        notes: "Edit note"
      });
    });

    fireEvent.click(screen.getByRole("button", { name: /anulează/i }));
    expect(onCancel).toHaveBeenCalled();
  });
});
