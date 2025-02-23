import { pgTable, text, uuid, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const endpoints = pgTable("endpoints", {
  id: uuid("id").defaultRandom().primaryKey(),
  prompt: text("prompt").notNull(),
  fileName: text("file_name"),
  jsonData: jsonb("json_data").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const insertEndpointSchema = createInsertSchema(endpoints).pick({
  prompt: true,
  fileName: true,
  jsonData: true
});

export type InsertEndpoint = z.infer<typeof insertEndpointSchema>;
export type Endpoint = typeof endpoints.$inferSelect;
