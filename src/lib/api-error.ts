/**
 * Extracts a user-friendly message from an axios error.
 * Handles `{ message }` responses as well as ASP.NET validation
 * problem details (`{ title, errors: { field: [msg] } }`).
 */
export function getApiErrorMessage(err: any, fallback = 'Something went wrong. Please try again.'): string {
  const data = err?.response?.data;

  if (typeof data?.message === 'string' && data.message) return data.message;

  if (data?.errors && typeof data.errors === 'object') {
    const messages = Object.entries(data.errors as Record<string, string[]>)
      // Skip the framework's generic "dto field is required" noise
      .filter(([key]) => key !== 'dto')
      .flatMap(([key, msgs]) => {
        const field = key.replace(/^\$\./, '');
        return (msgs ?? []).map(m =>
          m.includes('could not be converted') ? `Invalid value for ${field}.` : m,
        );
      });
    if (messages.length > 0) return messages.join('\n');
  }

  if (typeof data?.title === 'string' && data.title) return data.title;

  if (!err?.response && err?.message) {
    return 'Network error. Please check your internet connection and try again.';
  }

  return fallback;
}
