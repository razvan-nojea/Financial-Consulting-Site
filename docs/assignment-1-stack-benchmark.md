# SDI Assignment 1: Front-End Technology Stack Benchmark

## Project context

The application needs:

- a presentation website for a financial consulting business
- a master-detail module for appointments
- client-side CRUD with in-memory storage only
- strong validation and a maintainable component structure
- high automated test coverage

## Benchmark criteria

The following criteria were used for comparing free front-end stacks:

| Criterion | Weight | Why it matters for this project |
| --- | ---: | --- |
| TypeScript support | 15 | Reduces implementation mistakes in forms, routing, and CRUD flows |
| Component ecosystem | 15 | Faster delivery of polished UI elements and accessibility helpers |
| Routing and state simplicity | 15 | Needed for presentation pages plus authenticated dashboard flows |
| Testing experience | 15 | Assignment requires testing all functionalities with high coverage |
| Performance and dev speed | 15 | Vite-style feedback loop helps deliver features quickly |
| Learning curve | 10 | Important for defending the choice and continuing development in the lab |
| Community and documentation | 15 | Best-practice guidance is explicitly required by the assignment |

## Options benchmarked

| Stack | TS Support (15) | Ecosystem (15) | Routing/State (15) | Testing (15) | Performance (15) | Learning Curve (10) | Community (15) | Total (100) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| React + TypeScript + Vite | 15 | 15 | 13 | 15 | 15 | 8 | 15 | 96 |
| Vue 3 + TypeScript + Vite | 14 | 12 | 14 | 13 | 15 | 9 | 12 | 89 |
| Angular | 15 | 13 | 15 | 14 | 10 | 6 | 14 | 87 |

## Chosen stack

The implementation uses:

- React 18
- TypeScript
- Vite
- React Router
- Tailwind CSS
- Radix UI primitives and reusable UI components
- Vitest + Testing Library

## Why React + TypeScript + Vite won

1. It gives the best balance between delivery speed and long-term maintainability.
2. The component ecosystem is excellent for forms, dialogs, tables, badges, and accessible interactions.
3. Vitest and Testing Library integrate naturally with Vite and make high-coverage testing practical.
4. React Router supports the required split between presentation pages and authenticated dashboard flows.
5. TypeScript makes the appointment entity, form data, validation, and CRUD operations explicit and safer.

## Best-practice alignment

The stack fits the assignment guidance because it supports:

- reusable components instead of duplicated UI
- clear separation between context/state, pages, and form components
- in-memory domain data through React context and local state
- automated tests close to user behavior
- easy extension from the current CRUD module to future entities
