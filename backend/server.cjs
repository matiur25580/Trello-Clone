const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { randomUUID } = require("node:crypto");

dotenv.config();

const app = express();
const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:3000,http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    // Allow non-browser clients (curl, health checks) and configured browser origins.
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("Origin is not allowed by CORS."));
  },
}));
app.use(express.json({ limit: "16kb" }));

// Demo storage only: data is reset whenever this process restarts.
const boards = [
  { _id: "default-1", title: "⏳ Pending", cards: [] },
  { _id: "default-2", title: "🚀 Backlog", cards: [] },
  { _id: "default-3", title: "💻 In Progress", cards: [] },
  { _id: "default-4", title: "🔍 Code Review", cards: [] },
  { _id: "default-5", title: "✅ Done", cards: [] },
];

app.get("/", (_req, res) => {
  res.json({ name: "Trello Clone API", status: "ok" });
});

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "healthy" });
});

app.get("/api/boards", (_req, res) => {
  res.json(boards);
});

app.post("/api/boards", (req, res) => {
  const title = typeof req.body?.title === "string" ? req.body.title.trim() : "";
  if (!title || title.length > 100) {
    return res.status(400).json({ error: "Board title is required (max 100 characters)." });
  }

  const board = {
    _id: randomUUID(),
    title,
    description: typeof req.body.description === "string"
      ? req.body.description.trim().slice(0, 500)
      : "",
    cards: [],
  };
  boards.push(board);
  return res.status(201).json({ message: "Board created successfully.", board });
});

app.post("/api/cards", (req, res) => {
  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
    return res.status(400).json({ error: "A card object is required." });
  }

  // The current frontend contract is not yet connected to persistent card storage.
  return res.status(202).json({
    message: "Card payload accepted by the demo API; persistent card storage is not configured.",
    data: req.body,
  });
});

app.use((error, _req, res, _next) => {
  if (error.message === "Origin is not allowed by CORS.") {
    return res.status(403).json({ error: "Origin is not allowed." });
  }
  if (error instanceof SyntaxError && error.status === 400) {
    return res.status(400).json({ error: "Invalid JSON request body." });
  }
  if (error.status === 413) {
    return res.status(413).json({ error: "Request body is too large." });
  }
  console.error("API error:", error.message);
  return res.status(500).json({ error: "An unexpected server error occurred." });
});

const PORT = Number(process.env.PORT) || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Trello demo API listening on port ${PORT}`);
});
