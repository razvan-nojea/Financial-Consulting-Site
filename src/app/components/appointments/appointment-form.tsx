import React from "react";
import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  AppointmentFormData,
  AppointmentErrors,
  AppointmentStatus,
  validateAppointment,
} from "../../contexts/appointments-context";

// ─── Constants ─────────────────────────────────────────────────────────────

export const SERVICES = [
  "Planificare Financiară Personală",
  "Planificare Pensie",
  "Gestionarea Datoriilor",
  "Strategii de Investiții",
  "Planificare Imobiliară",
  "Consultanță Financiară pentru Afaceri",
  "Planificare Educație Copii",
  "Coaching Bugetar",
];

export const TIME_SLOTS = [
  "09:00", "10:00", "11:00",
  "13:00", "14:00", "15:00", "16:00", "17:00",
];

export const STATUS_OPTIONS: { value: AppointmentStatus; label: string }[] = [
  { value: "pending", label: "În așteptare" },
  { value: "confirmed", label: "Confirmată" },
  { value: "completed", label: "Completată" },
  { value: "cancelled", label: "Anulată" },
];

const EMPTY_FORM: AppointmentFormData = {
  service: "",
  date: "",
  time: "",
  status: "pending",
  clientName: "",
  phone: "",
  notes: "",
};

// ─── Component ─────────────────────────────────────────────────────────────

interface Props {
  initialData?: Partial<AppointmentFormData>;
  isNew?: boolean;
  onSubmit: (data: AppointmentFormData) => void;
  onCancel: () => void;
}

export function AppointmentForm({
  initialData,
  isNew = true,
  onSubmit,
  onCancel,
}: Props) {
  const [formData, setFormData] = useState<AppointmentFormData>({
    ...EMPTY_FORM,
    ...initialData,
  });
  const [errors, setErrors] = useState<AppointmentErrors>({});
  const [touched, setTouched] = useState<Partial<Record<keyof AppointmentFormData, boolean>>>({});

  // ── Helpers ────────────────────────────────────────────────────────────

  const setField = (field: keyof AppointmentFormData, value: string) => {
    const next = { ...formData, [field]: value };
    setFormData(next);
    setTouched((prev) => ({ ...prev, [field]: true }));
    setErrors(validateAppointment(next, isNew));
  };

  const markTouched = (field: keyof AppointmentFormData) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    setErrors(validateAppointment(formData, isNew));
  };

  const fieldError = (field: keyof AppointmentFormData) =>
    touched[field] && errors[field] ? (
      <p className="mt-1 text-xs text-red-400">{errors[field]}</p>
    ) : null;

  const inputClass = (field: keyof AppointmentFormData) =>
    `mt-1.5 bg-background border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-blue-600 ${
      touched[field] && errors[field] ? "border-red-500 focus-visible:ring-red-500" : ""
    }`;

  // ── Submit ─────────────────────────────────────────────────────────────

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Touch all fields to show errors
    const keys = Object.keys(EMPTY_FORM) as (keyof AppointmentFormData)[];
const allTouched = {} as Record<keyof AppointmentFormData, boolean>;
for (const k of keys) allTouched[k] = true;
    setTouched(allTouched);

    const errs = validateAppointment(formData, isNew);
    setErrors(errs);

    if (Object.keys(errs).length === 0) {
      onSubmit(formData);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────

  const today = new Date().toISOString().split("T")[0];

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>

      {/* Serviciu */}
      <div>
        <Label className="text-foreground/80 text-sm">
          Serviciu <span className="text-red-400">*</span>
        </Label>
        <Select
          value={formData.service}
          onValueChange={(v) => setField("service", v)}
        >
          <SelectTrigger
            className={`mt-1.5 bg-background border-border text-foreground ${
              touched.service && errors.service ? "border-red-500" : ""
            }`}
          >
            <SelectValue placeholder="Selectează serviciul..." />
          </SelectTrigger>
          <SelectContent>
            {SERVICES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {fieldError("service")}
      </div>

      {/* Data + Ora */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-foreground/80 text-sm">
            Data <span className="text-red-400">*</span>
          </Label>
          <Input
            type="date"
            value={formData.date}
            min={isNew ? today : undefined}
            onChange={(e) => setField("date", e.target.value)}
            onBlur={() => markTouched("date")}
            className={inputClass("date")}
          />
          {fieldError("date")}
        </div>
        <div>
          <Label className="text-foreground/80 text-sm">
            Ora <span className="text-red-400">*</span>
          </Label>
          <Select
            value={formData.time}
            onValueChange={(v) => setField("time", v)}
          >
            <SelectTrigger
              className={`mt-1.5 bg-background border-border text-foreground ${
                touched.time && errors.time ? "border-red-500" : ""
              }`}
            >
              <SelectValue placeholder="Ora..." />
            </SelectTrigger>
            <SelectContent>
              {TIME_SLOTS.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {fieldError("time")}
        </div>
      </div>

      {/* Nume client */}
      <div>
        <Label className="text-foreground/80 text-sm">
          Numele Complet <span className="text-red-400">*</span>
        </Label>
        <Input
          value={formData.clientName}
          onChange={(e) => setField("clientName", e.target.value)}
          onBlur={() => markTouched("clientName")}
          placeholder="ex: Ion Popescu"
          className={inputClass("clientName")}
        />
        {fieldError("clientName")}
      </div>

      {/* Telefon */}
      <div>
        <Label className="text-foreground/80 text-sm">Telefon</Label>
        <Input
          value={formData.phone}
          onChange={(e) => setField("phone", e.target.value)}
          onBlur={() => markTouched("phone")}
          placeholder="ex: 0722 123 456"
          className={inputClass("phone")}
        />
        {fieldError("phone")}
      </div>

      {/* Status — doar la editare */}
      {!isNew && (
        <div>
          <Label className="text-foreground/80 text-sm">Status</Label>
          <Select
            value={formData.status}
            onValueChange={(v) => setField("status", v as AppointmentStatus)}
          >
            <SelectTrigger className="mt-1.5 bg-background border-border text-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Notițe */}
      <div>
        <Label className="text-foreground/80 text-sm">
          Notițe{" "}
          <span className="text-muted-foreground text-xs">
            ({formData.notes.length}/500)
          </span>
        </Label>
        <Textarea
          value={formData.notes}
          onChange={(e) => setField("notes", e.target.value)}
          onBlur={() => markTouched("notes")}
          placeholder="Mențiuni speciale, întrebări sau alte informații relevante..."
          rows={3}
          className={`${inputClass("notes")} resize-none`}
        />
        {fieldError("notes")}
      </div>

      {/* Acțiuni */}
      <div className="flex gap-3 pt-2">
        <Button
          type="submit"
          className="flex-1 bg-blue-600 hover:bg-blue-500 text-white"
        >
          {isNew ? "Adaugă Programare" : "Salvează Modificările"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1 border-border text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          Anulează
        </Button>
      </div>
    </form>
  );
}
