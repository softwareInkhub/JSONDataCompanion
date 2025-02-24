import { pgTable, text, uuid, jsonb, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Schema table definition
export const schemas = pgTable("schemas", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  version: integer("version").default(1),
  schema: jsonb("schema").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// Endpoints table definition
export const endpoints = pgTable("endpoints", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  jsonData: jsonb("json_data").notNull(),
  schemaId: uuid("schema_id").references(() => schemas.id),
  filterOptions: jsonb("filter_options"),
  sortOptions: jsonb("sort_options"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// Schema validation types
export const schemaPropertySchema = z.object({
  type: z.enum(["string", "number", "boolean", "array", "object", "null"]),
  description: z.string().optional(),
  required: z.boolean().optional(),
  format: z.string().optional(),
  minimum: z.number().optional(),
  maximum: z.number().optional(),
  minLength: z.number().optional(),
  maxLength: z.number().optional(),
  pattern: z.string().optional(),
  enum: z.array(z.union([z.string(), z.number()])).optional(),
  items: z.lazy(() => schemaPropertySchema).optional(),
  properties: z.record(z.lazy(() => schemaPropertySchema)).optional(),
});

export const insertSchemaSchema = createInsertSchema(schemas).extend({
  schema: z.object({
    type: z.literal("object"),
    properties: z.record(schemaPropertySchema),
    required: z.array(z.string()).optional(),
    additionalProperties: z.boolean().optional(),
  })
});

export const insertEndpointSchema = createInsertSchema(endpoints);

// Type exports
export type InsertSchema = z.infer<typeof insertSchemaSchema>;
export type Schema = typeof schemas.$inferSelect;
export type InsertEndpoint = z.infer<typeof insertEndpointSchema>;
export type Endpoint = typeof endpoints.$inferSelect;