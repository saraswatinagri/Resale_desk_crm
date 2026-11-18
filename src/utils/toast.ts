/**
 * Simple toast notification utility for CRM alerts and feedback.
 */
export const toast = {
  success: (message: string) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('crm:toast', { detail: { message, type: 'success' } }));
    }
  },
  error: (message: string) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('crm:toast', { detail: { message, type: 'error' } }));
    }
  },
  info: (message: string) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('crm:toast', { detail: { message, type: 'info' } }));
    }
  },
};
