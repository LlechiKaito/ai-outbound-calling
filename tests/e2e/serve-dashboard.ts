import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = Fastify();

app.register(fastifyStatic, {
  root: path.join(__dirname, "..", "..", "frontend", "public"),
  prefix: "/",
});

app.get("/dashboard", (_request, reply) => {
  reply.sendFile("dashboard.html");
});

app.listen({ port: 3000, host: "0.0.0.0" }).then(() => {
  console.log("E2E test server running on http://localhost:3000");
});
