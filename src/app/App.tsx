import { RouterProvider } from "react-router";
import { router } from "./routes";
import { Toaster } from "./components/ui/sonner";
import { AuthProvider } from "./contexts/auth-context";
import { ThemeProvider } from "./contexts/theme-context";
import { AppointmentsProvider } from "./contexts/appointments-context";
import { ChatProvider } from "./contexts/chat-context";

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppointmentsProvider>
          <ChatProvider>
            <RouterProvider router={router} />
            <Toaster />
          </ChatProvider>
        </AppointmentsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
