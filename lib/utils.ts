import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatAmc(amc: number | undefined) {
  return amc === undefined ? "—" : `${amc.toFixed(2)}%`
}
