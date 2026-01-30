require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ObjectId } = require("mongodb");

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Required env vars (Task 11)
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("❌ MONGO_URI is missing. Add it to .env (local) or Render env vars (prod).");
  process.exit(1);
}

// ✅ New database for this project (MongoDB creates it when you insert first doc)
const DB_NAME = "shop";
const COLLECTION = "items";

const client = new MongoClient(MONGO_URI);
let items;

async function start() {
  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");

    const db = client.db(DB_NAME);
    items = db.collection(COLLECTION);

    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  }
}

// GET /
app.get("/", (req, res) => {
  res.json({ message: "Backend API is running", db: DB_NAME, collection: COLLECTION });
});

// GET /api/items
app.get("/api/items", async (req, res) => {
  try {
    const list = await items.find({}).sort({ _id: -1 }).toArray();
    res.json({ count: list.length, items: list });
  } catch (err) {
    console.error("GET /api/items error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/items/:id
app.get("/api/items/:id", async (req, res) => {
  const { id } = req.params;
  if (!ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid id" });

  try {
    const item = await items.findOne({ _id: new ObjectId(id) });
    if (!item) return res.status(404).json({ error: "Item not found" });
    res.json(item);
  } catch (err) {
    console.error("GET /api/items/:id error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/items
app.post("/api/items", async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name || typeof name !== "string") {
      return res.status(400).json({ error: "name (string) is required" });
    }
    if (description !== undefined && typeof description !== "string") {
      return res.status(400).json({ error: "description must be string" });
    }

    const doc = {
      name: name.trim(),
      description: description ? description.trim() : "",
      createdAt: new Date(),
    };

    const result = await items.insertOne(doc);
    res.status(201).json({ _id: result.insertedId, ...doc });
  } catch (err) {
    console.error("POST /api/items error:", err.message);
    res.status(500).json({ error: "Failed to create item" });
  }
});

// GET /version
app.get("/version", (req, res) => {
  res.json({
    version: "1.1",
    updatedAt: "2026-01-25"
  });
});

// PUT /api/items/:id
app.put("/api/items/:id", async (req, res) => {
  const { id } = req.params;
  if (!ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid id" });

  try {
    const { name, description } = req.body;

    const update = {};
    if (name !== undefined) {
      if (typeof name !== "string") return res.status(400).json({ error: "name must be string" });
      update.name = name.trim();
    }
    if (description !== undefined) {
      if (typeof description !== "string") return res.status(400).json({ error: "description must be string" });
      update.description = description.trim();
    }

    const result = await items.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: update },
      { returnDocument: "after" }
    );

    if (!result.value) return res.status(404).json({ error: "Item not found" });
    res.json(result.value);
  } catch (err) {
    console.error("PUT /api/items/:id error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// PATCH /api/items/:id (Partial update)
app.patch("/api/items/:id", async (req, res) => {
  const { id } = req.params;
  if (!ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid id" });

  try {
    const { name, description } = req.body;

    const update = {};
    if (name !== undefined) {
      if (typeof name !== "string") return res.status(400).json({ error: "name must be string" });
      update.name = name.trim();
    }
    if (description !== undefined) {
      if (typeof description !== "string") return res.status(400).json({ error: "description must be string" });
      update.description = description.trim();
    }

    const result = await items.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: update },
      { returnDocument: "after" }
    );

    if (!result.value) return res.status(404).json({ error: "Item not found" });
    res.json(result.value);
  } catch (err) {
    console.error("PATCH /api/items/:id error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE /api/items/:id
app.delete("/api/items/:id", async (req, res) => {
  const { id } = req.params;
  if (!ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid id" });

  try {
    const result = await items.deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) return res.status(404).json({ error: "Item not found" });
    res.json({ message: "Deleted", id });
  } catch (err) {
    console.error("DELETE /api/items/:id error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// 404 JSON
app.use((req, res) => {
  res.status(404).json({ error: "API endpoint not found" });
});

start();
