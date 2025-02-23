import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { OpenAI } from "openai";
import multer from "multer";
import * as Papa from "papaparse";
import * as XLSX from "xlsx";
import { insertEndpointSchema, insertSchemaSchema } from "@shared/schema";
import { generateSchemaPrompt } from "./ai-prompts";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import * as xml2js from "xml2js";
import * as cheerio from "cheerio";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

interface FilterOption {
  field: string;
  operator: "equals" | "contains" | "greaterThan" | "lessThan";
  value: any;
}

interface SortOption {
  field: string;
  direction: "asc" | "desc";
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

async function validateJsonWithSchema(jsonData: unknown, schema: Schema): Promise<unknown> {
  const zodSchema = z.object(schema.schema.properties).strict();

  if (schema.schema.required && schema.schema.required.length > 0) {
    return zodSchema.required(schema.schema.required).parse(jsonData);
  }

  return zodSchema.parse(jsonData);
}

async function regenerateSchemaFromValidationError(data: any, error: any): Promise<any> {
  const errorPrompt = `The following JSON schema validation failed for this data:
Data: ${JSON.stringify(data)}
Error: ${error.message}

Please generate a corrected JSON schema that properly validates this data structure.
Return the schema as a JSON object.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: "You are a schema correction expert. Fix the schema to properly validate the given data. Return the response as a JSON object."
      },
      {
        role: "user",
        content: errorPrompt
      }
    ],
    response_format: { type: "json_object" }
  });

  const result = JSON.parse(completion.choices[0].message.content || "{}");
  return result.schema;
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.use("/api", limiter);

  // Schema Management Routes
  app.get("/api/schemas", async (req, res) => {
    try {
      const schemas = await storage.listSchemas();
      res.json(schemas);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/schemas", async (req, res) => {
    try {
      const schema = insertSchemaSchema.parse(req.body);
      const created = await storage.createSchema(schema);
      res.json(created);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
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

  // Generate schema from JSON data
  app.post("/api/generate-schema", async (req, res) => {
    try {
      const { data } = req.body;

      if (!data) {
        return res.status(400).json({ error: "No data provided" });
      }

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a schema generator that creates JSON validation schemas based on data structure analysis. Return the response as a JSON object."
          },
          {
            role: "user",
            content: generateSchemaPrompt(data)
          }
        ],
        response_format: { type: "json_object" }
      });

      let schema = JSON.parse(completion.choices[0].message.content || "{}");

      if (!schema.schema || !schema.schema.properties) {
        throw new Error("Invalid schema generated");
      }

      // Validate the generated schema
      try {
        const zodSchema = z.object(schema.schema.properties);
        zodSchema.parse(data); // Test the schema against the original data
      } catch (validationError: any) {
        console.warn("Generated schema validation failed:", validationError);
        // Automatically adjust the schema based on validation errors
        schema.schema = await regenerateSchemaFromValidationError(data, validationError);
      }

      res.json(schema);
    } catch (error: any) {
      console.error("Schema generation error:", error);
      res.status(500).json({ 
        error: error.message,
        details: error.stack
      });
    }
  });

  // Generate endpoint from text prompt
  app.post("/api/generate", async (req, res) => {
    try {
      const { prompt, filterOptions, sortOptions, schemaId } = req.body;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a JSON data generator. Generate or modify structured JSON data based on the user's prompt and context."
          },
          {
            role: "user",
            content: prompt.includes("Context:") ? prompt : `Generate JSON data for: ${prompt}`
          }
        ],
        response_format: { type: "json_object" }
      });

      let jsonData = JSON.parse(completion.choices[0].message.content || "{}");

      // Validate against schema if provided
      if (schemaId) {
        const schema = await storage.getSchema(schemaId);
        if (schema) {
          jsonData = await validateJsonWithSchema(jsonData, schema);
        }
      }

      const endpoint = await storage.createEndpoint({
        name: prompt,
        jsonData,
        schemaId: schemaId || null,
        filterOptions: filterOptions || null,
        sortOptions: sortOptions || null
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

  const httpServer = createServer(app);
  return httpServer;
}