import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";

console.log("Starting StaffVerify API in TypeScript...");

import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

// Import routes
import authRoutes from "./routes/authRoutes.js";
import staffRoutes from "./routes/staffRoutes.js";
import eligibilityRoutes from "./routes/eligibilityRoutes.js";
import billingRoutes from "./routes/billingRoutes.js";
import automationRoutes from "./routes/automationRoutes.js";
import storageRoutes from "./routes/storageRoutes.js";
import clientRoutes from "./routes/clientRoutes.js";
import priorAuthRoutes from "./routes/priorAuthRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import payerRuleRoutes from "./routes/payerRuleRoutes.js";
import pricingRoutes from "./routes/pricingRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import subscriberRoutes from "./routes/subscriberRoutes.js";
import providerRoutes from "./routes/providerRoutes.js";
import knowledgeBaseRoutes from "./routes/knowledgeBaseRoutes.js";
import payrollRoutes from "./routes/payrollRoutes.js";
import activityRoutes from "./routes/activityRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import emailRoutes from "./routes/emailRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// CORS configuration - allow frontend origins
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim())
  : ["http://localhost:3010", "http://127.0.0.1:3010"];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin) || allowedOrigins.includes("*")) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));

// Request logging
app.use(morgan("dev"));

// Serve uploaded files statically
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.get("/", (_req: express.Request, res: express.Response) => {
  res.json({ status: "ok", service: "staffverify-api" });
});

app.get("/health", (_req: express.Request, res: express.Response) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/eligibility", eligibilityRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/automation", automationRoutes);
app.use("/api/storage", storageRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/prior-auth", priorAuthRoutes);
app.use("/api/users", userRoutes);
app.use("/api/payer-rules", payerRuleRoutes);
app.use("/api/pricing", pricingRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/subscribers", subscriberRoutes);
app.use("/api/providers", providerRoutes);
app.use("/api/knowledge-base", knowledgeBaseRoutes);
app.use("/api/payroll", payrollRoutes);
app.use("/api/activity", activityRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/email", emailRoutes);

// Error Handling
app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT || 3011;

// Only listen if this file is run directly
if (process.argv[1] === __filename) {
  app.listen(PORT, () => {
    console.log(`StaffVerify API running on port ${PORT}`);
  });
}

export default app;
