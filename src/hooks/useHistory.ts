import { useState, useEffect } from 'react';
import { HgeoResult } from '../lib/api';

export function useHistory() {
  const [history, setHistory] = useState<HgeoResult[]>(() => {
    try {
      const saved = localStorage.getItem('geoalt_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('geoalt_history', JSON.stringify(history));
  }, [history]);

  const addPoint = (point: HgeoResult) => {
    setHistory(prev => {
      // Remove duplicate if exists, then add to top
      const filtered = prev.filter(p => p.lat !== point.lat || p.long !== point.long);
      return [point, ...filtered].slice(0, 10);
    });
  };

  const clearHistory = () => setHistory([]);

  return { history, addPoint, clearHistory };
}
