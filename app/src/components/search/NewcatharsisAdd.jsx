import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Link2, Loader2, AlertCircle, BookOpen, CheckCircle } from 'lucide-react'
import { Button } from '../ui/Button'
import { manhwaService } from '../../services/api'
import { toast } from 'react-hot-toast'

/**
 * Alta desde NewCatharsis por slug manual (la API no tiene buscador).
 * Acepta el slug suelto o la URL completa de la obra y extrae el slug.
 */
function extractSlug(input) {
  const t = (input || '').trim()
  if (!t) return ''
  const m = t.match(/([a-z0-9]+(?:-[a-z0-9]+)*)\/?$/i)
  return m ? m[1].toLowerCase() : t.toLowerCase()
}

export function NewcatharsisAdd() {
  const navigate = useNavigate()
  const [raw, setRaw] = useState('')
  const [preview, setPreview] = useState(null)
  const [existing, setExisting] = useState(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [creating, setCreating] = useState(false)

  const handlePreview = async () => {
    const slug = extractSlug(raw)
    if (!slug) {
      toast.error('Pega el slug o la URL de la obra')
      return
    }
    setLoadingPreview(true)
    setPreview(null)
    setExisting(null)
    try {
      const res = await manhwaService.previewNewcatharsis(slug)
      setPreview(res.preview)
      setExisting(res.existing || null)
      if (res.existing) toast('Esta obra ya está en tu base de datos', { icon: '📚' })
    } catch (error) {
      toast.error(error.response?.data?.message || error.data?.message || 'No se encontró esa obra')
    } finally {
      setLoadingPreview(false)
    }
  }

  const handleConfirm = async () => {
    if (existing) {
      navigate(`/manhwa/${existing.id}`)
      return
    }
    const slug = extractSlug(raw)
    setCreating(true)
    try {
      const manhwa = await manhwaService.getOrCreateFromNewcatharsis(slug)
      toast.success('Obra añadida. Los capítulos se descargan al abrirlos.')
      navigate(`/manhwa/${manhwa.id}`)
    } catch (error) {
      toast.error(error.response?.data?.message || error.data?.message || 'No se pudo añadir la obra')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <h3 className="font-display font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-1">
          <Link2 className="w-4 h-4 text-[#8FBC93]" />
          Añadir obra desde NewCatharsis
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          En el sitio, abre la obra y copia el slug de la URL (la parte final, ej:{' '}
          <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">lagrimas-entre-flores-marchitas</code>).
          También puedes pegar la URL completa.
        </p>
        <div className="flex gap-2">
          <input
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handlePreview()}
            placeholder="slug-de-la-obra o URL completa…"
            className="flex-1 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8FBC93]"
            aria-label="Slug o URL de NewCatharsis"
          />
          <Button variant="primary" onClick={handlePreview} disabled={loadingPreview || !raw.trim()}>
            {loadingPreview ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Vista previa'}
          </Button>
        </div>
      </div>

      {preview && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-5 flex gap-4"
        >
          {preview.portada_url ? (
            <img
              src={preview.portada_url}
              alt={preview.titulo}
              className="w-20 h-28 object-cover rounded-xl shrink-0"
            />
          ) : (
            <div className="w-20 h-28 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
              <BookOpen className="w-8 h-8 text-gray-300" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="font-display font-semibold text-gray-900 dark:text-gray-100 truncate">
              {preview.titulo || preview.slug}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {preview.n_capitulos != null ? `${preview.n_capitulos} capítulos` : 'Capítulos desconocidos'}
              {preview.estado ? ` · ${preview.estado}` : ''}
              {preview.scan ? ` · ${preview.scan}` : ''}
            </p>
            {preview.nsfw && (
              <span className="inline-block mt-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                NSFW
              </span>
            )}
            {preview.descripcion && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 line-clamp-3">
                {preview.descripcion.replace(/<[^>]*>?/gm, '')}
              </p>
            )}
            <div className="mt-3">
              <Button variant="primary" size="sm" onClick={handleConfirm} isLoading={creating}>
                <CheckCircle className="w-4 h-4 mr-1" />
                {existing ? 'Abrir obra' : 'Confirmar y añadir'}
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {!preview && !loadingPreview && (
        <div className="text-center py-6 text-gray-400 text-sm">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
          Pega un slug para ver la vista previa antes de guardar.
        </div>
      )}
    </div>
  )
}
