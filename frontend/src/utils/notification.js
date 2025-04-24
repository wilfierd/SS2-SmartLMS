// src/utils/notification.js
// Note: You'll need to install react-hot-toast:
// npm install react-hot-toast
import toast from 'react-hot-toast';

/**
 * Notification utility for the application
 * Uses react-hot-toast for all notifications
 */
const notification = {
  /**
   * Show a success toast notification
   * @param {string} message - The message to display
   */
  success: (message) => {
    toast.success(message, {
      duration: 3000,
      position: 'bottom-center',
      style: {
        fontSize: '16px',
        padding: '16px',
        minWidth: '300px'
      }
    });
  },

  /**
   * Show an error toast notification
   * @param {string} message - The message to display
   */
  error: (message) => {
    toast.error(message, {
      duration: 4000,
      position: 'bottom-center',
      style: {
        fontSize: '16px',
        padding: '16px',
        minWidth: '300px'
      }
    });
  },

  /**
   * Show an info toast notification
   * @param {string} message - The message to display
   */
  info: (message) => {
    toast(message, {
      duration: 3000,
      position: 'bottom-center',
      icon: '📌',
      style: {
        fontSize: '16px',
        padding: '16px',
        minWidth: '300px'
      }
    });
  },

  /**
   * Show a warning toast notification
   * @param {string} message - The message to display
   */
  warning: (message) => {
    toast(message, {
      duration: 4000,
      position: 'top-right',
      icon: '⚠️',
      style: {
        background: '#FFF3CD',
        color: '#856404',
        fontSize: '16px',
        padding: '16px',
        minWidth: '300px'
      },
    });
  },

  /**
   * Show a loading toast notification
   * @param {string} message - The message to display
   * @returns {string} - Toast ID that can be used to dismiss or update
   */
  loading: (message) => {
    return toast.loading(message, {
      position: 'bottom-center',
      style: {
        fontSize: '16px',
        padding: '16px',
        minWidth: '300px'
      }
    });
  },

  /**
   * Dismiss a specific toast by ID
   * @param {string} toastId - The ID of the toast to dismiss
   */
  dismiss: (toastId) => {
    toast.dismiss(toastId);
  },

  /**
   * Dismiss all toasts
   */
  dismissAll: () => {
    toast.dismiss();
  },
};

export default notification;