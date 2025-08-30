const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

type Position = {
  id: string | number;
  status: 'won' | 'filled' | 'open' | string;
  updated_at?: string;
  [k: string]: unknown;
};

async function fetchByStatus(status: string, signal?: AbortSignal): Promise<Position[]> {
  const url = `${API_URL}/positions?status=${encodeURIComponent(status)}`;
  const res = await fetch(url, { signal, cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch positions (${status}): ${res.status}`);
  return res.json();
}

function mergeUniquePositions(lists: Position[][]): Position[] {
  const byId = new Map<string | number, Position>();
  for (const list of lists) {
    for (const p of list) {
      const prev = byId.get(p.id);
      if (!prev) {
        byId.set(p.id, p);
        continue;
      }
      // Prefer the most recently updated if duplicate ids appear
      const prevTime = prev.updated_at ? Date.parse(prev.updated_at) : 0;
      const currTime = p.updated_at ? Date.parse(p.updated_at) : 0;
      if (currTime >= prevTime) byId.set(p.id, p);
    }
  }
  return Array.from(byId.values());
}

export async function fetchPositionData(opts?: { signal?: AbortSignal }): Promise<Position[]> {
  const { signal } = opts || {};
  const [won, filled, open] = await Promise.all([
    fetchByStatus('won', signal),
    fetchByStatus('filled', signal),
    fetchByStatus('open', signal),
  ]);
  return mergeUniquePositions([won, filled, open]);
}

// Backwards-compatible alias to fix old call sites misspelling
export const fetchPoistionData = fetchPositionData;
