import { useEffect, useMemo, useState } from 'react'
import { Bell, BookOpen, ChevronRight, RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { chapterService } from '../services/api'

export function Notifications() {
  const [chapters, setChapters] = useState([])
  const [loading, setLoading] = useState(true)

  const loadNotifications = async () => {
    setLoading(true)
    try {
      const response = await chapterService.getNewChapters()
      setChapters(Array.isArray(response) ? response : (response?.data || []))
    } catch (error) {
      console.error('Error loading notifications:', error)
      setChapters([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadNotifications()
  }, [])

  const notifications = useMemo(() => {
    const grouped = new Map()
    chapters.forEach(chapter => {
      const key = chapter.manhwa_id
      const current = grouped.get(key) || { ...chapter, chapters: [] }
      current.chapters.push(chapter)
      grouped.set(key, current)
    })
    return [...grouped.values()]
  }, [chapters])

  return (
    <div className="page-container pb-16">
      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E9ACBB]/20 text-[#C07A8A]">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-gray-100">Notificaciones</h1>
            <p className="text-sm text-gray-400 dark:text-gray-500">Capítulos nuevos de las obras que sigues.</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={loadNotifications} disabled={loading} aria-label="Actualizar notificaciones">
          <RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
          <span className="hidden sm:inline">Actualizar</span>
        </Button>
      </motion.div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(item => <div key={item} className="skeleton h-24 w-full" />)}
        </div>
      ) : notifications.length === 0 ? (
        <Card className="py-16 text-center">
          <Bell className="mx-auto mb-4 h-14 w-14 text-bl-sand/50" />
          <h2 className="font-display text-xl font-semibold text-gray-900">No hay notificaciones nuevas</h2>
          <p className="mt-2 text-bl-textLight">Cuando aparezcan capítulos nuevos de tu biblioteca, los verás aquí.</p>
          <Button asChild variant="primary" className="mt-6">
            <Link to="/search">Buscar obras</Link>
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification, index) => {
            const title = notification.title_english || notification.title_romaji || notification.title || 'Sin título'
            return (
              <motion.div key={notification.manhwa_id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}>
                <Link to={`/manhwa/${notification.manhwa_id}`} className="block">
                  <Card className="flex items-center gap-4 p-4 bg-white hover:bg-bl-blue/10">
                    {notification.cover_image ? (
                      <img src={notification.cover_image} alt={title} className="h-16 w-12 shrink-0 rounded-lg object-cover" />
                    ) : (
                      <div className="flex h-16 w-12 shrink-0 items-center justify-center rounded-lg bg-bl-blue/20 text-bl-blueDark"><BookOpen className="h-5 w-5" /></div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate font-display text-lg font-semibold text-gray-900">{title}</h2>
                      <p className="mt-1 text-sm font-medium text-bl-blueDark">
                        {notification.chapters.length} capítulo{notification.chapters.length !== 1 ? 's' : ''} nuevo{notification.chapters.length !== 1 ? 's' : ''}
                      </p>
                      <p className="mt-1 text-xs text-bl-textLight">
                        Hasta el capítulo {Math.max(...notification.chapters.map(chapter => Number(chapter.chapter_number) || 0))}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 shrink-0 text-bl-sand" />
                  </Card>
                </Link>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
