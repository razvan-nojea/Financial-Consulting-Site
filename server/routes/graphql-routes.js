import { graphql, buildSchema } from "graphql";

const schema = buildSchema(`
  type Appointment {
    id: ID!
    service: String!
    date: String!
    time: String!
    status: String!
    clientName: String!
    phone: String!
    notes: String!
    createdAt: String!
    ownerEmail: String!
  }

  type PaginatedAppointments {
    items: [Appointment!]!
    totalItems: Int!
    totalPages: Int!
    page: Int!
    pageSize: Int!
  }

  type Statistics {
    total: Int!
    upcoming: Int!
    byStatus: [StatusCount!]!
    byService: [ServiceCount!]!
  }

  type StatusCount {
    status: String!
    count: Int!
  }

  type ServiceCount {
    service: String!
    count: Int!
  }

  type MutationResult {
    success: Boolean!
    appointment: Appointment
    message: String
  }

  type Query {
    appointments(page: Int, pageSize: Int, search: String, status: String): PaginatedAppointments!
    appointment(id: ID!): Appointment
    statistics: Statistics!
  }

  type Mutation {
    createAppointment(
      service: String!
      date: String!
      time: String!
      status: String!
      clientName: String!
      phone: String
      notes: String
    ): MutationResult!

    updateAppointment(
      id: ID!
      service: String
      date: String
      time: String
      status: String
      clientName: String
      phone: String
      notes: String
    ): MutationResult!

    deleteAppointment(id: ID!): MutationResult!
  }
`);

function buildRootValue(service, ownerEmail) {
  return {
    async appointments({ page = 1, pageSize = 10, search, status }) {
      const query = {};
      if (page) query.page = page;
      if (pageSize) query.pageSize = pageSize;
      if (search) query.search = search;
      if (status) query.status = status;
      const result = await service.list(ownerEmail, query);
      return {
        items: result.items,
        totalItems: result.pagination.totalItems,
        totalPages: result.pagination.totalPages,
        page: result.pagination.page,
        pageSize: result.pagination.pageSize,
      };
    },

    async appointment({ id }) {
      try {
        return await service.getById(ownerEmail, id);
      } catch {
        return null;
      }
    },

    async statistics() {
      const raw = await service.getStatistics(ownerEmail);
      const byStatus = Object.entries(raw.byStatus ?? {}).map(([status, count]) => ({ status, count }));
      const byService = Object.entries(raw.byService ?? {}).map(([svc, count]) => ({ service: svc, count }));
      return {
        total: raw.total ?? 0,
        upcoming: raw.upcoming ?? 0,
        byStatus,
        byService,
      };
    },

    async createAppointment(args) {
      try {
        const appointment = await service.create(ownerEmail, {
          ...args,
          phone: args.phone ?? "",
          notes: args.notes ?? "",
        });
        return { success: true, appointment };
      } catch (err) {
        return { success: false, message: err.message };
      }
    },

    async updateAppointment({ id, ...fields }) {
      try {
        const appointment = await service.update(ownerEmail, id, fields);
        return { success: true, appointment };
      } catch (err) {
        return { success: false, message: err.message };
      }
    },

    async deleteAppointment({ id }) {
      try {
        const appointment = await service.delete(ownerEmail, id);
        return { success: true, appointment };
      } catch (err) {
        return { success: false, message: err.message };
      }
    },
  };
}

export async function handleGraphqlRoute(context) {
  const { request, pathname, body, service } = context;

  if (pathname !== "/api/graphql") return null;

  if (request.method === "GET") {
    return {
      statusCode: 200,
      payload: {
        message: "GraphQL endpoint activ. Trimite POST cu { query, variables }.",
        schema: "Query: appointments, appointment(id), statistics | Mutation: createAppointment, updateAppointment, deleteAppointment",
      },
    };
  }

  if (request.method !== "POST") {
    return { statusCode: 405, payload: { message: "Metoda nu este permisa." } };
  }

  if (!body || typeof body.query !== "string") {
    return { statusCode: 400, payload: { message: "Corpul cererii trebuie sa contina { query }." } };
  }

  const ownerEmail = context.ownerEmail ?? "guest@local";
  const rootValue = buildRootValue(service, ownerEmail);

  const result = await graphql({
    schema,
    source: body.query,
    rootValue,
    variableValues: body.variables ?? {},
  });

  return { statusCode: 200, payload: result };
}
