import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";
import { ArrowLeft, Eye, EyeOff, LockKeyhole } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { useAuth } from "../contexts/auth-context";

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { resetPassword } = useAuth();

  const tokenFromUrl = searchParams.get("token") ?? "";

  const [formData, setFormData] = useState({
    token:           tokenFromUrl,
    newPassword:     "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading]       = useState(false);
  const [success, setSuccess]           = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.token.trim()) {
      toast.error("Token-ul de resetare lipsește.");
      return;
    }
    if (formData.newPassword.length < 8) {
      toast.error("Parola trebuie să aibă cel puțin 8 caractere.");
      return;
    }
    if (formData.newPassword !== formData.confirmPassword) {
      toast.error("Parolele nu coincid.");
      return;
    }

    setIsLoading(true);
    const result = await resetPassword(formData.token.trim(), formData.newPassword);
    setIsLoading(false);

    if (!result) {
      toast.error("Nu s-a putut contacta serverul. Încearcă din nou.");
      return;
    }

    // The server returns 400 for an invalid/expired token
    if ((result as { message?: string }).message?.toLowerCase().includes("invalid") ||
        (result as { message?: string }).message?.toLowerCase().includes("expirat")) {
      toast.error(result.message ?? "Token invalid sau expirat.");
      return;
    }

    toast.success("Parola a fost resetată cu succes!");
    setSuccess(true);
    setTimeout(() => navigate("/autentificare"), 2500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#080d1a] px-4">
      <div className="w-full max-w-[400px] space-y-8">

        {/* Back link */}
        <Link
          to="/autentificare"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
        >
          <ArrowLeft size={16} />
          Înapoi la autentificare
        </Link>

        {/* Heading */}
        <div className="space-y-2">
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30">
            <LockKeyhole size={22} className="text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white">Resetare parolă</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Introdu token-ul primit și alege o parolă nouă.
          </p>
        </div>

        {success ? (
          <div className="rounded-xl border border-green-200 dark:border-green-800/40 bg-green-50 dark:bg-green-900/10 px-4 py-4 space-y-2">
            <p className="text-sm text-green-700 dark:text-green-400 font-medium">
              Parola a fost resetată cu succes! Te redirecționăm…
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Token */}
            <div className="space-y-1.5">
              <Label htmlFor="token" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Token de resetare
              </Label>
              <Input
                id="token"
                name="token"
                type="text"
                required
                value={formData.token}
                onChange={handleChange}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                className="h-11 font-mono text-sm bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/25 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-transparent transition"
              />
            </div>

            {/* New password */}
            <div className="space-y-1.5">
              <Label htmlFor="newPassword" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Parolă nouă
              </Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  name="newPassword"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  value={formData.newPassword}
                  onChange={handleChange}
                  placeholder="cel puțin 8 caractere"
                  className="h-11 pr-11 bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/25 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-transparent transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Ascunde parola" : "Arată parola"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-white/30 dark:hover:text-white/60 transition-colors"
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {/* Confirm password */}
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Confirmă parola
              </Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="new-password"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="repetă parola nouă"
                className="h-11 bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/25 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-transparent transition"
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-blue-600/25 transition-all disabled:opacity-70"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Se resetează…
                </span>
              ) : (
                "Resetează parola"
              )}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
