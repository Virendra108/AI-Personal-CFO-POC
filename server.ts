import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import multer from "multer";
import { FinanceEngine } from "./src/services/financeEngine.ts";
import { GoogleGenAI } from "@google/genai";
import Groq from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.cwd());
  },
  filename: (req, file, cb) => {
    cb(null, "ai_cfo_synthetic_data.csv"); // Overwrite existing for now as per simple requirement
  },
});
const upload = multer({ storage });

async function startServer() {
  const app = express();
  const PORT = 3000;
  const financeEngine = new FinanceEngine();

  app.use(express.json());

  // API Routes
  app.get("/api/insights", (req, res) => {
    const person = (req.query.person as string) || "Bhavesh";
    try {
      const insights = financeEngine.getInsights(person);
      res.json(insights);
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  });

  app.post("/api/upload", upload.single("file"), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    try {
      // Reload data in finance engine
      financeEngine.loadData(); 
      res.json({ message: "File uploaded and data reloaded successfully" });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to reload data: " + error.message });
    }
  });

  app.post("/api/goals", (req, res) => {
    const { person, goal } = req.body;
    try {
      const newGoal = financeEngine.addGoal(person, goal);
      res.json(newGoal);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/chat", async (req, res) => {
    const { message, person = "Bhavesh" } = req.body;
    
    try {
      const groqKey = process.env.GROQ_API_KEY;
      const geminiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || process.env.GEMINI_API_KEY_1;
      
      const insights = financeEngine.getInsights(person);
      const systemInstruction = `
        You are an AI Personal CFO. Your role is to provide predictive financial insights and proactive risk alerts.
        
        Current Financial Context for ${person}:
        - Current Balance: ₹${insights.currentBalance}
        - Monthly Income: ₹${insights.monthlyIncome}
        - Monthly Expenses: ₹${insights.monthlyExpenses}
        - Monthly Surplus: ₹${insights.surplus}
        - Upcoming Fixed Expenses: ${JSON.stringify(insights.upcomingFixedExpenses)}
        - Risk Alerts: ${insights.riskAlerts.join(", ")}
        - Forecast (3 months): ${JSON.stringify(insights.forecast)}
        - Financial Goals: ${JSON.stringify(insights.goals)}
        - Priority Waterfall Allocation (from current surplus): ${JSON.stringify(insights.waterfallAllocation)}
        
        Guidelines:
        1. DO NOT perform raw arithmetic. Use the pre-calculated numbers provided above.
        2. If the user asks "Can I afford X?", use the pre-calculated surplus and upcoming fixed expenses to answer.
        3. Be proactive. Warn about month-end cash flow crunches (e.g., rent/gym due between 25th-30th).
        4. Mention Indian micro-trends if relevant (e.g., summer electricity bills, Diwali shopping).
        5. Use a professional yet conversational tone.
        6. If the user's request involves a purchase, simulate it and provide a risk score (1-10).
        7. Reference the Priority Waterfall when discussing surplus funds. Explain why certain goals are being funded before others based on priority.
      `;

      if (groqKey && groqKey !== "MY_GROQ_API_KEY") {
        const groq = new Groq({ apiKey: groqKey });
        const completion = await groq.chat.completions.create({
          messages: [
            { role: "system", content: systemInstruction },
            { role: "user", content: message }
          ],
          model: "llama-3.3-70b-versatile",
        });
        return res.json({ text: completion.choices[0]?.message?.content || "No response from Groq" });
      }

      if (!geminiKey || geminiKey === "MY_GEMINI_API_KEY") {
        return res.status(401).json({ 
          error: "No valid AI API Key found. Please set GROQ_API_KEY or GEMINI_API_KEY in the Secrets panel." 
        });
      }

      const genAI = new GoogleGenAI({ apiKey: geminiKey });
      const result = await genAI.models.generateContent({ 
        model: "gemini-3-flash-preview",
        contents: [{ parts: [{ text: message }] }],
        config: {
          systemInstruction: systemInstruction
        }
      });
      res.json({ text: result.text });
    } catch (error: any) {
      console.error("AI Error:", error);
      res.status(500).json({ error: "Failed to process request: " + (error.message || "Unknown error") });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
