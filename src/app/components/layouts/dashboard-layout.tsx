import { Outlet, Link, useLocation, useNavigate } from "react-router";
import { Button } from "../ui/button";
import {
  LayoutDashboard,
  Calendar,
  Settings,
  LogOut,
  Menu,
  X,
  User,
  Activity,
  Moon,
  Sun,
  BarChart2,
  ShieldAlert,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/auth-context";
import { useTheme } from "../../contexts/theme-context";
import { ChatWindow } from "../chat/chat-window";

const BASE_NAVIGATION = [
  { name: "Cont", href: "/cont", icon: LayoutDashboard, exact: true, adminOnly: false },
  { name: "Programări", href: "/cont/programari", icon: Calendar, exact: false, adminOnly: false },
  { name: "Sănătate Financiară", href: "/cont/sanatate-financiara", icon: Activity, exact: false, adminOnly: false },
  { name: "Statistici", href: "/cont/statistici", icon: BarChart2, exact: false, adminOnly: false },
  { name: "Setări", href: "/cont/setari", icon: Settings, exact: false, adminOnly: false },
  { name: "Administrare", href: "/cont/admin", icon: ShieldAlert, exact: false, adminOnly: true },
];

function isActive(href: string, exact: boolean, pathname: string): boolean {
  return exact ? pathname === href : pathname.startsWith(href);
}

export function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation = BASE_NAVIGATION.filter((item) => !item.adminOnly || user?.role === "admin");

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const navLinkClass = (href: string, exact: boolean) =>
    `flex items-center space-x-3 px-4 py-3 rounded-md text-sm font-medium transition-colors ${
      isActive(href, exact, location.pathname)
        ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
    }`;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0f0f0f]">

      {/* ── Top Header ─────────────────────────────────────────────────── */}
      <header className="bg-white dark:bg-[#1a1a1a] border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">

            <Link to="/" className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">RN</span>
              </div>
              <div className="hidden sm:block">
                <div className="font-semibold text-gray-900 dark:text-gray-100">
                  Răzvan-Ionuț Nojea
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Consultant Financiar
                </div>
              </div>
            </Link>

            <div className="flex items-center space-x-4">
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="hidden md:flex p-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Schimbă tema"
              >
                {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
              </button>

              {/* User pill */}
              <div className="hidden md:flex items-center space-x-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <User size={20} className="text-gray-600 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {user?.name}
                </span>
              </div>

              {/* Logout */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="hidden md:flex items-center space-x-2"
              >
                <LogOut size={16} />
                <span>Deconectare</span>
              </Button>

              {/* Mobile hamburger */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label="Meniu"
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row gap-8">

          {/* ── Desktop Sidebar ───────────────────────────────────────── */}
          <aside className="hidden md:block w-64 flex-shrink-0">
            <nav className="space-y-1 bg-white dark:bg-[#1a1a1a] rounded-lg border border-gray-200 dark:border-gray-800 p-2 sticky top-24">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={navLinkClass(item.href, item.exact)}
                  >
                    <Icon size={20} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </aside>

          {/* ── Mobile Menu ───────────────────────────────────────────── */}
          {mobileMenuOpen && (
            <div className="md:hidden mb-4">
              <nav className="space-y-1 bg-white dark:bg-[#1a1a1a] rounded-lg border border-gray-200 dark:border-gray-800 p-2">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={navLinkClass(item.href, item.exact)}
                    >
                      <Icon size={20} />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
                <Button
                  variant="ghost"
                  onClick={handleLogout}
                  className="w-full justify-start space-x-3 px-4 py-3"
                >
                  <LogOut size={20} />
                  <span>Deconectare</span>
                </Button>
              </nav>
            </div>
          )}

          {/* ── Main Content ──────────────────────────────────────────── */}
          <main className="flex-1 min-w-0">
            <Outlet />
          </main>
        </div>
      </div>

      {/* ── Floating Chat ─────────────────────────────────────────── */}
      <ChatWindow />
    </div>
  );
}
