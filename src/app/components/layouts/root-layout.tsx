import { Outlet, Link, useLocation } from "react-router";
import { Button } from "../ui/button";
import { Menu, X, User, LogOut, Moon, Sun } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/auth-context";
import { useTheme } from "../../contexts/theme-context";
import { useActivityCookies } from "../../hooks/use-activity-cookies";

function ScrollToTop() {
  const { pathname } = useLocation();
  const { trackPageVisit } = useActivityCookies();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    trackPageVisit(pathname);
  }, [pathname]);
  return null;
}

export function RootLayout() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isAuthenticated, user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const navigation = [
    { name: "Acasă", href: "/" },
    { name: "Despre", href: "/despre" },
    { name: "Servicii", href: "/servicii" },
    { name: "Contact", href: "/contact" },
  ];

  const isActive = (path: string) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  const handleLogout = () => {
    logout();
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#0f0f0f]">
      <ScrollToTop />
      {/* Header */}
      <header className="bg-white dark:bg-[#1a1a1a] border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">RN</span>
              </div>
              <div className="hidden sm:block">
                <div className="font-semibold text-gray-900 dark:text-gray-100">Răzvan-Ionuț Nojea</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Consultant Financiar</div>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive(item.href)
                      ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </div>

            {/* Auth Buttons */}
            <div className="hidden md:flex items-center space-x-3">
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Toggle theme"
              >
                {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
              </button>
              
              {isAuthenticated ? (
                <>
                  <Link to="/cont">
                    <Button variant="ghost" className="flex items-center space-x-2">
                      <User size={20} />
                      <span>{user?.name}</span>
                    </Button>
                  </Link>
                  <Button variant="ghost" onClick={handleLogout}>
                    <LogOut size={20} />
                  </Button>
                </>
              ) : (
                <>
                  <Link to="/autentificare">
                    <Button variant="ghost">Autentificare</Button>
                  </Link>
                  <Link to="/inregistrare">
                    <Button>Înregistrare</Button>
                  </Link>
                </>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1a1a1a]">
              <div className="flex flex-col space-y-2">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`px-4 py-2 rounded-md text-sm font-medium ${
                      isActive(item.href)
                        ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                    }`}
                  >
                    {item.name}
                  </Link>
                ))}
                <div className="pt-4 border-t border-gray-200 dark:border-gray-800 flex flex-col space-y-2">
                  {/* Theme Toggle for Mobile */}
                  <button
                    onClick={toggleTheme}
                    className="flex items-center space-x-2 px-4 py-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
                    <span className="text-sm">{theme === "dark" ? "Mod Luminos" : "Mod Întunecat"}</span>
                  </button>
                  
                  {isAuthenticated ? (
                    <>
                      <div className="flex items-center space-x-2 px-4 py-2">
                        <User size={20} className="text-gray-700 dark:text-gray-300" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{user?.name}</span>
                      </div>
                      <Button variant="ghost" onClick={handleLogout} className="w-full justify-start">
                        <LogOut size={20} className="mr-2" />
                        Deconectare
                      </Button>
                    </>
                  ) : (
                    <>
                      <Link to="/autentificare" onClick={() => setMobileMenuOpen(false)}>
                        <Button variant="ghost" className="w-full">
                          Autentificare
                        </Button>
                      </Link>
                      <Link to="/inregistrare" onClick={() => setMobileMenuOpen(false)}>
                        <Button className="w-full">Înregistrare</Button>
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xl">RN</span>
                </div>
                <div>
                  <div className="font-semibold">Răzvan-Ionuț Nojea</div>
                  <div className="text-sm text-gray-400">Consultant Financiar</div>
                </div>
              </div>
              <p className="text-gray-400 text-sm max-w-md">
                Oferim consultanță financiară gratuită pentru a vă ajuta să vă atingeți obiectivele
                financiare și să construiți un viitor sigur.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Navigare</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <Link to="/" className="hover:text-white transition-colors">
                    Acasă
                  </Link>
                </li>
                <li>
                  <Link to="/despre" className="hover:text-white transition-colors">
                    Despre
                  </Link>
                </li>
                <li>
                  <Link to="/servicii" className="hover:text-white transition-colors">
                    Servicii
                  </Link>
                </li>
                <li>
                  <Link to="/contact" className="hover:text-white transition-colors">
                    Contact
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Legal</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <Link
                    to="/politica-confidentialitate"
                    className="hover:text-white transition-colors"
                  >
                    Politica de Confidențialitate
                  </Link>
                </li>
                <li>
                  <Link to="/termeni-conditii" className="hover:text-white transition-colors">
                    Termeni și Condiții
                  </Link>
                </li>
                <li>
                  <Link to="/disclaimer" className="hover:text-white transition-colors">
                    Disclaimer
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-gray-800 text-center text-sm text-gray-400">
            <p>&copy; {new Date().getFullYear()} Răzvan-Ionuț Nojea. Toate drepturile rezervate.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}