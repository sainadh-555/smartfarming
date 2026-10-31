/**
 * Centralized Indian Rupee (₹) Currency and Number Formatter
 * Complies with Indian numbering system (Lakhs, Crores) and SaaS financial standards.
 */

/**
 * Format a number as Indian Rupees (₹)
 * Example: 500 -> "₹500", 1250 -> "₹1,250", 125000 -> "₹1,25,000"
 * 
 * @param {number} amount - Numeric amount in INR
 * @param {object} [options] - Optional formatting options
 * @param {boolean} [options.decimals=false] - Whether to show paise / decimals
 * @param {boolean} [options.compact=false] - Whether to format as K / L (Lakh)
 * @returns {string} Formatted currency string
 */
export function formatINR(amount, options = {}) {
  const { decimals = false, compact = false } = options;

  if (amount === null || amount === undefined || isNaN(amount)) {
    return '₹0';
  }

  const num = Number(amount);

  if (compact) {
    if (Math.abs(num) >= 10000000) {
      return `₹${(num / 10000000).toFixed(2)} Cr`;
    }
    if (Math.abs(num) >= 100000) {
      return `₹${(num / 100000).toFixed(2)} L`;
    }
    if (Math.abs(num) >= 1000) {
      return `₹${(num / 1000).toFixed(1)}k`;
    }
  }

  try {
    const formatter = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: decimals ? 2 : 0,
      minimumFractionDigits: decimals ? 2 : 0
    });
    return formatter.format(num);
  } catch {
    // Fallback if Intl fails
    const rounded = decimals ? num.toFixed(2) : Math.round(num).toString();
    return `₹${rounded}`;
  }
}

/**
 * Format quantity numbers according to Indian locale (e.g. 10,000, 1,25,000)
 */
export function formatIndianNumber(num, decimals = 0) {
  if (num === null || num === undefined || isNaN(num)) return '0';
  try {
    return new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: decimals,
      minimumFractionDigits: decimals
    }).format(num);
  } catch {
    return String(num);
  }
}

/**
 * Parse an INR formatted string back to number
 */
export function parseINR(str) {
  if (typeof str === 'number') return str;
  if (!str) return 0;
  const cleaned = String(str).replace(/[^0-9.-]+/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}
