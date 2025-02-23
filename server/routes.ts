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
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

export async function registerRoutes(app: Express): Promise<Server> {
  app.use("/api", limiter);

  // Generate endpoint from text prompt
  app.post("/api/generate", async (req, res) => {
    try {
      const { prompt } = req.body;
      
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

      const jsonData = JSON.parse(completion.choices[0].message.content);
      
      const endpoint = await storage.createEndpoint({
        prompt,
        jsonData,
        fileName: null
      });

      res.json({ 
        id: endpoint.id,
        jsonData,
        apiUrl: `/api/${endpoint.id}`
      });

    } catch (error) {
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
        const { data } = Papa.parse(csvString, { header: true });
        jsonData = data;
      } else if (fileName.match(/\.xlsx?$/)) {
        const workbook = XLSX.read(req.file.buffer);
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        jsonData = XLSX.utils.sheet_to_json(firstSheet);
      } else {
        return res.status(400).json({ error: "Unsupported file format" });
      }

      const endpoint = await storage.createEndpoint({
        prompt: `File upload: ${fileName}`,
        fileName,
        jsonData
      });

      res.json({
        id: endpoint.id,
        jsonData,
        apiUrl: `/api/${endpoint.id}`
      });

    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get endpoint data
  app.get("/api/:id", async (req, res) => {
    try {
      const endpoint = await storage.getEndpoint(req.params.id);
      
      if (!endpoint) {
        return res.status(404).json({ error: "Endpoint not found" });
      }

      res.json(endpoint.jsonData);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
