import { useCallback, useEffect, useState } from 'react';

export type ThemePreference = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'geoalt_theme';

function systemPrefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyThemeClass(dark: boolean) {
  document.documentElement.classList.toggle('dark', dark);
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', dark ? '#0f172a' : '#f8fafc');
}

/**
 * Tema da interface: claro, escuro ou seguindo o sistema.
 * A escolha fica em localStorage; o script anti-flash no index.html aplica a
 * classe antes do React montar para não "piscar" o tema errado.
 */
export function useTheme() {
  const [preference, setPreference] = useState<ThemePreference>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
  });
  const [isDark, setIsDark] = useState<boolean>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'dark') return true;
    if (stored === 'light') return false;
    return systemPrefersDark();
  });

  useEffect(() => {
    const apply = () => {
      const dark = preference === 'system' ? systemPrefersDark() : preference === 'dark';
      setIsDark(dark);
      applyThemeClass(dark);
    };
    apply();
    if (preference !== 'system') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [preference]);

  const setTheme = useCallback((next: ThemePreference) => {
    localStorage.setItem(STORAGE_KEY, next);
    setPreference(next);
  }, []);

  return { preference, setTheme, isDark };
}
