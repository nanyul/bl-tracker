import { useState, useCallback, useEffect, useRef } from 'react'

export function useReader(chapters, initialChapter) {
  const [currentIndex, setCurrentIndex] = useState(() => {
    if (!initialChapter) return 0
    return chapters.findIndex(c => c.mangadex_chapter_id === initialChapter.mangadex_chapter_id)
  })
  
  // Update currentIndex when initialChapter or chapters change
  useEffect(() => {
    if (initialChapter) {
      const index = chapters.findIndex(c => c.mangadex_chapter_id === initialChapter.mangadex_chapter_id)
      if (index !== -1) {
        setCurrentIndex(index)
      }
    }
  }, [chapters, initialChapter])
  
  const [zoom, setZoom] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [mode, setMode] = useState('vertical') // 'vertical' for webtoon, 'horizontal' for manga
  const [pages, setPages] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const containerRef = useRef(null)
  const savedPositionRef = useRef({})

  const currentChapter = chapters[currentIndex] || null

  const goToChapter = useCallback((index) => {
    if (index >= 0 && index < chapters.length) {
      setCurrentIndex(index)
      setZoom(1)
      setPages([])
      savedPositionRef.current = {}
    }
  }, [chapters.length])

  const nextChapter = useCallback(() => {
    goToChapter(currentIndex + 1)
  }, [currentIndex, chapters.length, goToChapter])

  const prevChapter = useCallback(() => {
    goToChapter(currentIndex - 1)
  }, [currentIndex, goToChapter])

  const handleZoom = useCallback((delta) => {
    setZoom(prev => Math.min(Math.max(prev + delta, 0.5), 3))
  }, [])

  const resetZoom = useCallback(() => {
    setZoom(1)
  }, [])

  const toggleFullscreen = useCallback(async () => {
    if (!document.fullscreenElement && containerRef.current) {
      try {
        await containerRef.current.requestFullscreen()
        setIsFullscreen(true)
      } catch (e) {
        console.error('Fullscreen error:', e)
      }
    } else {
      try {
        await document.exitFullscreen()
        setIsFullscreen(false)
      } catch (e) {
        console.error('Exit fullscreen error:', e)
      }
    }
  }, [])

  const toggleMode = useCallback(() => {
    setMode(prev => prev === 'vertical' ? 'horizontal' : 'vertical')
  }, [])

  const setPagesLoaded = useCallback((chapterId, pageList) => {
    if (chapters[currentIndex]?.mangadex_chapter_id === chapterId) {
      setPages(pageList)
      setLoading(false)
    }
  }, [currentIndex, chapters])

  const savePosition = useCallback((chapterId, scrollTop) => {
    savedPositionRef.current[chapterId] = scrollTop
  }, [])

  const getSavedPosition = useCallback((chapterId) => {
    return savedPositionRef.current[chapterId] || 0
  }, [])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      
      switch (e.key) {
        case 'ArrowRight':
        case ' ':
        case 'd':
          e.preventDefault()
          if (mode === 'horizontal') {
            nextChapter()
          }
          break
        case 'ArrowLeft':
        case 'a':
          e.preventDefault()
          if (mode === 'horizontal') {
            prevChapter()
          }
          break
        case 'ArrowDown':
          e.preventDefault()
          if (mode === 'vertical') {
            // Scroll down
          }
          break
        case 'ArrowUp':
          e.preventDefault()
          if (mode === 'vertical') {
            // Scroll up
          }
          break
        case 'f':
          e.preventDefault()
          toggleFullscreen()
          break
        case 'm':
          e.preventDefault()
          toggleMode()
          break
        case '=':
        case '+':
          e.preventDefault()
          handleZoom(0.25)
          break
        case '-':
          e.preventDefault()
          handleZoom(-0.25)
          break
        case '0':
          e.preventDefault()
          resetZoom()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [mode, nextChapter, prevChapter, toggleFullscreen, toggleMode, handleZoom, resetZoom])

  return {
    currentChapter,
    currentIndex,
    chapters,
    zoom,
    setZoom: handleZoom,
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
    savePosition,
    getSavedPosition,
    hasNext: currentIndex < chapters.length - 1,
    hasPrev: currentIndex > 0,
  }
}