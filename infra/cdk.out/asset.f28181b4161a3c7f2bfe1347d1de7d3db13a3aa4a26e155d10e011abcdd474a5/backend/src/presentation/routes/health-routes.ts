import type { FastifyInstance } from "fastify";
import { HTTP_STATUS } from "@/constants/http.js";

export async function healthRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get("/health", async (_request, reply) => {
    return reply.status(HTTP_STATUS.OK).send({
      isSuccess: true,
      data: { status: "ok" },
    });
  });
}
