import React, { useState } from "react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import { Eye, EyeOff, TrendingUp, Shield, Clock, ArrowRight } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { useAuth } from "../contexts/auth-context";

// ── Decorative metric card shown on the left panel ──────────────────────────
function MetricCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm px-5 py-4">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-blue-200/60">{label}</p>
      <p className={`mt-1 text-2xl font-black ${accent}`}>{value}</p>
      <p className="mt-0.5 text-xs text-white/40">{sub}</p>
    </div>
  );
}

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Small artificial delay so the loading state is visible
    await new Promise((r) => setTimeout(r, 300));
    const result = login(formData.email, formData.password);
    setIsLoading(false);
    if (!result.success) {
      toast.error(result.message ?? "Autentificarea a eșuat.");
      return;
    }
    toast.success("Autentificare reușită!");
    navigate("/cont");
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen flex">

      {/* ── LEFT — immersive dark panel ───────────────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-[48%] flex-col relative overflow-hidden"
        style={{ background: "linear-gradient(160deg,#06102a 0%,#0d1f4e 40%,#112560 70%,#060e25 100%)" }}
      >
        {/* Layered glows */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-40 left-0 h-[500px] w-[500px] rounded-full bg-blue-600/20 blur-[120px]" />
          <div className="absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-indigo-500/15 blur-[100px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-64 rounded-full bg-cyan-400/10 blur-[80px]" />
        </div>
        {/* Subtle grid texture */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,.6) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.6) 1px,transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        {/* Logo */}
        <div className="relative px-10 pt-10">
          <Link to="/" className="inline-flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center backdrop-blur-sm group-hover:bg-blue-500/30 transition-colors">
              <span className="text-white font-black text-sm">RN</span>
            </div>
            <div>
              <p className="font-bold text-white text-sm leading-tight">Răzvan-Ionuț Nojea</p>
              <p className="text-blue-300/60 text-xs">Consultant Financiar</p>
            </div>
          </Link>
        </div>

        {/* Central copy */}
        <div className="relative flex-1 flex flex-col justify-center px-10 py-10 space-y-8">
          <div className="space-y-4">
            <span className="inline-block text-xs font-bold uppercase tracking-[0.3em] text-blue-300/70">
              Platformă de consultanță
            </span>
            <h1 className="text-[2.6rem] font-black leading-[1.08] text-white xl:text-5xl">
              Bun revenit<br />
              <span className="text-blue-400">în contul tău.</span>
            </h1>
            <p className="text-base text-white/50 leading-7 max-w-[340px]">
              Accesează programările, urmărește planul financiar și gestionează-ți
              consultațiile — totul într-un singur loc.
            </p>
          </div>

          {/* Metric cards */}
          <div className="grid grid-cols-2 gap-3">
            <MetricCard label="Consultații" value="1 la 1" sub="Personalizate" accent="text-white" />
            <MetricCard label="Disponibilitate" value="100%" sub="Gratuit" accent="text-blue-300" />
            <MetricCard label="Plan personal" value="Adaptat" sub="Situației tale" accent="text-white" />
            <MetricCard label="Programare" value="Online" sub="În câteva minute" accent="text-cyan-300" />
          </div>

          {/* Trust strip */}
          <div className="flex items-center gap-6 pt-2 border-t border-white/8">
            {[
              { icon: Shield, text: "Date securizate" },
              { icon: Clock, text: "Acces instant" },
              { icon: TrendingUp, text: "Progres vizibil" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2 text-xs text-white/40">
                <Icon size={13} className="text-blue-400/70" />
                {text}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="relative px-10 pb-8 text-xs text-white/20">
          © {new Date().getFullYear()} Răzvan-Ionuț Nojea — Consultant Financiar
        </p>
      </div>

      {/* ── RIGHT — form panel ─────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col bg-white dark:bg-[#080d1a]">

        {/* Top bar on mobile */}
        <div className="lg:hidden flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-white/8">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="text-white font-black text-xs">RN</span>
            </div>
            <span className="text-sm font-bold text-gray-900 dark:text-white">Consultant Financiar</span>
          </Link>
          <Link to="/inregistrare" className="text-xs font-semibold text-blue-600 dark:text-blue-400">
            Cont nou
          </Link>
        </div>

        {/* Form centred */}
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 sm:px-10">
          <div className="w-full max-w-[400px] space-y-8">

            {/* Heading */}
            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-blue-600 dark:text-blue-400">
                Autentificare
              </p>
              <h2 className="text-3xl font-black text-gray-900 dark:text-white">
                Intră în cont
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Nu ai cont?{" "}
                <Link
                  to="/inregistrare"
                  className="font-semibold text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Înregistrează-te gratuit
                </Link>
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Adresă email
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="email@exemplu.ro"
                  className="h-11 bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/25 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-transparent transition"
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Parolă
                  </Label>
                  <Link
                    to="/parola-uitata"
                    className="text-xs text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-colors"
                  >
                    Ai uitat parola?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="h-11 pr-11 bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/25 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-transparent transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-white/30 dark:hover:text-white/60 transition-colors"
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-blue-600/25 transition-all gap-2 disabled:opacity-70"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Se conectează…
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Autentifică-te
                    <ArrowRight size={16} />
                  </span>
                )}
              </Button>
            </form>

            {/* Demo hint */}
            <div className="rounded-xl border border-gray-100 dark:border-white/8 bg-gray-50 dark:bg-white/4 px-4 py-3.5 space-y-1.5">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400 dark:text-gray-600">
                Conturi demo
              </p>
              <div className="space-y-1">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  <span className="font-semibold text-gray-700 dark:text-gray-300">Utilizator:</span>{" "}
                  demo@exemplu.ro / demo123
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  <span className="font-semibold text-gray-700 dark:text-gray-300">Admin:</span>{" "}
                  admin@exemplu.ro / admin123
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
