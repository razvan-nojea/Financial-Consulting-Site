import { createBrowserRouter } from "react-router";
import { RootLayout } from "./components/layouts/root-layout";
import { HomePage } from "./pages/home-page";
import { AboutPage } from "./pages/about-page";
import { ServicesPage } from "./pages/services-page";
import { ContactPage } from "./pages/contact-page";
import { LoginPage } from "./pages/login-page";
import { SignupPage } from "./pages/signup-page";
import { DashboardLayout } from "./components/layouts/dashboard-layout";
import { AccountOverview } from "./pages/account-overview";
import { AccountSettings } from "./pages/account-settings";
import { AppointmentsPage } from "./pages/appointments-page";
import { AppointmentDetailPage } from "./pages/appointment-detail-page";
import { FinancialHealthPage } from "./pages/financial-health-page";
import { PrivacyPolicyPage } from "./pages/privacy-policy-page";
import { TermsPage } from "./pages/terms-page";
import { DisclaimerPage } from "./pages/disclaimer-page";
import { ProtectedRoute, AdminRoute } from "./components/protected-route";
import { StatisticsPage } from "./pages/statistics-page";
import { AdminPage } from "./pages/admin-page";
import { ForgotPasswordPage } from "./pages/forgot-password-page";
import { ResetPasswordPage } from "./pages/reset-password-page";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: RootLayout,
    children: [
      { index: true, Component: HomePage },
      { path: "despre", Component: AboutPage },
      { path: "servicii", Component: ServicesPage },
      { path: "contact", Component: ContactPage },
      { path: "autentificare", Component: LoginPage },
      { path: "inregistrare", Component: SignupPage },
      { path: "politica-confidentialitate", Component: PrivacyPolicyPage },
      { path: "termeni-conditii", Component: TermsPage },
      { path: "disclaimer", Component: DisclaimerPage },
      { path: "parola-uitata", Component: ForgotPasswordPage },
      { path: "resetare-parola", Component: ResetPasswordPage },
    ],
  },
  {
    path: "/cont",
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, Component: AccountOverview },
      { path: "setari", Component: AccountSettings },
      { path: "programari", Component: AppointmentsPage },
      { path: "programari/:id", Component: AppointmentDetailPage },
      { path: "sanatate-financiara", Component: FinancialHealthPage },
      { path: "statistici", Component: StatisticsPage },
      {
        path: "admin",
        element: (
          <AdminRoute>
            <AdminPage />
          </AdminRoute>
        ),
      },
    ],
  },
]);
