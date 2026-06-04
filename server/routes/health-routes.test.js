import { describe, expect, it } from "vitest";
import { handleHealthRoutes } from "./health-routes.js";

describe("health-routes", () => {
  it("returns null for unrelated paths", async () => {
    await expect(
      handleHealthRoutes({
        pathname: "/api/appointments",
        request: {
          method: "GET",
        },
      })
    ).resolves.toBeNull();
  });

  it("returns the health payload for GET requests", async () => {
    await expect(
      handleHealthRoutes({
        pathname: "/api/health",
        request: {
          method: "GET",
        },
      })
    ).resolves.toEqual({
      statusCode: 200,
      payload: {
        status: "ok",
      },
    });
  });

  it("rejects unsupported methods", async () => {
    await expect(
      handleHealthRoutes({
        pathname: "/api/health",
        request: {
          method: "POST",
        },
      })
    ).resolves.toEqual({
      statusCode: 405,
      payload: {
        message: "Metoda nu este permisa pentru aceasta resursa.",
      },
    });
  });
});
