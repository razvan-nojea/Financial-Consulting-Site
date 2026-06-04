import React from "react";
import { Calendar, CalendarCheck2, Coins, Target, TrendingUp } from "lucide-react";
import { Link } from "react-router";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { StatusBadge } from "../components/appointments/status-badge";
import { useAppointments } from "../contexts/appointments-context";
import { useAuth } from "../contexts/auth-context";

function formatCurrency(value: number) {
  return value.toLocaleString("ro-RO", {
    style: "currency",
    currency: "RON",
    maximumFractionDigits: 0,
  });
}

function formatDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("ro-RO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function AccountOverview() {
  const { user } = useAuth();
  const { appointments } = useAppointments();

  const today = new Date().toISOString().split("T")[0];
  const totalAppointments = appointments.length;
  const upcomingAppointments = appointments
    .filter((appointment) => appointment.date >= today && appointment.status !== "cancelled")
    .sort((left, right) => left.date.localeCompare(right.date))
    .slice(0, 3);
  const upcomingCount = upcomingAppointments.length;
  const completedCount = appointments.filter((appointment) => appointment.status === "completed").length;
  const cancelledCount = appointments.filter((appointment) => appointment.status === "cancelled").length;
  const investmentProgress =
    user && user.investmentGoal > 0
      ? Math.min(100, Math.round((user.totalSalary / user.investmentGoal) * 100))
      : 0;

  const stats = [
    {
      title: "Programări totale",
      value: String(totalAppointments),
      helper: `${completedCount} finalizate`,
      icon: Calendar,
      accent: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300",
    },
    {
      title: "Viitoare",
      value: String(upcomingCount),
      helper: cancelledCount > 0 ? `${cancelledCount} anulate` : "Fără anulări",
      icon: CalendarCheck2,
      accent: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300",
    },
    {
      title: "Venit declarat",
      value: formatCurrency(user?.totalSalary ?? 0),
      helper: "Actualizat din setările contului",
      icon: Coins,
      accent: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300",
    },
    {
      title: "Obiectiv investiții",
      value: formatCurrency(user?.investmentGoal ?? 0),
      helper: `${investmentProgress}% progres`,
      icon: Target,
      accent: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Bun venit, {user?.name ?? "client"}!
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          Aici vezi situația actuală a contului tău și următoarele programări.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <Card key={stat.title} className="dark:border-gray-800 dark:bg-[#1a1a1a]">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm text-gray-500 dark:text-gray-400">{stat.title}</p>
                    <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                      {stat.value}
                    </p>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{stat.helper}</p>
                  </div>
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${stat.accent}`}>
                    <Icon size={20} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="dark:border-gray-800 dark:bg-[#1a1a1a]">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle className="dark:text-white">Programări viitoare</CardTitle>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Primele consultanțe programate în contul tău.
              </p>
            </div>
            <Link to="/cont/programari">
              <Button variant="outline" className="dark:border-gray-700 dark:text-gray-200">
                Vezi toate
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {upcomingAppointments.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 px-6 py-10 text-center dark:border-gray-700">
                <Calendar className="mx-auto mb-3 text-gray-400" size={32} />
                <p className="font-medium text-gray-900 dark:text-white">Nu ai programări încă.</p>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Creează prima programare și vei vedea aici următoarele consultații.
                </p>
                <Link to="/cont/programari" className="mt-4 inline-block">
                  <Button className="bg-blue-600 text-white hover:bg-blue-500">
                    Adaugă programare
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingAppointments.map((appointment) => (
                  <Link
                    key={appointment.id}
                    to={`/cont/programari/${appointment.id}`}
                    className="block rounded-2xl border border-gray-200 p-4 transition-colors hover:border-blue-500 hover:bg-blue-50/40 dark:border-gray-800 dark:hover:border-blue-500 dark:hover:bg-blue-950/20"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {appointment.service}
                        </p>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          {appointment.clientName} · {formatDate(appointment.date)} · {appointment.time}
                        </p>
                      </div>
                      <StatusBadge status={appointment.status} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-8">
          <Card className="dark:border-gray-800 dark:bg-[#1a1a1a]">
            <CardHeader>
              <CardTitle className="dark:text-white">Profil financiar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl bg-gray-50 p-4 dark:bg-[#111111]">
                <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Venit total</p>
                <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(user?.totalSalary ?? 0)}
                </p>
              </div>
              <div className="rounded-2xl bg-gray-50 p-4 dark:bg-[#111111]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-gray-500">
                      Țintă investiții
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(user?.investmentGoal ?? 0)}
                    </p>
                  </div>
                  <TrendingUp className="text-blue-500" size={22} />
                </div>
                <div className="mt-4 h-2 rounded-full bg-gray-200 dark:bg-gray-800">
                  <div
                    className="h-2 rounded-full bg-blue-600 transition-all"
                    style={{ width: `${investmentProgress}%` }}
                  />
                </div>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Progres curent: {investmentProgress}%
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="dark:border-gray-800 dark:bg-[#1a1a1a]">
            <CardHeader>
              <CardTitle className="dark:text-white">Date personale</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4 border-b border-gray-200 pb-3 dark:border-gray-800">
                <span className="text-gray-500 dark:text-gray-400">Email</span>
                <span className="text-right text-gray-900 dark:text-white">{user?.email}</span>
              </div>
              <div className="flex items-center justify-between gap-4 border-b border-gray-200 pb-3 dark:border-gray-800">
                <span className="text-gray-500 dark:text-gray-400">Telefon</span>
                <span className="text-right text-gray-900 dark:text-white">
                  {user?.phone || "Necompletat"}
                </span>
              </div>
              <div className="space-y-2">
                <span className="text-gray-500 dark:text-gray-400">Bio</span>
                <p className="rounded-2xl bg-gray-50 p-4 text-gray-900 dark:bg-[#111111] dark:text-white">
                  {user?.bio || "Nu ai adăugat încă o descriere personală."}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
