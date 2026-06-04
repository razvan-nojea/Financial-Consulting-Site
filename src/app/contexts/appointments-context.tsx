import React, { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import {
  checkAppointmentsApiHealth,
  createAppointmentInApi,
  deleteAppointmentInApi,
  listAppointmentsFromApi,
  updateAppointmentInApi,
  startGeneratorInApi,
  stopGeneratorInApi,
} from "../api/appointments-api";
import { normalizeEmail, useAuth } from "./auth-context";

import { WS_BASE } from "../lib/api-base";

const WS_URL = WS_BASE;

export type AppointmentStatus = "confirmed" | "pending" | "completed" | "cancelled";

export interface Appointment {
  id: string;
  service: string;
  date: string;
  time: string;
  status: AppointmentStatus;
  clientName: string;
  phone: string;
  notes: string;
  createdAt: string;
  /** Set by the server when appointments are pushed via the generator. */
  ownerEmail?: string;
}

export type AppointmentFormData = Omit<Appointment, "id" | "createdAt">;
export type AppointmentsConnectionStatus = "online" | "offline" | "syncing";

export interface AppointmentErrors {
  service?: string;
  date?: string;
  time?: string;
  clientName?: string;
  phone?: string;
  notes?: string;
  status?: string;
}

export function validateAppointment(
  data: AppointmentFormData,
  isNew = true
): AppointmentErrors {
  const errors: AppointmentErrors = {};

  if (!data.service.trim()) {
    errors.service = "Serviciul este obligatoriu.";
  }

  if (!data.date) {
    errors.date = "Data este obligatorie.";
  } else if (isNew && data.date < new Date().toISOString().split("T")[0]) {
    errors.date = "Data nu poate fi în trecut.";
  }

  if (!data.time) {
    errors.time = "Ora este obligatorie.";
  }

  if (!data.clientName.trim()) {
    errors.clientName = "Numele este obligatoriu.";
  } else if (data.clientName.trim().length < 3) {
    errors.clientName = "Numele trebuie să aibă cel puțin 3 caractere.";
  }

  if (data.phone && !/^(\+4|0)[0-9]{9}$/.test(data.phone.replace(/\s/g, ""))) {
    errors.phone = "Număr invalid. Exemplu valid: 0722 123 456.";
  }

  if (data.notes.length > 500) {
    errors.notes = `Notițele depășesc limita de 500 de caractere (${data.notes.length}/500).`;
  }

  return errors;
}

const DEMO_ACCOUNT_EMAIL = "demo@exemplu.ro";
const APPOINTMENTS_STORAGE_PREFIX = "appointments:";
const APPOINTMENTS_QUEUE_PREFIX = "appointments-sync:";

const DEMO_APPOINTMENTS: Appointment[] = [
  {
    id: "1",
    service: "Consultanță Planificare Pensie",
    date: "2025-04-15",
    time: "10:00",
    status: "pending",
    clientName: "Ion Popescu",
    phone: "0722 123 456",
    notes:
      "Prima consultanță despre planificarea pensiei. Clientul dorește să înceapă un plan de economii pe termen lung.",
    createdAt: "2025-03-20",
  },
  {
    id: "2",
    service: "Revizuire Plan Financiar",
    date: "2025-04-22",
    time: "14:30",
    status: "pending",
    clientName: "Ion Popescu",
    phone: "0722 123 456",
    notes: "",
    createdAt: "2025-03-22",
  },
  {
    id: "3",
    service: "Planificare Imobiliară",
    date: "2025-05-03",
    time: "11:00",
    status: "cancelled",
    clientName: "Ion Popescu",
    phone: "0744 456 789",
    notes:
      "Discuție despre investiții imobiliare și construirea unui portofoliu diversificat.",
    createdAt: "2025-03-28",
  },
  {
    id: "4",
    service: "Coaching Bugetar",
    date: "2028-05-10",
    time: "13:00",
    status: "confirmed",
    clientName: "Ion Popescu",
    phone: "0722 123 456",
    notes:
      "Sesiune de coaching pentru gestionarea bugetului lunar și reducerea cheltuielilor neesențiale.",
    createdAt: "2028-03-30",
  },
  {
    id: "5",
    service: "Strategii de Investiții",
    date: "2028-06-01",
    time: "09:00",
    status: "pending",
    clientName: "Ion Popescu",
    phone: "",
    notes: "",
    createdAt: "2028-04-01",
  },
  {
    id: "6",
    service: "Planificare Financiară pentru Afaceri",
    date: "2028-06-15",
    time: "15:00",
    status: "pending",
    clientName: "Ion Popescu",
    phone: "0733 987 654",
    notes: "Consultanță pentru optimizarea fluxului de numerar al firmei.",
    createdAt: "2028-04-02",
  },
  {
    id: "7",
    service: "Consultanță Inițială",
    date: "2026-03-01",
    time: "10:00",
    status: "completed",
    clientName: "Ion Popescu",
    phone: "0722 123 456",
    notes: "Sesiune introductivă completată cu succes. S-au stabilit obiectivele principale.",
    createdAt: "2026-02-25",
  },
  {
    id: "8",
    service: "Analiza Datorii",
    date: "2026-02-25",
    time: "15:00",
    status: "completed",
    clientName: "Ion Popescu",
    phone: "0722 123 456",
    notes: "Analiză detaliată a datoriilor și strategii de reducere accelerată.",
    createdAt: "2026-02-20",
  },
  {
    id: "9",
    service: "Planificare Educație Copii",
    date: "2026-02-10",
    time: "09:00",
    status: "cancelled",
    clientName: "Ion Popescu",
    phone: "0722 000 111",
    notes: "Anulată de client cu 24h înainte.",
    createdAt: "2026-02-01",
  },
  {
    id: "10",
    service: "Gestionarea Datoriilor",
    date: "2026-01-20",
    time: "16:00",
    status: "completed",
    clientName: "Ion Popescu",
    phone: "0756 321 654",
    notes: "Sesiune finalizată. Plan de rambursare a datoriilor stabilit pe 18 luni.",
    createdAt: "2026-01-10",
  },
  {
    id: "11",
    service: "Planificare Pensie",
    date: "2026-01-08",
    time: "11:00",
    status: "completed",
    clientName: "Ion Popescu",
    phone: "0722 123 456",
    notes: "",
    createdAt: "2025-12-28",
  },
  {
    id: "12",
    service: "Strategii de Investiții",
    date: "2025-12-15",
    time: "14:00",
    status: "cancelled",
    clientName: "Ion Popescu",
    phone: "",
    notes: "Anulată - conflict de calendar.",
    createdAt: "2025-12-01",
  },
];

interface AppointmentsContextType {
  appointments: Appointment[];
  isLoading: boolean;
  connectionStatus: AppointmentsConnectionStatus;
  pendingChangesCount: number;
  generatorRunning: boolean;
  addAppointment: (data: AppointmentFormData) => Appointment;
  updateAppointment: (id: string, data: Partial<AppointmentFormData>) => void;
  deleteAppointment: (id: string) => void;
  getAppointment: (id: string) => Appointment | undefined;
  refreshAppointments: () => Promise<void>;
  startGenerator: (interval?: number) => Promise<void>;
  stopGenerator: () => Promise<void>;
}

const AppointmentsContext = createContext<AppointmentsContextType | undefined>(undefined);

interface SyncQueueEntry {
  type: "create" | "update" | "delete";
  appointmentId: string;
  payload?: Appointment;
  timestamp: number;
}

function cloneAppointments(appointments: Appointment[]) {
  return appointments.map((appointment) => ({ ...appointment }));
}

export function getAppointmentsStorageKey(email: string) {
  return `${APPOINTMENTS_STORAGE_PREFIX}${normalizeEmail(email)}`;
}

export function getAppointmentsQueueStorageKey(email: string) {
  return `${APPOINTMENTS_QUEUE_PREFIX}${normalizeEmail(email)}`;
}

function getSeedAppointments(email: string) {
  if (normalizeEmail(email) === DEMO_ACCOUNT_EMAIL) {
    return cloneAppointments(DEMO_APPOINTMENTS);
  }

  return [];
}

function sanitizeStoredAppointment(value: unknown): Appointment | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<Appointment>;
  if (
    typeof candidate.id !== "string" ||
    typeof candidate.service !== "string" ||
    typeof candidate.date !== "string" ||
    typeof candidate.time !== "string" ||
    typeof candidate.status !== "string" ||
    typeof candidate.clientName !== "string" ||
    typeof candidate.phone !== "string" ||
    typeof candidate.notes !== "string" ||
    typeof candidate.createdAt !== "string"
  ) {
    return null;
  }

  if (!["confirmed", "pending", "completed", "cancelled"].includes(candidate.status)) {
    return null;
  }

  return candidate as Appointment;
}

function sanitizeQueueEntry(value: unknown): SyncQueueEntry | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<SyncQueueEntry>;
  if (
    (candidate.type !== "create" && candidate.type !== "update" && candidate.type !== "delete") ||
    typeof candidate.appointmentId !== "string" ||
    typeof candidate.timestamp !== "number"
  ) {
    return null;
  }

  if (candidate.type === "delete") {
    return {
      type: candidate.type,
      appointmentId: candidate.appointmentId,
      timestamp: candidate.timestamp,
    };
  }

  const payload = sanitizeStoredAppointment(candidate.payload);
  if (!payload) {
    return null;
  }

  return {
    type: candidate.type,
    appointmentId: candidate.appointmentId,
    payload,
    timestamp: candidate.timestamp,
  };
}

function readStoredAppointments(email: string) {
  const raw = localStorage.getItem(getAppointmentsStorageKey(email));
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as unknown[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((appointment) => sanitizeStoredAppointment(appointment))
      .filter((appointment): appointment is Appointment => appointment !== null);
  } catch {
    return [];
  }
}

function writeStoredAppointments(email: string, appointments: Appointment[]) {
  localStorage.setItem(
    getAppointmentsStorageKey(email),
    JSON.stringify(appointments)
  );
}

function readStoredQueue(email: string) {
  const raw = localStorage.getItem(getAppointmentsQueueStorageKey(email));
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((entry) => sanitizeQueueEntry(entry))
      .filter((entry): entry is SyncQueueEntry => entry !== null);
  } catch {
    return [];
  }
}

function writeStoredQueue(email: string, queue: SyncQueueEntry[]) {
  localStorage.setItem(getAppointmentsQueueStorageKey(email), JSON.stringify(queue));
}

function cloneAppointment(appointment: Appointment) {
  return { ...appointment };
}

export function AppointmentsProvider({ children }: { children: ReactNode }) {
  const { user, updateUser } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<AppointmentsConnectionStatus>(
    typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "online"
  );
  const [pendingChangesCount, setPendingChangesCount] = useState(0);
  const [generatorRunning, setGeneratorRunning] = useState(false);
  const appointmentsRef = useRef<Appointment[]>([]);
  const queueRef = useRef<SyncQueueEntry[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  function commitAppointments(email: string, nextAppointments: Appointment[]) {
    appointmentsRef.current = nextAppointments;
    setAppointments(nextAppointments);
    writeStoredAppointments(email, nextAppointments);
  }

  function commitQueue(email: string, nextQueue: SyncQueueEntry[]) {
    queueRef.current = nextQueue;
    setPendingChangesCount(nextQueue.length);
    writeStoredQueue(email, nextQueue);
  }

  function setOfflineState() {
    setConnectionStatus("offline");
  }

  async function synchronizeWithServer(activeEmail: string, fetchRemote = true) {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setOfflineState();
      return;
    }

    setConnectionStatus("syncing");

    try {
      await checkAppointmentsApiHealth();

      let nextQueue = [...queueRef.current];
      while (nextQueue.length > 0) {
        const [entry, ...rest] = nextQueue;

        if (entry.type === "create" && entry.payload) {
          await createAppointmentInApi(activeEmail, entry.payload);
        } else if (entry.type === "update" && entry.payload) {
          await updateAppointmentInApi(activeEmail, entry.payload);
        } else if (entry.type === "delete") {
          await deleteAppointmentInApi(activeEmail, entry.appointmentId);
        }

        nextQueue = rest;
        commitQueue(activeEmail, nextQueue);
      }

      if (fetchRemote) {
        const remote = await listAppointmentsFromApi(activeEmail);
        commitAppointments(activeEmail, remote.items.map((appointment) => cloneAppointment(appointment)));
      }
      setConnectionStatus("online");
    } catch {
      setOfflineState();
    }
  }

  function queueChange(activeEmail: string, entry: SyncQueueEntry) {
    commitQueue(activeEmail, [...queueRef.current, entry]);

    if (typeof navigator === "undefined" || navigator.onLine) {
      void synchronizeWithServer(activeEmail, false);
    }
  }

  useEffect(() => {
    if (!user) {
      setAppointments([]);
      appointmentsRef.current = [];
      queueRef.current = [];
      setPendingChangesCount(0);
      setIsInitialized(false);
      setIsLoading(false);
      return;
    }

    const storedAppointments = readStoredAppointments(user.email);
    const nextAppointments =
      storedAppointments === null ? getSeedAppointments(user.email) : storedAppointments;
    const nextQueue = readStoredQueue(user.email);

    setIsLoading(true);
    commitAppointments(user.email, nextAppointments);
    commitQueue(user.email, nextQueue);
    setIsInitialized(true);
    void synchronizeWithServer(user.email).finally(() => {
      setIsLoading(false);
    });
  }, [user?.email]);

  useEffect(() => {
    if (!user || !isInitialized) {
      return;
    }

    writeStoredAppointments(user.email, appointments);

    if (user.appointmentCount !== appointments.length) {
      updateUser({
        ...user,
        appointmentCount: appointments.length,
      });
    }
  }, [appointments, isInitialized, updateUser, user]);

  useEffect(() => {
    const activeEmail = user?.email;

    const handleOnline = () => {
      if (!activeEmail) {
        setConnectionStatus("online");
        return;
      }

      void synchronizeWithServer(activeEmail);
    };

    const handleOffline = () => {
      setOfflineState();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [user?.email]);

  /* ── WebSocket: receive generator-pushed appointments ─────────────────── */
  const connectWebSocket = useCallback((activeEmail: string) => {
    if (wsRef.current && wsRef.current.readyState < 2) return;

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string) as { type: string; data: unknown };
          if (msg.type === "new-appointment") {
            const apt = msg.data as Appointment;
            if (apt.ownerEmail === normalizeEmail(activeEmail)) {
              appointmentsRef.current = [apt, ...appointmentsRef.current];
              setAppointments([...appointmentsRef.current]);
              writeStoredAppointments(activeEmail, appointmentsRef.current);
            }
          }
          if (msg.type === "generator-stopped") {
            setGeneratorRunning(false);
          }
        } catch {
          // ignore malformed messages
        }
      };

      ws.onerror = () => {};
      ws.onclose = () => {
        // reconnect after 3 s if user still logged in
        setTimeout(() => {
          if (activeEmail) connectWebSocket(activeEmail);
        }, 3000);
      };
    } catch {
      // WebSocket not available (test env, etc.)
    }
  }, []);

  useEffect(() => {
    if (!user) {
      /* v8 ignore next */
      wsRef.current?.close();
      wsRef.current = null;
      setGeneratorRunning(false);
      return;
    }

    connectWebSocket(user.email);

    return () => {
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [user?.email, connectWebSocket]);

  const addAppointment = (data: AppointmentFormData): Appointment => {
    const newAppointment: Appointment = {
      ...data,
      id: Date.now().toString(),
      createdAt: new Date().toISOString().split("T")[0],
    };

    if (!user) {
      return newAppointment;
    }

    commitAppointments(user.email, [newAppointment, ...appointmentsRef.current]);
    queueChange(user.email, {
      type: "create",
      appointmentId: newAppointment.id,
      payload: newAppointment,
      timestamp: Date.now(),
    });
    return newAppointment;
  };

  const updateAppointment = (id: string, data: Partial<AppointmentFormData>) => {
    if (!user) {
      return;
    }

    const nextAppointments = appointmentsRef.current.map((appointment) => {
      return appointment.id === id ? { ...appointment, ...data } : appointment;
    });
    const target = nextAppointments.find((appointment) => appointment.id === id);

    commitAppointments(user.email, nextAppointments);

    if (target) {
      queueChange(user.email, {
        type: "update",
        appointmentId: id,
        payload: target,
        timestamp: Date.now(),
      });
    }
  };

  const deleteAppointment = (id: string) => {
    if (!user) {
      return;
    }

    commitAppointments(
      user.email,
      appointmentsRef.current.filter((appointment) => appointment.id !== id)
    );
    queueChange(user.email, {
      type: "delete",
      appointmentId: id,
      timestamp: Date.now(),
    });
  };

  const getAppointment = (id: string) => {
    return appointments.find((appointment) => appointment.id === id);
  };

  const refreshAppointments = async () => {
    if (!user) {
      return;
    }

    setIsLoading(true);
    await synchronizeWithServer(user.email);
    setIsLoading(false);
  };

  const startGenerator = async (interval = 3000) => {
    if (!user) return;
    await startGeneratorInApi(user.email, interval);
    setGeneratorRunning(true);
  };

  const stopGenerator = async () => {
    if (!user) return;
    await stopGeneratorInApi(user.email);
    setGeneratorRunning(false);
  };

  return (
    <AppointmentsContext.Provider
      value={{
        appointments,
        isLoading,
        connectionStatus,
        pendingChangesCount,
        generatorRunning,
        addAppointment,
        updateAppointment,
        deleteAppointment,
        getAppointment,
        refreshAppointments,
        startGenerator,
        stopGenerator,
      }}
    >
      {children}
    </AppointmentsContext.Provider>
  );
}

export function useAppointments() {
  const context = useContext(AppointmentsContext);
  if (!context) {
    throw new Error("useAppointments must be used within AppointmentsProvider");
  }

  return context;
}
