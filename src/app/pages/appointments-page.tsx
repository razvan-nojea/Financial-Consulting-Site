import React from "react";
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
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
  Plus,
  Search,
  Eye,
  Pencil,
  Trash2,
  Calendar,
  CalendarClock,
  Loader2,
  Zap,
  ZapOff,
} from "lucide-react";
import { useAppointments, AppointmentFormData, Appointment } from "../contexts/appointments-context";
import { AppointmentForm } from "../components/appointments/appointment-form";
import { StatusBadge } from "../components/appointments/status-badge";
import { useActivityCookies } from "../hooks/use-activity-cookies";

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("ro-RO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ─── Constants ─────────────────────────────────────────────────────────────

const PAGE_SIZE = 5;

type FilterTab = "all" | "upcoming" | "completed" | "cancelled";

const FILTER_TABS: { value: FilterTab; label: string }[] = [
  { value: "all", label: "Toate" },
  { value: "upcoming", label: "Viitoare" },
  { value: "completed", label: "Completate" },
  { value: "cancelled", label: "Anulate" },
];
export function runIfTargetPresent<T>(target: T | null, action: (value: T) => void) {
  if (target !== null) {
    action(target);
  }
}

// ─── Component ─────────────────────────────────────────────────────────────

export function AppointmentsPage() {
  const navigate = useNavigate();
  const {
    appointments,
    isLoading,
    connectionStatus,
    pendingChangesCount,
    generatorRunning,
    addAppointment,
    updateAppointment,
    deleteAppointment,
    startGenerator,
    stopGenerator,
  } = useAppointments();
  const { trackFilterTab, getSavedFilterTab } = useActivityCookies();

  // ── UI state ─────────────────────────────────────────────────────────────
  const [filterTab, setFilterTab] = useState<FilterTab>(() => {
    const saved = getSavedFilterTab();
    return (saved as FilterTab) ?? "all";
  });
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [isGeneratorToggling, setIsGeneratorToggling] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const isMountRef = useRef(true);

  // Persist filter tab changes to cookie
  useEffect(() => {
    trackFilterTab(filterTab);
  }, [filterTab]);

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editTarget, setEditTarget] = useState<Appointment | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Appointment | null>(null);

  // ── Filtering + sorting ──────────────────────────────────────────────────
  const today = new Date().toISOString().split("T")[0];

  const filtered = useMemo(() => {
    let list = [...appointments];

    // Tab filter
    if (filterTab === "upcoming") {
      list = list.filter(
        (a) => a.date >= today && a.status !== "cancelled"
      );
    } else if (filterTab === "completed") {
      list = list.filter((a) => a.status === "completed");
    } else if (filterTab === "cancelled") {
      list = list.filter((a) => a.status === "cancelled");
    }

    // Search filter
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (a) =>
          a.service.toLowerCase().includes(q) ||
          a.clientName.toLowerCase().includes(q)
      );
    }

    // Sort by date descending (most recent first)
    list.sort((a, b) => b.date.localeCompare(a.date));

    return list;
  }, [appointments, filterTab, search, today]);

  // ── Infinite scroll ──────────────────────────────────────────────────────
  const paginated = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  // Reset visible count when filter or search changes (skip on initial mount)
  useEffect(() => {
    if (isMountRef.current) {
      isMountRef.current = false;
      return;
    }
    setVisibleCount(PAGE_SIZE);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [filterTab, search]);

  // IntersectionObserver: load next page when sentinel enters viewport
  const loadMore = useCallback(() => {
    setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, filtered.length));
  }, [filtered.length]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    /* v8 ignore next */
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore) loadMore();
      },
      { rootMargin: "120px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  const handleFilterTab = (tab: FilterTab) => {
    setFilterTab(tab);
  };

  const handleSearch = (v: string) => {
    setSearch(v);
  };

  // ── Generator controls ───────────────────────────────────────────────────
  const handleGeneratorToggle = async () => {
    setIsGeneratorToggling(true);
    try {
      if (generatorRunning) {
        await stopGenerator();
        toast.success("Generator oprit.");
      } else {
        await startGenerator(3000);
        toast.success("Generator pornit. Programări noi apar automat.");
      }
    } catch {
      toast.error("Nu s-a putut contacta serverul.");
    } finally {
      setIsGeneratorToggling(false);
    }
  };

  // ── CRUD handlers ─────────────────────────────────────────────────────────
  const handleAdd = (data: AppointmentFormData) => {
    const appt = addAppointment(data);
    setShowAddDialog(false);
    toast.success("Programare adăugată cu succes!");
    navigate(`/cont/programari/${appt.id}`);
  };

  const handleEdit = (data: AppointmentFormData) => {
    runIfTargetPresent(editTarget, (target) => {
      updateAppointment(target.id, data);
      setEditTarget(null);
      toast.success("Programare actualizată!");
    });
  };

  const handleDelete = () => {
    runIfTargetPresent(deleteTarget, (target) => {
      deleteAppointment(target.id);
      setDeleteTarget(null);
      toast.success("Programarea a fost ștearsă.");
    });
  };

  // ── Summary counts ────────────────────────────────────────────────────────
  const upcoming = appointments.filter(
    (a) => a.date >= today && a.status !== "cancelled"
  ).length;
  const completed = appointments.filter((a) => a.status === "completed").length;
  const cancelled = appointments.filter((a) => a.status === "cancelled").length;
  const statusLabel =
    connectionStatus === "syncing"
      ? "Sincronizare in curs"
      : connectionStatus === "offline"
        ? "Mod offline"
        : "Conectat";

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-1">Programări</h1>
          <p className="text-muted-foreground text-sm">
            Gestionează și urmărește toate consultările tale financiare
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span
              className={`rounded-full px-2.5 py-1 font-medium ${
                connectionStatus === "online"
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                  : connectionStatus === "syncing"
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              {statusLabel}
            </span>
            {pendingChangesCount > 0 && (
              <span className="text-muted-foreground">
                {pendingChangesCount} modificări așteaptă sincronizarea
              </span>
            )}
            {isLoading && <span className="text-muted-foreground">Se actualizează lista</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {generatorRunning ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleGeneratorToggle}
              disabled={isGeneratorToggling}
              title="Oprește generatorul"
              className="border-yellow-500 text-yellow-600 dark:border-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 gap-1.5"
            >
              {isGeneratorToggling
                ? <Loader2 size={14} className="animate-spin" />
                : <ZapOff size={14} />}
              Stop Faker
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleGeneratorToggle}
              disabled={isGeneratorToggling}
              title="Pornește generatorul de date"
              className="border-border text-muted-foreground hover:text-foreground gap-1.5"
            >
              {isGeneratorToggling
                ? <Loader2 size={14} className="animate-spin" />
                : <Zap size={14} />}
              Start Faker
            </Button>
          )}
          <Button
            onClick={() => setShowAddDialog(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-2"
          >
            <Plus size={16} />
            Adaugă Programare
          </Button>
        </div>
      </div>

      {/* ── Summary cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total", value: appointments.length, color: "text-foreground" },
          { label: "Viitoare", value: upcoming, color: "text-blue-600 dark:text-blue-400" },
          { label: "Completate", value: completed, color: "text-emerald-600 dark:text-emerald-400" },
          { label: "Anulate", value: cancelled, color: "text-red-600 dark:text-red-400" },
        ].map((s) => (
          <Card key={s.label} className="bg-card border-border">
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-muted-foreground text-xs mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Table card ─────────────────────────────────────────────────── */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {/* Filter tabs */}
            <div className="flex gap-1 bg-muted rounded-lg p-1 border border-border">
              {FILTER_TABS.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => handleFilterTab(tab.value)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    filterTab === tab.value
                      ? "bg-blue-600 text-white"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative sm:ml-auto">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
              />
              <Input
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Caută serviciu sau client..."
                className="pl-8 bg-background border-border text-foreground placeholder:text-muted-foreground text-sm h-9 w-full sm:w-64"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {/* ── Desktop table ─────────────────────────────────────────── */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">
                Vedere master-detail pentru programari cu actiuni complete de creare,
                vizualizare, actualizare si stergere.
              </caption>
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium text-xs uppercase tracking-wider w-12">
                    #
                  </th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium text-xs uppercase tracking-wider">
                    Serviciu
                  </th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium text-xs uppercase tracking-wider">
                    Client
                  </th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium text-xs uppercase tracking-wider">
                    Data
                  </th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium text-xs uppercase tracking-wider">
                    Ora
                  </th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium text-xs uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-right py-3 px-4 text-muted-foreground font-medium text-xs uppercase tracking-wider">
                    Acțiuni
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center">
                      <Calendar size={36} className="text-muted-foreground/40 mx-auto mb-3" />
                      <p className="text-muted-foreground">Nicio programare găsită.</p>
                      {search && (
                        <button
                          className="text-blue-600 dark:text-blue-400 text-sm mt-1 hover:underline"
                          onClick={() => handleSearch("")}
                        >
                          Șterge filtrul
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  paginated.map((appt, idx) => (
                    <tr
                      key={appt.id}
                      className="border-b border-border/50 hover:bg-muted/30 transition-colors group"
                    >
                      <td className="py-3.5 px-4 text-muted-foreground text-xs">
                        {idx + 1}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-foreground font-medium line-clamp-1">
                          {appt.service}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-muted-foreground">{appt.clientName}</td>
                      <td className="py-3.5 px-4 text-foreground/70 whitespace-nowrap">
                        {formatDate(appt.date)}
                      </td>
                      <td className="py-3.5 px-4 text-foreground/70">{appt.time}</td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={appt.status} />
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/20"
                            title="Detalii"
                            aria-label={`Vezi detalii pentru ${appt.service}`}
                            onClick={() => navigate(`/cont/programari/${appt.id}`)}
                          >
                            <Eye size={15} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-amber-600 dark:hover:text-yellow-400 hover:bg-amber-100 dark:hover:bg-yellow-900/20"
                            aria-label={`Editeaza ${appt.service}`}
                            title="Editează"
                            onClick={() => setEditTarget(appt)}
                          >
                            <Pencil size={15} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-red-600 dark:hover:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20"
                            aria-label={`Sterge ${appt.service}`}
                            title="Șterge"
                            onClick={() => setDeleteTarget(appt)}
                          >
                            <Trash2 size={15} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* ── Mobile cards ──────────────────────────────────────────── */}
          <div className="md:hidden divide-y divide-border">
            {paginated.length === 0 ? (
              <div className="py-16 text-center">
                <Calendar size={36} className="text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">Nicio programare găsită.</p>
              </div>
            ) : (
              paginated.map((appt) => (
                <div key={appt.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-foreground font-medium text-sm">{appt.service}</p>
                      <p className="text-muted-foreground text-xs mt-0.5">{appt.clientName}</p>
                    </div>
                    <StatusBadge status={appt.status} />
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <CalendarClock size={12} />
                      {formatDate(appt.date)} la {appt.time}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 h-8 text-xs border-border text-foreground/70 hover:bg-muted"
                      aria-label={`Vezi detalii pentru ${appt.service}`}
                      onClick={() => navigate(`/cont/programari/${appt.id}`)}
                    >
                      <Eye size={13} className="mr-1" />
                      Detalii
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 w-8 p-0 border-border text-muted-foreground hover:text-amber-600 dark:hover:text-yellow-400 hover:border-amber-400 dark:hover:border-yellow-700"
                      aria-label={`Editeaza ${appt.service}`}
                      onClick={() => setEditTarget(appt)}
                    >
                      <Pencil size={13} />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 w-8 p-0 border-border text-muted-foreground hover:text-red-600 dark:hover:text-red-400 hover:border-red-400 dark:hover:border-red-700"
                      aria-label={`Sterge ${appt.service}`}
                      onClick={() => setDeleteTarget(appt)}
                    >
                      <Trash2 size={13} />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* ── Infinite scroll sentinel ───────────────────────────────── */}
          <div className="px-4 pb-2 pt-1 text-xs text-muted-foreground text-center">
            {paginated.length} din {filtered.length} programări afișate
          </div>
          <div ref={sentinelRef} className="flex items-center justify-center py-3">
            {hasMore && (
              <Loader2 size={18} className="animate-spin text-muted-foreground" />
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Add Dialog ─────────────────────────────────────────────────── */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <Plus size={18} className="text-blue-400" />
              Programare Nouă
            </DialogTitle>
          </DialogHeader>
          <AppointmentForm
            isNew
            onSubmit={handleAdd}
            onCancel={() => setShowAddDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {/* ── Edit Dialog ────────────────────────────────────────────────── */}
      <Dialog open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <Pencil size={18} className="text-yellow-400" />
              Editează Programarea
            </DialogTitle>
          </DialogHeader>
          {editTarget && (
            <AppointmentForm
              isNew={false}
              initialData={editTarget}
              onSubmit={handleEdit}
              onCancel={() => setEditTarget(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ────────────────────────────────────────── */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">
              Ștergi această programare?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              <strong className="text-foreground/80">
                {deleteTarget?.service}
              </strong>{" "}
              din {deleteTarget ? formatDate(deleteTarget.date) : ""} la{" "}
              {deleteTarget?.time} va fi ștearsă definitiv. Această acțiune nu
              poate fi anulată.
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
