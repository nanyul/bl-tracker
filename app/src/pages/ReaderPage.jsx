import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft, ChevronRight, Maximize, Minimize,
  ZoomIn, ZoomOut, RotateCcw, Home, Menu,
  Loader2, AlertCircle, ChevronUp, ChevronDown
} from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { chapterService } from '../services/api'
import { useReader } from '../hooks/useReader'
import { useAuth } from '../context/AuthContext'
import { toast } from 'react-hot-toast'
import { cn } from '../utils/helpers'

export function ReaderPage() {
  const { manhwaId, chapterId } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const [chapters, setChapters] = useState([])
  const [loadingChapters, setLoadingChapters] = useState(true)
  const [readerMode, setReaderMode] = useState('reader') // 'reader' or 'list'
  const [showChapterList, setShowChapterList] = useState(false)

  // Load chapters list
  useEffect(() => {
    const loadChapters = async () => {
      try {
        setLoadingChapters(true)
        const res = await chapterService.getChapters(manhwaId)
        const loadedChapters = Array.isArray(res) ? res : (res?.data || [])
        setChapters(loadedChapters)
      } catch (error) {
        console.error('Error loading chapters:', error)
        toast.error('Error cargando capítulos')
      } finally {
        setLoadingChapters(false)
      }
    }
    loadChapters()
  }, [manhwaId])

  // Find initial chapter
  const initialChapter = useMemo(() => chapters.find(c => 
    c.mangadex_chapter_id === chapterId || c.id === parseInt(chapterId)
  ), [chapters, chapterId])

  const {
    currentChapter,
    currentIndex,
    zoom,
    setZoom,
    resetZoom,
    isFullscreen,
    toggleFullscreen,
    mode,
    toggleMode,
    pages,
    setPages,
    setPagesLoaded,
    loading,
    setLoading,
    error,
    setError,
    containerRef,
    goToChapter,
    nextChapter,
    prevChapter,
    hasNext,
    hasPrev,
    savePosition,
    getSavedPosition,
  } = useReader(chapters, initialChapter)

  // Load pages when chapter changes
  useEffect(() => {
    // Wait for both currentChapter and chapters to be ready
    // Also verify that currentChapter matches the requested chapterId
    if (!currentChapter?.mangadex_chapter_id || loadingChapters) return
    // Verify the current chapter matches the requested chapter ID
    const requestedChapterId = chapterId
    const currentMatches = currentChapter.mangadex_chapter_id === requestedChapterId || 
                           currentChapter.id === parseInt(requestedChapterId)
    if (!currentMatches) return
    
    const loadPages = async () => {
      setLoading(true)
      setError(null)
      setPages({ full: [], saver: [], hash: null, baseUrl: null })
      try {
        const res = await chapterService.getPages(manhwaId, currentChapter.mangadex_chapter_id)
        const pageList = res?.data || res?.pages || []
        const hash = res?.hash
        const baseUrl = res?.base_url
        
        if (pageList.length > 0 && baseUrl && hash) {
          // Store only the path part (relative to uploads.mangadex.org) for proxy
          const fullPages = pageList.map(page => `data/${hash}/${page}`)
          const saverPages = res?.data_saver?.map(page => `data-saver/${hash}/${page}`) || []
          setPages({ full: fullPages, saver: saverPages, hash, baseUrl })
        } else {
          setPages({ full: [], saver: [], hash: null, baseUrl: null })
        }
      } catch (err) {
        console.error('Error loading pages:', err)
        setError('No se pudieron cargar las páginas')
      } finally {
        setLoading(false)
      }
    }
    loadPages()
  }, [currentChapter, manhwaId, chapterId, loadingChapters, setPages, setLoading, setError])

  // Auto-mark as read when reaching end (for vertical mode)
  useEffect(() => {
    if (mode !== 'vertical' || !currentChapter || !isAuthenticated) return
    
    const container = containerRef.current
    if (!container) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      if (scrollTop + clientHeight >= scrollHeight - 100) {
        // Near bottom, mark as read
        chapterService.markAsRead(currentChapter.id).catch(console.error)
      }
      savePosition(currentChapter.mangadex_chapter_id, scrollTop)
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [mode, currentChapter, isAuthenticated, savePosition])

  // Restore scroll position
  useEffect(() => {
    if (mode !== 'vertical' || !currentChapter) return
    const container = containerRef.current
    if (container) {
      const saved = getSavedPosition(currentChapter.mangadex_chapter_id)
      if (saved > 0) {
        container.scrollTop = saved
      }
    }
  }, [currentChapter, mode, getSavedPosition])

  // Handle wheel for zoom
  const handleWheel = useCallback((e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      setZoom(e.deltaY > 0 ? -0.1 : 0.1)
    }
  }, [setZoom])

  // Keyboard navigation for chapter list
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      
      if (e.key === 'Escape') {
        setShowChapterList(false)
        setReaderMode('reader')
      }
      if (e.key === 'c' && !showChapterList) {
        setShowChapterList(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showChapterList])

  if (loadingChapters) {
    return (
      <div className="min-h-screen bg-bl-cream dark:bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-bl-sage" />
      </div>
    )
  }

  if (!currentChapter) {
    return (
      <div className="min-h-screen bg-bl-cream dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 mx-auto text-bl-rose/50 mb-4" />
          <h2 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100 mb-2">
            Capítulo no encontrado
          </h2>
          <p className="text-bl-sand dark:text-gray-400">
            Este capítulo no existe en la obra seleccionada
          </p>
        </div>
      </div>
    )
  }

  const pageUrls = pages?.full || []
  const saverUrls = pages?.saver || []
  const useDataSaver = false // Could be a setting

  return (
    <div className="min-h-screen bg-black">
      {/* Reader Header */}
      <motion.div
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="fixed top-0 left-0 right-0 z-40 bg-gradient-to-b from-black/80 to-transparent px-4 py-4 transition-opacity duration-300"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} aria-label="Volver">
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div>
              <p className="text-white font-medium truncate max-w-xs">
                {currentChapter.manhwa?.title || currentChapter.title || 'Cargando...'}
              </p>
              <p className="text-xs text-white/70">
                Cap. {currentChapter.chapter_number} {currentChapter.title ? `· ${currentChapter.title}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleMode}
              className={cn(mode === 'vertical' && 'bg-white/20')}
            >
              <RotateCcw className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleFullscreen}
            >
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowChapterList(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Progress indicator */}
        <div className="mt-2 h-1 bg-white/20 rounded-full overflow-hidden">
          <motion.div
            animate={{ width: `${((currentIndex + 1) / chapters.length) * 100}%` }}
            className="h-full bg-bl-rose transition-all duration-300"
          />
        </div>
      </motion.div>

      {/* Chapter List Overlay */}
      <AnimatePresence>
        {showChapterList && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
            onClick={() => setShowChapterList(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-gray-900 rounded-2xl max-w-md w-full mx-4 max-h-[80vh] overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-4 border-b border-gray-700 flex items-center justify-between">
                <h3 className="font-display font-semibold text-white">Capítulos</h3>
                <Button variant="ghost" size="sm" onClick={() => setShowChapterList(false)}>
                  <ChevronDown className="w-5 h-5" />
                </Button>
              </div>
              <div className="max-h-[60vh] overflow-y-auto p-4 space-y-2">
                {chapters.map((ch, idx) => (
                  <Button
                    key={ch.mangadex_chapter_id}
                    variant={idx === currentIndex ? 'primary' : 'ghost'}
                    className="w-full justify-start"
                    onClick={() => { goToChapter(idx); setShowChapterList(false); }}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span>Cap. {ch.chapter_number}</span>
                      {ch.title && <span className="text-xs text-gray-400">{ch.title}</span>}
                    </div>
                  </Button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reader Content */}
      <div
        ref={containerRef}
        className={cn(
          'relative w-full h-screen overflow-hidden touch-none',
          mode === 'vertical' ? 'overflow-y-auto' : 'overflow-x-auto overflow-y-hidden flex items-center'
        )}
        onWheel={handleWheel}
      >
        {mode === 'vertical' ? (
          // Vertical scrolling (Webtoon style)
          <div className="w-full max-w-4xl mx-auto px-4 py-8">
            {pageUrls.map((url, idx) => (
              <div key={idx} className="mb-4 relative">
                <img
                  src={chapterService.getImageProxyUrl(url)}
                  alt={`Página ${idx + 1}`}
                  className="w-full h-auto rounded-xl shadow-2xl"
                  loading="lazy"
                  onError={(e) => {
                    // Fallback to data saver
                    if (saverUrls[idx] && e.target.src !== chapterService.getImageProxyUrl(saverUrls[idx])) {
                      e.target.src = chapterService.getImageProxyUrl(saverUrls[idx])
                    }
                  }}
                />
                {idx === pageUrls.length - 1 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center py-8 text-white/70"
                  >
                    <p>Fin del capítulo</p>
                    <div className="flex gap-2 justify-center mt-4">
                      {hasPrev && (
                        <Button variant="outline" onClick={prevChapter}>
                          <ChevronLeft className="w-4 h-4 mr-1" />
                          Anterior
                        </Button>
                      )}
                      {hasNext && (
                        <Button variant="primary" onClick={nextChapter}>
                          Siguiente <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      )}
                    </div>
                  </motion.div>
                )}
              </div>
            ))}
          </div>
        ) : (
          // Horizontal paging (Manga style)
          <div className="flex h-full items-center justify-center gap-8 px-8 overflow-x-auto snap-x snap-mandatory">
            {pageUrls.map((url, idx) => (
              <div
                key={idx}
                className="flex-shrink-0 w-full max-w-4xl snap-center snap-always"
                style={{ scrollSnapAlign: 'center' }}
              >
                <img
                  src={chapterService.getImageProxyUrl(url)}
                  alt={`Página ${idx + 1}`}
                  className="w-full h-auto rounded-xl shadow-2xl"
                  loading="lazy"
                  onError={(e) => {
                    if (saverUrls[idx] && e.target.src !== chapterService.getImageProxyUrl(saverUrls[idx])) {
                      e.target.src = chapterService.getImageProxyUrl(saverUrls[idx])
                    }
                  }}
                />
              </div>
            ))}
          </div>
        )}

        {/* Navigation Overlay (Horizontal mode) */}
        {mode === 'horizontal' && (
          <>
            {hasPrev && (
              <Button
                variant="ghost"
                size="lg"
                className="fixed left-4 top-1/2 -translate-y-1/2 z-30 bg-white/10 hover:bg-white/20 text-white"
                onClick={prevChapter}
              >
                <ChevronLeft className="w-8 h-8" />
              </Button>
            )}
            {hasNext && (
              <Button
                variant="ghost"
                size="lg"
                className="fixed right-4 top-1/2 -translate-y-1/2 z-30 bg-white/10 hover:bg-white/20 text-white"
                onClick={nextChapter}
              >
                <ChevronRight className="w-8 h-8" />
              </Button>
            )}
          </>
        )}

        {/* Loading / Error */}
        {loading && (
          <div className="fixed inset-0 z-20 bg-black/50 flex items-center justify-center">
            <Loader2 className="w-12 h-12 animate-spin text-bl-rose" />
          </div>
        )}
        {error && (
          <div className="fixed inset-0 z-20 bg-black/50 flex items-center justify-center">
            <Card className="max-w-md mx-4 text-center p-8">
              <AlertCircle className="w-12 h-12 mx-auto text-bl-rose mb-4" />
              <h3 className="font-display text-xl font-semibold text-white mb-2">Error al cargar</h3>
              <p className="text-gray-400 mb-6">{error}</p>
              <Button variant="primary" onClick={() => window.location.reload()}>
                Reintentar
              </Button>
            </Card>
          </div>
        )}

        {/* Zoom Controls (Bottom) */}
        <motion.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-full px-4 py-2"
        >
          <Button variant="ghost" size="sm" onClick={() => setZoom(-0.25)} aria-label="Alejar">
            <ZoomOut className="w-5 h-5 text-white" />
          </Button>
          <span className="text-white px-3 font-mono text-sm">{Math.round(zoom * 100)}%</span>
          <Button variant="ghost" size="sm" onClick={resetZoom} aria-label="Restablecer zoom">
            <RotateCcw className="w-5 h-5 text-white" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setZoom(0.25)} aria-label="Acercar">
            <ZoomIn className="w-5 h-5 text-white" />
          </Button>
        </motion.div>

        {/* Chapter Navigation (Bottom - Vertical mode) */}
        {mode === 'vertical' && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 flex items-center gap-4 bg-black/60 backdrop-blur-sm rounded-full px-6 py-3"
          >
            {hasPrev && (
              <Button variant="outline" onClick={prevChapter} className="gap-2">
                <ChevronLeft className="w-5 h-5" />
                Anterior
              </Button>
            )}
            <span className="text-white px-4 text-center min-w-[120px]">
              Cap. {currentChapter.chapter_number} / {chapters.length}
            </span>
            {hasNext && (
              <Button variant="primary" onClick={nextChapter} className="gap-2">
                Siguiente <ChevronRight className="w-5 h-5" />
              </Button>
            )}
          </motion.div>
        )}
      </div>
    </div>
    )
  }