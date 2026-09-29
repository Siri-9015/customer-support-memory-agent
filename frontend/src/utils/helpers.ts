/** Format an ISO timestamp to a readable local time string. */
export function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

/** Format an ISO timestamp to a readable date+time. */
export function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString([], {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso || '';
  }
}

/** Generate a unique ID for messages. */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Map a memory context label to a display colour. */
export function contextColor(context?: string | null): string {
  switch (context?.toLowerCase()) {
    case 'environment': return 'bg-blue-100 text-blue-800';
    case 'issue':       return 'bg-red-100 text-red-800';
    case 'solution':    return 'bg-green-100 text-green-800';
    case 'preference':  return 'bg-purple-100 text-purple-800';
    case 'outcome':     return 'bg-yellow-100 text-yellow-800';
    default:            return 'bg-gray-100 text-gray-700';
  }
}

/** Map a memory context label to an emoji icon. */
export function contextIcon(context?: string | null): string {
  switch (context?.toLowerCase()) {
    case 'environment': return '🖥️';
    case 'issue':       return '⚠️';
    case 'solution':    return '✅';
    case 'preference':  return '💡';
    case 'outcome':     return '📋';
    default:            return '🧠';
  }
}

/** Truncate a string to maxLen characters with an ellipsis. */
export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + '…';
}
