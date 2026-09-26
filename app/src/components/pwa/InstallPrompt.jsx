import { useState, useEffect } from 'react'
import { Download, X } from 'lucide-react'
import { Button } from '../ui/Button'

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      // Mostrar tras 2s si no está instalado
      setTimeout(() => setVisible(true), 2000)
    }
    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => {
      setVisible(false)
      setDeferredPrompt(null)
    })
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (!visible || !deferredPrompt) return null

  const handleInstall = async () => {
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setVisible(false)
    setDeferredPrompt(null)
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-bl-rose/20 flex items-center justify-center shrink-0">
        <Download className="w-5 h-5 text-bl-rose" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 text-sm">Instalar BL Tracker</p>
        <p className="text-xs text-gray-500">Acceso rápido desde tu pantalla de inicio</p>
      </div>
      <Button size="sm" variant="primary" onClick={handleInstall}>Instalar</Button>
      <button onClick={() => setVisible(false)} className="p-1 text-gray-400 hover:text-gray-600" aria-label="Cerrar">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
