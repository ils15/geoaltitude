import { useState, useEffect } from 'react';
import { HgeoResult } from '../lib/api';

const STORAGE_KEY = 'geoalt_history';
const MAX_ITEMS = 10;

function readStoredHistory(): HgeoResult[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as HgeoResult[]) : [];
  } catch {
    return [];
  }
}

export function useHistory() {
  const [history, setHistory] = useState<HgeoResult[]>(readStoredHistory);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch {
      // storage cheio/indisponível: histórico só fica em memória
    }
  }, [history]);

  const addPoint = (point: HgeoResult) => {
    setHistory((prev) => {
      const exists = prev.some((p) => p.lat === point.lat && p.long === point.long);
      const next = exists ? prev : [point, ...prev].slice(0, MAX_ITEMS);
      return next;
    });
  };

  const clearHistory = () => setHistory([]);

  return { history, addPoint, clearHistory };
}
