import { motion, AnimatePresence } from 'framer-motion'
import { Search, Filter, Loader2 } from 'lucide-react'
import { ManhwaCard } from '../manhwa/ManhwaCard'
import { SearchResultsSkeleton } from '../ui/Skeleton'
import { Button } from '../ui/Button'
import { cn } from '../../utils/helpers'

export function SearchResults({ 
  results = [], 
  isLoading, 
  hasSearched,
  query,
  onLoadMore,
  hasMore,
  isLoadingMore,
  layout = 'grid'
}) {
  if (isLoading && !hasSearched) {
    return <SearchResultsSkeleton count={8} />
  }

  if (hasSearched && results.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-16"
      >
        <Search className="w-16 h-16 mx-auto text-bl-sand/50 mb-4" />
        <h3 className="font-display font-semibold text-gray-900 mb-2">
          No se encontraron resultados
        </h3>
        <p className="text-bl-sand mb-6">
          No hay obras que coincidan con <span className="font-medium">"{query}"</span>
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button variant="outline" onClick={() => window.history.back()}>
            Volver a buscar
          </Button>
        </div>
      </motion.div>
    )
  }

  return (
    <div>
      <AnimatePresence mode="popLayout">
        {layout === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {results.map((manhwa, index) => {
              const key = manhwa.id || manhwa.anilist_id || `result-${index}`;
              return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <ManhwaCard manhwa={manhwa} />
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-4">
            {results.map((manhwa, index) => {
              const key = manhwa.id || manhwa.anilist_id || `result-${index}`;
              return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <ManhwaCard manhwa={manhwa} variant="horizontal" />
                </motion.div>
              );
            })}
          </div>
        )}
      </AnimatePresence>

      {(hasMore || isLoadingMore) && (
        <div className="mt-8 text-center">
          <Button
            variant="outline"
            size="lg"
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="w-full sm:w-auto"
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Cargando más...
              </>
            ) : (
              'Cargar más resultados'
            )}
          </Button>
        </div>
      )}
    </div>
  )
}

export function SearchPageHeader({ query, resultCount, onLayoutChange, layout }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-gray-900">
            Resultados para <span className="text-bl-sage">"{query}"</span>
          </h1>
          <p className="text-bl-sand mt-1">
            {resultCount} obra{resultCount !== 1 ? 's' : ''} encontrada{resultCount !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={layout === 'grid' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => onLayoutChange('grid')}
            aria-label="Vista en cuadrícula"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </Button>
          <Button
            variant={layout === 'list' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => onLayoutChange('list')}
            aria-label="Vista en lista"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </Button>
        </div>
      </div>
    </motion.div>
  )
}