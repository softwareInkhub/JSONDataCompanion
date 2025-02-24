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
    console.log('Creating endpoint:', insertEndpoint);
    const [endpoint] = await db
      .insert(endpoints)
      .values(insertEndpoint)
      .returning();
    console.log('Created endpoint:', endpoint);
    return endpoint;
  }

  async getEndpoint(id: string): Promise<Endpoint | undefined> {
    console.log('Getting endpoint:', id);
    const [endpoint] = await db
      .select()
      .from(endpoints)
      .where(eq(endpoints.id, id));
    console.log('Retrieved endpoint:', endpoint);
    return endpoint;
  }

  async createSchema(insertSchema: InsertSchema): Promise<Schema> {
    console.log('Creating schema:', insertSchema);
    const [schema] = await db
      .insert(schemas)
      .values(insertSchema)
      .returning();
    console.log('Created schema:', schema);
    return schema;
  }

  async getSchema(id: string): Promise<Schema | undefined> {
    console.log('Getting schema:', id);
    const [schema] = await db
      .select()
      .from(schemas)
      .where(eq(schemas.id, id));
    console.log('Retrieved schema:', schema);
    return schema;
  }

  async listSchemas(): Promise<Schema[]> {
    console.log('Listing all schemas');
    const schemaList = await db
      .select()
      .from(schemas)
      .orderBy(schemas.createdAt);
    console.log('Retrieved schemas:', schemaList);
    return schemaList;
  }

  async updateSchema(id: string, schema: Partial<InsertSchema>): Promise<Schema> {
    console.log('Updating schema:', id, schema);
    const [updatedSchema] = await db
      .update(schemas)
      .set(schema)
      .where(eq(schemas.id, id))
      .returning();
    console.log('Updated schema:', updatedSchema);
    return updatedSchema;
  }

  async deleteSchema(id: string): Promise<void> {
    console.log('Deleting schema:', id);
    await db
      .delete(schemas)
      .where(eq(schemas.id, id));
    console.log('Deleted schema:', id);
  }
}

export const storage = new DatabaseStorage();