import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-please-change";
const API_AUTH_KEY = process.env.AUTH_KEY || process.env.API_AUTH_KEY || ""; // static key alternative
const VALUE_TOLERANCE = parseFloat(process.env.VALUE_TOLERANCE || "0.1"); // 10%
const ALLOW_SELF_JOIN = String(process.env.ALLOW_SELF_JOIN || "false").toLowerCase() === "true";

app.use(cors());
app.use(express.json());

// In-memory storage
/** @type {Map<string, any>} */
const rooms = new Map();

// Middleware to authenticate JWT Bearer token
function authenticate(req, res, next) {
  // Prefer JWT if present
  const authHeader = req.headers["authorization"] || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      req.user = payload;
      return next();
    } catch (err) {
      return res.status(401).json({ error: "Invalid token" });
    }
  }

  // Fallback: static API key with user headers
  const key = req.headers["x-api-key"]; // case-insensitive handled by Node
  if (API_AUTH_KEY && key && String(key) === API_AUTH_KEY) {
    const userId = String(req.headers["x-user-id"] || "");
    const robloxName = String(req.headers["x-user-name"] || "");
    if (!userId || !robloxName) {
      return res.status(400).json({ error: "x-user-id and x-user-name headers required with API key" });
    }
    req.user = { robloxId: userId, id: userId, robloxName, displayName: robloxName };
    return next();
  }

  return res.status(401).json({ error: "Missing token or API key" });
}

app.get("/health", (_req, res) => {
  res.json({ ok: true, rooms: rooms.size });
});

// Issue a signed auth token for the client
app.post("/auth/issue", (req, res) => {
  const { id, robloxId, robloxName, displayName } = req.body || {};
  if (!robloxId || !robloxName) {
    return res.status(400).json({ error: "robloxId and robloxName are required" });
  }
  const payload = {
    id: id || robloxId,
    robloxId,
    robloxName,
    displayName: displayName || robloxName,
  };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
  res.json({ token });
});

// List open coinflip rooms
app.get("/coinflips", (_req, res) => {
  const list = Array.from(rooms.values()).filter((r) => r.status === "open");
  res.json({ success: true, data: list });
});

// Get coinflip room by id
app.get("/coinflips/:id", (req, res) => {
  const room = rooms.get(req.params.id);
  if (!room) return res.status(404).json({ error: "Not found" });
  res.json({ success: true, data: room });
});

// Create a new coinflip room (host)
app.post("/coinflips", authenticate, (req, res) => {
  const { items, totalValue, side } = req.body || {};
  if (!Array.isArray(items) || typeof totalValue !== "number") {
    return res.status(400).json({ error: "items[] and totalValue required" });
  }
  const id = uuidv4();
  const room = {
    id,
    createdAt: Date.now(),
    status: "open", // open -> matched -> finished
    host: {
      userId: req.user.robloxId,
      robloxName: req.user.robloxName,
      items,
      totalValue,
      side: side === "H" || side === "T" ? side : null,
    },
    joiner: null,
    result: null,
  };
  rooms.set(id, room);
  res.json({ success: true, data: room });
});

// Join an existing room (challenger)
app.post("/coinflips/:id/join", authenticate, (req, res) => {
  const room = rooms.get(req.params.id);
  if (!room) return res.status(404).json({ error: "Not found" });
  if (room.status !== "open") return res.status(400).json({ error: "Room not open" });
  if (!ALLOW_SELF_JOIN && room.host.userId === req.user.robloxId)
    return res.status(400).json({ error: "Cannot join your own room" });

  const { items, totalValue, side } = req.body || {};
  if (!Array.isArray(items) || typeof totalValue !== "number") {
    return res.status(400).json({ error: "items[] and totalValue required" });
  }

  const hostVal = room.host.totalValue || 0;
  const lower = hostVal * (1 - VALUE_TOLERANCE);
  const upper = hostVal * (1 + VALUE_TOLERANCE);
  if (totalValue < lower || totalValue > upper) {
    return res.status(400).json({
      error: "Value mismatch",
      expectedRange: { min: lower, max: upper },
    });
  }

  room.joiner = {
    userId: req.user.robloxId,
    robloxName: req.user.robloxName,
    items,
    totalValue,
    side: side === "H" || side === "T" ? side : null,
  };
  room.status = "matched";
  rooms.set(room.id, room);
  res.json({ success: true, data: room });
});

// Execute the coinflip once both players are in
app.post("/coinflips/:id/flip", authenticate, async (req, res) => {
  const room = rooms.get(req.params.id);
  if (!room) return res.status(404).json({ error: "Not found" });
  if (room.status !== "matched") return res.status(400).json({ error: "Room not ready to flip" });

  // Basic random flip (0 = Heads, 1 = Tails)
  const outcome = Math.random() < 0.5 ? "H" : "T";

  // If any player chose a side, that side wins; otherwise random owner wins
  let winnerUserId;
  if (room.host.side || room.joiner.side) {
    if (room.host.side === outcome) {
      winnerUserId = room.host.userId;
    } else if (room.joiner.side === outcome) {
      winnerUserId = room.joiner.userId;
    } else {
      // If neither picked the outcome side, pick randomly between host/joiner
      winnerUserId = Math.random() < 0.5 ? room.host.userId : room.joiner.userId;
    }
  } else {
    winnerUserId = Math.random() < 0.5 ? room.host.userId : room.joiner.userId;
  }

  const loserUserId = winnerUserId === room.host.userId ? room.joiner.userId : room.host.userId;

  room.status = "finished";
  room.result = {
    outcome,
    winnerUserId,
    loserUserId,
    transferredItems: [
      ...(room.host.items || []),
      ...(room.joiner.items || []),
    ],
    finishedAt: Date.now(),
  };
  rooms.set(room.id, room);

  // Optional: notify external transfer service
  try {
    const transferUrl = process.env.TRANSFER_URL;
    const transferKey = process.env.TRANSFER_AUTH_KEY || API_AUTH_KEY;
    if (transferUrl) {
      await fetch(transferUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(transferKey ? { "X-API-Key": transferKey } : {}),
        },
        body: JSON.stringify({
          roomId: room.id,
          outcome,
          winnerUserId,
          loserUserId,
          items: room.result.transferredItems,
        }),
      });
    }
  } catch (e) {
    console.error("Transfer notify failed:", e);
  }

  res.json({ success: true, data: room.result });
});

app.listen(PORT, () => {
  console.log(`Coinflip API server listening on http://localhost:${PORT}`);
});
