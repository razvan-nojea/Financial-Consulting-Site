import React from "react";
import { useState, type ElementType, type ReactNode } from "react";
import { useParams, useNavigate, Link } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import { toast } from "sonner";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Calendar,
  Clock,
  User,
  Phone,
  FileText,
  CalendarPlus,
  Info,
} from "lucide-react";
import { useAppointments, AppointmentFormData } from "../contexts/appointments-context";
import { AppointmentForm } from "../components/appointments/appointment-form";
import { StatusBadge } from "../components/appointments/status-badge";

// ─── Helper ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("ro-RO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatDateShort(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("ro-RO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ─── Detail Row ──────────────────────────────────────────────────────────────

interface DetailRowProps {
  icon: ElementType;
  label: string;
  value: ReactNode;
}

function DetailRow({ icon: Icon, label, value }: DetailRowProps) {
  return (
    <div className="flex items-start gap-4 py-4 border-b border-border last:border-0">
      <div className="w-9 h-9 bg-muted rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon size={16} className="text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">{label}</p>
        <div className="text-foreground/90 text-sm">{value}</div>
      </div>
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function AppointmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isLoading, getAppointment, updateAppointment, deleteAppointment } = useAppointments();

  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const appointment = getAppointment(id ?? "");

  if (!appointment && isLoading && id) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[320px] text-center">
        <Calendar size={40} className="text-muted-foreground/40 mb-4" />
        <p className="text-muted-foreground text-sm">Se încarcă detaliile programării...</p>
      </div>
    );
  }

  // ── Not found ──────────────────────────────────────────────────────────────
  if (!appointment) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <Calendar size={48} className="text-muted-foreground/40 mb-4" />
        <h2 className="text-xl font-bold text-foreground mb-2">Programare negăsită</h2>
        <p className="text-muted-foreground text-sm mb-6">
          Programarea cu ID-ul <code className="text-blue-400">#{id}</code> nu există sau a
          fost ștearsă.
        </p>
        <Link to="/cont/programari">
          <Button className="bg-blue-600 hover:bg-blue-500 text-white">
            <ArrowLeft size={16} className="mr-2" />
            Înapoi la Programări
          </Button>
        </Link>
      </div>
    );
  }

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleEdit = (data: AppointmentFormData) => {
    updateAppointment(appointment.id, data);
    setShowEditDialog(false);
    toast.success("Programare actualizată cu succes!");
  };

  const handleDelete = () => {
    deleteAppointment(appointment.id);
    toast.success("Programarea a fost ștearsă.");
    navigate("/cont/programari");
  };

  const isUpcoming =
    appointment.date >= new Date().toISOString().split("T")[0] &&
    appointment.status !== "cancelled";

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-2xl">

      {/* ── Back + Actions ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Link
          to="/cont/programari"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm"
        >
          <ArrowLeft size={16} />
          Înapoi la Programări
        </Link>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-border text-muted-foreground hover:bg-muted hover:text-foreground gap-2"
            aria-label={`Editeaza ${appointment.service}`}
            onClick={() => setShowEditDialog(true)}
          >
            <Pencil size={14} />
            Editează
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-red-800 text-red-400 hover:bg-red-900/20 hover:text-red-300 gap-2"
            aria-label={`Sterge ${appointment.service}`}
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 size={14} />
            Șterge
          </Button>
        </div>
      </div>

      {/* ── Main Card ─────────────────────────────────────────────────── */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                Programare #{appointment.id}
              </p>
              <CardTitle className="text-foreground text-xl leading-tight">
                {appointment.service}
              </CardTitle>
            </div>
            <StatusBadge status={appointment.status} size="md" />
          </div>
        </CardHeader>

        <CardContent className="pt-2">
          <DetailRow
            icon={Calendar}
            label="Data"
            value={
              <span className="capitalize">{formatDate(appointment.date)}</span>
            }
          />
          <DetailRow icon={Clock} label="Ora" value={appointment.time} />
          <DetailRow icon={User} label="Client" value={appointment.clientName} />
          <DetailRow
            icon={Phone}
            label="Telefon"
            value={
              appointment.phone ? (
                <a
                  href={`tel:${appointment.phone.replace(/\s/g, "")}`}
                  className="text-blue-400 hover:underline"
                >
                  {appointment.phone}
                </a>
              ) : (
                <span className="text-gray-600 italic">Necompletat</span>
              )
            }
          />
          <DetailRow
            icon={FileText}
            label="Notițe"
            value={
              appointment.notes ? (
                <span className="whitespace-pre-wrap">{appointment.notes}</span>
              ) : (
                <span className="text-gray-600 italic">Fără notițe</span>
              )
            }
          />
          <DetailRow
            icon={CalendarPlus}
            label="Creată pe"
            value={formatDateShort(appointment.createdAt)}
          />
        </CardContent>
      </Card>

      {/* ── Info banner for upcoming ───────────────────────────────────── */}
      {isUpcoming && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 border border-blue-200 dark:bg-blue-900/20 dark:border-blue-800/40">
          <Info size={16} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <p className="text-blue-700 dark:text-blue-300 text-sm">
            Această programare este în viitor. Asigură-te că ești disponibil pe{" "}
            <strong className="text-blue-900 dark:text-white capitalize">
              {formatDate(appointment.date)}
            </strong>{" "}
            la ora <strong className="text-blue-900 dark:text-white">{appointment.time}</strong>.
          </p>
        </div>
      )}

      {/* ── Edit Dialog ────────────────────────────────────────────────── */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <Pencil size={18} className="text-yellow-400" />
              Editează Programarea
            </DialogTitle>
          </DialogHeader>
          <AppointmentForm
            isNew={false}
            initialData={appointment}
            onSubmit={handleEdit}
            onCancel={() => setShowEditDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ────────────────────────────────────────── */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">
              Ștergi această programare?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              <strong className="text-foreground/80">{appointment.service}</strong> din{" "}
              {formatDateShort(appointment.date)} va fi ștearsă definitiv. Această
              acțiune nu poate fi anulată.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-border text-muted-foreground hover:bg-muted hover:text-foreground">
              Anulează
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-500 text-white border-0"
            >
              Da, șterge
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
