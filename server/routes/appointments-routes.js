export async function handleAppointmentsRoutes(context) {
  const { request, pathname, searchParams, body, service, ownerEmail } = context;

  if (pathname === "/api/appointments" && request.method === "GET") {
    return {
      statusCode: 200,
      payload: await service.list(ownerEmail, {
        page: searchParams.get("page"),
        pageSize: searchParams.get("pageSize"),
        search: searchParams.get("search"),
        status: searchParams.get("status"),
      }),
    };
  }

  if (pathname === "/api/appointments" && request.method === "POST") {
    return {
      statusCode: 201,
      payload: {
        data: await service.create(ownerEmail, body ?? {}),
      },
    };
  }

  const match = pathname.match(/^\/api\/appointments\/([^/]+)$/);
  if (!match) {
    return null;
  }

  const appointmentId = decodeURIComponent(match[1]);

  if (request.method === "GET") {
    return {
      statusCode: 200,
      payload: {
        data: await service.getById(ownerEmail, appointmentId),
      },
    };
  }

  if (request.method === "PUT") {
    return {
      statusCode: 200,
      payload: {
        data: await service.update(ownerEmail, appointmentId, body ?? {}),
      },
    };
  }

  if (request.method === "DELETE") {
    return {
      statusCode: 200,
      payload: {
        data: await service.delete(ownerEmail, appointmentId),
      },
    };
  }

  return {
    statusCode: 405,
    payload: {
      message: "Metoda nu este permisa pentru aceasta resursa.",
    },
  };
}
