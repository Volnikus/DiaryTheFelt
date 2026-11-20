import "server-only";
import type { AppConfig } from "../client/media";
import { DB_DRIVER } from "./db";
import { STORAGE_DRIVER } from "./storage";

export function appConfig(): AppConfig {
  return {
    storage: STORAGE_DRIVER,
    database: DB_DRIVER,
    persistent: !process.env.VERCEL || (STORAGE_DRIVER === "blob" && DB_DRIVER !== "file"),
  };
}
