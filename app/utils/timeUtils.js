// Time utility functions for document processing

/**
 * Validates if a string is a valid time in HH:mm format (00:00–23:59)
 */
export function isValidTimeHHmm(str) {
  // Allow both 24h and 12h formats, with or without leading zeros
  return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(str);
}

/**
 * Auto-format a string of digits (3 or 4) to HH:mm
 * E.g. '645' => '6:45', '1530' => '15:30'
 */
export function autoFormatToHHmm(str) {
  if (/^\d{3}$/.test(str)) {
    return `${str[0]}:${str.slice(1)}`;
  } else if (/^\d{4}$/.test(str)) {
    return `${str.slice(0,2)}:${str.slice(2)}`;
  }
  return str;
}

/**
 * If end time is less than start time and end hour < 12, convert to 24-hour format.
 * Example: start="13:00", end="3:30" → returns "15:30"
 * Otherwise, returns end as is.
 */
export function normalizeEndTimeIfNeeded(start, end) {
  if (!start || !end) return end;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  if (
    !isNaN(sh) && !isNaN(sm) && !isNaN(eh) && !isNaN(em) &&
    (eh < sh || (eh === sh && em < sm)) &&
    eh < 12
  ) {
    return `${eh + 12}:${em.toString().padStart(2, '0')}`;
  }
  return end;
}

/**
 * Filters a string to allow only numbers and a single colon, max 5 chars
 */
export function filterTimeInput(val) {
  return val.replace(/[^0-9:]/g, '').slice(0, 5);
}

/**
 * Tries to parse and format a string as HH:mm. Returns '' if not possible.
 * Accepts: '330', '0330', '3:30', '15:30', etc.
 */
export function parseAndFormatTime(str) {
  if (!str) return '';
  str = str.trim();
  // Accept HH:MM
  if (/^\d{1,2}:\d{2}$/.test(str)) {
    const [h, m] = str.split(':');
    if (parseInt(h, 10) >= 0 && parseInt(h, 10) <= 23 && parseInt(m, 10) >= 0 && parseInt(m, 10) <= 59) {
      return `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
    }
  }
  // Accept HHMM or HMM
  if (/^\d{3,4}$/.test(str)) {
    const padded = str.padStart(4, '0');
    const h = padded.slice(0, 2);
    const m = padded.slice(2);
    if (parseInt(h, 10) >= 0 && parseInt(h, 10) <= 23 && parseInt(m, 10) >= 0 && parseInt(m, 10) <= 59) {
      return `${h}:${m}`;
    }
  }
  return '';
} 