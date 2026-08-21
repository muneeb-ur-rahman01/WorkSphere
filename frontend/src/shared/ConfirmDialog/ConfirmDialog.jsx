import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Trash2, PauseCircle, HelpCircle } from 'lucide-react';

// ============================================================
// Modern, centered replacement for window.confirm().
//
// Usage anywhere in the app:
//
//   const confirm = useConfirm();
//   const ok = await confirm({
//     title: 'Delete this camp?',
//     message: `"${camp.title}" will be permanently removed. This cannot be undone.`,
//     confirmLabel: 'Delete',
//     variant: 'danger' // 'danger' | 'warning' | 'default'
//   });
//   if (!ok) return;
//
// Mounted once in App.jsx (ConfirmDialogProvider wraps the whole app), so
// every page shares the same dialog instance instead of each component
// managing its own modal state.
// ============================================================

const ConfirmDialogContext = createContext(null);

const VARIANT_STYLES = {
  danger: {
    icon: <Trash2 size={26} />,
    iconWrap: 'bg-red-100 text-red-600',
    confirmBtn: 'bg-red-600 hover:bg-red-700'
  },
  warning: {
    icon: <PauseCircle size={26} />,
    iconWrap: 'bg-amber-100 text-amber-600',
    confirmBtn: 'bg-amber-600 hover:bg-amber-700'
  },
  default: {
    icon: <HelpCircle size={26} />,
    iconWrap: 'bg-indigo-100 text-indigo-600',
    confirmBtn: 'bg-indigo-600 hover:bg-indigo-700'
  }
};

export const ConfirmDialogProvider = ({ children }) => {
  const [state, setState] = useState(null); // { title, message, confirmLabel, cancelLabel, variant }
  const resolverRef = useRef(null);

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setState({
        title: options?.title || 'Are you sure?',
        message: options?.message || 'This action cannot be undone.',
        confirmLabel: options?.confirmLabel || 'Confirm',
        cancelLabel: options?.cancelLabel || 'Cancel',
        variant: options?.variant || 'default'
      });
    });
  }, []);

  const close = (result) => {
    setState(null);
    if (resolverRef.current) {
      resolverRef.current(result);
      resolverRef.current = null;
    }
  };

  const styles = state ? (VARIANT_STYLES[state.variant] || VARIANT_STYLES.default) : null;

  return (
    <ConfirmDialogContext.Provider value={confirm}>
      {children}

      {state && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => close(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-7 text-center animate-scale-up"
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
          >
            <div className={`inline-flex p-3.5 rounded-full mb-5 ${styles.iconWrap}`}>
              {styles.icon}
            </div>

            <h3 id="confirm-dialog-title" className="text-xl font-bold text-black mb-2">
              {state.title}
            </h3>

            <p className="text-sm text-gray-600 leading-6 mb-7">
              {state.message}
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => close(false)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition"
              >
                {state.cancelLabel}
              </button>
              <button
                onClick={() => close(true)}
                autoFocus
                className={`flex-1 py-3 rounded-xl text-sm font-bold text-white shadow-md hover:shadow-lg transition ${styles.confirmBtn}`}
              >
                {state.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmDialogContext.Provider>
  );
};

// Returns an async confirm(options) function — see usage above.
export const useConfirm = () => {
  const ctx = useContext(ConfirmDialogContext);
  if (!ctx) {
    throw new Error('useConfirm() must be used within a ConfirmDialogProvider (mounted in App.jsx).');
  }
  return ctx;
};
