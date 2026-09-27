import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search as SearchIcon, Filter, Grid, List, Loader2, Sparkles } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card, CardContent } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { ManhwaCard } from '../components/manhwa/ManhwaCard'
import { SearchBar } from '../components/search/SearchBar'
import { SearchFilters } from '../components/search/SearchFilters'
import { SearchResults, SearchPageHeader } from '../components/search/SearchResults'
import { NewcatharsisAdd } from '../components/search/NewcatharsisAdd'
import { manhwaService } from '../services/api'
import { cn, debounce } from '../utils/helpers'
import { SearchResultsSkeleton } from '../components/ui/Skeleton'

function parseFilterValues(value) {
  if (Array.isArray(value)) return value.map(String)
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    if (Array.isArray(parsed)) return parsed.map(String)
    if (parsed && typeof parsed === 'object') return Object.values(parsed).map(String)
  } catch {
    return []
  }
  return []
}

function applyFilters(results, filters) {
  const filtered = results.filter((manhwa) => {
    const genres = parseFilterValues(manhwa.genres).map(value => value.toLowerCase())
    const tags = parseFilterValues(manhwa.tags).map(value => value.toLowerCase())
    const selectedGenres = (filters.genres || []).map(value => value.toLowerCase())
    const selectedTags = (filters.tags || []).map(value => value.toLowerCase())

    return (!filters.status || manhwa.status === filters.status) &&
      selectedGenres.every(genre => genres.includes(genre)) &&
      selectedTags.every(tag => tags.includes(tag))
  })

  return [...filtered].sort((first, second) => {
    if (filters.sort === 'SCORE_DESC') return (second.average_score || 0) - (first.average_score || 0)
    if (filters.sort === 'START_DATE_DESC') return String(second.start_date || '').localeCompare(String(first.start_date || ''))
    if (filters.sort === 'START_DATE_ASC') return String(first.start_date || '').localeCompare(String(second.start_date || ''))
    if (filters.sort === 'TITLE_ROMAJI') return String(first.title_romaji || '').localeCompare(String(second.title_romaji || ''))
    return (second.popularity || 0) - (first.popularity || 0)
  })
}

export function Search() {
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState({
    genres: [],
    tags: [],
    status: '',
    sort: 'POPULARITY_DESC',
  })
  const [showFilters, setShowFilters] = useState(false)
  const [layout, setLayout] = useState('grid')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [source, setSource] = useState('anilist') // 'anilist' | 'newcatharsis'

  const hasActiveFilters = (activeFilters) => (
    activeFilters.genres?.length || activeFilters.tags?.length || activeFilters.status
  )

  const search = useCallback(async (searchQuery, reset = true, activeFilters = filters) => {
    if (!searchQuery.trim() && !hasActiveFilters(activeFilters)) return
    
    setQuery(searchQuery)
    setHasSearched(true)
    
    if (reset) {
      setLoading(true)
      setResults([])
      setPage(1)
    } else {
      setIsLoadingMore(true)
    }

    try {
      const res = await manhwaService.search(searchQuery, reset ? 1 : page, 20, activeFilters)
      const data = applyFilters(res.data || [], activeFilters)
      
      if (reset) {
        setResults(data)
      } else {
        setResults(prev => [...prev, ...data])
      }
      
      setHasMore(res.pagination?.has_next_page || false)
      setPage(prev => prev + 1)
    } catch (error) {
      console.error('Error searching:', error)
      setResults([])
      setHasMore(false)
    } finally {
      setLoading(false)
      setIsLoadingMore(false)
    }
  }, [filters, page])

  const debouncedSearch = useCallback(
    debounce((q) => {
      if (q.trim()) {
        search(q)
      }
    }, 500),
    [search]
  )

  const handleSearchSubmit = (searchQuery) => {
    search(searchQuery, true, filters)
  }

  const handleLoadMore = () => {
    search(query, false)
  }

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters)
  }

  const handleApplyFilters = () => {
    search(query, true, filters)
  }

  const handleClearFilters = () => {
    setFilters({ genres: [], tags: [], status: '', sort: 'POPULARITY_DESC' })
    search(query, true, { genres: [], tags: [], status: '', sort: 'POPULARITY_DESC' })
  }

  return (
    <div className="page-container">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <SearchIcon className="w-6 h-6 text-[#8FBC93]" />
              Búsqueda de manhwas
            </h1>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-0.5">Encuentra tu próximo manga o manhwa favorito</p>
          </div>
          {source === 'anilist' && (
          <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="rounded-xl bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700">
            <Filter className="w-4 h-4 mr-2" />
            Filtros
          </Button>
          )}
        </div>

        <div className="flex gap-2 mb-4">
          <Button
            variant={source === 'anilist' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setSource('anilist')}
            className="rounded-full"
          >
            Buscar (AniList)
          </Button>
          <Button
            variant={source === 'newcatharsis' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setSource('newcatharsis')}
            className="rounded-full"
          >
            Por slug (NewCatharsis)
          </Button>
        </div>

        {source === 'anilist' ? (
        <SearchBar 
          onSearch={handleSearchSubmit}
          initialQuery={query}
          placeholder="Título, autor, género... (ej: Jinx, Killing Stalking, Omegaverse)"
          showFilters={false}
        />
        ) : (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          NewCatharsis no tiene buscador en su API: se añade por slug con vista previa antes de guardar.
        </p>
        )}
      </motion.div>

      {source === 'anilist' && (
      <>
      <SearchFilters
        filters={filters}
        onFiltersChange={handleFilterChange}
        onClear={handleClearFilters}
        onApply={handleApplyFilters}
        isOpen={showFilters}
        onToggle={() => setShowFilters(!showFilters)}
      />

      {hasSearched && (
        <SearchPageHeader 
          query={query || 'filtros seleccionados'} 
          resultCount={results.length} 
          onLayoutChange={setLayout} 
          layout={layout}
        />
      )}

      <AnimatePresence mode="wait">
        {loading && !hasSearched ? (
          <SearchResultsSkeleton count={8} />
        ) : (
          <SearchResults
            results={results}
            isLoading={loading}
            hasSearched={hasSearched}
            query={query || 'los filtros seleccionados'} 
            onLoadMore={handleLoadMore}
            hasMore={hasMore}
            isLoadingMore={isLoadingMore}
            layout={layout}
          />
        )}
      </AnimatePresence>
      </>
      )}

      {source === 'newcatharsis' && <NewcatharsisAdd />}

      {!hasSearched && !loading && source === 'anilist' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-12"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {[
              { icon: Sparkles, title: 'Búsqueda inteligente', desc: 'Busca por título, autor, género o tags. Resultados de AniList en tiempo real.' },
              { icon: SearchIcon, title: 'Filtros avanzados', desc: 'Filtra por género, tags, estado de publicación y orden.' },
              { icon: Grid, title: 'Añade a tu biblioteca', desc: 'Guarda obras, rastrea tu progreso y recibe notificaciones de capítulos nuevos.' },
            ].map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="card p-6 text-center hover:shadow-elevated transition-shadow"
              >
                <div className="w-14 h-14 rounded-2xl bg-bl-sage/10 flex items-center justify-center mx-auto mb-4">
                  <item.icon className="w-7 h-7 text-bl-sage" />
                </div>
                <h3 className="font-display font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-bl-sand text-sm">{item.desc}</p>
              </motion.div>
            ))}
          </div>

          <div className="card p-6 bg-gradient-to-r from-bl-sage/10 to-bl-rose/10 rounded-2xl">
            <h3 className="font-display text-xl font-semibold text-gray-900 mb-3 text-center">
              Búsquedas populares
            </h3>
            <div className="flex flex-wrap justify-center gap-2">
              {[
                'Jinx', 'Killing Stalking', 'Painter of the Night', 'Semantic Error',
                'BJ Alex', 'Love or Hate', 'Dear Door', 'Sign', 'Under the Green Light',
                'Omegaverse', 'Office BL', 'Historical BL', 'Fantasy BL'
              ].map((term) => (
                <Button
                  key={term}
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSearchSubmit(term)}
                  className="bg-white/50 hover:bg-white"
                >
                  {term}
                </Button>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}