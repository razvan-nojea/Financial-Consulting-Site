# SDI Assignment 0: Bronze Challenge Prototype Checklist

## What the bronze challenge asks for

You need visual Figma prototypes for:

- login view
- register view
- presentation view with logo, name, tagline, and short description
- a master-detail view for one domain entity with full CRUD
- a paginated table with minimal entity information
- a separate detail page/view for each entity row
- add, update, and delete flows

## Screens already covered by the implemented project

### Login / Register

- Login screen implemented in `src/app/pages/login-page.tsx`
- Register screen implemented in `src/app/pages/signup-page.tsx`

### Presentation view

- Presentation screen implemented in `src/app/pages/home-page.tsx`
- Includes:
  - logo
  - application/business name
  - tagline
  - brief application description

### Master-detail CRUD

- Chosen entity: appointment
- Master page: `src/app/pages/appointments-page.tsx`
- Detail page: `src/app/pages/appointment-detail-page.tsx`
- CRUD logic: `src/app/contexts/appointments-context.tsx`
- Validation UI: `src/app/components/appointments/appointment-form.tsx`

## Bronze challenge mapping

- Paginated table: implemented with `PAGE_SIZE = 5` in `src/app/pages/appointments-page.tsx`
- Minimal info in table: service, client, date, time, status
- Separate detail page: `/cont/programari/:id`
- Add flow: add dialog in the appointments page
- Update flow: edit dialog in both master and detail pages
- Delete flow: delete confirmation in both master and detail pages

## Figma submission note

The codebase now covers the required screens and behaviors, but the assignment text specifically asks for **Figma visual prototypes**.

That means the submission should include a Figma file or Figma share link containing prototypes for:

- login
- register
- home/presentation
- appointments master page
- appointment detail page
- add/edit/delete interaction states

## Existing design source

The repository already references the original design source in `README.md`:

- `https://www.figma.com/design/9ZudCK0Q6FojH7tnBLMLNv/Financial-Consulting-Website`

If that Figma file is yours and contains these screens, then you can use it as the bronze prototype deliverable. If not, you should update that Figma file so it matches the implemented screens above.
