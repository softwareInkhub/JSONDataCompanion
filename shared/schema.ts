import { pgTable, text, uuid, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const endpoints = pgTable("endpoints", {
  id: uuid("id").defaultRandom().primaryKey(),
  prompt: text("prompt").notNull(),
  fileName: text("file_name"),
  jsonData: jsonb("json_data").notNull(),
  filterOptions: jsonb("filter_options"),
  sortOptions: jsonb("sort_options"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const filterOptionSchema = z.object({
  field: z.string(),
  operator: z.enum(["equals", "contains", "greaterThan", "lessThan"]),
  value: z.string()
});

export const sortOptionSchema = z.object({
  field: z.string(),
  direction: z.enum(["asc", "desc"])
});

export const insertEndpointSchema = createInsertSchema(endpoints).pick({
  prompt: true,
  fileName: true,
  jsonData: true,
  filterOptions: true,
  sortOptions: true
});

export type InsertEndpoint = z.infer<typeof insertEndpointSchema>;
export type Endpoint = typeof endpoints.$inferSelect;
export type FilterOption = z.infer<typeof filterOptionSchema>;
export type SortOption = z.infer<typeof sortOptionSchema>;