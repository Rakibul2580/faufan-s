import express from "express";
import { nanoid } from "nanoid";
import { authenticate } from "../middleware/auth.js";
import Link from "../models/Link.js";
import QRCode from "qrcode";

const router = express.Router();

// Create short link
router.post("/", authenticate, async (req, res) => {
  try {
    const { originalUrl, customCode, expiresInDays } = req.body;
    if (!originalUrl)
      return res.status(400).json({ error: "Original URL required" });

    let shortCode = customCode?.trim();
    if (shortCode) {
      const existing = await Link.findOne({ shortCode });
      if (existing)
        return res.status(400).json({ error: "Custom code already taken" });
    } else {
      shortCode = nanoid(6);
    }

    let expiresAt = null;
    if (expiresInDays && expiresInDays > 0) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    }

    const link = new Link({
      originalUrl,
      shortCode,
      userId: req.userId,
      expiresAt,
    });
    await link.save();

    res.status(201).json(link);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get user's links
router.get("/my-links", authenticate, async (req, res) => {
  try {
    const links = await Link.find({ userId: req.userId }).sort({
      createdAt: -1,
    });
    res.json(links);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get recent global links
router.get("/recent", async (req, res) => {
  try {
    const recent = await Link.find({
      $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("userId", "username");
    res.json(recent);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Redirect to original URL (public) - still keep for backward compatibility
router.get("/:shortCode", async (req, res) => {
  try {
    const link = await Link.findOne({ shortCode: req.params.shortCode });
    if (!link) return res.status(404).json({ error: "Link not found" });
    if (link.expiresAt && link.expiresAt < new Date()) {
      return res.status(410).json({ error: "Link expired" });
    }
    link.clicks += 1;
    await link.save();
    res.redirect(link.originalUrl);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get original URL info (for frontend if needed)
router.get("/info/:shortCode", async (req, res) => {
  try {
    const link = await Link.findOne({ shortCode: req.params.shortCode });
    if (!link) return res.status(404).json({ error: "Link not found" });
    if (link.expiresAt && link.expiresAt < new Date()) {
      return res.status(410).json({ error: "Link expired" });
    }
    res.json({ originalUrl: link.originalUrl, shortCode: link.shortCode });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete link
router.delete("/:id", authenticate, async (req, res) => {
  try {
    const link = await Link.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId,
    });
    if (!link) return res.status(404).json({ error: "Link not found" });
    res.json({ message: "Link deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Generate QR code
router.get("/qr/:shortCode", authenticate, async (req, res) => {
  try {
    const shortUrl = `${req.protocol}://${req.get("host")}/api/links/${req.params.shortCode}`;
    const qrBuffer = await QRCode.toBuffer(shortUrl, { width: 200 });
    res.setHeader("Content-Type", "image/png");
    res.send(qrBuffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
