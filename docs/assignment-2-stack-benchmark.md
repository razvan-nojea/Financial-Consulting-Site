# SDI Assignment 2: Back-End Stack Benchmark

## Goal

The bronze brief requires a free back-end stack that can deliver:

- REST endpoints for CRUD and statistics
- server-side validation
- separated endpoint layer
- server-side pagination
- in-memory storage only
- high automated test coverage

The current project already runs on Node.js because the front end uses Vite and Vitest, so the back end should fit naturally into the same local toolchain.

## Evaluation Method

The table below is a qualitative benchmark created from the official documentation of each option. The scores are my own engineering assessment on a `1-5` scale, based on how well each stack fits this specific bronze assignment.

Criteria:

- `Bronze fit`: how directly it supports a small in-memory REST API
- `Validation`: first-party or documented path for request validation
- `Architecture`: how naturally it supports separation between routes and business logic
- `Runtime simplicity`: how easy it is to run inside the current repo
- `Testing fit`: how easy it is to cover end-to-end with automated tests
- `Dependency footprint`: how easy it is to keep the solution minimal and RAM-only

## Benchmark Table

| Stack | Bronze fit | Validation | Architecture | Runtime simplicity | Testing fit | Dependency footprint | Notes |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Node.js `node:http` | 5 | 3 | 5 | 5 | 5 | 5 | Lowest-level option, but already available in the repo and easy to keep dependency-free. |
| Express | 4 | 3 | 4 | 4 | 5 | 3 | Excellent ecosystem and routing, but validation and structure depend more on extra packages and conventions. |
| Fastify | 5 | 5 | 4 | 4 | 5 | 4 | Very strong built-in story for JSON-schema validation and performance-oriented APIs. |
| Hono | 4 | 3 | 4 | 4 | 4 | 4 | Small and modern, especially attractive for Web Standards and multi-runtime support. |
| NestJS | 3 | 5 | 5 | 2 | 4 | 2 | Strongest large-app architecture, but heavier than needed for a bronze in-memory assignment. |

## Selected Stack

Chosen stack:

- Node.js native HTTP server via `node:http`
- modular JavaScript architecture
- in-memory repository stored only in RAM
- Vitest for automated testing

## Why This Stack Was Chosen

This choice matches the assignment especially well because:

1. It satisfies the "RAM only" rule naturally.
The repository is just an in-process array, so there is no database layer, ORM, file storage, or hidden persistence path.

2. It keeps the implementation small and easy to justify in lab.
For bronze, the priority is correctness, validation, separation of concerns, pagination, and tests, not framework ceremony.

3. It fits the existing repo with zero new runtime dependencies.
The project already depends on Node.js for Vite and Vitest, so the back end can run immediately with `node server/index.js`.

4. It still follows good community structure.
Even without a framework, the implementation is separated into:
- `server/domain`
- `server/repositories`
- `server/services`
- `server/routes`
- `server/http`

5. It is highly testable.
Node 24 already provides the primitives needed for a clean test loop, and the final solution reaches `100%` statements, branches, functions, and lines in the whole repository.

## Comparison Notes From Official Sources

- Node.js documents `node:http` as a stable built-in HTTP module for creating servers and handling requests directly.
  Source: [Node.js HTTP docs](https://nodejs.org/api/http.html)

- Express documents routing through `app.get`, `app.post`, `app.put`, `app.delete`, and modular routers via `express.Router()`.
  Source: [Express routing guide](https://expressjs.com/en/guide/routing.html)

- Fastify documents request validation as a core framework concept using JSON Schema on routes.
  Source: [Fastify getting started](https://fastify.dev/docs/latest/Guides/Getting-Started/)

- Hono describes itself as a small, simple, ultrafast framework built on Web Standards and able to run across many JavaScript runtimes, including Node.js.
  Source: [Hono docs](https://hono.dev/docs/)

- NestJS describes itself as an efficient, scalable Node.js framework with a strong application architecture, built with and fully supporting TypeScript, and using Express or Fastify underneath.
  Source: [NestJS introduction](https://docs.nestjs.com/)

## Final Justification

For a larger team project, Fastify or NestJS would be very strong candidates.

For this specific bronze assignment, the best tradeoff is the native Node.js stack because it:

- minimizes moving parts
- avoids dependency overhead
- makes "no persistence" easy to prove
- supports a clean layered design
- reaches full automated coverage with a small, explainable codebase
