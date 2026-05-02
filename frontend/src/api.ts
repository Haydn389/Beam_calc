import type { AnalyzeRequest, AnalyzeResponse } from './types';

const BASE = '/api';

export async function analyzeBeam(req: AnalyzeRequest): Promise<AnalyzeResponse> {
  const res = await fetch(`${BASE}/analyze`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(req),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? 'Unknown server error');
  }

  return res.json() as Promise<AnalyzeResponse>;
}
