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
export type SchemaProperty = {
  type: "string" | "number" | "boolean" | "array" | "object" | "null";
  description?: string;
  required?: boolean;
  format?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  enum?: (string | number)[];
  items?: SchemaProperty;
  properties?: Record<string, SchemaProperty>;
};

export const schemaPropertySchema: z.ZodType<SchemaProperty> = z.lazy(() => 
  z.object({
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
    items: schemaPropertySchema.optional(),
    properties: z.record(schemaPropertySchema).optional(),
  })
);

export const insertSchemaSchema = createInsertSchema(schemas).extend({
  schema: z.object({
    type: z.literal("object"),
    properties: z.record(schemaPropertySchema),
    required: z.array(z.string()).optional(),
    additionalProperties: z.boolean().optional(),
  })
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
  name: true,
  jsonData: true,
  schemaId: true,
  filterOptions: true,
  sortOptions: true
});

// Type exports
export type InsertSchema = z.infer<typeof insertSchemaSchema>;
export type Schema = typeof schemas.$inferSelect;
export type InsertEndpoint = z.infer<typeof insertEndpointSchema>;
export type Endpoint = typeof endpoints.$inferSelect;
export type FilterOption = z.infer<typeof filterOptionSchema>;
export type SortOption = z.infer<typeof sortOptionSchema>;