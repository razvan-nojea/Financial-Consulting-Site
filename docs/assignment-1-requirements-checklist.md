# SDI Assignment 1: Requirements Checklist

## Technology stack choice

- Requirement: benchmark and justify a free front-end stack
- Evidence: `docs/assignment-1-stack-benchmark.md`

## Presentation view

- Requirement: presentation view containing logo, name, tagline, and brief application description
- Evidence:
  - `src/app/pages/home-page.tsx`
  - hero branding with logo and app name
  - tagline and short application description above the main calls to action

## Master-detail perspective

- Requirement: master/detail perspective for a domain entity
- Chosen entity: appointment
- Evidence:
  - master page: `src/app/pages/appointments-page.tsx`
  - detail page: `src/app/pages/appointment-detail-page.tsx`
  - routing: `src/app/routes.tsx`

## Full CRUD capabilities

- Requirement: entities can be added, updated, erased, and inspected in detail
- Evidence:
  - create: add dialog in `src/app/pages/appointments-page.tsx`
  - read/list: paginated table in `src/app/pages/appointments-page.tsx`
  - read/detail: `src/app/pages/appointment-detail-page.tsx`
  - update: edit dialog in both appointments list and detail page
  - delete: confirmation dialog in both appointments list and detail page
  - data operations: `src/app/contexts/appointments-context.tsx`

## Paginated table with minimal information

- Requirement: table must be paginated and show minimal entity information
- Evidence:
  - `src/app/pages/appointments-page.tsx`
  - table columns: service, client, date, time, status
  - `PAGE_SIZE = 5` pagination implemented in memory

## Client-side RAM storage only

- Requirement: information stored solely in RAM
- Evidence:
  - `src/app/contexts/appointments-context.tsx`
  - appointments are kept in React state with seeded in-memory data
  - no backend API, database, or persistence layer is used for appointments

## Data validation

- Requirement: validation is mandatory
- Evidence:
  - validation rules: `src/app/contexts/appointments-context.tsx`
  - validated form UI: `src/app/components/appointments/appointment-form.tsx`

## Separation of visual aspects from implementation

- Requirement: separate presentation from implementation logic
- Evidence:
  - reusable UI primitives in `src/app/components/ui`
  - appointment-specific form component in `src/app/components/appointments/appointment-form.tsx`
  - domain state and CRUD logic in `src/app/contexts/appointments-context.tsx`
  - page-level composition in `src/app/pages/*.tsx`

## Testing with high coverage

- Requirement: test all functionalities with maximum achievable coverage
- Evidence:
  - form tests: `src/app/components/appointments/appointment-form.test.tsx`
  - context tests: `src/app/contexts/appointments-context.test.tsx`
  - page tests:
    - `src/app/pages/home-page.test.tsx`
    - `src/app/pages/appointments-page.test.tsx`
    - `src/app/pages/appointment-detail-page.test.tsx`
  - coverage configuration: `vitest.config.ts`
