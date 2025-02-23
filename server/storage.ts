import { type Endpoint, type InsertEndpoint } from "@shared/schema";
import { v4 as uuidv4 } from "uuid";

export interface IStorage {
  createEndpoint(endpoint: InsertEndpoint): Promise<Endpoint>;
  getEndpoint(id: string): Promise<Endpoint | undefined>;
}

export class MemStorage implements IStorage {
  private endpoints: Map<string, Endpoint>;

  constructor() {
    this.endpoints = new Map();
  }

  async createEndpoint(insertEndpoint: InsertEndpoint): Promise<Endpoint> {
    const id = uuidv4();
    const endpoint: Endpoint = {
      id,
      ...insertEndpoint,
      createdAt: new Date()
    };
    this.endpoints.set(id, endpoint);
    return endpoint;
  }

  async getEndpoint(id: string): Promise<Endpoint | undefined> {
    return this.endpoints.get(id);
  }
}

export const storage = new MemStorage();
