import React, { useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { ArrowLeft, Mail, KeyRound } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { useAuth } from "../contexts/auth-context";

export function ForgotPasswordPage() {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setIsLoading(true);
    const result = await forgotPassword(email.trim());
    setIsLoading(false);

    if (!result) {
      toast.error("Nu s-a putut contacta serverul. Încearcă din nou.");
      return;
    }

    setSubmitted(true);

    // In production this token would arrive by email.
    // For the assignment demo we display it directly.
    if (result.resetToken) {
      setResetToken(result.resetToken);
      toast.info("Token de resetare generat (demo).");
    } else {
      toast.success(result.message ?? "Email trimis dacă adresa există.");
    }
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
            <KeyRound size={22} className="text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white">Parolă uitată</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Introdu emailul contului și îți trimitem un link de resetare.
          </p>
        </div>

        {!submitted ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Adresă email
              </Label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@exemplu.ro"
                  className="h-11 pl-9 bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/25 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-transparent transition"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-blue-600/25 transition-all disabled:opacity-70"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Se trimite…
                </span>
              ) : (
                "Trimite link de resetare"
              )}
            </Button>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-green-200 dark:border-green-800/40 bg-green-50 dark:bg-green-900/10 px-4 py-4">
              <p className="text-sm text-green-700 dark:text-green-400 font-medium">
                Dacă emailul există în sistem, vei primi instrucțiunile de resetare.
              </p>
            </div>

            {/* Demo only: show the token so students can test the reset flow */}
            {resetToken && (
              <div className="rounded-xl border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-900/10 px-4 py-4 space-y-2">
                <p className="text-xs font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                  Token demo (nu apare în producție)
                </p>
                <code className="block text-xs break-all text-amber-800 dark:text-amber-300 font-mono">
                  {resetToken}
                </code>
                <Link
                  to={`/resetare-parola?token=${resetToken}`}
                  className="inline-block text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  → Resetează parola acum
                </Link>
              </div>
            )}

            <Link
              to="/autentificare"
              className="block text-center text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              Înapoi la autentificare
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
