import { useEffect, useState } from 'react'
import { AlertCircle, ChevronLeft, ChevronRight, Loader2, X } from 'lucide-react'
import { chapterService } from '../../services/api'
import { Button } from '../ui/Button'

export function ChapterReader({ chapter, onClose, onPrevious, onNext }) {
  const [pages, setPages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    const loadPages = async () => {
      setLoading(true)
      setError('')
      try {
        // chapter.manhwa_id puede venir como manhwa_id o id según origen
        const manhwaId = chapter.manhwa_id || chapter.manhwaId
        if (!manhwaId) {
          throw new Error('Manhwa ID no disponible para este capítulo')
        }
        const response = await chapterService.getPages(manhwaId, chapter.mangadex_chapter_id)
        const baseUrl = (response?.base_url || response?.baseUrl || '').replace(/\/+$/, '')
        const hash = response?.hash
        const filenames = response?.data || response?.pages || []
        // Prioridad: at-home server oficial de MangaDex (URL directa, sin hotlink-block).
        // Fallback: proxy del backend (evita CORS/hotlink si el at-home falla).
        const imagePages = hash
          ? filenames.map(filename => ({
              primary: baseUrl ? `${baseUrl}/data/${hash}/${filename}` : null,
              fallback: chapterService.getImageProxyUrl(`data/${hash}/${filename}`),
            })).map(page => (page.primary ? page : { ...page, primary: page.fallback, fallback: null }))
          : []
        if (active) setPages(imagePages)
      } catch (loadError) {
        if (active) setError(loadError.response?.data?.message || 'No se pudieron cargar las páginas.')
      } finally {
        if (active) setLoading(false)
      }
    }

    loadPages()
    return () => { active = false }
  }, [chapter])

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95 text-white">
      <header className="flex shrink-0 items-center justify-between border-b border-white/10 bg-black/80 px-4 py-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-white/60">Lector MangaDex</p>
          <h2 className="font-display text-lg font-semibold">Capítulo {chapter.chapter_number}</h2>
        </div>
        <button onClick={onClose} className="rounded-xl p-2 text-white/70 hover:bg-white/10 hover:text-white" aria-label="Cerrar lector">
          <X className="h-5 w-5" />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto px-3 py-6 sm:px-6">
        {loading && <div className="flex min-h-64 items-center justify-center gap-3 text-white/70"><Loader2 className="h-6 w-6 animate-spin" />Cargando páginas...</div>}
        {!loading && error && <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-20 text-center text-white/75"><AlertCircle className="h-10 w-10 text-bl-rose" /><p>{error}</p></div>}
        {!loading && !error && pages.length === 0 && <div className="py-20 text-center text-white/70">Este capítulo no tiene páginas disponibles.</div>}
        {!loading && !error && pages.length > 0 && (
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-3">
            {pages.map((page, index) => (
              <img
                key={page.primary}
                src={page.primary}
                alt={`Página ${index + 1}`}
                className="block w-full object-contain"
                loading={index < 2 ? 'eager' : 'lazy'}
                onError={(e) => {
                  if (page.fallback && e.currentTarget.src !== page.fallback) {
                    e.currentTarget.src = page.fallback
                  }
                }}
              />
            ))}
          </div>
        )}
      </main>

      <footer className="flex shrink-0 items-center justify-center gap-3 border-t border-white/10 bg-black/80 px-4 py-3">
        <Button variant="ghost" onClick={onPrevious} disabled={!onPrevious} className="text-white hover:bg-white/10 hover:text-white"><ChevronLeft className="h-4 w-4" />Anterior</Button>
        <Button variant="ghost" onClick={onNext} disabled={!onNext} className="text-white hover:bg-white/10 hover:text-white">Siguiente<ChevronRight className="h-4 w-4" /></Button>
      </footer>
    </div>
  )
}
