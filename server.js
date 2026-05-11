import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import compression from "compression";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import authRoutes from "./routes/auth.js";
import linkRoutes from "./routes/links.js";
import Link from "./models/Link.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(compression());
app.use(cors());
app.use(express.json());

// Database connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error(err));

// ---------- FAST REDIRECT for short codes (no React load) ----------
// This must be placed before API routes and static files
app.get("/:shortCode", async (req, res, next) => {
  const { shortCode } = req.params;

  // Skip if it's an API route, static file, or has dot extension
  if (
    shortCode === "api" ||
    shortCode === "health" ||
    shortCode.includes(".")
  ) {
    return next();
  }

  try {
    const link = await Link.findOne({ shortCode });
    if (!link) return next(); // pass to React router (404 page)
    if (link.expiresAt && link.expiresAt < new Date()) {
      return next();
    }
    // Increment clicks (non-blocking, but we do it before redirect)
    link.clicks += 1;
    await link.save();
    // 301 Permanent Redirect for SEO and speed
    return res.redirect(301, link.originalUrl);
  } catch (err) {
    console.error(err);
    return next();
  }
});

app.get("/", async (req, res) => {
  res.send("Welcome to SortLink API");
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/links", linkRoutes);

// Health check
app.get("/api/health", (req, res) => res.send("OK"));

// Serve frontend static files (after building)
const frontendDist = path.join(__dirname, "../frontend/dist");
app.use(express.static(frontendDist));
app.get("*", (req, res) => {
  res.sendFile(path.join(frontendDist, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
