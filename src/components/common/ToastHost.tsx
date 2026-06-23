import { AlertCircle, CheckCircle2, Info, X, TriangleAlert } from 'lucide-react'

export interface ToastItem {
  id: string
  title: string
  message?: string
  variant: 'success' | 'error' | 'warning' | 'info'
}

interface ToastHostProps {
  toasts: ToastItem[]
  onDismiss: (id: string) => void
}

const VARIANT_STYLES: Record<ToastItem['variant'], string> = {
  success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100',
  error: 'border-red-500/30 bg-red-500/10 text-red-100',
  warning: 'border-amber-500/30 bg-amber-500/10 text-amber-100',
  info: 'border-sky-500/30 bg-sky-500/10 text-sky-100',
}

const VARIANT_ICONS: Record<ToastItem['variant'], JSX.Element> = {
  success: <CheckCircle2 size={18} />,
  error: <AlertCircle size={18} />,
  warning: <TriangleAlert size={18} />,
  info: <Info size={18} />,
}

export default function ToastHost({ toasts, onDismiss }: ToastHostProps) {
  if (!toasts.length) return null

  return (
    <div className="fixed right-4 top-4 z-[60] flex w-full max-w-md flex-col gap-3">
      {toasts.map(toast => (
        <div key={toast.id} className={`rounded-xl border px-4 py-3 shadow-xl backdrop-blur ${VARIANT_STYLES[toast.variant]}`} role="alert">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 shrink-0">{VARIANT_ICONS[toast.variant]}</div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-white">{toast.title}</div>
              {toast.message && <div className="mt-0.5 text-sm text-slate-200/90">{toast.message}</div>}
            </div>
            <button type="button" onClick={() => onDismiss(toast.id)} className="text-slate-200/70 transition-colors hover:text-white">
              <X size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}