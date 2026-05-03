import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPhoneNumber(num: string) {
  if (!num) return '-';
  const digits = num.replace(/\D/g, '');
  if (digits.length === 11) return `+${digits[0]} (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  return num;
}

export function formatDate(date: any) {
  if (!date) return '-';
  
  // Handle Firestore Timestamp
  if (date && typeof date.toDate === 'function') {
    return date.toDate().toLocaleDateString();
  }
  
  // Handle regular Date or string
  const d = new Date(date);
  return isNaN(d.getTime()) ? '-' : d.toLocaleDateString();
}
