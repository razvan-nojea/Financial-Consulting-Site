export async function handleHealthRoutes(context) {
  if (context.pathname !== "/api/health") {
    return null;
  }

  if (context.request.method !== "GET") {
    return {
      statusCode: 405,
      payload: {
        message: "Metoda nu este permisa pentru aceasta resursa.",
      },
    };
  }

  return {
    statusCode: 200,
    payload: {
      status: "ok",
    },
  };
}
