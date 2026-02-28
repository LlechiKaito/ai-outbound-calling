import type { FastifyInstance } from "fastify";

import type { DashboardController } from "@/presentation/controllers/dashboard/dashboard-controller.js";

export function dashboardRoutes(controller: DashboardController) {
  return async (app: FastifyInstance): Promise<void> => {
    app.get(
      "/api/dashboard/kpis",
      controller.getKpis.bind(controller),
    );

    app.get(
      "/api/dashboard/leads",
      controller.getLeads.bind(controller),
    );

    app.get(
      "/api/dashboard/call-history",
      controller.getCallHistory.bind(controller),
    );

    app.post(
      "/api/dashboard/leads",
      controller.addLead.bind(controller),
    );

    app.get(
      "/api/dashboard/status",
      controller.getStatus.bind(controller),
    );
  };
}
