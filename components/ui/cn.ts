import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge conditional classNames and resolve Tailwind conflicts.
 * Works with NativeWind on native + React Native for Web.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}


