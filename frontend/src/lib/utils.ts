import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatSalary(from?: number, to?: number): string {
  if (!from && !to) return "Not specified";
  if (from && to) return `${from.toLocaleString()} - ${to.toLocaleString()}`;
  if (from) return `From ${from.toLocaleString()}`;
  return `Up to ${to!.toLocaleString()}`;
}

export function formatExperience(from?: number, to?: number): string {
  if (!from && !to) return "";
  if (from && to) {
    if (from === to) return `${from} ${from === 1 ? "year" : "years"}`;
    return `${from}-${to} years`;
  }
  if (from) return `${from}+ years`;
  return `Up to ${to} ${to === 1 ? "year" : "years"}`;
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "...";
}
