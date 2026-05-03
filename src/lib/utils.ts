import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPhoneNumber(num: string) {
  // Simple formatter
  return num.replace(/(\d{1})(\d{3})(\d{3})(\d{4})/, '+$1 ($2) $3-$4');
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
