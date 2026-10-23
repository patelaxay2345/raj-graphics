import { getCloudflareContext } from "@opennextjs/cloudflare";
import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1";
import { cache } from "react";
import * as schema from "@/db/schema";

export type Db = DrizzleD1Database<typeof schema>;

export const connect = (d1: D1Database): Db => drizzle(d1, { schema });

export const getDb = cache(() => connect(getCloudflareContext().env.DB));
