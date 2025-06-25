import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a number to remove floating point precision issues
 * @param value - The number or string to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted number as string
 */
export function formatNumber(value: number | string | undefined | null, decimals: number = 2): string {
  if (value === undefined || value === null || value === '') {
    return decimals === 0 ? '0' : '0.00'
  }
  
  const num = typeof value === 'string' ? parseFloat(value) : value
  
  if (isNaN(num)) {
    return decimals === 0 ? '0' : '0.00'
  }
  
  // Round to avoid floating point precision issues
  const rounded = Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals)
  return decimals === 0 ? Math.round(rounded).toString() : rounded.toFixed(decimals)
}

/**
 * Format currency with Pakistani Rupee symbol
 * @param value - The number or string to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted currency string
 */
export function formatCurrency(value: number | string | undefined | null, decimals: number = 2): string {
  const formatted = formatNumber(value, decimals)
  const num = parseFloat(formatted)
  
  // For whole numbers, don't show decimals
  if (decimals === 2 && num % 1 === 0) {
    return `₨${Math.round(num).toLocaleString('en-PK')}`
  }
  
  return `₨${parseFloat(formatted).toLocaleString('en-PK', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })}`
}

/**
 * Parse a number safely, handling floating point precision
 * @param value - The value to parse
 * @param defaultValue - Default value if parsing fails
 * @returns Parsed number
 */
export function parseNumber(value: string | number | undefined | null, defaultValue: number = 0): number {
  if (value === undefined || value === null || value === '') {
    return defaultValue
  }
  
  const num = typeof value === 'string' ? parseFloat(value) : value
  
  if (isNaN(num)) {
    return defaultValue
  }
  
  // Round to 2 decimal places to avoid precision issues
  return Math.round(num * 100) / 100
}

/**
 * Format a number for input fields (removes floating point precision issues)
 * @param value - The number to format for input
 * @param forCurrency - Whether this is for currency (rounds to whole numbers)
 * @returns Clean string for input field
 */
export function formatForInput(value: number | string | undefined | null, forCurrency: boolean = true): string {
  if (value === undefined || value === null || value === '') {
    return ''
  }
  
  const num = typeof value === 'string' ? parseFloat(value) : value
  
  if (isNaN(num)) {
    return ''
  }
  
  // For currency inputs, round to whole numbers to avoid precision issues
  if (forCurrency) {
    return Math.round(num).toString()
  }
  
  // For other inputs, round to 2 decimal places
  return (Math.round(num * 100) / 100).toString()
}