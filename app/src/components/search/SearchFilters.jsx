import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronDown, ChevronUp, Tag, Calendar, Star, Globe, Search } from 'lucide-react'
import { Button } from '../ui/Button'
import { cn } from '../../utils/helpers'

const GENRES = [
  'Romance', 'Drama', 'Comedy', 'Fantasy', 'Historical', 'School Life',
  'Slice of Life', 'Supernatural', 'Yaoi', 'Shounen Ai', 'Office',
  'College', 'Sports', 'Music', 'Mystery', 'Psychological', 'Action'
]

const TAGS = [
  'Omegaverse', 'Mpreg', 'Age Gap', 'Childhood Friends', 'Enemies to Lovers',
  'Fake Relationship', 'Forced Proximity', 'One Bed', 'Slow Burn', 'Pining',
  'Mutual Pining', 'First Love', 'Reunion', 'Secret Relationship', 'Workplace Romance'
]

const STATUSES = [
  { value: 'RELEASING', label: 'En publicación' },
  { value: 'FINISHED', label: 'Finalizado' },
  { value: 'HIATUS', label: 'En pausa' },
  { value: 'CANCELLED', label: 'Cancelado' },
]

const SORT_OPTIONS = [
  { value: 'POPULARITY_DESC', label: 'Más popular' },
  { value: 'SCORE_DESC', label: 'Mejor puntuado' },
  { value: 'START_DATE_DESC', label: 'Más reciente' },
  { value: 'START_DATE_ASC', label: 'Más antiguo' },
  { value: 'TITLE_ROMAJI', label: 'Alfabético' },
]

export function SearchFilters({ 
  filters, 
  onFiltersChange, 
  onClear,
  onApply,
  isOpen,
  onToggle 
}) {
  const [expandedSections, setExpandedSections] = useState({
    genres: true,
    tags: true,
    status: false,
    sort: false,
  })

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const handleGenreToggle = (genre) => {
    const newGenres = filters.genres?.includes(genre)
      ? filters.genres.filter(g => g !== genre)
      : [...(filters.genres || []), genre]
    onFiltersChange({ ...filters, genres: newGenres })
  }

  const handleTagToggle = (tag) => {
    const newTags = filters.tags?.includes(tag)
      ? filters.tags.filter(t => t !== tag)
      : [...(filters.tags || []), tag]
    onFiltersChange({ ...filters, tags: newTags })
  }

  const hasActiveFilters = filters.genres?.length || filters.tags?.length || filters.status || filters.sort

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="bg-white rounded-2xl border border-bl-sand/20 p-6 space-y-6 animate-in slide-down"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-display font-semibold text-gray-900">Filtros de búsqueda</h3>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={onClear}>
                <X className="w-4 h-4 mr-1" />
                Limpiar todo
              </Button>
            )}
          </div>

          <div className="space-y-6">
            <FilterSection
              title="Géneros"
              icon={Tag}
              expanded={expandedSections.genres}
              onToggle={() => toggleSection('genres')}
            >
              <div className="flex flex-wrap gap-2">
                {GENRES.map((genre) => (
                  <button
                    key={genre}
                    onClick={() => handleGenreToggle(genre)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200',
                      filters.genres?.includes(genre)
                        ? 'bg-bl-sage text-white shadow-soft'
                        : 'bg-bl-sand/10 text-bl-sandDark hover:bg-bl-sage/10 hover:text-bl-sageDark'
                    )}
                  >
                    {genre}
                  </button>
                ))}
              </div>
            </FilterSection>

            <FilterSection
              title="Tags / Temas"
              icon={Tag}
              expanded={expandedSections.tags}
              onToggle={() => toggleSection('tags')}
            >
              <div className="flex flex-wrap gap-2">
                {TAGS.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => handleTagToggle(tag)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200',
                      filters.tags?.includes(tag)
                        ? 'bg-bl-rose text-white shadow-soft'
                        : 'bg-bl-rose/10 text-bl-roseDark hover:bg-bl-rose/20'
                    )}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </FilterSection>

            <FilterSection
              title="Estado de publicación"
              icon={Calendar}
              expanded={expandedSections.status}
              onToggle={() => toggleSection('status')}
            >
              <div className="flex flex-wrap gap-2">
                {STATUSES.map((status) => (
                  <button
                    key={status.value}
                    onClick={() => onFiltersChange({ ...filters, status: filters.status === status.value ? '' : status.value })}
                    className={cn(
                      'px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 border-2',
                      filters.status === status.value
                        ? 'bg-bl-sage border-bl-sage text-white'
                        : 'bg-white border-bl-sand/20 text-bl-sandDark hover:border-bl-sage/50'
                    )}
                  >
                    {status.label}
                  </button>
                ))}
              </div>
            </FilterSection>

            <FilterSection
              title="Ordenar por"
              icon={Star}
              expanded={expandedSections.sort}
              onToggle={() => toggleSection('sort')}
            >
              <div className="flex flex-wrap gap-2">
                {SORT_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => onFiltersChange({ ...filters, sort: option.value })}
                    className={cn(
                      'px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 border-2',
                      filters.sort === option.value
                        ? 'bg-bl-sand border-bl-sand text-white'
                        : 'bg-white border-bl-sand/20 text-bl-sandDark hover:border-bl-sand/50'
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </FilterSection>
          </div>

          <div className="flex justify-end border-t border-bl-sand/20 pt-5">
            <Button variant="primary" onClick={onApply}>
              <Search className="w-4 h-4" />
              Buscar con filtros
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function FilterSection({ title, icon: Icon, expanded, onToggle, children }) {
  return (
    <div className="border-t border-bl-sand/20 pt-4 first:border-0 first:pt-0">
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full text-left"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-bl-sand" />
          <span className="font-medium text-gray-900">{title}</span>
        </div>
        {expanded ? <ChevronUp className="w-5 h-5 text-bl-sand" /> : <ChevronDown className="w-5 h-5 text-bl-sand" />}
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}