import React, { useState } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Checkbox } from "../components/ui/checkbox";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import { useAuth } from "../contexts/auth-context";
import { ArrowRight, CheckCircle2, PiggyBank, TrendingUp, Users } from "lucide-react";

// ── Left-panel benefit row ───────────────────────────────────────────────────
function Benefit({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-3">
      <CheckCircle2 size={17} className="text-blue-400 flex-shrink-0 mt-0.5" />
      <span className="text-sm text-white/70 leading-relaxed">{text}</span>
    </li>
  );
}

export function SignupPage() {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    terms: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error("Parolele nu se potrivesc!");
      return;
    }
    if (!formData.terms) {
      toast.error("Trebuie să accepți termenii și condițiile!");
      return;
    }

    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 300));

    const fullName = `${formData.firstName} ${formData.lastName}`;
    const result = signup(fullName, formData.email, formData.password);
    setIsLoading(false);

    if (!result.success) {
      toast.error(result.message ?? "Contul nu a putut fi creat.");
      return;
    }

    toast.success("Cont creat cu succes! Bun venit!");
    navigate("/cont");
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  const handleTermsChange = (checked: boolean) => {
    const fakeEvent = {
      target: { name: "terms", type: "checkbox", checked },
    } as unknown as React.ChangeEvent<HTMLInputElement>;
    handleChange(fakeEvent);
  };

  const inputClass =
    "h-11 bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/25 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-transparent transition";

  return (
    <div className="min-h-screen flex">

      {/* ── LEFT — immersive panel ────────────────────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-[44%] flex-col relative overflow-hidden"
        style={{ background: "linear-gradient(155deg,#040c22 0%,#0b1940 45%,#0f2257 75%,#040b1e 100%)" }}
      >
        {/* Glows */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-0 right-0 h-[450px] w-[450px] rounded-full bg-blue-500/20 blur-[130px]" />
          <div className="absolute bottom-0 left-0 h-[350px] w-[350px] rounded-full bg-indigo-600/15 blur-[100px]" />
        </div>
        {/* Grid */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,.7) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.7) 1px,transparent 1px)",
            backgroundSize: "44px 44px",
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
              Înregistrare gratuită
            </span>
            <h1 className="text-[2.4rem] font-black leading-[1.1] text-white xl:text-[2.8rem]">
              Începe-ți<br />
              <span className="text-blue-400">călătoria financiară.</span>
            </h1>
            <p className="text-base text-white/50 leading-7 max-w-[320px]">
              Creează un cont gratuit și primești acces complet la programări,
              planificare și consultanță personalizată.
            </p>
          </div>

          {/* Benefits */}
          <ul className="space-y-3">
            <Benefit text="Programare online în câteva minute, fără formulare complicate." />
            <Benefit text="Vizualizezi istoricul consultațiilor și statusul fiecărei programări." />
            <Benefit text="Plan financiar personalizat, adaptat situației tale reale." />
            <Benefit text="Confidențialitate garantată — datele tale nu sunt partajate." />
            <Benefit text="Acces complet gratuit, fără taxe sau abonamente ascunse." />
          </ul>

          {/* Social proof */}
          <div className="flex items-center gap-5 pt-2 border-t border-white/8">
            {[
              { icon: Users, text: "Conturi active" },
              { icon: TrendingUp, text: "Planuri create" },
              { icon: PiggyBank, text: "Consultații gratuite" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2 text-xs text-white/35">
                <Icon size={13} className="text-blue-400/60" />
                {text}
              </div>
            ))}
          </div>
        </div>

        <p className="relative px-10 pb-8 text-xs text-white/20">
          © {new Date().getFullYear()} Răzvan-Ionuț Nojea — Consultant Financiar
        </p>
      </div>

      {/* ── RIGHT — form panel ────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col bg-white dark:bg-[#080d1a]">

        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-white/8">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="text-white font-black text-xs">RN</span>
            </div>
            <span className="text-sm font-bold text-gray-900 dark:text-white">Consultant Financiar</span>
          </Link>
          <Link to="/autentificare" className="text-xs font-semibold text-blue-600 dark:text-blue-400">
            Autentificare
          </Link>
        </div>

        {/* Scrollable form area */}
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 sm:px-10 overflow-y-auto">
          <div className="w-full max-w-[420px] space-y-7">

            {/* Heading */}
            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-blue-600 dark:text-blue-400">
                Cont nou
              </p>
              <h2 className="text-3xl font-black text-gray-900 dark:text-white">
                Creează cont
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Ai deja cont?{" "}
                <Link
                  to="/autentificare"
                  className="font-semibold text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Autentifică-te
                </Link>
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Name row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="firstName" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Prenume
                  </Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    type="text"
                    required
                    autoComplete="given-name"
                    value={formData.firstName}
                    onChange={handleChange}
                    placeholder="Ion"
                    className={inputClass}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastName" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Nume
                  </Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    type="text"
                    required
                    autoComplete="family-name"
                    value={formData.lastName}
                    onChange={handleChange}
                    placeholder="Popescu"
                    className={inputClass}
                  />
                </div>
              </div>

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
                  className={inputClass}
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Parolă
                </Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="new-password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Minimum 8 caractere"
                  className={inputClass}
                />
              </div>

              {/* Confirm password */}
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Confirmă parola
                </Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  autoComplete="new-password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Repetă parola"
                  className={`${inputClass} ${
                    formData.confirmPassword && formData.password !== formData.confirmPassword
                      ? "border-red-400 dark:border-red-500 focus-visible:ring-red-400"
                      : formData.confirmPassword && formData.password === formData.confirmPassword
                      ? "border-green-400 dark:border-green-600 focus-visible:ring-green-400"
                      : ""
                  }`}
                />
                {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                  <p className="text-xs text-red-500 dark:text-red-400">Parolele nu se potrivesc.</p>
                )}
              </div>

              {/* Terms */}
              <div className="flex items-start gap-3 pt-1">
                <Checkbox
                  id="terms"
                  name="terms"
                  checked={formData.terms}
                  onCheckedChange={(checked) => handleTermsChange(checked as boolean)}
                  className="mt-0.5 border-gray-300 dark:border-white/20"
                />
                <Label htmlFor="terms" className="text-sm font-normal text-gray-600 dark:text-gray-400 cursor-pointer leading-relaxed">
                  Sunt de acord cu{" "}
                  <Link to="/termeni-conditii" className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400">
                    Termenii și Condițiile
                  </Link>{" "}
                  și{" "}
                  <Link to="/politica-confidentialitate" className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400">
                    Politica de Confidențialitate
                  </Link>
                </Label>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-blue-600/25 transition-all gap-2 mt-2 disabled:opacity-70"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Se creează contul…
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Creează cont gratuit
                    <ArrowRight size={16} />
                  </span>
                )}
              </Button>
            </form>

          </div>
        </div>
      </div>
    </div>
  );
}
