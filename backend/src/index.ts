import cors from "cors";
import express from "express";
import { config } from "./config";
import { authRouter } from "./routes/auth";
import { activitiesRouter } from "./routes/activities";
import { planRouter } from "./routes/plan";
import { profileRouter } from "./routes/profile";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, stravaConfigured: Boolean(config.stravaClientId && config.stravaClientSecret) });
});

app.use("/api/auth", authRouter);
app.use("/api/profile", profileRouter);
app.use("/api/activities", activitiesRouter);
app.use("/api/plan", planRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  const message = err instanceof Error ? err.message : "Error interno";
  res.status(500).json({ error: message });
});

app.listen(config.port, () => {
  console.log(`personalStrava backend escuchando en http://localhost:${config.port}`);
  if (!config.stravaClientId || !config.stravaClientSecret) {
    console.warn(
      "Aviso: STRAVA_CLIENT_ID/STRAVA_CLIENT_SECRET no configurados. Copia .env.example a .env y rellena tus credenciales de https://www.strava.com/settings/api",
    );
  }
});
