import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Heart, BookOpen, Calendar, Star, Award, Tag, 
  ChevronRight, ChevronDown, X, CheckCircle, 
  Loader2, AlertCircle, Bell, Share2, RefreshCw, Clock, Pause
} from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card, CardContent, CardHeader } from '../components/ui/Card'
import { Badge, StatusBadge, GenreBadge } from '../components/ui/Badge'
import { ChapterProgress, ChapterList } from '../components/manhwa/ChapterProgress'
import { ChapterReader } from '../components/manhwa/ChapterReader'
import { Modal, ConfirmModal } from '../components/ui/Modal'
import { manhwaService, libraryService, chapterService } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { cn, formatDate, truncate, getStatusLabel } from '../utils/helpers'
import { toast } from 'react-hot-toast'

export function ManhwaDetail() {
  const { id, anilist_id } = useParams()
  const { isAuthenticated } = useAuth()
  
  const [manhwa, setManhwa] = useState(null)
  const [chapters, setChapters] = useState([])
  const [libraryEntry, setLibraryEntry] = useState(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showConfirmRemove, setShowConfirmRemove] = useState(false)
  const [newChaptersCount, setNewChaptersCount] = useState(0)
  const [activeTab, setActiveTab] = useState('capítulos')
  const [readerChapter, setReaderChapter] = useState(null)
  const [addSelected, setAddSelected] = useState(null)
  const [addFav, setAddFav] = useState(false)
  const [checkedReads, setCheckedReads] = useState(() => {
    try {
      const key = `bl_read_${id || anilist_id || 'tmp'}`
      const saved = localStorage.getItem(key)
      return new Set(saved ? JSON.parse(saved) : [])
    } catch { return new Set() }
  })

  useEffect(() => {
    loadManhwa()
  }, [id, anilist_id])

  // Persistir checks de leído por obra
  useEffect(() => {
    const key = `bl_read_${manhwa?.id || id || anilist_id || 'tmp'}`
    if (checkedReads.size === 0) return
    localStorage.setItem(key, JSON.stringify([...checkedReads]))
  }, [checkedReads, manhwa?.id, id, anilist_id])

  // Cargar checks guardados cuando cambia obra
  useEffect(() => {
    const key = `bl_read_${manhwa?.id || id || anilist_id || 'tmp'}`
    try {
      const saved = localStorage.getItem(key)
      if (saved) setCheckedReads(new Set(JSON.parse(saved)))
    } catch {}
  }, [manhwa?.id])

  const loadManhwa = async () => {
    setLoading(true)
    try {
      let manhwaRes;
      if (id) {
        try {
          manhwaRes = await manhwaService.getById(id)
        } catch (error) {
          if (error.response?.status !== 404) throw error
          manhwaRes = await manhwaService.getByAniListId(id)
        }
      } else if (anilist_id) {
        manhwaRes = await manhwaService.getByAniListId(anilist_id)
      } else {
        throw new Error('No ID provided')
      }
      
      const localId = manhwaRes.id;
      setManhwa(manhwaRes)
      
      const chaptersRes = await chapterService.getChapters(localId).catch(() => [])
      const loadedChapters = Array.isArray(chaptersRes) ? chaptersRes : (chaptersRes?.data || [])
      setChapters(loadedChapters)
      
      if (isAuthenticated) {
        try {
          const entryRes = await libraryService.getLibraryEntry(localId)
          setLibraryEntry(entryRes)
          if (entryRes) {
            const newChaps = loadedChapters.filter(c => c.chapter_number > (entryRes.current_chapter || 0))
            setNewChaptersCount(newChaps.length)
          }
        } catch {
          // Not in library
        }
      }
    } catch (error) {
      console.error('Error loading manhwa:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddToLibrary = async (initialData = {}) => {
    if (!isAuthenticated) {
      return
    }
    setUpdating(true)
    try {
      const localId = manhwa.id;
      const res = await libraryService.addToLibrary({ manhwa_id: localId, ...initialData })
      setLibraryEntry(res)
      setShowAddModal(false)
    } catch (error) {
      console.error('Error adding to library:', error)
    } finally {
      setUpdating(false)
    }
  }

  const handleUpdateProgress = async (chapter) => {
    if (!libraryEntry) return
    try {
      const res = await libraryService.updateProgress(manhwa.id, chapter)
      setLibraryEntry(res.entry || res)
      const newChaps = chapters.filter(c => c.chapter_number > chapter)
      setNewChaptersCount(newChaps.length)
    } catch (error) {
      console.error('Error updating progress:', error)
    }
  }

  const handleToggleFavorite = async () => {
    if (!libraryEntry) return
    try {
      const res = await libraryService.toggleFavorite(manhwa.id)
      setLibraryEntry(res)
    } catch (error) {
      console.error('Error toggling favorite:', error)
    }
  }

  const handleUpdateStatus = async (status) => {
    if (!libraryEntry || updating || libraryEntry.status === status) return
    const prev = libraryEntry
    setUpdating(true)
    setLibraryEntry(p => ({ ...p, status }))
    try {
      await libraryService.updateLibraryEntry(manhwa.id, { status })
      const fresh = await libraryService.getLibraryEntry(manhwa.id)
      setLibraryEntry(fresh)
      toast.success(`Estado cambiado a ${status}`)
    } catch (error) {
      setLibraryEntry(prev)
      console.error('Error updating library status:', error)
      toast.error(error.response?.data?.message || error.data?.message || 'No se pudo cambiar el estado')
    } finally {
      setUpdating(false)
    }
  }

  const handleRemoveFromLibrary = async () => {
    try {
      await libraryService.removeFromLibrary(manhwa.id)
      setLibraryEntry(null)
      setShowConfirmRemove(false)
    } catch (error) {
      console.error('Error removing from library:', error)
    }
  }

  const handleUpdateChapters = async () => {
    setUpdating(true)
    try {
      const res = await manhwaService.updateChapters(manhwa.id)
      setChapters(res.chapters || [])
      if (libraryEntry) {
        const newChaps = res.chapters.filter(c => c.chapter_number > (libraryEntry.current_chapter || 0))
        setNewChaptersCount(newChaps.length)
      }
    } catch (error) {
      console.error('Error updating chapters:', error)
    } finally {
      setUpdating(false)
    }
  }

  const handleOpenChapter = (chapter) => {
    if (chapter.mangadex_chapter_id) setReaderChapter(chapter)
  }

  const getChapterKey = (chapter) => chapter.mangadex_chapter_id || String(chapter.id)
  const handleToggleRead = (chapter) => {
    const key = getChapterKey(chapter)
    setCheckedReads(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      localStorage.setItem(`bl_read_${manhwa?.id || id || anilist_id}`, JSON.stringify([...next]))
      // Opcional: notificar backend sin mover current_chapter
      chapterService.markAsRead(chapter.id).catch(() => {})
      return next
    })
  }

  const readerIndex = readerChapter ? chapters.findIndex(chapter => chapter.id === readerChapter.id || chapter.mangadex_chapter_id === readerChapter.mangadex_chapter_id) : -1
  const previousChapter = readerIndex > 0 ? chapters[readerIndex - 1] : null
  const nextChapter = readerIndex >= 0 && readerIndex < chapters.length - 1 ? chapters[readerIndex + 1] : null

  if (loading) {
    return (
      <div className="page-container">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <div className="skeleton aspect-[2/3] w-full max-w-xs mx-auto lg:mx-0 rounded-2xl" />
          </div>
          <div className="lg:col-span-2 space-y-6">
            <div className="skeleton h-10 w-3/4" />
            <div className="skeleton h-6 w-1/2" />
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-4 w-2/3" />
            <div className="flex gap-2"><div className="skeleton h-8 w-24 rounded-xl" /><div className="skeleton h-8 w-24 rounded-xl" /></div>
            <div className="skeleton h-32 w-full" />
          </div>
        </div>
      </div>
    )
  }

  if (!manhwa) {
    return (
      <div className="page-container text-center py-16">
        <AlertCircle className="w-16 h-16 mx-auto text-bl-sand/50 mb-4" />
        <h2 className="font-display text-2xl font-semibold text-gray-900 mb-2">Obra no encontrada</h2>
        <p className="text-bl-sand mb-6">La obra que buscas no existe o ha sido eliminada.</p>
        <Button asChild variant="primary">
          <Link to="/search">Buscar otras obras</Link>
        </Button>
      </div>
    )
  }

  const {
    title,
    title_english,
    title_romaji,
    title_native,
    description,
    cover_image,
    banner_image,
    bannerImage,
    genres = [],
    tags = [],
    status: publicationStatus,
    average_score,
    mean_score,
    popularity,
    favourites,
    chapters: totalChapters,
    volumes,
    start_date,
    end_date,
    season,
    season_year,
    format,
    source,
    updated_at,
    country_of_origin,
    is_licensed,
    is_adult,
    next_airing_episode,
  } = manhwa

  const displayTitle = title_english || title_romaji || title || 'Sin título'
  const coverImage = cover_image || banner_image || bannerImage

  const statusColors = {
    RELEASING: 'bg-bl-sage/10 text-bl-sageDark border-bl-sage/30',
    FINISHED: 'bg-bl-rose/10 text-bl-roseDark border-bl-rose/30',
    HIATUS: 'bg-bl-sand/20 text-bl-sandDark border-bl-sand/30',
    CANCELLED: 'bg-gray-100 text-gray-500 border-gray-200',
  }

  // Safely parse JSON arrays from API strings
  const parseJsonArray = (value) => {
    if (Array.isArray(value)) return value
    if (!value) return []
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  const parsedGenres = parseJsonArray(genres)
  const parsedTags = parseJsonArray(tags)

  const libraryStatusStyles = {
    LEYENDO: { icon: BookOpen, className: 'bg-[#C9B297]/20 text-[#6B8CA8] border-[#C9B297]/30' },
    PENDIENTE: { icon: Calendar, className: 'bg-[#EEEFE8] text-[#8A7A6A] border border-[#C9B297]/30' },
    COMPLETADO: { icon: CheckCircle, className: 'bg-[#8FBC93]/15 text-[#6BAE75] border-[#8FBC93]/30' },
    PAUSADO: { icon: Bell, className: 'bg-gray-100 text-gray-500 border-gray-200' },
    ABANDONADO: { icon: X, className: 'bg-gray-100 text-gray-600 border-gray-200' },
    RELECTURA: { icon: RefreshCw, className: 'bg-[#E9ACBB]/15 text-[#C07A8A] border-[#E9ACBB]/30' },
  }

  const currentLibraryStatus = libraryEntry?.status || 'PENDIENTE'
  const CurrentStatusIcon = libraryStatusStyles[currentLibraryStatus]?.icon || Calendar

  const formatGenres = () => parsedGenres.map(g => g.name || g).filter(Boolean)
  const formatTags = () => parsedTags.map(t => t.name || t).filter(Boolean).slice(0, 10)

  return (
    <div className="page-container pb-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 lg:grid-cols-12 gap-8"
      >
        <div className="lg:col-span-4">
          <div className="sticky top-8">
            <div className="relative aspect-[3/4] rounded-[32px] overflow-hidden bg-gray-100 shadow-sm border border-gray-100">
              {coverImage ? (
                <img 
                  src={coverImage} 
                  alt={displayTitle}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <BookOpen className="w-20 h-20 opacity-50" />
                </div>
              )}
              {/* Overlay with Title like in mockup */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-6 pt-20">
                <h1 className="font-display text-4xl font-bold text-white uppercase tracking-wider">
                  {displayTitle}
                </h1>
              </div>
            </div>

            {isAuthenticated && !libraryEntry && (
              <Button 
                variant="primary" 
                className="w-full mt-6 py-4 rounded-2xl shadow-sm" 
                size="lg"
                onClick={() => setShowAddModal(true)}
              >
                Agregar a mi biblioteca
              </Button>
            )}

            {isAuthenticated && libraryEntry && (
              <div className="mt-6 rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 space-y-3 shadow-sm">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Mi estado</span>
                  <span className="text-[11px] text-[#8FBC93] font-medium">● Actualizado</span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-3 gap-1.5">
                  {Object.entries(libraryStatusStyles).map(([status, { icon: Icon }]) => {
                    const active = (currentLibraryStatus?.trim().toUpperCase() === status)
                    return (
                      <motion.button
                        key={status}
                        onClick={() => handleUpdateStatus(status)}
                        disabled={updating}
                        whileTap={{ scale: 0.96 }}
                        animate={active ? { scale: [1, 1.04, 1] } : {}}
                        transition={{ duration: 0.3 }}
                        className={cn(
                          'h-9 rounded-full border text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1 transition-all disabled:opacity-60',
                          active ? 'bg-[#E9ACBB] border-[#E9ACBB] text-white shadow-md ring-2 ring-[#E9ACBB]/30' : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50'
                        )}
                      >
                        <motion.span animate={active ? { rotate: 360, scale: 1.1 } : { rotate: 0, scale: 1 }} transition={{ duration: 0.4 }}>
                          <Icon className="w-3.5 h-3.5" />
                        </motion.span>
                        <span className="hidden sm:inline">{getStatusLabel(status)}</span>
                        <span className="sm:hidden">{status.slice(0,3)}</span>
                      </motion.button>
                    )
                  })}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 rounded-xl border-gray-200 text-gray-600 hover:bg-gray-50 text-sm"
                    onClick={() => setShowConfirmRemove(true)}
                  >
                    Quitar de biblioteca
                  </Button>
                  <Button
                    variant={libraryEntry.favorite ? 'primary' : 'outline'}
                    className={cn('w-12 rounded-xl', libraryEntry.favorite ? 'bg-[#E9ACBB] border-[#E9ACBB]' : 'border-gray-200 text-gray-400')}
                    onClick={handleToggleFavorite}
                    aria-label={libraryEntry.favorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}
                  >
                    <Heart className={cn('h-5 w-5', libraryEntry.favorite && 'fill-current')} />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-8 lg:pl-4">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-3">
              <h1 className="font-display text-3xl font-bold text-gray-900 dark:text-gray-100">
                {displayTitle}
              </h1>
              {libraryEntry && (
                <Heart className={cn("w-5 h-5 text-[#E9ACBB]", libraryEntry.favorite && "fill-current")} />
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5 mb-3">
              {formatGenres().slice(0, 4).map((genre) => (
                <span key={genre} className="text-[11px] px-2.5 py-1 rounded-full bg-[#C9B297]/20 text-[#6B8CA8] dark:bg-[#C9B297]/15 font-medium">{genre}</span>
              ))}
              <span className="text-[11px] px-2.5 py-1 rounded-full bg-[#E9ACBB]/20 text-[#C07A8A] font-medium">BL</span>
              {is_adult && (
                <span className="text-[11px] px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 font-medium">Adulto</span>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs mb-6">
              <div className="flex items-center gap-1.5 text-amber-600 font-semibold bg-amber-50 dark:bg-amber-900/20 px-2.5 py-1 rounded-full border border-amber-100 dark:border-amber-800">
                <Star className="w-3.5 h-3.5 fill-current" />
                {average_score ? (average_score / 10).toFixed(1) : 'N/A'} 
                <span className="text-amber-600/60 font-normal">({popularity ? Math.round(popularity/1000) + 'k' : '0'})</span>
              </div>
              <span className="text-[11px] px-2.5 py-1 rounded-full bg-[#8FBC93]/15 text-[#6BAE75] font-medium border border-[#8FBC93]/20">{publicationStatus==='FINISHED'?'Finalizado':publicationStatus==='RELEASING'?'En emisión':getStatusLabel(publicationStatus)}</span>
            </div>

            <div className="mb-8">
              <h3 className="font-display text-xl font-bold text-gray-900 mb-3">Sinopsis</h3>
              <div className="text-gray-600 leading-relaxed text-sm/6 sm:text-base/7">
                {description ? description.replace(/<[^>]*>?/gm, '') : 'No hay sinopsis disponible.'}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 py-4 border-y border-gray-100 dark:border-gray-700 mb-6 text-center bg-gray-50/50 dark:bg-gray-800/50 rounded-xl">
              <div>
                <p className="text-[11px] text-gray-400 uppercase tracking-wide">Autor</p>
                <p className="font-medium text-sm text-gray-900 dark:text-gray-100 mt-0.5">{parsedTags.find(t => t.category === 'Cast-Main')?.name || 'Desconocido'}</p>
              </div>
              <div>
                <p className="text-[11px] text-gray-400 uppercase tracking-wide">Estado</p>
                <p className="font-medium text-sm text-gray-900 dark:text-gray-100 mt-0.5">{getStatusLabel(publicationStatus)}</p>
              </div>
              <div>
                <p className="text-[11px] text-gray-400 uppercase tracking-wide">Capítulos</p>
                <p className="font-medium text-sm text-gray-900 dark:text-gray-100 mt-0.5">{totalChapters || '?'}</p>
              </div>
            </div>
          </div>

          <div>
            <div className="flex gap-6 mb-6 border-b border-gray-100 dark:border-gray-700">
              <button className="pb-3 text-sm font-semibold text-[#6B8CA8] dark:text-[#8FB0CC] relative">
                Capítulos
                <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#C9B297]" />
              </button>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key="capítulos"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                  {libraryEntry ? (
                    <>
                      <ChapterProgress
                        currentChapter={libraryEntry.current_chapter || 0}
                        totalChapters={totalChapters || chapters.length}
                        status={libraryEntry.status}
                        newChaptersCount={newChaptersCount}
                        onUpdate={handleUpdateProgress}
                        isLoading={updating}
                        manhwaId={id}
                      />
                      <ChapterList
                        chapters={chapters}
                        currentChapter={libraryEntry.current_chapter || 0}
                        onChapterClick={handleOpenChapter}
                        onToggleRead={handleToggleRead}
                        checkedReads={checkedReads}
                        manhwaId={id}
                      />
                      <div className="mt-4 flex gap-2">
                        <Button variant="outline" onClick={handleUpdateChapters} isLoading={updating}>
                          <RefreshCw className="w-4 h-4 mr-1" />
                          Buscar nuevos capítulos
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-12 bg-gray-50 rounded-[24px]">
                      <BookOpen className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                      <p className="text-gray-500 mb-4 font-medium">Agrega esta obra a tu biblioteca para llevar el progreso.</p>
                      {isAuthenticated ? (
                        <Button variant="primary" onClick={() => setShowAddModal(true)}>
                          Añadir a mi biblioteca
                        </Button>
                      ) : (
                        <Button variant="primary" asChild>
                          <Link to="/login" state={{ from: { pathname: `/manhwa/${id}` } }}>
                            Iniciar sesión para añadir
                          </Link>
                        </Button>
                      )}
                    </div>
                  )}
                </motion.div>

            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      <Modal isOpen={showAddModal} onClose={() => { setShowAddModal(false); setAddSelected(null); setAddFav(false) }} title="Añadir a mi biblioteca" size="md">
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">¿Cómo quieres empezar esta obra?</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.entries({
              LEYENDO: BookOpen,
              PENDIENTE: Clock,
              COMPLETADO: CheckCircle,
              PAUSADO: Pause,
              ABANDONADO: X,
              RELECTURA: RefreshCw,
            }).map(([status, Icon]) => {
              const selected = addSelected === status
              return (
                <motion.button
                  key={status}
                  onClick={() => setAddSelected(status)}
                  whileTap={{ scale: 0.96 }}
                  animate={selected ? { scale: [1, 1.03, 1] } : {}}
                  transition={{ duration: 0.35 }}
                  className={cn(
                    'h-10 sm:h-11 rounded-full border text-[11px] sm:text-[13px] font-semibold flex items-center justify-center gap-1 sm:gap-1.5 px-2 transition-all whitespace-nowrap',
                    selected ? 'bg-[#E9ACBB] border-[#E9ACBB] text-white shadow-md' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50'
                  )}
                >
                  <motion.span
                    animate={selected ? { rotate: 360, scale: 1.1 } : { rotate: 0, scale: 1 }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                  >
                    <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </motion.span>
                  <span className="truncate">{status}</span>
                  {selected && <motion.span initial={{ scale: 0 }} animate={{ scale: 1, rotate: 360 }} transition={{ duration: 0.3 }} className="ml-0.5 hidden sm:inline"><CheckCircle className="w-3.5 h-3.5" /></motion.span>}
                </motion.button>
              )
            })}
          </div>
          <motion.button
            onClick={() => setAddFav(v => !v)}
            className={cn('w-full h-11 rounded-full border flex items-center justify-center gap-2 text-sm font-semibold transition-all', addFav ? 'bg-[#E9ACBB] border-[#E9ACBB] text-white' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300')}
            animate={addFav ? { scale: [1, 1.02, 1] } : {}}
            transition={{ duration: 0.3 }}
          >
            <Heart className={cn('w-4 h-4', addFav && 'fill-current animate-pulse')} />
            {addFav ? 'Añadido a favoritos' : 'Añadir a favoritos'}
          </motion.button>
          <div className="flex gap-2 pt-2">
            <Button variant="ghost" className="flex-1" onClick={() => { setShowAddModal(false); setAddSelected(null); setAddFav(false) }}>Cancelar</Button>
            <Button
              variant="primary"
              className="flex-1 bg-[#E9ACBB] hover:bg-[#D89BAA]"
              disabled={!addSelected || updating}
              isLoading={updating}
              onClick={() => handleAddToLibrary({
                status: addSelected,
                current_chapter: addSelected === 'LEYENDO' ? 1 : addSelected === 'COMPLETADO' ? (totalChapters || 0) : 0,
                favorite: addFav,
              })}
            >
              Confirmar
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={showConfirmRemove}
        onClose={() => setShowConfirmRemove(false)}
        onConfirm={handleRemoveFromLibrary}
        title="Eliminar de biblioteca"
        message="¿Estás seguro de que quieres eliminar esta obra de tu biblioteca? Se perderá tu progreso y notas."
        confirmText="Eliminar"
        variant="danger"
      />

      {readerChapter && (
        <ChapterReader
          chapter={readerChapter}
          onClose={() => setReaderChapter(null)}
          onPrevious={previousChapter ? () => setReaderChapter(previousChapter) : undefined}
          onNext={nextChapter ? () => setReaderChapter(nextChapter) : undefined}
        />
      )}
    </div>
  )
}