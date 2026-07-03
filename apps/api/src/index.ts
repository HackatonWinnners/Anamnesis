import { serve } from "@hono/node-server";
import { app, COGNEE_SERVICE_URL } from "./app.js";

const PORT = Number(process.env.PORT ?? 8787);

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`Anamnesis API listening on http://localhost:${info.port}`);
  console.log(`Cognee service: ${COGNEE_SERVICE_URL}`);
});
