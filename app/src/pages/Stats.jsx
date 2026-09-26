import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { BarChart3, BookOpen, CheckCircle, Clock, Heart, Pause, RotateCcw, TrendingUp } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { libraryService } from '../services/api'

const statusRows = [
  { key: 'reading', label: 'Leyendo', icon: BookOpen, color: 'bg-[#C9B297]', text: 'text-[#8A7A6A]' },
  { key: 'pending', label: 'Pendientes', icon: Clock, color: 'bg-[#EEEFE8] border border-[#C9B297]/30', text: 'text-[#8A7A6A]' },
  { key: 'completed', label: 'Completados', icon: CheckCircle, color: 'bg-[#8FBC93]', text: 'text-[#6BAE75]' },
  { key: 'paused', label: 'Pausados', icon: Pause, color: 'bg-gray-200', text: 'text-gray-500' },
  { key: 'dropped', label: 'Abandonados', icon: BarChart3, color: 'bg-gray-300', text: 'text-gray-600' },
  { key: 'rereading', label: 'Relectura', icon: RotateCcw, color: 'bg-[#E9ACBB]', text: 'text-[#C07A8A]' },
]

export function Stats() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadStats = async () => {
      try {
        setStats(await libraryService.getStats())
      } catch (error) {
        console.error('Error loading statistics:', error)
        setStats({})
      } finally {
        setLoading(false)
      }
    }

    loadStats()
  }, [])

  const total = Number(stats?.total || 0)
  const progress = total ? Math.round((Number(stats?.completed || 0) / total) * 100) : 0

  if (loading) {
    return <div className="page-container"><div className="skeleton h-10 w-64 mb-8" /><div className="grid grid-cols-2 lg:grid-cols-4 gap-4"><div className="skeleton h-32" /><div className="skeleton h-32" /><div className="skeleton h-32" /><div className="skeleton h-32" /></div></div>
  }

  return (
    <div className="page-container pb-16">
      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#C9B297]/20 text-[#6B8CA8]">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-gray-100">Estadísticas</h1>
            <p className="text-sm text-gray-400 dark:text-gray-500">Una vista rápida de tu biblioteca.</p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Obras en total" value={total} icon={BookOpen} className="bg-[#C9B297]/15 text-[#8A7A6A] border border-[#C9B297]/25" />
        <StatCard label="Completadas" value={stats?.completed || 0} icon={CheckCircle} className="bg-[#8FBC93]/15 text-[#6BAE75] border border-[#8FBC93]/20" />
        <StatCard label="Leyendo" value={stats?.reading || 0} icon={TrendingUp} className="bg-[#E9ACBB]/15 text-[#C07A8A] border border-[#E9ACBB]/20" />
        <StatCard label="Favoritos" value={stats?.favorites || 0} icon={Heart} className="bg-white text-[#9AA0A6] border border-gray-200 shadow-sm" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-3 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-display text-xl font-semibold text-gray-900">Distribución de tu biblioteca</h2>
              <p className="text-sm text-bl-textLight mt-1">Estado actual de tus obras</p>
            </div>
            <span className="text-2xl font-display font-bold text-gray-900">{total}</span>
          </div>
          <div className="space-y-4">
            {statusRows.map(({ key, label, icon: Icon, color, text }) => {
              const value = Number(stats?.[key] || 0)
              const width = total ? Math.max(value ? 4 : 0, (value / total) * 100) : 0
              return (
                <div key={key}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className={`flex items-center gap-2 font-medium ${text}`}><Icon className="h-4 w-4" />{label}</span>
                    <span className="text-gray-500">{value}</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-bl-bg overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${width}%` }} transition={{ duration: 0.6 }} className={`h-full rounded-full ${color}`} />
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

        <Card className="lg:col-span-2 p-6 flex flex-col justify-between">
          <div>
            <h2 className="font-display text-xl font-semibold text-gray-900">Progreso general</h2>
            <p className="text-sm text-bl-textLight mt-1">Obras que ya terminaste</p>
          </div>
          <div className="flex items-center justify-center py-8">
            <div className="relative flex h-44 w-44 items-center justify-center rounded-full" style={{ background: `conic-gradient(#8FBC93 ${progress}%, #EEEFE8 ${progress}% 100%)` }}>
              <div className="flex h-32 w-32 flex-col items-center justify-center rounded-full bg-white">
                <span className="font-display text-4xl font-bold text-gray-900">{progress}%</span>
                <span className="text-xs text-bl-textLight">completado</span>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-bl-sand/20 pt-4 text-sm">
            <span className="text-bl-textLight">Completadas</span>
            <span className="font-semibold text-bl-sageDark">{stats?.completed || 0} obras</span>
          </div>
        </Card>
      </div>
    </div>
  )
}

function StatCard({ label, value, icon: Icon, className }) {
  return (
    <Card className={`p-5 ${className}`}>
      <Icon className="h-6 w-6 mb-5" />
      <p className="text-sm font-medium opacity-80">{label}</p>
      <p className="font-display text-3xl font-bold text-gray-900 mt-1">{value}</p>
    </Card>
  )
}
