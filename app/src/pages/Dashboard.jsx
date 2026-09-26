import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { BookOpen, Heart, Clock, TrendingUp, Plus, ArrowRight, AlertCircle, CheckCircle, ChevronRight } from 'lucide-react'
import { Card, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge, StatusBadge } from '../components/ui/Badge'
import { ManhwaCard } from '../components/manhwa/ManhwaCard'
import { ChapterProgress } from '../components/manhwa/ChapterProgress'
import { libraryService, chapterService } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { cn, formatRelativeTime } from '../utils/helpers'
import { DashboardStatsSkeleton } from '../components/ui/Skeleton'

export function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [continueReading, setContinueReading] = useState([])
  const [newChapters, setNewChapters] = useState([])
  const [favorites, setFavorites] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const [statsRes, libraryRes, chaptersRes, favRes] = await Promise.all([
        libraryService.getStats(),
        libraryService.getMyLibrary({ status: 'LEYENDO', limit: 4 }),
        libraryService.getNewChapters(),
        libraryService.getMyLibrary({ favorite: true, limit: 4 }),
      ])
      
      setStats(statsRes)
      setContinueReading(libraryRes.data || [])
      setFavorites(favRes.data || [])
      
      setNewChapters(chaptersRes || [])
    } catch (error) {
      console.error('Error loading dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    { label: 'Leyendo', value: stats?.reading || 0, icon: BookOpen, card: 'bg-[#EEF2F7] text-[#6B8CA8] border-[#C9B297]/20 dark:bg-[#2A3540] dark:text-[#8FB0CC] dark:border-gray-600' },
    { label: 'Leídos', value: stats?.completed || 0, icon: CheckCircle, card: 'bg-[#FDF2F4] text-[#C07A8A] border-[#E9ACBB]/20 dark:bg-[#3A2A32] dark:text-[#D89BAA]' },
    { label: 'Pendientes', value: stats?.pending || 0, icon: Clock, card: 'bg-[#EEF5EE] text-[#6BAE75] border-[#8FBC93]/20 dark:bg-[#2A3A2E] dark:text-[#8FBC93]' },
    { label: 'Favoritos', value: stats?.favorites || 0, icon: Heart, card: 'bg-white text-[#9AA0A6] border-gray-100 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700' },
  ]

  if (loading) {
    return (
      <div className="page-container animate-in">
        <DashboardStatsSkeleton />
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6"><DashboardStatsSkeleton /></Card>
          <Card className="p-6"><DashboardStatsSkeleton /></Card>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container animate-in pb-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="font-display text-4xl md:text-5xl font-bold text-gray-900 dark:text-gray-100">
          ¡Hola, {user?.name?.split(' ')[0] || 'lector'}! 👋
        </h1>
        <p className="text-base md:text-lg text-gray-500 dark:text-gray-400 mt-2">Aquí tienes un resumen de tu biblioteca.</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10"
      >
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + index * 0.05 }}
          >
            <Card className={`p-5 border shadow-sm hover:shadow-sm transition-shadow ${stat.card}`}>
              <stat.icon className="w-6 h-6 mb-5 opacity-80" />
              <p className="text-sm font-medium opacity-80">{stat.label}</p>
              <p className="font-display text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">{stat.value}</p>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
        {/* Actualizaciones (Nuevos Capítulos) */}
        <motion.section
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 p-5 rounded-[20px] shadow-sm border border-gray-100 dark:border-gray-700"
        >
          <div className="flex items-center justify-between mb-4 border-b border-gray-100 dark:border-gray-700 pb-3">
            <h2 className="font-display text-sm font-bold text-gray-900 dark:text-gray-100">
              Actualizaciones
            </h2>
            {newChapters.length > 0 && (
              <Button variant="ghost" size="sm" asChild className="text-[#6B8CA8] text-xs">
                <Link to="/notifications">Ver todas +</Link>
              </Button>
            )}
          </div>
          
          {newChapters.length > 0 ? (
            <div className="space-y-4">
              {newChapters.slice(0, 4).map((item, index) => {
                const manhwaId = item.manhwa_id || item.manhwa?.id || item.id
                const title = item.title || (item.manhwa || item).title_english || (item.manhwa || item).title_romaji || (item.manhwa || item).title
                const chapList = item.new_chapters || item.chapters || []
                const chapterLabel = chapList.length > 0
                  ? (chapList.length === 1
                      ? `Cap. ${Number(chapList[0].chapter_number).toFixed(0)}`
                      : `Caps. ${chapList.slice(0,3).map(c=> Number(c.chapter_number).toFixed(0)).join(', ')}${chapList.length>3 ? ' +' + (chapList.length-3) : ''}`)
                  : (item.chapter_number ? `Cap. ${Number(item.chapter_number).toFixed(0)}` : '')
                return (
                <Link key={`${item.manhwa_id}_${item.chapter_id || index}`} to={manhwaId ? `/manhwa/${manhwaId}` : '#'} className="flex items-center gap-4 p-2 -m-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors group">
                  {item.cover_image || (item.manhwa || item).cover_image ? (
                    <img src={item.cover_image || (item.manhwa || item).cover_image} alt={title} className="w-12 h-16 object-cover rounded-xl shadow-sm shrink-0" />
                  ) : (
                    <div className="w-12 h-16 bg-gray-100 rounded-xl flex items-center justify-center shrink-0"><BookOpen className="w-5 h-5 text-gray-400"/></div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate group-hover:text-[#6B8CA8]">{title}</h3>
                    <p className="text-sm text-[#6B8CA8] font-medium mt-0.5">
                      {chapterLabel}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 shrink-0 group-hover:text-[#6B8CA8]" />
                </Link>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400 text-sm">No hay actualizaciones recientes</div>
          )}
        </motion.section>

        {/* Continuar leyendo */}
        <motion.section
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-gray-800 p-5 rounded-[20px] shadow-sm border border-gray-100 dark:border-gray-700"
        >
          <div className="flex items-center justify-between mb-4 border-b border-gray-100 dark:border-gray-700 pb-3">
            <h2 className="font-display text-sm font-bold text-gray-900 dark:text-gray-100">
              Continuar leyendo
            </h2>
            {continueReading.length > 0 && (
              <Button variant="ghost" size="sm" asChild className="text-[#6B8CA8] text-xs">
                <Link to="/library?status=LEYENDO">Ver todas +</Link>
              </Button>
            )}
          </div>

          {continueReading.length > 0 ? (
            <div className="space-y-5">
              {continueReading.slice(0, 4).map((entry, index) => {
                const manhwa = entry.manhwa || entry
                const total = manhwa.chapters || 100
                const current = entry.current_chapter || 0
                const percent = Math.min(100, Math.round((current / total) * 100))
                
                return (
                  <div key={`${entry.manhwa_id}_${index}`} className="flex items-center gap-4">
                    {manhwa.cover_image ? (
                      <img src={manhwa.cover_image} alt="cover" className="w-12 h-16 object-cover rounded-xl shadow-sm" />
                    ) : (
                      <div className="w-12 h-16 bg-gray-100 rounded-xl flex items-center justify-center"><BookOpen className="w-5 h-5 text-gray-400"/></div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">{manhwa.title_english || manhwa.title_romaji || manhwa.title}</h3>
                      <div className="flex items-center justify-between mt-1 mb-1.5">
                        <span className="text-xs text-gray-500 font-medium">Cap. {current} / {manhwa.chapters || '?'}</span>
                        <span className="text-xs text-bl-blue font-bold">{percent}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-bl-blue rounded-full" style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400 text-sm">No estás leyendo nada actualmente</div>
          )}
        </motion.section>
      </div>
      
      {continueReading.length === 0 && newChapters.length === 0 && favorites.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-16"
        >
          <BookOpen className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="font-display text-xl font-semibold text-gray-900 mb-2">Tu biblioteca está vacía</h3>
          <p className="text-gray-500 mb-6">Empieza a buscar y agregar manhwas a tu biblioteca</p>
          <Button asChild variant="primary" size="lg">
            <Link to="/search">Buscar tu primer manhwa</Link>
          </Button>
        </motion.div>
      )}
    </div>
  )
}