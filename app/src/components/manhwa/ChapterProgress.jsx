import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Minus, Plus, BookOpen, CheckCircle, AlertCircle, Check } from 'lucide-react'
import { Button } from '../ui/Button'
import { Badge, StatusBadge } from '../ui/Badge'
import { cn, getStatusLabel } from '../../utils/helpers'

export function ChapterProgress({ 
  currentChapter, 
  totalChapters, 
  status, 
  onUpdate, 
  isLoading,
  newChaptersCount = 0,
  manhwaId 
}) {
  const [localChapter, setLocalChapter] = useState(currentChapter)
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    setLocalChapter(currentChapter)
  }, [currentChapter])

  const handleIncrement = () => {
    if (localChapter < totalChapters) {
      const next = localChapter + 1
      setLocalChapter(next)
      onUpdate?.(next)
    }
  }

  const handleDecrement = () => {
    if (localChapter > 0) {
      const next = localChapter - 1
      setLocalChapter(next)
      onUpdate?.(next)
    }
  }

  const handleManualSubmit = () => {
    const maxChapter = Number(totalChapters) || 0
    const next = Math.max(0, maxChapter > 0 ? Math.min(localChapter, maxChapter) : localChapter)
    setLocalChapter(next)
    setIsEditing(false)
    onUpdate?.(next)
  }

  const progress = totalChapters > 0 ? Math.min(100, (localChapter / totalChapters) * 100) : 0
  const isCompleted = status === 'COMPLETADO' || localChapter >= totalChapters

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
            Cap. {localChapter} / {totalChapters || '?'}
          </span>
          {newChaptersCount > 0 && (
            <span className="px-2 py-0.5 bg-[#E9ACBB]/15 text-[#C07A8A] rounded-full text-[11px] font-medium">
              +{newChaptersCount} nuevos
            </span>
          )}
          <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 ml-2">RELEASING</span>
        </div>
      </div>

      <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          className="h-full rounded-full bg-[#8FBC93] transition-all duration-500"
        />
      </div>

      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDecrement}
          disabled={localChapter <= 0 || isLoading}
          aria-label="Capítulo anterior"
          className="w-8 h-8 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-700"
        >
          <Minus className="w-4 h-4" />
        </Button>

        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <input
                  type="number"
                  min="0"
                  max={totalChapters || undefined}
                  value={localChapter}
                  onChange={(event) => setLocalChapter(Math.max(0, Number(event.target.value) || 0))}
                  onKeyDown={(event) => event.key === 'Enter' && handleManualSubmit()}
                  className="w-16 rounded-lg border border-gray-200 bg-white px-2 py-1 text-center text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#E9ACBB]"
                  aria-label="Número de capítulo"
                  autoFocus
                />
                <Button variant="primary" size="sm" onClick={handleManualSubmit} disabled={isLoading} aria-label="Guardar capítulo" className="w-8 h-8 rounded-full bg-[#E9ACBB]">
                  <Check className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <button
                type="button"
                className="min-w-8 rounded-full px-3 py-1 text-sm font-bold text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100"
                onClick={() => setIsEditing(true)}
                aria-label="Editar número de capítulo"
              >
                {localChapter}
              </button>
            )}
          </div>
          {totalChapters && localChapter > 0 && (
            <span className="text-[10px] text-gray-400 mt-1">{Math.round(progress)}% completado</span>
          )}
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={handleIncrement}
          disabled={localChapter >= totalChapters || isLoading}
          aria-label="Siguiente capítulo"
          className="w-8 h-8 rounded-full bg-[#E9ACBB] hover:bg-[#D89BAA] text-white"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {isCompleted && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 p-3 bg-[#8FBC93]/10 rounded-xl text-[#6BAE75] text-sm"
        >
          <CheckCircle className="w-5 h-5 shrink-0" />
          <span>¡Completado! {status === 'RELECTURA' ? 'Iniciando relectura...' : '¿Quieres marcarlo como relectura?'}</span>
        </motion.div>
      )}
    </div>
  )
}

export function ChapterList({ chapters = [], currentChapter, onChapterClick, onToggleRead, checkedReads = new Set(), manhwaId }) {
  const [expanded, setExpanded] = useState(false)
  const displayChapters = expanded ? chapters : chapters.slice(-10)
  const hasMore = chapters.length > 10
  const getKey = (ch) => ch.mangadex_chapter_id || String(ch.id)

  return (
    <div className="space-y-2 mt-4">
      <AnimatePresence mode="popLayout">
        {displayChapters.map((chapter, index) => {
          const key = getKey(chapter)
          const isProgressRead = chapter.chapter_number <= currentChapter
          const isChecked = checkedReads.has(key)
          const isRead = isProgressRead || isChecked
          const formattedNum = Number(chapter.chapter_number).toFixed(2)
          return (
          <motion.div
            key={chapter.id || chapter.mangadex_chapter_id || index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ delay: index * 0.03 }}
            className={cn(
              'w-full flex items-center justify-between p-3 rounded-xl border transition-all duration-200 text-left',
              isRead
                ? 'bg-[#EEF5EE] border-[#8FBC93]/20 hover:bg-[#E6F2E8]'
                : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-gray-200'
            )}
          >
            <button onClick={() => onChapterClick?.(chapter)} className="flex items-center gap-3 min-w-0 flex-1 text-left">
              <span className={cn(
                'w-9 h-9 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0',
                isRead
                  ? 'bg-[#8FBC93] text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
              )}>
                {isRead ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  formattedNum
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">
                  Cap. {formattedNum} <span className="font-normal text-gray-500 dark:text-gray-400">: {chapter.title || 'Sin título'}</span>
                </p>
                <p className="text-[11px] text-gray-400">
                  {chapter.publish_date ? new Date(chapter.publish_date).toLocaleDateString('es-ES') : '—'}
                </p>
              </div>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onToggleRead?.(chapter) }}
              aria-label={isChecked ? 'Marcar como no leído' : 'Marcar como leído'}
              title={isChecked ? 'Quitar marca' : 'Marcar como leído (no afecta progreso)'}
              className={cn('ml-2 w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors border',
                isChecked ? 'bg-[#8FBC93] text-white border-[#8FBC93]' : isProgressRead ? 'bg-[#8FBC93]/20 text-[#8FBC93] border-[#8FBC93]/30' : 'bg-white dark:bg-gray-700 text-gray-400 border-gray-300 dark:border-gray-600 hover:border-[#8FBC93]/40')}
            >
              <Check className="w-4 h-4" />
            </button>
          </motion.div>
        )})}
      </AnimatePresence>

      {hasMore && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? 'Mostrar menos' : `Ver ${chapters.length - 10} capítulos más`}
        </Button>
      )}

      {chapters.length === 0 && (
        <div className="text-center py-8 text-bl-sand">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No hay capítulos disponibles aún</p>
        </div>
      )}
    </div>
  )
}