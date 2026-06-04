import type { Appointment } from "../contexts/appointments-context";
import { API_BASE } from "../lib/api-base";
import { getSessionId, ACCESS_TOKEN_KEY } from "./auth-api";

interface AppointmentListResponse {
  items: Appointment[];
}

interface AppointmentItemResponse {
  data: Appointment;
}

export class AppointmentsApiError extends Error {
  statusCode: number;
  details: unknown;

  constructor(message: string, statusCode: number, details?: unknown) {
    super(message);
    this.name = "AppointmentsApiError";
    this.statusCode = statusCode;
    this.details = details;
  }
}

async function parseResponse(response: Response) {
  const text = await response.text();
  return text ? JSON.parse(text) : {};
}

async function request<T>(path: string, email: string, init?: RequestInit): Promise<T> {
  let response: Response;

  const sessionId   = getSessionId();
  const accessToken = sessionStorage.getItem(ACCESS_TOKEN_KEY);

  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...(init?.headers ?? {}),
        "x-user-email": email,
        // Send Bearer JWT so resolveSession can identify the user even when the
        // session-store entry isn't ready yet (loginToServer still in-flight).
        ...(accessToken ? { "Authorization": `Bearer ${accessToken}` } : {}),
        ...(sessionId   ? { "x-session-id": sessionId }               : {}),
      },
    });
  } catch (error) {
    throw new AppointmentsApiError("Serverul nu poate fi contactat momentan.", 0, error);
  }

  const payload = await parseResponse(response);
  if (!response.ok) {
    throw new AppointmentsApiError(
      typeof payload.message === "string" ? payload.message : "Cererea catre server a esuat.",
      response.status,
      payload
    );
  }

  return payload as T;
}

export async function checkAppointmentsApiHealth() {
  return request<{ status: string }>("/api/health", "healthcheck@local");
}

export async function listAppointmentsFromApi(email: string) {
  return request<AppointmentListResponse>("/api/appointments?page=1&pageSize=100", email);
}

export async function getAppointmentFromApi(email: string, id: string) {
  return request<AppointmentItemResponse>(`/api/appointments/${id}`, email);
}

export async function createAppointmentInApi(email: string, appointment: Appointment) {
  return request<AppointmentItemResponse>("/api/appointments", email, {
    method: "POST",
    body: JSON.stringify(appointment),
  });
}

export async function updateAppointmentInApi(email: string, appointment: Appointment) {
  return request<AppointmentItemResponse>(`/api/appointments/${appointment.id}`, email, {
    method: "PUT",
    body: JSON.stringify(appointment),
  });
}

export async function deleteAppointmentInApi(email: string, id: string) {
  return request<AppointmentItemResponse>(`/api/appointments/${id}`, email, {
    method: "DELETE",
  });
}

export async function listAppointmentsPageFromApi(email: string, page: number, pageSize: number) {
  return request<AppointmentListResponse & { pagination: { totalPages: number; totalItems: number; hasNextPage: boolean } }>(
    `/api/appointments?page=${page}&pageSize=${pageSize}`,
    email
  );
}

export async function startGeneratorInApi(email: string, interval = 3000) {
  return request<{ message: string; interval: number }>(
    `/api/generator/start?interval=${interval}`,
    email,
    { method: "POST" }
  );
}

export async function stopGeneratorInApi(email: string) {
  return request<{ message: string }>("/api/generator/stop", email, { method: "POST" });
}

export async function getGeneratorStatusFromApi(email: string) {
  return request<{ running: boolean }>("/api/generator/status", email);
}
