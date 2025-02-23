import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { OpenAI } from "openai";
import multer from "multer";
import * as Papa from "papaparse";
import * as XLSX from "xlsx";
import { insertEndpointSchema } from "@shared/schema";
import { z } from "zod";
import rateLimit from "express-rate-limit";

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

export async function registerRoutes(app: Express): Promise<Server> {
  app.use("/api", limiter);

  // Generate endpoint from text prompt
  app.post("/api/generate", async (req, res) => {
    try {
      const { prompt, filterOptions, sortOptions } = req.body;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a JSON data generator. Generate structured JSON data based on the user's prompt."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" }
      });

      let jsonData = JSON.parse(completion.choices[0].message.content);

      // Apply filtering and sorting if provided
      if (Array.isArray(jsonData) && filterOptions) {
        jsonData = applyFilter(jsonData, filterOptions);
      }

      if (Array.isArray(jsonData) && sortOptions) {
        jsonData = applySort(jsonData, sortOptions);
      }

      const endpoint = await storage.createEndpoint({
        prompt,
        jsonData,
        fileName: null,
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

      if (fileName.endsWith(".csv")) {
        const csvString = req.file.buffer.toString();
        const { data, errors } = Papa.parse(csvString, { 
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

        // Clean and process the data
        let processedData = cleanData(data);
        const types = detectDataTypes(processedData);
        jsonData = convertDataTypes(processedData, types);

      } else if (fileName.match(/\.xlsx?$/)) {
        const workbook = XLSX.read(req.file.buffer);

        // Process all sheets
        jsonData = {};
        workbook.SheetNames.forEach(sheetName => {
          const sheet = workbook.Sheets[sheetName];
          let data = XLSX.utils.sheet_to_json(sheet, { 
            raw: false,
            defval: null
          });

          // Clean and process the data
          let processedData = cleanData(data);
          const types = detectDataTypes(processedData);
          jsonData[sheetName] = convertDataTypes(processedData, types);
        });

        // If there's only one sheet, use its data directly
        if (workbook.SheetNames.length === 1) {
          jsonData = jsonData[workbook.SheetNames[0]];
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

  const httpServer = createServer(app);
  return httpServer;
}