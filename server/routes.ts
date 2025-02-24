import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { OpenAI } from "openai";
import { z } from "zod";
import { generateSchemaPrompt } from "./ai-prompts";
import { insertSchemaSchema, schemas, endpoints } from "@shared/schema";
import rateLimit from "express-rate-limit";
import { db } from "./db";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

function createZodSchema(schemaProperty: any): z.ZodType {
  try {
    console.log('Creating Zod schema for property:', JSON.stringify(schemaProperty, null, 2));

    if (!schemaProperty || !schemaProperty.type) {
      throw new Error('Invalid schema property: missing type');
    }

    let schema: z.ZodType;

    switch (schemaProperty.type) {
      case "string": {
        schema = z.string();
        if (schemaProperty.minLength !== undefined) {
          schema = schema.min(schemaProperty.minLength, `Minimum length is ${schemaProperty.minLength}`);
        }
        if (schemaProperty.maxLength !== undefined) {
          schema = schema.max(schemaProperty.maxLength, `Maximum length is ${schemaProperty.maxLength}`);
        }
        if (schemaProperty.pattern) {
          schema = schema.regex(new RegExp(schemaProperty.pattern), 'Invalid format');
        }
        break;
      }

      case "number": {
        schema = z.number();
        if (schemaProperty.minimum !== undefined) {
          schema = schema.min(schemaProperty.minimum, `Minimum value is ${schemaProperty.minimum}`);
        }
        if (schemaProperty.maximum !== undefined) {
          schema = schema.max(schemaProperty.maximum, `Maximum value is ${schemaProperty.maximum}`);
        }
        break;
      }

      case "boolean": {
        schema = z.boolean();
        break;
      }

      case "array": {
        if (!schemaProperty.items) {
          throw new Error('Array type must have items defined');
        }
        const itemSchema = createZodSchema(schemaProperty.items);
        schema = z.array(itemSchema);
        if (schemaProperty.minItems !== undefined) {
          schema = schema.min(schemaProperty.minItems, `Minimum ${schemaProperty.minItems} items required`);
        }
        if (schemaProperty.maxItems !== undefined) {
          schema = schema.max(schemaProperty.maxItems, `Maximum ${schemaProperty.maxItems} items allowed`);
        }
        break;
      }

      case "object": {
        if (!schemaProperty.properties) {
          throw new Error('Object type must have properties defined');
        }

        const shape: Record<string, z.ZodType> = {};
        const required = new Set(schemaProperty.required || []);

        // Process each property
        for (const [key, value] of Object.entries(schemaProperty.properties)) {
          let propertySchema = createZodSchema(value as any);

          // Make non-required fields optional
          if (!required.has(key)) {
            propertySchema = propertySchema.optional();
          }

          shape[key] = propertySchema;
        }

        schema = z.object(shape);
        break;
      }

      default:
        throw new Error(`Unsupported schema type: ${schemaProperty.type}`);
    }

    if (schemaProperty.description) {
      schema = schema.describe(schemaProperty.description);
    }

    return schema;
  } catch (error) {
    console.error('Error creating Zod schema:', error);
    throw error;
  }
}

async function validateJsonWithSchema(jsonData: unknown, schema: any): Promise<unknown> {
  try {
    console.log('Validating with schema:', JSON.stringify(schema, null, 2));

    if (!schema.type || schema.type !== 'object' || !schema.properties) {
      throw new Error('Invalid schema structure');
    }

    const zodSchema = createZodSchema(schema);
    console.log('Created Zod schema successfully');

    const result = zodSchema.parse(jsonData);
    console.log('Validation successful');
    return result;
  } catch (error) {
    console.error('Schema validation error:', error);
    throw error;
  }
}

async function regenerateSchemaFromValidationError(data: any): Promise<any> {
  try {
    const inferType = (value: any): string => {
      if (value === null) return "null";
      if (Array.isArray(value)) return "array";
      if (typeof value === "object") return "object";
      return typeof value;
    };

    const inferValidations = (value: any, type: string): any => {
      switch (type) {
        case "string":
          return {
            minLength: value?.length || 0,
            maxLength: value?.length ? value.length * 2 : 100
          };
        case "number":
          return {
            minimum: typeof value === "number" ? Math.floor(value) : null,
            maximum: typeof value === "number" ? Math.ceil(value * 2) : null
          };
        default:
          return {};
      }
    };

    const inferSchema = (value: any): any => {
      const type = inferType(value);
      const baseSchema: any = {
        type,
        description: `${type} field`,
        ...inferValidations(value, type)
      };

      if (type === "array") {
        const sampleItem = value.length > 0 ? value[0] : null;
        baseSchema.items = sampleItem ? inferSchema(sampleItem) : { type: "string" };
        baseSchema.minItems = 0;
        baseSchema.maxItems = value.length * 2 || 10;
      } else if (type === "object") {
        const properties: Record<string, any> = {};
        const required: string[] = [];

        Object.entries(value || {}).forEach(([key, val]) => {
          properties[key] = inferSchema(val);
          if (val !== null && val !== undefined) {
            required.push(key);
          }
        });

        baseSchema.properties = properties;
        baseSchema.required = required;
      }

      return baseSchema;
    };

    console.log('Regenerating schema for data:', JSON.stringify(data, null, 2));
    const schema = inferSchema(data);
    console.log('Generated schema:', JSON.stringify(schema, null, 2));

    return schema;
  } catch (error) {
    console.error("Error regenerating schema:", error);
    throw error;
  }
}

function inferSchemaFromData(data: any): any {
  function createSchema(value: any): any {
    if (Array.isArray(value)) {
      const sampleItem = value.length > 0 ? value[0] : null;
      return {
        type: "array",
        items: sampleItem ? createSchema(sampleItem) : { type: "string" }
      };
    }

    if (typeof value === "object" && value !== null) {
      const properties: Record<string, any> = {};
      Object.entries(value).forEach(([key, val]) => {
        properties[key] = createSchema(val);
      });
      return {
        type: "object",
        properties
      };
    }

    return { type: typeof value };
  }

  try {
    const schema = createSchema(data);
    console.log('Generated schema:', JSON.stringify(schema, null, 2));
    return schema;
  } catch (error) {
    console.error('Schema generation error:', error);
    throw error;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Schema Management Routes
  app.get("/api/schemas", async (req, res) => {
    try {
      const schemas = await storage.listSchemas();
      res.json(schemas);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/generate-schema", async (req, res) => {
    try {
      const { data } = req.body;
      if (!data) {
        return res.status(400).json({ error: "No data provided" });
      }

      const schema = inferSchemaFromData(data);
      res.json({ schema });
    } catch (error: any) {
      console.error("Schema generation error:", error);
      res.status(500).json({
        error: "Failed to generate schema",
        details: error.message
      });
    }
  });

  app.post("/api/schemas", async (req, res) => {
    try {
      console.log("Receiving schema creation request:", req.body);
      const schema = insertSchemaSchema.parse(req.body);
      console.log("Validated schema:", schema);

      const created = await storage.createSchema(schema);
      console.log("Created schema in database:", created);

      res.json(created);
    } catch (error: any) {
      console.error("Schema creation error:", error);
      res.status(400).json({
        error: error.message,
        details: error.errors || error.cause
      });
    }
  });

  app.put("/api/schemas/:id", async (req, res) => {
    try {
      const schema = insertSchemaSchema.parse(req.body);
      const updated = await storage.updateSchema(req.params.id, schema);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/schemas/:id", async (req, res) => {
    try {
      await storage.deleteSchema(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/generate", async (req, res) => {
    try {
      const { prompt, context } = req.body;

      if (!prompt) {
        return res.status(400).json({ error: "No prompt provided" });
      }

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a JSON data enhancer. Analyze the existing data structure and enhance it based on the user's request. Maintain the same structure but add or modify data as requested."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" }
      });

      let jsonData = JSON.parse(completion.choices[0].message.content || "{}");

      // Create endpoint with enhanced data
      const endpoint = await storage.createEndpoint({
        name: prompt,
        jsonData,
        schemaId: null,
        filterOptions: null,
        sortOptions: null
      });

      res.json({
        id: endpoint.id,
        jsonData,
        apiUrl: `/api/${endpoint.id}`
      });

    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Generate endpoint from file upload
  app.post("/api/upload", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      let jsonData;
      const fileName = req.file.originalname;
      const fileContent = req.file.buffer.toString();

      if (fileName.endsWith(".json")) {
        try {
          jsonData = JSON.parse(fileContent);
        } catch (error) {
          return res.status(400).json({ error: "Invalid JSON format" });
        }
      } else if (fileName.endsWith(".xml")) {
        try {
          jsonData = await parseXML(fileContent);
        } catch (error: any) {
          return res.status(400).json({ error: error.message });
        }
      } else if (fileName.endsWith(".html")) {
        try {
          jsonData = parseHTML(fileContent);
        } catch (error) {
          return res.status(400).json({ error: error.message });
        }
      } else if (fileName.endsWith(".csv")) {
        const { data, errors } = Papa.parse(fileContent, {
          header: true,
          skipEmptyLines: true,
          dynamicTyping: true
        });

        if (errors.length > 0) {
          return res.status(400).json({
            error: "CSV parsing errors",
            details: errors
          });
        }

        let processedData = cleanData(data);
        const types = detectDataTypes(processedData);
        jsonData = convertDataTypes(processedData, types);
      } else if (fileName.match(/\.xlsx?$/)) {
        const workbook = XLSX.read(req.file.buffer);
        jsonData = {};

        workbook.SheetNames.forEach(sheetName => {
          const sheet = workbook.Sheets[sheetName];
          let data = XLSX.utils.sheet_to_json(sheet, {
            raw: false,
            defval: null
          });

          let processedData = cleanData(data);
          const types = detectDataTypes(processedData);
          jsonData[sheetName] = convertDataTypes(processedData, types);
        });

        if (workbook.SheetNames.length === 1) {
          jsonData = jsonData[workbook.SheetNames[0]];
        }
      } else if (fileName.endsWith(".txt")) {
        // Try to detect and parse the content format
        const content = fileContent.trim();
        try {
          // Try JSON first
          jsonData = JSON.parse(content);
        } catch {
          try {
            // Try XML
            jsonData = await parseXML(content);
          } catch {
            // Fallback to treating it as plain text
            jsonData = { content: content.split('\n').map(line => line.trim()) };
          }
        }
      } else {
        return res.status(400).json({ error: "Unsupported file format" });
      }

      const endpoint = await storage.createEndpoint({
        prompt: `File upload: ${fileName}`,
        fileName,
        jsonData,
        filterOptions: null,
        sortOptions: null
      });

      res.json({
        id: endpoint.id,
        jsonData,
        apiUrl: `/api/${endpoint.id}`
      });

    } catch (error: any) {
      res.status(500).json({
        error: "File processing error",
        message: error.message
      });
    }
  });

  // Get endpoint data
  app.get("/api/:id", async (req, res) => {
    try {
      const endpoint = await storage.getEndpoint(req.params.id);

      if (!endpoint) {
        return res.status(404).json({ error: "Endpoint not found" });
      }

      let jsonData = endpoint.jsonData;

      // Apply runtime filtering and sorting if provided in query parameters
      const filterOptions = req.query.filter ? JSON.parse(req.query.filter as string) : null;
      const sortOptions = req.query.sort ? JSON.parse(req.query.sort as string) : null;

      if (Array.isArray(jsonData) && filterOptions) {
        jsonData = applyFilter(jsonData, filterOptions);
      }

      if (Array.isArray(jsonData) && sortOptions) {
        jsonData = applySort(jsonData, sortOptions);
      }

      res.json(jsonData);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Add /api/test-api endpoint
  app.post("/api/test-api", async (req, res) => {
    try {
      const { url, method = 'GET', headers = {}, body } = req.body;

      if (!url) {
        return res.status(400).json({ error: "URL is required" });
      }

      // Validate and prepare fetch options
      const fetchOptions: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      };

      if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        fetchOptions.body = JSON.stringify(body);
      }

      const response = await fetch(url, fetchOptions);

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      let data;
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else {
        // Handle non-JSON responses
        const text = await response.text();
        data = { content: text };
      }

      // Create a new endpoint with the fetched data
      const endpoint = await storage.createEndpoint({
        prompt: `API Test: ${url}`,
        jsonData: data,
        fileName: null,
        filterOptions: null,
        sortOptions: null,
        sourceApiUrl: url // Store the source API URL
      });

      res.json({
        id: endpoint.id,
        jsonData: data,
        apiUrl: `/api/${endpoint.id}`,
        sourceApiUrl: url
      });

    } catch (error: any) {
      res.status(500).json({
        error: "API request failed",
        message: error.message
      });
    }
  });

  // Update the SQL query execution endpoint
  app.post("/api/execute-sql", async (req, res) => {
    try {
      const { query } = req.body;

      if (!query) {
        return res.status(400).json({ error: "No query provided" });
      }

      // Execute the query using drizzle
      const result = await db.execute(query);

      // Transform the result to handle dates and complex objects
      const transformedResult = JSON.parse(JSON.stringify(result, (key, value) => {
        if (value instanceof Date) {
          return value.toISOString();
        }
        return value;
      }));

      res.json(transformedResult);
    } catch (error: any) {
      console.error('SQL execution error:', error);
      res.status(500).json({
        error: "Query execution failed",
        message: error.message
      });
    }
  });

  // Update the table data endpoint
  app.get("/api/table-data/:table", async (req, res) => {
    try {
      const { table } = req.params;

      if (!['schemas', 'endpoints'].includes(table)) {
        return res.status(400).json({ error: "Invalid table name" });
      }

      const result = await db.select().from(table === 'schemas' ? schemas : endpoints);

      // Transform the result to handle dates and complex objects
      const transformedResult = JSON.parse(JSON.stringify(result, (key, value) => {
        if (value instanceof Date) {
          return value.toISOString();
        }
        return value;
      }));

      res.json(transformedResult);
    } catch (error: any) {
      console.error('Table data fetch error:', error);
      res.status(500).json({
        error: "Failed to fetch table data",
        message: error.message
      });
    }
  });


  app.use("/api", limiter);
  const httpServer = createServer(app);
  return httpServer;
}

function cleanData(data: any[]): any[] {
  return data.map(row => {
    const cleanRow: { [key: string]: any } = {};
    for (const [key, value] of Object.entries(row)) {
      // Remove special characters and spaces from keys
      const cleanKey = key.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
      // Convert empty strings to null
      cleanRow[cleanKey] = value === '' ? null : value;
    }
    return cleanRow;
  });
}

function detectDataTypes(data: any[]): { [key: string]: string } {
  const types: { [key: string]: Set<string> } = {};

  data.forEach(row => {
    Object.entries(row).forEach(([key, value]) => {
      if (!types[key]) {
        types[key] = new Set();
      }

      if (value === null) {
        types[key].add('null');
      } else if (typeof value === 'number') {
        types[key].add('number');
      } else if (!isNaN(Date.parse(value as string))) {
        types[key].add('date');
      } else {
        types[key].add('string');
      }
    });
  });

  const finalTypes: { [key: string]: string } = {};
  Object.entries(types).forEach(([key, typeSet]) => {
    if (typeSet.has('number') && typeSet.size === 2 && typeSet.has('null')) {
      finalTypes[key] = 'number';
    } else if (typeSet.has('date') && typeSet.size === 2 && typeSet.has('null')) {
      finalTypes[key] = 'date';
    } else {
      finalTypes[key] = 'string';
    }
  });

  return finalTypes;
}

function convertDataTypes(data: any[], types: { [key: string]: string }): any[] {
  return data.map(row => {
    const convertedRow: { [key: string]: any } = {};
    Object.entries(row).forEach(([key, value]) => {
      if (value === null) {
        convertedRow[key] = null;
      } else if (types[key] === 'number') {
        convertedRow[key] = Number(value);
      } else if (types[key] === 'date') {
        convertedRow[key] = new Date(value as string).toISOString();
      } else {
        convertedRow[key] = String(value);
      }
    });
    return convertedRow;
  });
}

function applyFilter(data: any[], filter: FilterOption) {
  return data.filter(item => {
    const value = item[filter.field];
    switch (filter.operator) {
      case "equals":
        return value === filter.value;
      case "contains":
        return String(value).toLowerCase().includes(filter.value.toLowerCase());
      case "greaterThan":
        return Number(value) > Number(filter.value);
      case "lessThan":
        return Number(value) < Number(filter.value);
      default:
        return true;
    }
  });
}

function applySort(data: any[], sort: SortOption) {
  return [...data].sort((a, b) => {
    const aVal = a[sort.field];
    const bVal = b[sort.field];
    const modifier = sort.direction === "asc" ? 1 : -1;

    if (typeof aVal === "string") {
      return aVal.localeCompare(bVal) * modifier;
    }
    return (aVal - bVal) * modifier;
  });
}

async function parseXML(xmlContent: string): Promise<any> {
  try {
    const parser = new xml2js.Parser({
      explicitArray: false,
      mergeAttrs: true,
      normalize: true,
      normalizeTags: true
    });
    return await parser.parseStringPromise(xmlContent);
  } catch (error) {
    throw new Error("Invalid XML format");
  }
}

function parseHTML(htmlContent: string): any {
  try {
    const $ = cheerio.load(htmlContent);
    const data: any = {};

    // Extract table data if present
    const tables: any[] = [];
    $('table').each((i, table) => {
      const tableData: any[] = [];
      $(table).find('tr').each((j, row) => {
        const rowData: any[] = [];
        $(row).find('th, td').each((k, cell) => {
          rowData.push($(cell).text().trim());
        });
        if (rowData.length > 0) {
          tableData.push(rowData);
        }
      });
      if (tableData.length > 0) {
        tables.push(tableData);
      }
    });

    if (tables.length > 0) {
      data.tables = tables;
    }

    // Extract lists
    const lists: any[] = [];
    $('ul, ol').each((i, list) => {
      const items: string[] = [];
      $(list).find('li').each((j, item) => {
        items.push($(item).text().trim());
      });
      if (items.length > 0) {
        lists.push(items);
      }
    });

    if (lists.length > 0) {
      data.lists = lists;
    }

    return data;
  } catch (error) {
    throw new Error("Invalid HTML format");
  }
}

interface Schema {
  schema: any;
  required?: string[];
}

interface FilterOption {
  field: string;
  operator: "equals" | "contains" | "greaterThan" | "lessThan";
  value: any;
}

interface SortOption {
  field: string;
  direction: "asc" | "desc";
}


import multer from "multer";
import * as Papa from "papaparse";
import * as XLSX from "xlsx";
import * as xml2js from "xml2js";
import * as cheerio from "cheerio";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});