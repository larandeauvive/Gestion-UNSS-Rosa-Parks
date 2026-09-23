import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDateFr(dateStr: string | boolean | undefined): string {
  if (!dateStr || typeof dateStr !== 'string') return String(dateStr || '');
  const str = dateStr.trim();
  
  // YYYY-MM-DD or YYYY/MM/DD
  const ymdMatch = str.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})(T.*)?$/);
  if (ymdMatch) {
    const [, y, m, d] = ymdMatch;
    return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
  }

  // YYYY-MM-DD HH:MM:SS
  const sqlMatch = str.match(/^(\d{4})-(\d{2})-(\d{2}) \d{2}:\d{2}:\d{2}$/);
  if (sqlMatch) {
     return `${sqlMatch[3]}/${sqlMatch[2]}/${sqlMatch[1]}`;
  }

  // Let's check for MM/DD/YYYY (US format)
  // This is tricky because 05/04/2004 could be April 5th or May 4th.
  // But if the user says "it looks like english format", they probably see YYYY-MM-DD.
  
  return str;
}

export function normalizeGender(val: unknown): 'M' | 'F' | '' {
  if (!val || typeof val !== 'string') return '';
  const clean = val.trim().toUpperCase();
  if (['F', 'FILLE', 'FEMININ', 'FÉMININ', 'FEMME', 'WOMAN', 'GIRL', '2'].includes(clean)) return 'F';
  if (['M', 'G', 'GARCON', 'GARÇON', 'MASCULIN', 'HOMME', 'MAN', 'BOY', '1'].includes(clean)) return 'M';
  if (clean.startsWith('F')) return 'F';
  if (clean.startsWith('M') || clean.startsWith('G')) return 'M';
  return '';
}
