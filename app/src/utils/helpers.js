import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateString) {
  if (!dateString) return 'Desconocida'
  const date = new Date(dateString)
  return date.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function formatRelativeTime(dateString) {
  if (!dateString) return 'Hace poco'
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now - date
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffMinutes = Math.floor(diffMs / (1000 * 60))

  if (diffDays > 0) {
    return diffDays === 1 ? 'Ayer' : `Hace ${diffDays} días`
  }
  if (diffHours > 0) {
    return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`
  }
  if (diffMinutes > 0) {
    return `Hace ${diffMinutes} minuto${diffMinutes > 1 ? 's' : ''}`
  }
  return 'Justo ahora'
}

export function truncate(str, length = 100) {
  if (!str) return ''
  if (str.length <= length) return str
  return str.slice(0, length).trim() + '...'
}

export function getStatusColor(status) {
  const colors = {
    LEYENDO: 'badge-reading',
    PENDIENTE: 'badge-pending',
    COMPLETADO: 'badge-completed',
    PAUSADO: 'badge-paused',
    ABANDONADO: 'badge-dropped',
    RELECTURA: 'badge-re-reading',
  }
  return colors[status] || 'badge-pending'
}

export function getStatusLabel(status) {
  const labels = {
    LEYENDO: 'Leyendo',
    PENDIENTE: 'Pendiente',
    COMPLETADO: 'Completado',
    PAUSADO: 'Pausado',
    ABANDONADO: 'Abandonado',
    RELECTURA: 'Relectura',
  }
  return labels[status] || status
}

export function generateId() {
  return Math.random().toString(36).substring(2, 15)
}

export function debounce(fn, delay) {
  let timeoutId
  const debounced = (...args) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
  debounced.cancel = () => clearTimeout(timeoutId)
  return debounced
}

export function parseJsonArray(value) {
  if (!value) return []
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : [] } catch { return [] }
  }
  return []
}