import fs from "node:fs";
import path from "node:path";
import { config } from "./config";
import type { Profile, StoredActivity, User, WeeklyPlan } from "./types";

interface DbShape {
  users: User[];
  profiles: Profile[];
  activities: StoredActivity[];
  plans: WeeklyPlan[];
}

const EMPTY_DB: DbShape = { users: [], profiles: [], activities: [], plans: [] };

/**
 * Almacen de datos basado en un fichero JSON. No hay dependencias nativas que
 * compilar (a diferencia de sqlite3), lo que simplifica instalar y desplegar
 * esta app de un unico usuario. Todas las operaciones son sincronas y
 * relativamente pequeñas en volumen de datos, asi que no hace falta un motor
 * de base de datos real.
 */
class JsonDatabase {
  private data: DbShape;

  constructor(private readonly filePath: string) {
    this.data = this.load();
  }

  private load(): DbShape {
    if (!fs.existsSync(this.filePath)) {
      fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
      fs.writeFileSync(this.filePath, JSON.stringify(EMPTY_DB, null, 2));
      return structuredClone(EMPTY_DB);
    }
    const raw = fs.readFileSync(this.filePath, "utf-8");
    return { ...structuredClone(EMPTY_DB), ...JSON.parse(raw) };
  }

  private persist(): void {
    const tmpPath = `${this.filePath}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(this.data, null, 2));
    fs.renameSync(tmpPath, this.filePath);
  }

  // --- users -------------------------------------------------------------
  findUserBySessionToken(sessionToken: string): User | undefined {
    return this.data.users.find((u) => u.sessionToken === sessionToken);
  }

  findUserByStravaAthleteId(stravaAthleteId: number): User | undefined {
    return this.data.users.find((u) => u.stravaAthleteId === stravaAthleteId);
  }

  upsertUser(user: User): User {
    const idx = this.data.users.findIndex((u) => u.stravaAthleteId === user.stravaAthleteId);
    if (idx >= 0) {
      this.data.users[idx] = user;
    } else {
      this.data.users.push(user);
    }
    this.persist();
    return user;
  }

  // --- profiles ------------------------------------------------------------
  getProfile(userId: string): Profile | undefined {
    return this.data.profiles.find((p) => p.userId === userId);
  }

  saveProfile(profile: Profile): Profile {
    const idx = this.data.profiles.findIndex((p) => p.userId === profile.userId);
    if (idx >= 0) {
      this.data.profiles[idx] = profile;
    } else {
      this.data.profiles.push(profile);
    }
    this.persist();
    return profile;
  }

  // --- activities ----------------------------------------------------------
  getActivities(userId: string): StoredActivity[] {
    return this.data.activities
      .filter((a) => a.userId === userId)
      .sort((a, b) => (a.startDate < b.startDate ? 1 : -1));
  }

  replaceActivities(userId: string, activities: StoredActivity[]): void {
    this.data.activities = [
      ...this.data.activities.filter((a) => a.userId !== userId),
      ...activities,
    ];
    this.persist();
  }

  // --- plans -----------------------------------------------------------------
  getLatestPlan(userId: string): WeeklyPlan | undefined {
    return this.getPlans(userId)[0];
  }

  getPlans(userId: string): WeeklyPlan[] {
    return this.data.plans
      .filter((p) => p.userId === userId)
      .sort((a, b) => (a.weekStartDate < b.weekStartDate ? 1 : -1));
  }

  savePlan(plan: WeeklyPlan): WeeklyPlan {
    const idx = this.data.plans.findIndex(
      (p) => p.userId === plan.userId && p.weekStartDate === plan.weekStartDate,
    );
    if (idx >= 0) {
      this.data.plans[idx] = plan;
    } else {
      this.data.plans.push(plan);
    }
    this.persist();
    return plan;
  }

  updateSessionCompletion(userId: string, sessionId: string, completed: boolean): boolean {
    let found = false;
    for (const plan of this.data.plans) {
      if (plan.userId !== userId) continue;
      for (const day of plan.days) {
        for (const session of day.sessions) {
          if (session.id === sessionId) {
            found = true;
          }
        }
        if (day.sessions.some((s) => s.id === sessionId)) {
          day.completed = completed;
        }
      }
    }
    if (found) this.persist();
    return found;
  }
}

export const db = new JsonDatabase(config.dataFile);
