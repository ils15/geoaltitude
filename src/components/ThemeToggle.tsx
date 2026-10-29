import React from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import type { ThemePreference } from '../hooks/useTheme';

const OPTIONS: Array<{ id: ThemePreference; icon: React.ReactNode; label: string }> = [
  { id: 'light', icon: <Sun className="w-4 h-4" />, label: 'Tema claro' },
  { id: 'dark', icon: <Moon className="w-4 h-4" />, label: 'Tema escuro' },
  { id: 'system', icon: <Monitor className="w-4 h-4" />, label: 'Seguir o sistema' },
];

export function ThemeToggle({ preference, onChange }: { preference: ThemePreference; onChange: (p: ThemePreference) => void }) {
  return (
    <div
      role="group"
      aria-label="Escolher tema da interface"
      className="flex items-center gap-0.5 bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 rounded-xl p-1 shadow-inner"
    >
      {OPTIONS.map(option => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
          aria-label={option.label}
          aria-pressed={preference === option.id}
          title={option.label}
          className={`p-1.5 rounded-lg transition-all duration-200 ${
            preference === option.id
              ? 'bg-white dark:bg-slate-700 text-ibge-blue dark:text-white shadow-sm'
              : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          {option.icon}
        </button>
      ))}
    </div>
  );
}
