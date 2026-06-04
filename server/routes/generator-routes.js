import { faker } from "@faker-js/faker";

const SERVICES = [
  "Consultanță Planificare Pensie",
  "Revizuire Plan Financiar",
  "Strategii de Investiții",
  "Coaching Bugetar",
  "Gestionarea Datoriilor",
  "Planificare Imobiliară",
  "Planificare Financiară pentru Afaceri",
  "Consultanță Inițială",
  "Analiza Datorii",
  "Fond de Urgență",
];

const STATUSES = ["confirmed", "pending", "completed", "cancelled"];

const TIMES = ["09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00"];

let generatorTimer = null;
let generatorOwnerEmail = "demo@exemplu.ro";

function randomFutureDate() {
  const d = new Date();
  d.setDate(d.getDate() + Math.floor(Math.random() * 90) + 1);
  return d.toISOString().split("T")[0];
}

function generateFakeAppointment(ownerEmail) {
  return {
    id: String(Date.now()) + Math.random().toString(36).slice(2, 6),
    ownerEmail,
    service: SERVICES[Math.floor(Math.random() * SERVICES.length)],
    date: randomFutureDate(),
    time: TIMES[Math.floor(Math.random() * TIMES.length)],
    status: STATUSES[Math.floor(Math.random() * STATUSES.length)],
    clientName: faker.person.fullName(),
    phone: `07${Math.floor(10000000 + Math.random() * 89999999)}`,
    notes: Math.random() > 0.5 ? faker.lorem.sentence() : "",
    createdAt: new Date().toISOString().split("T")[0],
  };
}

export async function handleGeneratorRoutes(context) {
  const { request, pathname, service, broadcaster } = context;

  if (!pathname.startsWith("/api/generator")) return null;

  if (pathname === "/api/generator/start" && request.method === "POST") {
    const interval = parseInt(context.searchParams?.get("interval") ?? "3000", 10);
    const clampedInterval = Math.max(1000, Math.min(interval, 10000));

    if (generatorTimer) {
      clearInterval(generatorTimer);
    }

    generatorOwnerEmail = context.ownerEmail ?? "demo@exemplu.ro";

    generatorTimer = setInterval(async () => {
      const fake = generateFakeAppointment(generatorOwnerEmail);
      if (broadcaster) {
        broadcaster.broadcast({ type: "new-appointment", data: fake });
      }
      try {
        await service.create(generatorOwnerEmail, fake);
      } catch {
        // validation edge-case — skip silently
      }
    }, clampedInterval);

    return {
      statusCode: 200,
      payload: { message: "Generator pornit.", interval: clampedInterval },
    };
  }

  if (pathname === "/api/generator/stop" && request.method === "POST") {
    if (generatorTimer) {
      clearInterval(generatorTimer);
      generatorTimer = null;
    }
    if (broadcaster) {
      broadcaster.broadcast({ type: "generator-stopped" });
    }
    return { statusCode: 200, payload: { message: "Generator oprit." } };
  }

  if (pathname === "/api/generator/status" && request.method === "GET") {
    return {
      statusCode: 200,
      payload: { running: generatorTimer !== null },
    };
  }

  return null;
}
