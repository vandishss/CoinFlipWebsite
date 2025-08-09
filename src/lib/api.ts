export interface CreateRoomPayload {
  items: string[];
  totalValue: number;
  side?: "H" | "T";
}

export interface JoinRoomPayload extends CreateRoomPayload {}

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3001";
const API_KEY = import.meta.env.VITE_API_KEY || "";

export function withAuth(headers: Record<string, string> = {}, token?: string, user?: { robloxId?: string; robloxName?: string }) {
  if (token) headers["Authorization"] = `Bearer ${token}`;
  else if (API_KEY) {
    headers["X-API-Key"] = API_KEY;
    if (user?.robloxId) headers["X-User-Id"] = user.robloxId;
    if (user?.robloxName) headers["X-User-Name"] = user.robloxName;
  }
  return headers;
}

export async function issueToken(body: {
  id: string;
  robloxId: string;
  robloxName: string;
  displayName: string;
}) {
  const res = await fetch(`${API_BASE}/auth/issue`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Failed to issue token");
  return res.json();
}

export async function listRooms() {
  const res = await fetch(`${API_BASE}/coinflips`);
  if (!res.ok) throw new Error("Failed to list rooms");
  return res.json();
}

export async function getRoom(id: string) {
  const res = await fetch(`${API_BASE}/coinflips/${id}`);
  if (!res.ok) throw new Error("Failed to get room");
  return res.json();
}

export async function createRoom(payload: CreateRoomPayload, token?: string, user?: { robloxId?: string; robloxName?: string }) {
  const res = await fetch(`${API_BASE}/coinflips`, {
    method: "POST",
    headers: withAuth({ "Content-Type": "application/json" }, token, user),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function joinRoom(id: string, payload: JoinRoomPayload, token?: string, user?: { robloxId?: string; robloxName?: string }) {
  const res = await fetch(`${API_BASE}/coinflips/${id}/join`, {
    method: "POST",
    headers: withAuth({ "Content-Type": "application/json" }, token, user),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function flipRoom(id: string, token?: string, user?: { robloxId?: string; robloxName?: string }) {
  const res = await fetch(`${API_BASE}/coinflips/${id}/flip`, {
    method: "POST",
    headers: withAuth({ "Content-Type": "application/json" }, token, user),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
