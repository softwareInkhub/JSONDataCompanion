import { endpoints, schemas, type Endpoint, type InsertEndpoint, type Schema, type InsertSchema } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  createEndpoint(endpoint: InsertEndpoint): Promise<Endpoint>;
  getEndpoint(id: string): Promise<Endpoint | undefined>;
  createSchema(schema: InsertSchema): Promise<Schema>;
  getSchema(id: string): Promise<Schema | undefined>;
  listSchemas(): Promise<Schema[]>;
  updateSchema(id: string, schema: Partial<InsertSchema>): Promise<Schema>;
  deleteSchema(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async createEndpoint(insertEndpoint: InsertEndpoint): Promise<Endpoint> {
    const [endpoint] = await db
      .insert(endpoints)
      .values(insertEndpoint)
      .returning();
    return endpoint;
  }

  async getEndpoint(id: string): Promise<Endpoint | undefined> {
    const [endpoint] = await db
      .select()
      .from(endpoints)
      .where(eq(endpoints.id, id));
    return endpoint;
  }

  async createSchema(insertSchema: InsertSchema): Promise<Schema> {
    const [schema] = await db
      .insert(schemas)
      .values(insertSchema)
      .returning();
    return schema;
  }

  async getSchema(id: string): Promise<Schema | undefined> {
    const [schema] = await db
      .select()
      .from(schemas)
      .where(eq(schemas.id, id));
    return schema;
  }

  async listSchemas(): Promise<Schema[]> {
    return await db
      .select()
      .from(schemas)
      .orderBy(schemas.createdAt);
  }

  async updateSchema(id: string, schema: Partial<InsertSchema>): Promise<Schema> {
    const [updatedSchema] = await db
      .update(schemas)
      .set(schema)
      .where(eq(schemas.id, id))
      .returning();
    return updatedSchema;
  }

  async deleteSchema(id: string): Promise<void> {
    await db
      .delete(schemas)
      .where(eq(schemas.id, id));
  }
}

export const storage = new DatabaseStorage();