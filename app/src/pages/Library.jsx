import { useState, useEffect, useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Filter, Grid, List, Heart, Download, RefreshCw, ChevronDown, BookOpen } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card, CardContent } from '../components/ui/Card'
import { Badge, StatusBadge } from '../components/ui/Badge'
import { ManhwaCard } from '../components/manhwa/ManhwaCard'
import { SearchBar } from '../components/search/SearchBar'
import { SearchFilters } from '../components/search/SearchFilters'
import { libraryService, chapterService } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { cn, getStatusLabel, debounce } from '../utils/helpers'
import { LibraryListSkeleton } from '../components/ui/Skeleton'

const STATUSES = ['LEYENDO', 'PENDIENTE', 'COMPLETADO', 'PAUSADO', 'ABANDONADO', 'RELECTURA']

export function Library() {
  const { user } = useAuth()
  const location = useLocation()
  const [library, setLibrary] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    status: '',
    search: '',
    favorite: false,
    sort: 'updated_desc',
    page: 1,
    limit: 20,
  })
  const [showFilters, setShowFilters] = useState(false)
  const [layout, setLayout] = useState('grid')
  const [hasMore, setHasMore] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [statsServer, setStatsServer] = useState(null)

  const loadLibrary = async (reset = false) => {
    if (reset) {
      setLibrary([])
    }
    setLoading(true)
    try {
      const res = await libraryService.getMyLibrary(filters)
      const items = Array.isArray(res) ? res : (res?.data || [])
      const pagination = Array.isArray(res) ? {} : (res?.pagination || {})
      if (reset || filters.page === 1) {
        setLibrary(items)
      } else {
        setLibrary(prev => [...prev, ...items])
      }
      setHasMore(pagination.has_more ?? pagination.hasMore ?? false)
      setTotalCount(pagination.total || 0)
      const statsRes = await libraryService.getStats().catch(() => null)
      if (statsRes) setStatsServer(statsRes)
    } catch (error) {
      console.error('Error loading library:', error)
      toast.error('Error cargando biblioteca')
    } finally {
      setLoading(false)
    }
  }

  // Refrescar al volver a la pestaña (fix filtros 0 tras cambiar estado en Detalle)
  useEffect(() => {
    const onFocus = () => loadLibrary(true)
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [filters.status, filters.favorite])

  useEffect(() => {
    loadLibrary(true)
  }, [location.key])

  useEffect(() => {
    loadLibrary(true)
  }, [filters.status, filters.favorite, filters.sort])

  const debouncedSearch = useMemo(
    () => debounce((search) => {
      setFilters(prev => ({ ...prev, search, page: 1 }))
    }, 300),
    []
  )

  useEffect(() => {
    return () => debouncedSearch.cancel?.()
  }, [debouncedSearch])

  const handleSearch = (query) => {
    debouncedSearch(query)
  }

  const handleStatusFilter = (status) => {
    setFilters(prev => ({ ...prev, status: prev.status === status ? '' : status, page: 1 }))
  }

  const handleSortChange = (sort) => {
    setFilters(prev => ({ ...prev, sort, page: 1 }))
  }

  const handleToggleFavorite = async (manhwaId) => {
    try {
      await libraryService.toggleFavorite(manhwaId)
      setLibrary(prev => prev.map(entry => 
        entry.manhwa_id === manhwaId 
          ? { ...entry, favorite: !entry.favorite }
          : entry
      ))
      toast.success('Favorito actualizado')
    } catch (error) {
      console.error('Error toggling favorite:', error)
      toast.error('Error al actualizar favorito')
    }
  }

  const handleRemove = async (manhwaId) => {
    if (!window.confirm('¿Eliminar de tu biblioteca?')) return
    try {
      await libraryService.removeFromLibrary(manhwaId)
      setLibrary(prev => prev.filter(entry => entry.manhwa_id !== manhwaId))
      toast.success('Eliminado de la biblioteca')
    } catch (error) {
      console.error('Error removing from library:', error)
      toast.error('Error al eliminar')
    }
  }

  const handleLoadMore = () => {
    setFilters(prev => ({ ...prev, page: prev.page + 1 }))
  }

  useEffect(() => {
    if (filters.page > 1) {
      loadLibrary()
    }
  }, [filters.page])

  const filteredLibrary = useMemo(() => {
    let result = library
    if (filters.search) {
      const q = filters.search.toLowerCase()
      result = result.filter(entry => 
        (entry.manhwa || entry).title?.toLowerCase().includes(q) ||
        (entry.manhwa || entry).title_english?.toLowerCase().includes(q) ||
        (entry.manhwa || entry).title_romaji?.toLowerCase().includes(q)
      )
    }
    return result
  }, [library, filters.search])

  const stats = useMemo(() => {
    if (statsServer) {
      return {
        total: Number(statsServer.total || totalCount),
        reading: Number(statsServer.reading || 0),
        pending: Number(statsServer.pending || 0),
        completed: Number(statsServer.completed || 0),
        favorites: Number(statsServer.favorites || 0),
        paused: Number(statsServer.paused || 0),
        dropped: Number(statsServer.dropped || 0),
        rereading: Number(statsServer.rereading || 0),
      }
    }
    return {
      total: totalCount,
      reading: library.filter(e => e.status === 'LEYENDO').length,
      pending: library.filter(e => e.status === 'PENDIENTE').length,
      completed: library.filter(e => e.status === 'COMPLETADO').length,
      favorites: library.filter(e => e.favorite).length,
      paused: library.filter(e => e.status === 'PAUSADO').length,
      dropped: library.filter(e => e.status === 'ABANDONADO').length,
      rereading: library.filter(e => e.status === 'RELECTURA').length,
    }
  }, [library, totalCount, statsServer])

  return (
    <div className="page-container">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2"><BookOpen className="w-6 h-6 text-[#C9B297]" /> Mi biblioteca</h1>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-0.5">
              {stats.total} obra{stats.total !== 1 ? 's' : ''} en total
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="w-4 h-4 mr-2" />
              Filtros
            </Button>
            <div className="flex items-center gap-1 bg-bl-sand/10 rounded-xl p-1">
              <Button 
                variant={layout === 'grid' ? 'primary' : 'ghost'} 
                size="sm" 
                onClick={() => setLayout('grid')}
                aria-label="Vista cuadrícula"
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button 
                variant={layout === 'list' ? 'primary' : 'ghost'} 
                size="sm" 
                onClick={() => setLayout('list')}
                aria-label="Vista lista"
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        <SearchBar 
          onSearch={handleSearch}
          placeholder="Filtrar mi biblioteca..."
          showFilters={false}
        />
      </motion.div>

      <SearchFilters
        filters={filters}
        onFiltersChange={setFilters}
        onClear={() => setFilters({ status: '', search: '', favorite: false, sort: 'updated_desc', page: 1, limit: 20 })}
        isOpen={showFilters}
        onToggle={() => setShowFilters(!showFilters)}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6 flex flex-wrap gap-1.5 bg-white dark:bg-gray-800 p-1.5 rounded-2xl border border-gray-100 dark:border-gray-700 w-fit"
      >
        {['', ...STATUSES].map(status => {
          const label = status ? getStatusLabel(status) : 'Todos'
          const active = filters.status === status
          return (
            <button
              key={status || 'todos'}
              onClick={() => handleStatusFilter(status)}
              className={cn(
                'px-3 py-1.5 rounded-xl text-[12px] font-medium transition-all',
                active ? 'bg-[#C9B297] text-white shadow-sm dark:bg-[#8FBC93]' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
              )}
            >
              {label}
            </button>
          )
        })}
        <button
          onClick={() => setFilters(prev => ({ ...prev, favorite: !prev.favorite, page: 1 }))}
          className={cn('px-3 py-1.5 rounded-xl text-[12px] font-medium flex items-center gap-1', filters.favorite ? 'bg-[#E9ACBB] text-white' : 'text-gray-500 hover:bg-gray-50')}
        >
          <Heart className={cn('w-3.5 h-3.5', filters.favorite && 'fill-current')} /> Favoritos
        </button>
      </motion.div>

      <AnimatePresence mode="popLayout">
        {loading && filteredLibrary.length === 0 ? (
          <LibraryListSkeleton count={6} />
        ) : filteredLibrary.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <Search className="w-16 h-16 mx-auto text-bl-sand/50 mb-4" />
            <h3 className="font-display text-xl font-semibold text-gray-900 mb-2">
              {filters.search ? 'No se encontraron resultados' : 'Tu biblioteca está vacía'}
            </h3>
            <p className="text-bl-sand mb-6">
              {filters.search 
                ? `No hay obras que coincidan con "${filters.search}"` 
                : 'Empieza a buscar y agregar manhwas a tu biblioteca'}
            </p>
            {!filters.search && (
              <Button asChild variant="primary" size="lg">
                <Link to="/search">Buscar manhwas</Link>
              </Button>
            )}
          </motion.div>
        ) : (
          <>
            {layout === 'grid' ? (
              <motion.div
                key="grid"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3"
              >
                {filteredLibrary.map((entry, index) => (
                  <motion.div
                    key={entry.manhwa_id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <ManhwaCard
                      manhwa={entry.manhwa || entry}
                      libraryEntry={entry}
                      onFavoriteToggle={handleToggleFavorite}
                      onRemove={handleRemove}
                    />
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-3"
              >
                {filteredLibrary.map((entry, index) => (
                  <motion.div
                    key={entry.manhwa_id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.02 }}
                  >
                    <ManhwaCard
                      manhwa={entry.manhwa || entry}
                      libraryEntry={entry}
                      variant="horizontal"
                      onFavoriteToggle={handleToggleFavorite}
                      onRemove={handleRemove}
                    />
                  </motion.div>
                ))}
              </motion.div>
            )}

            {hasMore && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center mt-8"
              >
                <Button variant="outline" size="lg" onClick={handleLoadMore} disabled={loading}>
                  {loading ? 'Cargando...' : 'Cargar más'}
                </Button>
              </motion.div>
            )}
          </>
        )}
      </AnimatePresence>
    </div>
  )
}