import express from "express";
import { body, validationResult } from "express-validator";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = express.Router();

router.post(
  "/register",
  body("username").trim().isLength({ min: 3 }),
  body("email").isEmail().normalizeEmail(),
  body("password").isLength({ min: 6 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    try {
      const { username, email, password } = req.body;
      const existingUser = await User.findOne({
        $or: [{ email }, { username }],
      });
      if (existingUser)
        return res.status(400).json({ error: "User already exists" });

      const user = new User({ username, email, password });
      await user.save();

      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
        expiresIn: "7d",
      });
      res
        .status(201)
        .json({
          token,
          user: { id: user._id, username: user.username, email: user.email },
        });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
);

router.post(
  "/login",
  body("email").isEmail().normalizeEmail(),
  body("password").notEmpty(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email });
      if (!user) return res.status(401).json({ error: "Invalid credentials" });

      const isMatch = await user.comparePassword(password);
      if (!isMatch)
        return res.status(401).json({ error: "Invalid credentials" });

      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
        expiresIn: "7d",
      });
      res.json({
        token,
        user: { id: user._id, username: user.username, email: user.email },
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
);

export default router;
