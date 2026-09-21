"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { CheckCircle2, CircleAlert, X } from "lucide-react";

type ToastType = "success" | "error";

type Toast = {
  id: number;
  message: string;
  type: ToastType;
};

type ToastContextValue = {
  showToast: (message: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);

  const showToast = useCallback(
    (message: string, type: ToastType = "success") => {
      setToast({ id: Date.now(), message, type });
    },
    [],
  );

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeout = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const value = useMemo(() => ({ showToast }), [showToast]);
  const Icon = toast?.type === "error" ? CircleAlert : CheckCircle2;

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast && (
        <div
          key={toast.id}
          role={toast.type === "error" ? "alert" : "status"}
          aria-live={toast.type === "error" ? "assertive" : "polite"}
          className={`fixed bottom-4 left-1/2 z-[70] flex w-[min(92vw,24rem)] -translate-x-1/2 items-start gap-3 rounded-xl border px-4 py-3 shadow-lg sm:bottom-6 sm:left-auto sm:right-6 sm:translate-x-0 ${
            toast.type === "error"
              ? "border-red-200 bg-red-50 text-danger"
              : "border-green-200 bg-green-50 text-green-800"
          }`}
        >
          <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <p className="min-w-0 flex-1 text-sm font-semibold">
            {toast.message}
          </p>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="shrink-0 rounded p-0.5 transition hover:bg-black/5"
            aria-label="Fechar aviso"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast deve ser usado dentro de ToastProvider.");
  }

  return context;
}
