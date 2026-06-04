# SDI Assignment 2: Bronze Requirements Checklist

## Selected Entity

The REST API is implemented for the `appointments` domain entity.

## CRUD Endpoints

- `GET /api/appointments`
  Returns a paginated appointment list with optional `page`, `pageSize`, `search`, and `status` query parameters.

- `GET /api/appointments/:id`
  Returns one appointment by id.

- `POST /api/appointments`
  Creates a new appointment in server RAM only.

- `PUT /api/appointments/:id`
  Updates an existing appointment in server RAM only.

- `DELETE /api/appointments/:id`
  Removes an appointment from server RAM only.

## Statistics Endpoint

- `GET /api/statistics/appointments`
  Returns:
  - total appointments
  - upcoming appointments
  - counts by status
  - counts by service

## Requirement Mapping

### Server-side data validation

Implemented in:

- `server/domain/appointments.js`
- `server/services/appointments-service.js`

Validated fields:

- `service`
- `date`
- `time`
- `status`
- `clientName`
- `phone`
- `notes`

### Separate the endpoints from the rest of the implementation

Implemented through:

- `server/routes/appointments-routes.js`
- `server/routes/statistics-routes.js`
- `server/services/appointments-service.js`
- `server/repositories/in-memory-appointments-repository.js`
- `server/domain/appointments.js`

This keeps the HTTP layer separate from validation, business rules, and storage.

### Test all functionalities with maximum code coverage achievable

Automated coverage includes:

- `server/domain/appointments.test.js`
- `server/repositories/in-memory-appointments-repository.test.js`
- `server/routes/appointments-routes.test.js`
- `server/services/appointments-service.test.js`
- `server/http/app.test.js`

Verification command:

```powershell
npm run test:coverage
```

Current result:

- `100%` statements
- `100%` branches
- `100%` functions
- `100%` lines

### Information stored solely in RAM on the server machine

Implemented in:

- `server/repositories/in-memory-appointments-repository.js`

Important:

- data is stored only in a JavaScript array inside the running Node.js process
- no database is used
- no file persistence is used
- stopping the server resets the data

### Server-side pagination

Implemented in:

- `server/domain/appointments.js`
- `server/services/appointments-service.js`
- `GET /api/appointments`

Returned metadata:

- `page`
- `pageSize`
- `totalItems`
- `totalPages`
- `hasNextPage`
- `hasPreviousPage`

## How To Run

Start the front end:

```powershell
npm run dev
```

Start the REST API:

```powershell
npm run dev:server
```

Default API URL:

- `http://localhost:3001`
