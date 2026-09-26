import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, BookOpen, Filter, Grid, List } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { ManhwaCard } from '../components/manhwa/ManhwaCard'
import { libraryService } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { LibraryListSkeleton } from '../components/ui/Skeleton'

export function Favorites() {
  const { user } = useAuth()
  const [favorites, setFavorites] = useState([])
  const [loading, setLoading] = useState(true)
  const [layout, setLayout] = useState('grid')

  useEffect(() => {
    loadFavorites()
  }, [])

  const loadFavorites = async () => {
    setLoading(true)
    try {
      const res = await libraryService.getMyLibrary({ favorite: true, limit: 100 })
      setFavorites(Array.isArray(res) ? res : (res?.data || []))
    } catch (error) {
      console.error('Error loading favorites:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleFavorite = async (manhwaId) => {
    try {
      await libraryService.toggleFavorite(manhwaId)
      setFavorites(prev => prev.map(entry => 
        entry.manhwa_id === manhwaId 
          ? { ...entry, favorite: !entry.favorite }
          : entry
      ))
    } catch (error) {
      console.error('Error toggling favorite:', error)
    }
  }

  const handleRemove = async (manhwaId) => {
    if (!window.confirm('¿Eliminar de tu biblioteca?')) return
    try {
      await libraryService.removeFromLibrary(manhwaId)
      setFavorites(prev => prev.filter(entry => entry.manhwa_id !== manhwaId))
    } catch (error) {
      console.error('Error removing from library:', error)
    }
  }

  return (
    <div className="page-container">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Heart className="w-10 h-10 text-bl-rose" />
              Favoritos
            </h1>
            <p className="text-bl-sand mt-1">
              {favorites.length} obra{favorites.length !== 1 ? 's' : ''} en tus favoritos
            </p>
          </div>
          <div className="flex items-center gap-2">
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
      </motion.div>

      <AnimatePresence mode="popLayout">
        {loading ? (
          <LibraryListSkeleton count={6} />
        ) : favorites.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <Heart className="w-16 h-16 mx-auto text-bl-rose/50 mb-4" />
            <h3 className="font-display text-xl font-semibold text-gray-900 mb-2">No tienes favoritos aún</h3>
            <p className="text-bl-sand mb-6">Marca obras con el corazón para añadirlas aquí</p>
            <Button asChild variant="primary" size="lg">
              <a href="/search">Buscar obras</a>
            </Button>
          </motion.div>
        ) : (
          <>
            {layout === 'grid' ? (
              <motion.div
                key="grid"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
              >
                {favorites.map((entry, index) => (
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
                {favorites.map((entry, index) => (
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
          </>
        )}
      </AnimatePresence>
    </div>
  )
}