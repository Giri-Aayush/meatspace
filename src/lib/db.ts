// In-memory store for off-chain task metadata.
// Bridges what's on-chain (state, worker, amount) with what's off-chain
// (description, GPS coords, OTP, callback URL).

export interface TaskRecord {
  id: number;
  description: string;
  shopName: string;
  shopLat: number;
  shopLng: number;
  destLat: number;
  destLng: number;
  itemList: string[];
  deadline: number; // unix timestamp
  recipientContact: string;
  otp: string; // plaintext — NEVER returned in API responses
  agentCallbackUrl?: string;
  createdAt: number;
}

const store = new Map<number, TaskRecord>();

export const db = {
  set: (id: number, record: TaskRecord) => store.set(id, record),
  get: (id: number) => store.get(id),
  all: () => Array.from(store.values()),
};
