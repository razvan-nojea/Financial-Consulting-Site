export const APPOINTMENT_STATUSES = ["confirmed", "pending", "completed", "cancelled"];

export const DEMO_APPOINTMENTS = [
  {
    id: "1",
    ownerEmail: "demo@exemplu.ro",
    service: "Consultanta Planificare Pensie",
    date: "2026-04-15",
    time: "10:00",
    status: "confirmed",
    clientName: "Ion Popescu",
    phone: "0722 123 456",
    notes: "Prima consultanta despre planificarea pensiei.",
    createdAt: "2026-03-20",
  },
  {
    id: "2",
    ownerEmail: "demo@exemplu.ro",
    service: "Revizuire Plan Financiar",
    date: "2026-04-22",
    time: "14:30",
    status: "pending",
    clientName: "Maria Ionescu",
    phone: "0722 987 654",
    notes: "",
    createdAt: "2026-03-22",
  },
  {
    id: "3",
    ownerEmail: "demo@exemplu.ro",
    service: "Strategii de Investitii",
    date: "2026-05-03",
    time: "11:00",
    status: "pending",
    clientName: "Alex Dima",
    phone: "0744 456 789",
    notes: "Discutie despre diversificarea portofoliului.",
    createdAt: "2026-03-28",
  },
  {
    id: "4",
    ownerEmail: "demo@exemplu.ro",
    service: "Coaching Bugetar",
    date: "2026-05-10",
    time: "13:00",
    status: "confirmed",
    clientName: "Radu Matei",
    phone: "0722 111 333",
    notes: "Analiza cheltuielilor lunare.",
    createdAt: "2026-03-30",
  },
  {
    id: "5",
    ownerEmail: "demo@exemplu.ro",
    service: "Strategii de Investitii",
    date: "2026-06-01",
    time: "09:00",
    status: "pending",
    clientName: "Ana Vasile",
    phone: "",
    notes: "",
    createdAt: "2026-04-01",
  },
  {
    id: "6",
    ownerEmail: "demo@exemplu.ro",
    service: "Planificare Financiara pentru Afaceri",
    date: "2026-06-15",
    time: "15:00",
    status: "pending",
    clientName: "Mihai Stan",
    phone: "0733 987 654",
    notes: "Consultanta pentru fluxul de numerar.",
    createdAt: "2026-04-02",
  },
  {
    id: "7",
    ownerEmail: "demo@exemplu.ro",
    service: "Consultanta Initiala",
    date: "2026-03-01",
    time: "10:00",
    status: "completed",
    clientName: "Ioana Tudor",
    phone: "0722 555 111",
    notes: "Sesiune introductiva finalizata.",
    createdAt: "2026-02-25",
  },
  {
    id: "8",
    ownerEmail: "demo@exemplu.ro",
    service: "Analiza Datorii",
    date: "2026-02-25",
    time: "15:00",
    status: "completed",
    clientName: "Catalin Ene",
    phone: "0722 999 222",
    notes: "Plan de reducere a datoriilor.",
    createdAt: "2026-02-20",
  },
  {
    id: "9",
    ownerEmail: "demo@exemplu.ro",
    service: "Planificare Educatie Copii",
    date: "2026-02-10",
    time: "09:00",
    status: "cancelled",
    clientName: "Elena Pavel",
    phone: "0722 000 111",
    notes: "Anulata de client.",
    createdAt: "2026-02-01",
  },
  {
    id: "10",
    ownerEmail: "demo@exemplu.ro",
    service: "Gestionarea Datoriilor",
    date: "2026-01-20",
    time: "16:00",
    status: "completed",
    clientName: "Vlad Serban",
    phone: "0756 321 654",
    notes: "Plan de rambursare pe 18 luni.",
    createdAt: "2026-01-10",
  },
  {
    id: "11",
    ownerEmail: "demo@exemplu.ro",
    service: "Planificare Pensie",
    date: "2026-01-08",
    time: "11:00",
    status: "completed",
    clientName: "Cristina Munteanu",
    phone: "0722 123 999",
    notes: "",
    createdAt: "2025-12-28",
  },
  {
    id: "12",
    ownerEmail: "demo@exemplu.ro",
    service: "Strategii de Investitii",
    date: "2025-12-15",
    time: "14:00",
    status: "cancelled",
    clientName: "George Nistor",
    phone: "",
    notes: "Anulata din cauza unui conflict de program.",
    createdAt: "2025-12-01",
  },
];

function cleanText(value) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function isIsoDate(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isTime(value) {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function normalizePhone(value) {
  return cleanText(value);
}

function isPhoneValid(value) {
  if (!value) {
    return true;
  }

  return /^(\+4|0)[0-9]{9}$/.test(value.replace(/\s/g, ""));
}

function validatePastDate(date, today) {
  return date >= today;
}

export function cloneAppointments(appointments) {
  return appointments.map((appointment) => ({ ...appointment }));
}

export function createSeedAppointments() {
  return cloneAppointments(DEMO_APPOINTMENTS);
}

export function validateAppointmentInput(input, options = {}) {
  const { partial = false, allowPastDate = false, today = new Date().toISOString().split("T")[0] } =
    options;
  const errors = {};
  const normalized = {};

  if ("service" in input || !partial) {
    normalized.service = cleanText(input.service);
    if (!normalized.service) {
      errors.service = "Serviciul este obligatoriu.";
    }
  }

  if ("date" in input || !partial) {
    normalized.date = cleanText(input.date);
    if (!normalized.date) {
      errors.date = "Data este obligatorie.";
    } else if (!isIsoDate(normalized.date)) {
      errors.date = "Data trebuie sa fie in formatul YYYY-MM-DD.";
    } else if (!allowPastDate && !validatePastDate(normalized.date, today)) {
      errors.date = "Data nu poate fi in trecut.";
    }
  }

  if ("time" in input || !partial) {
    normalized.time = cleanText(input.time);
    if (!normalized.time) {
      errors.time = "Ora este obligatorie.";
    } else if (!isTime(normalized.time)) {
      errors.time = "Ora trebuie sa fie in formatul HH:MM.";
    }
  }

  if ("status" in input || !partial) {
    normalized.status = cleanText(input.status);
    if (!normalized.status) {
      errors.status = "Statusul este obligatoriu.";
    } else if (!APPOINTMENT_STATUSES.includes(normalized.status)) {
      errors.status = "Status invalid.";
    }
  }

  if ("clientName" in input || !partial) {
    normalized.clientName = cleanText(input.clientName);
    if (!normalized.clientName) {
      errors.clientName = "Numele clientului este obligatoriu.";
    } else if (normalized.clientName.length < 3) {
      errors.clientName = "Numele clientului trebuie sa aiba cel putin 3 caractere.";
    }
  }

  if ("phone" in input || !partial) {
    normalized.phone = normalizePhone(input.phone);
    if (!isPhoneValid(normalized.phone)) {
      errors.phone = "Numar invalid. Exemplu valid: 0722 123 456.";
    }
  }

  if ("notes" in input || !partial) {
    normalized.notes = cleanText(input.notes);
    if (normalized.notes.length > 500) {
      errors.notes = `Notitele depasesc limita de 500 de caractere (${normalized.notes.length}/500).`;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    value: normalized,
  };
}

export function createAppointmentRecord(input, options = {}) {
  const { id, createdAt = new Date().toISOString().split("T")[0], ownerEmail } = options;

  return {
    id: String(id),
    ownerEmail: typeof ownerEmail === "string" ? ownerEmail : "",
    service: input.service,
    date: input.date,
    time: input.time,
    status: input.status,
    clientName: input.clientName,
    phone: input.phone ?? "",
    notes: input.notes ?? "",
    createdAt,
  };
}

export function paginateAppointments(appointments, query = {}) {
  const page = Number.parseInt(query.page ?? "1", 10);
  const pageSize = Number.parseInt(query.pageSize ?? "5", 10);
  const normalizedPage = Number.isFinite(page) && page > 0 ? page : 1;
  const normalizedPageSize =
    Number.isFinite(pageSize) && pageSize > 0 && pageSize <= 50 ? pageSize : 5;
  const search = cleanText(query.search ?? "").toLowerCase();
  const status = cleanText(query.status ?? "").toLowerCase();

  const filtered = appointments.filter((appointment) => {
    const matchesStatus = !status || appointment.status === status;
    const haystack = `${appointment.service} ${appointment.clientName} ${appointment.notes}`
      .toLowerCase();
    const matchesSearch = !search || haystack.includes(search);
    return matchesStatus && matchesSearch;
  });

  const totalItems = filtered.length;
  const totalPages = totalItems === 0 ? 1 : Math.ceil(totalItems / normalizedPageSize);
  const safePage = normalizedPage > totalPages ? totalPages : normalizedPage;
  const start = (safePage - 1) * normalizedPageSize;
  const items = filtered.slice(start, start + normalizedPageSize);

  return {
    items,
    pagination: {
      page: safePage,
      pageSize: normalizedPageSize,
      totalItems,
      totalPages,
      hasNextPage: safePage < totalPages,
      hasPreviousPage: safePage > 1,
    },
    filters: {
      search,
      status,
    },
  };
}

export function buildAppointmentStatistics(appointments, today = new Date().toISOString().split("T")[0]) {
  const byStatus = APPOINTMENT_STATUSES.reduce((accumulator, status) => {
    accumulator[status] = appointments.filter((appointment) => appointment.status === status).length;
    return accumulator;
  }, {});

  const byService = appointments.reduce((accumulator, appointment) => {
    accumulator[appointment.service] = (accumulator[appointment.service] ?? 0) + 1;
    return accumulator;
  }, {});

  return {
    totalAppointments: appointments.length,
    upcomingAppointments: appointments.filter((appointment) => appointment.date >= today).length,
    byStatus,
    byService,
  };
}
