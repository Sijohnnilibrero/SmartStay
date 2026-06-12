import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function getInitials(name) {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function getStatusColor(status) {
  const map = {
    confirmed: 'bg-teal-50 text-teal-600 border-teal-200',
    pending:   'bg-amber-50  text-amber-600  border-amber-200',
    cancelled: 'bg-red-50    text-red-600    border-red-200',
    completed: 'bg-gray-100  text-gray-600   border-gray-200',
    full:      'bg-orange-50 text-orange-600 border-orange-200',
    active:    'bg-teal-50   text-teal-600   border-teal-200',
  }
  return map[status] || 'bg-gray-100 text-gray-600 border-gray-200'
}

export function getAvatarColor(initials) {
  const colors = [
    'bg-teal-50 text-teal-600',
    'bg-purple-100 text-purple-700',
    'bg-amber-50 text-amber-700',
    'bg-red-50 text-red-700',
    'bg-blue-50 text-blue-700',
  ]
  const idx = (initials.charCodeAt(0) + (initials.charCodeAt(1) || 0)) % colors.length
  return colors[idx]
}
