import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, Filter, Loader2 } from 'lucide-react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { cn, debounce } from '../../utils/helpers'

export function SearchBar({ 
  onSearch, 
  initialQuery = '', 
  placeholder = 'Buscar manhwa, manga, webtoon...',
  showFilters = false,
  onFilterClick,
  className 
}) {
  const [query, setQuery] = useState(initialQuery)
  const [isFocused, setIsFocused] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef(null)
  const wrapperRef = useRef(null)

  const debouncedSearch = debounce(async (q) => {
    if (q.length < 2) {
      setSuggestions([])
      return
    }
    setIsLoading(true)
    try {
      // Aquí se llamaría a la API de búsqueda para sugerencias
      // const res = await manhwaService.search(q, 1, 5)
      // setSuggestions(res.data || [])
    } catch {
      setSuggestions([])
    } finally {
      setIsLoading(false)
    }
  }, 300)

  useEffect(() => {
    debouncedSearch(query)
  }, [query])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (query.trim()) {
      onSearch?.(query.trim())
      setShowSuggestions(false)
    }
  }

  const handleClear = () => {
    setQuery('')
    setSuggestions([])
    inputRef.current?.focus()
  }

  return (
    <div ref={wrapperRef} className={cn('relative w-full', className)}>
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-bl-sand pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setShowSuggestions(true)
            }}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder={placeholder}
            className={cn(
              'input pl-12 pr-12 py-3.5 text-lg',
              isFocused && 'ring-2 ring-bl-sage border-transparent'
            )}
            autoComplete="off"
            aria-label="Buscar"
            aria-expanded={showSuggestions && suggestions.length > 0}
            aria-controls="search-suggestions"
          />
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-lg text-bl-sand hover:bg-bl-sand/10 transition-colors"
              aria-label="Limpiar búsqueda"
            >
              <X className="w-5 h-5" />
            </button>
          )}
          {isLoading && (
            <Loader2 className="absolute right-10 top-1/2 -translate-y-1/2 w-5 h-5 text-bl-sage animate-spin" />
          )}
        </div>

        <AnimatePresence>
          {showSuggestions && suggestions.length > 0 && (
            <motion.ul
              id="search-suggestions"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-elevated border border-bl-sand/20 overflow-hidden z-50 max-h-60 overflow-y-auto"
              role="listbox"
            >
              {suggestions.map((item, index) => (
                <motion.li
                  key={item.id || index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.02 }}
                >
                  <button
                    onClick={() => {
                      setQuery(item.title_english || item.title_romaji || item.title)
                      onSearch?.(item.title_english || item.title_romaji || item.title)
                      setShowSuggestions(false)
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-bl-sand/10 flex items-center gap-3"
                    role="option"
                  >
                    {item.cover_image && (
                      <img src={item.cover_image} alt="" className="w-10 h-14 object-cover rounded" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {item.title_english || item.title_romaji || item.title}
                      </p>
                      {item.title_romaji && item.title_english !== item.title_romaji && (
                        <p className="text-sm text-bl-sand truncate">{item.title_romaji}</p>
                      )}
                    </div>
                  </button>
                </motion.li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </form>

      {showFilters && (
        <Button variant="outline" onClick={onFilterClick} className="mt-3 sm:mt-0 sm:ml-3">
          <Filter className="w-4 h-4 mr-2" />
          Filtros
        </Button>
      )}
    </div>
  )
}