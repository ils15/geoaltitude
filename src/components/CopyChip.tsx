import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

/** Botão compacto de copiar para a área de transferência, com feedback visual. */
export function CopyChip({ text, label = 'Copiar valor' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard indisponível — ignora silenciosamente */
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={label}
      title={label}
      className="shrink-0 p-1 rounded-md text-slate-400 hover:text-ibge-blue dark:hover:text-ibge-light-blue hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-ibge-green" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}
