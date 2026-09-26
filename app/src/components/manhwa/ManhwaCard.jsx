import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Heart, BookOpen, Clock, Star } from 'lucide-react'
import { Card } from '../ui/Card'
import { Badge, StatusBadge } from '../ui/Badge'
import { manhwaService, libraryService } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { cn, formatDate, truncate, getStatusColor } from '../../utils/helpers'

/** Safely parse a value that may be a JSON string, array, or null into an array */
function parseJsonArray(value) {
  if (Array.isArray(value)) return value
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function ManhwaCard({ 
  manhwa = {}, 
  libraryEntry, 
  onFavoriteToggle, 
  onRemove, 
  variant = 'default',
  showActions = true 
}) {
  const { isAuthenticated } = useAuth()
  const [savedEntry, setSavedEntry] = useState(libraryEntry)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    setSavedEntry(libraryEntry)
  }, [libraryEntry])

  const {
    id,
    anilist_id,
    title, 
    title_english, 
    title_romaji, 
    cover_image, 
    banner_image,
    description,
    genres,
    tags,
    status: publicationStatus,
    average_score,
    chapters,
    start_date,
    end_date,
  } = manhwa

  const parsedGenres = parseJsonArray(genres)
  const parsedTags = parseJsonArray(tags)

  // Search results use AniList IDs until the detail endpoint creates the local record.
  const linkPath = id ? `/manhwa/${id}` : `/manhwa/anilist/${anilist_id}`

  const displayTitle = title_english || title_romaji || title || 'Sin título'
  const coverImage = cover_image || banner_image

  const handleFavoriteClick = async (event) => {
    event.preventDefault()
    event.stopPropagation()

    if (!isAuthenticated || isSaving) return

    setIsSaving(true)
    try {
      if (savedEntry) {
        const updatedEntry = onFavoriteToggle
          ? await onFavoriteToggle(id)
          : await libraryService.toggleFavorite(savedEntry.manhwa_id)
        if (updatedEntry) setSavedEntry(updatedEntry)
        return
      }

      const localManhwa = id ? manhwa : await manhwaService.getByAniListId(anilist_id)
      const newEntry = await libraryService.addToLibrary({
        manhwa_id: localManhwa.id,
        status: 'PENDIENTE',
        favorite: true,
      })
      setSavedEntry(newEntry)
    } catch (error) {
      console.error('Error toggling favorite:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const statusColors = {
    RELEASING: 'bg-bl-sage/10 text-bl-sageDark',
    FINISHED: 'bg-bl-rose/10 text-bl-roseDark',
    HIATUS: 'bg-bl-sand/20 text-bl-sandDark',
    CANCELLED: 'bg-gray-100 text-gray-500',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Link to={linkPath} className="block h-full">
        <Card className="h-full flex flex-col group cursor-pointer bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-[20px] overflow-hidden hover:shadow-elevated transition-shadow">
          <div className="relative aspect-[3/4] overflow-hidden bg-gray-50 dark:bg-gray-700">
          {coverImage ? (
            <img
              src={coverImage}
              alt={displayTitle}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-bl-sand">
              <BookOpen className="w-12 h-12 opacity-50" />
            </div>
          )}
          
          <div className="absolute top-2 left-2 flex gap-1.5">
            {libraryEntry && <StatusBadge status={libraryEntry.status} />}
          </div>

          <div className="absolute top-2 right-2 flex flex-col gap-1.5">
            {showActions && isAuthenticated && (
              <button
                onClick={handleFavoriteClick}
                disabled={isSaving}
                className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 shadow-sm',
                  savedEntry?.favorite
                    ? 'bg-[#E9ACBB] text-white'
                    : 'bg-white/90 text-gray-400 hover:text-[#E9ACBB] dark:bg-gray-800/90'
                )}
                aria-label={savedEntry?.favorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}
              >
                <Heart className={cn('w-4 h-4', savedEntry?.favorite && 'fill-current')} />
              </button>
            )}
            {showActions && onRemove && (
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onRemove(id)
                }}
                className="p-2 rounded-full bg-white/90 text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                aria-label="Eliminar de biblioteca"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        </div>

        <div className="p-3 flex flex-col flex-1 bg-white dark:bg-gray-800">
          <h3 className="font-medium text-[13px] text-gray-900 dark:text-gray-100 line-clamp-1">
            {displayTitle}
          </h3>
          {libraryEntry && (
            <div className="mt-1 flex items-center gap-1.5">
              <span className={cn('text-[11px] px-2 py-0.5 rounded-full font-medium',
                libraryEntry.status==='LEYENDO'&&'bg-[#E9ACBB]/20 text-[#C07A8A]',
                libraryEntry.status==='COMPLETADO'&&'bg-[#8FBC93]/20 text-[#6BAE75]',
                libraryEntry.status==='PENDIENTE'&&'bg-[#EEEFE8] text-[#8A7A6A] border border-[#C9B297]/20',
                libraryEntry.status==='PAUSADO'&&'bg-gray-100 text-gray-500',
                libraryEntry.status==='ABANDONADO'&&'bg-gray-100 text-gray-400',
                libraryEntry.status==='RELECTURA'&&'bg-[#C9B297]/20 text-[#8A7A6A]',
                !libraryEntry.status&&'bg-gray-100 text-gray-500'
              )}>{libraryEntry.status}</span>
              {libraryEntry.favorite && <Heart className="w-3 h-3 text-[#E9ACBB] fill-current" />}
            </div>
          )}
          {!libraryEntry && parsedGenres[0] && (
            <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-1">{(parsedGenres[0]?.name || parsedGenres[0])}</p>
          )}

          <div className="flex items-center justify-between text-[11px] text-gray-400 border-t border-gray-100 dark:border-gray-700 pt-2 mt-2">
            <span>Cap. {libraryEntry?.current_chapter ?? 0} / {chapters ?? '?'}</span>
            {libraryEntry?.current_chapter && chapters ? (
              <div className="w-14 h-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-[#8FBC93] rounded-full" style={{ width: `${Math.min(100, (libraryEntry.current_chapter / chapters) * 100)}%` }} />
              </div>
            ) : average_score ? <span className="flex items-center gap-1"><Star className="w-3 h-3 fill-current text-amber-400" />{(average_score/10).toFixed(1)}</span> : null}
          </div>
        </div>
      </Card>
      </Link>
    </motion.div>
  )
}

export function ManhwaCardHorizontal({ manhwa, libraryEntry, onFavoriteToggle, onRemove, showActions = true }) {
  const { 
    id, 
    title, 
    title_english, 
    title_romaji, 
    cover_image, 
    description,
    genres,
    tags,
    status: publicationStatus,
    average_score,
    chapters,
  } = manhwa

  const displayTitle = title_english || title_romaji || title || 'Sin título'

  const parsedGenres = parseJsonArray(genres)
  const parsedTags = parseJsonArray(tags)

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
    >
      <div className="card flex flex-row sm:flex-row overflow-hidden">
        <div className="relative w-full sm:w-32 shrink-0 aspect-[2/3] sm:aspect-auto">
          {cover_image ? (
            <img src={cover_image} alt={displayTitle} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-bl-sand/10 text-bl-sand">
              <BookOpen className="w-8 h-8" />
            </div>
          )}
        </div>
        <div className="p-4 flex flex-col justify-between flex-1 min-w-0">
          <div>
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="font-display font-semibold text-gray-900 line-clamp-1 flex-1">
                {displayTitle}
              </h3>
              <StatusBadge status={libraryEntry?.status || 'PENDIENTE'} />
            </div>
            {title_english && title_romaji && title_english !== title_romaji && (
              <p className="text-sm text-bl-sand mb-2">{title_romaji}</p>
            )}
            {description && (
              <p className="text-sm text-gray-500 line-clamp-2 mb-3">{truncate(description, 100)}</p>
            )}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {parsedGenres.slice(0, 2).map((genre) => (
                <Badge key={genre.id || genre} variant="default" className="text-xs">
                  {genre.name || genre}
                </Badge>
              ))}
              {parsedTags.slice(0, 1).map((tag) => (
                <Badge key={tag.id || tag} variant="rose" className="text-xs">
                  {tag.name || tag}
                </Badge>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-bl-sand/20">
            <div className="flex items-center gap-3 text-xs text-bl-sand">
              {chapters && <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" />{chapters} caps</span>}
              {average_score && <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5 fill-current text-amber-400" />{average_score / 10}</span>}
            </div>
            {showActions && libraryEntry && (
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onFavoriteToggle?.(id)
                }}
                className={cn(
                  'p-2 rounded-xl transition-colors',
                  libraryEntry.favorite
                    ? 'bg-bl-rose/10 text-bl-rose'
                    : 'text-bl-sand hover:bg-bl-sand/10'
                )}
              >
                <Heart className={cn('w-5 h-5', libraryEntry.favorite && 'fill-current')} />
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}