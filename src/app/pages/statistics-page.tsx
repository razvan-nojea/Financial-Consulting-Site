import { useMemo, useState } from "react";
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
  Pencil,
  Trash2,
  BarChart2,
  Wifi,
  WifiOff,
  RefreshCw,
  Zap,
  ZapOff,
  Loader2,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  useAppointments,
  type Appointment,
  type AppointmentFormData,
} from "../contexts/appointments-context";
import { useTheme } from "../contexts/theme-context";
import { AppointmentForm } from "../components/appointments/appointment-form";
import { StatusBadge } from "../components/appointments/status-badge";

const STATUS_COLORS: Record<string, string> = {
  confirmed: "#3b82f6",
  pending: "#f59e0b",
  completed: "#10b981",
  cancelled: "#ef4444",
};

const STATUS_LABELS: Record<string, string> = {
  confirmed: "Confirmate",
  pending: "În așteptare",
  completed: "Finalizate",
  cancelled: "Anulate",
};

const PALETTE = [
  "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6",
  "#ef4444", "#06b6d4", "#84cc16", "#f97316",
];

function useTooltipStyle(theme: string) {
  return theme === "dark"
    ? { contentStyle: { backgroundColor: "#1a1a1a", border: "1px solid #374151", borderRadius: "8px", color: "#f9fafb" } }
    : { contentStyle: { backgroundColor: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "8px", color: "#111827" } };
}

function formatDate(dateStr: string) {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("ro-RO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function StatisticsPage() {
  const { theme } = useTheme();
  const tooltipStyle = useTooltipStyle(theme);
  const tickColor = theme === "dark" ? "#9ca3af" : "#6b7280";
  const {
    appointments,
    isLoading,
    connectionStatus,
    pendingChangesCount,
    generatorRunning,
    addAppointment,
    updateAppointment,
    deleteAppointment,
    refreshAppointments,
    startGenerator,
    stopGenerator,
  } = useAppointments();

  const [search, setSearch] = useState("");
  const [editTarget, setEditTarget] = useState<Appointment | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Appointment | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [isGeneratorToggling, setIsGeneratorToggling] = useState(false);

  const handleGeneratorToggle = async () => {
    setIsGeneratorToggling(true);
    try {
      if (generatorRunning) {
        await stopGenerator();
        toast.success("Generator oprit.");
      } else {
        await startGenerator(3000);
        toast.success("Generator pornit. Statisticile se actualizează automat.");
      }
    } catch {
      toast.error("Nu s-a putut contacta serverul.");
    } finally {
      setIsGeneratorToggling(false);
    }
  };

  /* ── Derived statistics from real appointments ───────────────────────── */
  const stats = useMemo(() => {
    const byStatusMap: Record<string, number> = {
      confirmed: 0,
      pending: 0,
      completed: 0,
      cancelled: 0,
    };
    const byServiceMap: Record<string, number> = {};
    const byMonthMap: Record<string, number> = {};

    for (const apt of appointments) {
      byStatusMap[apt.status] = (byStatusMap[apt.status] ?? 0) + 1;
      byServiceMap[apt.service] = (byServiceMap[apt.service] ?? 0) + 1;
      const ym = apt.date.substring(0, 7);
      byMonthMap[ym] = (byMonthMap[ym] ?? 0) + 1;
    }

    const byStatus = Object.entries(byStatusMap).map(([name, value]) => ({
      name: STATUS_LABELS[name] ?? name,
      value,
      color: STATUS_COLORS[name] ?? "#6b7280",
    }));

    const byService = Object.entries(byServiceMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value], i) => ({ name, value, color: PALETTE[i % PALETTE.length] }));

    const today = new Date().toISOString().split("T")[0];
    const byMonth = Object.entries(byMonthMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-8)
      .map(([month, value]) => ({
        month: new Date(month + "-01").toLocaleDateString("ro-RO", { month: "short", year: "2-digit" }),
        consultatii: value,
      }));

    const upcoming = appointments.filter((a) => a.date >= today && a.status !== "cancelled").length;

    return { byStatus, byService, byMonth, total: appointments.length, upcoming };
  }, [appointments]);

  /* ── Filtered table rows ─────────────────────────────────────────────── */
  const filteredRows = useMemo(() => {
    if (!search.trim()) return appointments;
    const q = search.trim().toLowerCase();
    return appointments.filter(
      (a) =>
        a.service.toLowerCase().includes(q) ||
        a.clientName.toLowerCase().includes(q)
    );
  }, [appointments, search]);

  /* ── CRUD handlers ───────────────────────────────────────────────────── */
  const handleAdd = (data: AppointmentFormData) => {
    addAppointment(data);
    setShowAddDialog(false);
    toast.success("Programare adăugată!");
  };

  const handleEdit = (data: AppointmentFormData) => {
    if (!editTarget) return;
    updateAppointment(editTarget.id, data);
    setEditTarget(null);
    toast.success("Programare actualizată!");
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteAppointment(deleteTarget.id);
    setDeleteTarget(null);
    toast.success("Programare ștearsă.");
  };

  /* ── Connection status label ─────────────────────────────────────────── */
  const statusLabel =
    connectionStatus === "syncing"
      ? "Sincronizare"
      : connectionStatus === "offline"
      ? "Offline"
      : "Online";

  const StatusIcon =
    connectionStatus === "syncing"
      ? RefreshCw
      : connectionStatus === "offline"
      ? WifiOff
      : Wifi;

  /* ── Render ──────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-1">Statistici</h1>
          <p className="text-muted-foreground text-sm">
            Date în timp real din programările tale
          </p>
          <div className="mt-2 flex items-center gap-2 text-xs">
            <span
              className={`flex items-center gap-1 rounded-full px-2.5 py-1 font-medium ${
                connectionStatus === "online"
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                  : connectionStatus === "syncing"
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              <StatusIcon size={11} className={connectionStatus === "syncing" ? "animate-spin" : ""} />
              {statusLabel}
            </span>
            {pendingChangesCount > 0 && (
              <span className="text-muted-foreground">{pendingChangesCount} modificări în așteptare</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {generatorRunning && (
            <span className="flex items-center gap-1.5 text-xs font-medium text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-full px-2.5 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-yellow-500 animate-pulse" />
              Faker activ
            </span>
          )}
          {generatorRunning ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleGeneratorToggle}
              disabled={isGeneratorToggling}
              className="border-yellow-500 text-yellow-600 dark:border-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 gap-1.5"
            >
              {isGeneratorToggling ? <Loader2 size={14} className="animate-spin" /> : <ZapOff size={14} />}
              Stop Faker
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleGeneratorToggle}
              disabled={isGeneratorToggling}
              className="border-border text-muted-foreground hover:text-foreground gap-1.5"
            >
              {isGeneratorToggling ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
              Start Faker
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={refreshAppointments}
            disabled={isLoading}
            className="text-muted-foreground hover:text-foreground border border-border"
            aria-label="Reîncarcă datele"
          >
            <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
          </Button>
          <Button
            onClick={() => setShowAddDialog(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-2"
          >
            <Plus size={16} />
            Adaugă
          </Button>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total", value: stats.total, color: "text-foreground" },
          { label: "Viitoare", value: stats.upcoming, color: "text-blue-600 dark:text-blue-400" },
          { label: "Finalizate", value: stats.byStatus.find((s) => s.name === "Finalizate")?.value ?? 0, color: "text-emerald-600 dark:text-emerald-400" },
          { label: "Anulate", value: stats.byStatus.find((s) => s.name === "Anulate")?.value ?? 0, color: "text-red-600 dark:text-red-400" },
        ].map((kpi) => (
          <Card key={kpi.label} className="bg-card border-border">
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
              <p className="text-muted-foreground text-xs mt-0.5">{kpi.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── SIDE-BY-SIDE: Charts (left) + Table (right) ──────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* LEFT — Charts */}
        <div className="space-y-6">
          {/* Bar chart: appointments by month */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-foreground text-sm flex items-center gap-2">
                <BarChart2 size={16} className="text-blue-400" />
                Programări pe luni
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.byMonth.length === 0 ? (
                <p className="text-gray-600 text-xs py-8 text-center">Fără date disponibile</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={stats.byMonth} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                    <XAxis dataKey="month" tick={{ fill: tickColor, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: tickColor, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip {...tooltipStyle} />
                    <Bar dataKey="consultatii" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Programări" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Two pies: status + service */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-foreground text-sm">Pe status</CardTitle>
              </CardHeader>
              <CardContent>
                {stats.byStatus.every((s) => s.value === 0) ? (
                  <p className="text-muted-foreground text-xs py-6 text-center">Fără date</p>
                ) : (
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie
                        data={stats.byStatus.filter((s) => s.value > 0)}
                        cx="50%"
                        cy="50%"
                        innerRadius={36}
                        outerRadius={60}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {stats.byStatus.filter((s) => s.value > 0).map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip {...tooltipStyle} />
                      <Legend
                        iconType="circle"
                        iconSize={8}
                        formatter={(v) => <span style={{ color: tickColor, fontSize: 10 }}>{v}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-foreground text-sm">Pe serviciu</CardTitle>
              </CardHeader>
              <CardContent>
                {stats.byService.length === 0 ? (
                  <p className="text-muted-foreground text-xs py-6 text-center">Fără date</p>
                ) : (
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie
                        data={stats.byService}
                        cx="50%"
                        cy="50%"
                        innerRadius={36}
                        outerRadius={60}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {stats.byService.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip {...tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* RIGHT — Appointments table with CRUD */}
        <Card className="bg-card border-border flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-foreground text-sm flex items-center gap-2">
                <Zap size={15} className="text-yellow-400" />
                Programări (actualizare live)
              </CardTitle>
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Caută..."
                  className="pl-7 bg-background border-border text-foreground placeholder:text-muted-foreground text-xs h-8 w-44"
                />
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0 flex-1 flex flex-col overflow-hidden">
            <div className="overflow-y-auto max-h-[560px]">
              {filteredRows.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-sm">
                  {search ? "Niciun rezultat" : "Nicio programare"}
                </div>
              ) : (
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-muted/60 z-10">
                    <tr className="border-b border-border">
                      <th className="text-left py-2.5 px-3 text-muted-foreground font-medium uppercase tracking-wider">Serviciu</th>
                      <th className="text-left py-2.5 px-3 text-muted-foreground font-medium uppercase tracking-wider">Data</th>
                      <th className="text-left py-2.5 px-3 text-muted-foreground font-medium uppercase tracking-wider">Status</th>
                      <th className="text-right py-2.5 px-3 text-muted-foreground font-medium uppercase tracking-wider">Acțiuni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((appt) => (
                      <tr
                        key={appt.id}
                        className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                      >
                        <td className="py-2.5 px-3">
                          <p className="text-foreground font-medium line-clamp-1 max-w-[180px]">{appt.service}</p>
                          <p className="text-muted-foreground mt-0.5">{appt.clientName}</p>
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">{formatDate(appt.date)}</td>
                        <td className="py-2.5 px-3">
                          <StatusBadge status={appt.status} />
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setEditTarget(appt)}
                              aria-label={`Editează ${appt.service}`}
                              className="p-1.5 rounded text-muted-foreground hover:text-amber-600 dark:hover:text-yellow-400 hover:bg-amber-100 dark:hover:bg-yellow-900/20 transition-colors"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(appt)}
                              aria-label={`Șterge ${appt.service}`}
                              className="p-1.5 rounded text-muted-foreground hover:text-red-600 dark:hover:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <Plus size={18} className="text-blue-400" />
              Programare Nouă
            </DialogTitle>
          </DialogHeader>
          <AppointmentForm isNew onSubmit={handleAdd} onCancel={() => setShowAddDialog(false)} />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
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

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Ștergi această programare?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              <strong className="text-foreground/80">{deleteTarget?.service}</strong> din{" "}
              {deleteTarget ? formatDate(deleteTarget.date) : ""} va fi ștearsă definitiv.
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
