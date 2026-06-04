import { createServer as createHttpServer }  from "node:http";
import { createServer as createHttpsServer } from "node:https";
import { readFileSync, existsSync }          from "node:fs";
import { join, dirname }                     from "node:path";
import { fileURLToPath }                     from "node:url";
import { createApp }                         from "./http/app.js";
import { NeDbDocumentStore }                 from "./chat/nedb-document-store.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const port      = Number.parseInt(process.env.PORT      ?? "3001", 10);
const httpPort  = Number.parseInt(process.env.HTTP_PORT ?? "3000", 10);
const httpsEnabled = process.env.HTTPS_ENABLED === "true";

async function main() {
  let repository;
  let usersRepository;
  let logsRepository;
  let suspiciousUsersRepository;

  if (process.env.DATABASE_URL) {
    const { PrismaAppointmentsRepository } = await import(
      "./repositories/prisma-appointments-repository.js"
    );
    const { UsersRepository } = await import(
      "./repositories/users-repository.js"
    );
    const { LogsRepository } = await import(
      "./repositories/logs-repository.js"
    );
    const { SuspiciousUsersRepository } = await import(
      "./repositories/suspicious-users-repository.js"
    );

    repository                = new PrismaAppointmentsRepository();
    usersRepository           = new UsersRepository();
    logsRepository            = new LogsRepository();
    suspiciousUsersRepository = new SuspiciousUsersRepository();

    console.log("Using PostgreSQL repository (Prisma).");
  } else {
    const { JsonAppointmentsRepository } = await import(
      "./repositories/json-appointments-repository.js"
    );
    const { JsonUsersRepository } = await import(
      "./repositories/json-users-repository.js"
    );
    const { JsonLogsRepository } = await import(
      "./repositories/json-logs-repository.js"
    );
    const { JsonSuspiciousUsersRepository } = await import(
      "./repositories/json-suspicious-users-repository.js"
    );

    repository                = new JsonAppointmentsRepository();
    usersRepository           = new JsonUsersRepository();
    logsRepository            = new JsonLogsRepository();
    suspiciousUsersRepository = new JsonSuspiciousUsersRepository(
      "./data/suspicious-users.json",
      usersRepository
    );

    console.log("DATABASE_URL not set — using JSON file repositories (data/*).");
  }

  // NoSQL chat store — NeDB embedded document database, no server required.
  const chatStore = new NeDbDocumentStore("./data/chat-messages.db");

  const app = createApp({
    repository,
    usersRepository,
    logsRepository,
    suspiciousUsersRepository,
    chatStore,
  });

  if (httpsEnabled) {
    // ── HTTPS mode ─────────────────────────────────────────────────────────
    const certsDir = join(__dirname, "certs");
    const keyPath  = join(certsDir, "server.key");
    const certPath = join(certsDir, "server.crt");

    if (!existsSync(keyPath) || !existsSync(certPath)) {
      console.error("TLS certificate not found. Run: node scripts/generate-cert.js");
      process.exit(1);
    }

    const httpsOptions = {
      key:  readFileSync(keyPath),
      cert: readFileSync(certPath),
    };

    // Replace the HTTP server created inside createApp with an HTTPS server.
    const httpsServer = createHttpsServer(httpsOptions, app.server.listeners("request")[0]);

    // HTTP → HTTPS redirect (plain HTTP on httpPort)
    const redirectServer = createHttpServer((req, res) => {
      const host = (req.headers.host ?? "localhost").replace(/:\d+$/, "");
      res.writeHead(301, { Location: `https://${host}:${port}${req.url}` });
      res.end();
    });

    await new Promise((resolve) => redirectServer.listen(httpPort, resolve));
    console.log(`HTTP → HTTPS redirect running on http://localhost:${httpPort}`);

    // Attach broadcaster WebSocket upgrade to the HTTPS server
    await new Promise((resolve) => httpsServer.listen(port, resolve));
    app.broadcaster.attach(httpsServer);

    console.log(`Server running on https://localhost:${port}`);
    console.log(`WebSocket (real-time) on wss://localhost:${port}`);
    console.log(`TIP: Open https://localhost:${port} once and accept the self-signed certificate.`);
  } else {
    // ── HTTP mode (default for dev / testing) ──────────────────────────────
    await app.listen(port);
    console.log(`Server running on http://localhost:${port}`);
    console.log(`WebSocket (real-time) on ws://localhost:${port}`);
  }
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
