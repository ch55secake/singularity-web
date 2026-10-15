export type ToastTone = 'success' | 'error' | 'info'
export type Toast = { id: number; message: string; tone: ToastTone }

export const toasts = $state<Toast[]>([])
let nextId = 1

export function dismissToast(id: number) {
  const index = toasts.findIndex((toast) => toast.id === id)
  if (index !== -1) toasts.splice(index, 1)
}

export function notify(message: string, tone: ToastTone = 'info') {
  const id = nextId++
  toasts.push({ id, message, tone })
  window.setTimeout(() => dismissToast(id), 4000)
}
