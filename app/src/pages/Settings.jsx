import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { User, Mail, Lock, Bell, Palette, Trash2, LogOut, Save, Sun, Moon, Monitor } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card, CardHeader, CardContent } from '../components/ui/Card'
import { Modal, ConfirmModal } from '../components/ui/Modal'
import { userService } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { toast } from 'react-hot-toast'

export function Settings() {
  const { user, updateUser, logout, refreshProfile } = useAuth()
  const [activeTab, setActiveTab] = useState('profile')
  const [profileData, setProfileData] = useState({ name: '', email: '' })
  const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [errors, setErrors] = useState({})
  const [theme, setTheme] = useState(() => localStorage.getItem('bl_theme') || 'light')
  const [settings, setSettings] = useState(null)
  const [settingsLoading, setSettingsLoading] = useState(true)

  useEffect(() => {
    const root = document.documentElement
    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    root.classList.toggle('dark', isDark)
    localStorage.setItem('bl_theme', theme)
    if (settings) {
      userService.updateSettings({ theme }).catch(() => {})
    }
  }, [theme])

  // Cargar perfil y settings al montar
  useEffect(() => {
    userService.getProfile().then(res => {
      const u = res.user || res
      updateUser(u)
      setProfileData({ name: u.name || '', email: u.email || '' })
    }).catch(() => {
      if (user) setProfileData({ name: user.name || '', email: user.email || '' })
    })
    userService.getSettings().then(s => {
      setSettings(s)
      if (s.theme) setTheme(s.theme)
    }).catch(() => {}).finally(() => setSettingsLoading(false))
  }, [])

  const tabs = [
    { id: 'profile', label: 'Perfil', icon: User },
    { id: 'security', label: 'Seguridad', icon: Lock },
    { id: 'preferences', label: 'Preferencias', icon: Palette },
    { id: 'danger', label: 'Zona peligrosa', icon: Trash2 },
  ]

  const handleProfileSubmit = async (e) => {
    e.preventDefault()
    const payload = {}
    if (profileData.name && profileData.name !== user?.name) payload.name = profileData.name.trim()
    if (profileData.email && profileData.email !== user?.email) payload.email = profileData.email.trim()
    if (!payload.name && !payload.email) {
      toast('Nada que actualizar', { icon: 'ℹ️' })
      return
    }
    setLoading(true)
    setErrors({})
    try {
      const res = await userService.updateProfile(payload)
      const u = res.user || res
      updateUser(u)
      setProfileData({ name: u.name || '', email: u.email || '' })
      toast.success('Perfil actualizado')
    } catch (error) {
      const msg = error.response?.data?.message || 'Error al actualizar'
      toast.error(msg)
      if (error.response?.data?.errors) setErrors(error.response.data.errors)
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    if (passwordData.new !== passwordData.confirm) {
      setErrors({ confirm: 'Las contraseñas no coinciden' })
      return
    }
    if (passwordData.new.length < 8) {
      setErrors({ new: 'Mínimo 8 caracteres' })
      return
    }
    setErrors({})
    setLoading(true)
    try {
      await userService.updatePassword({ 
        current_password: passwordData.current, 
        password: passwordData.new,
        confirm_password: passwordData.confirm,
      })
      toast.success('Contraseña cambiada')
      setPasswordData({ current: '', new: '', confirm: '' })
    } catch (error) {
      toast.error(error.response?.data?.message || error.data?.message || 'Error al cambiar contraseña')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleSetting = async (key, value) => {
    const next = { ...settings, [key]: value }
    setSettings(next)
    try {
      await userService.updateSettings({ [key]: value ? 1 : 0 })
      toast.success('Preferencia guardada')
    } catch {
      toast.error('Error al guardar')
      setSettings(settings)
    }
  }

  const handleDeleteAccount = async () => {
    setLoading(true)
    try {
      await userService.deleteAccount()
      logout()
      toast.success('Cuenta eliminada')
      window.location.href = '/login'
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al eliminar cuenta')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-container max-w-3xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="font-display text-3xl font-bold text-gray-900 dark:text-gray-100">Configuración</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Gestiona tu cuenta y preferencias</p>
      </motion.div>

      <div className="flex flex-col lg:flex-row gap-8">
        <Card className="lg:w-64 flex-shrink-0 self-start sticky top-24 p-3">
          <nav className="space-y-2" aria-label="Configuración">
            {tabs.map(tab => (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? 'primary' : 'ghost'}
                className="w-full justify-start gap-3"
                onClick={() => setActiveTab(tab.id)}
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
              </Button>
            ))}
          </nav>
        </Card>

        <div className="flex-1">
          <AnimatePresence mode="wait">
            {activeTab === 'profile' && (
              <motion.div
                key="profile"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <Card>
                  <CardHeader>
                    <h2 className="font-display font-semibold text-gray-900 dark:text-gray-100">Perfil</h2>
                    <p className="text-gray-500 text-sm mt-1">Actualiza tu información personal</p>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleProfileSubmit} className="space-y-5">
                      <Input
                        label="Nombre"
                        value={profileData.name}
                        onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Tu nombre"
                        error={errors.name}
                      />
                      <Input
                        label="Correo electrónico"
                        type="email"
                        value={profileData.email}
                        onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="tu@correo.com"
                        error={errors.email}
                      />
                      <Button type="submit" variant="primary" isLoading={loading} disabled={loading || (!profileData.name && !profileData.email)}>
                        <Save className="w-4 h-4 mr-2" />
                        Guardar cambios
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {activeTab === 'security' && (
              <motion.div
                key="security"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <Card>
                  <CardHeader>
                    <h2 className="font-display font-semibold text-gray-900 dark:text-gray-100">Seguridad</h2>
                    <p className="text-gray-500 text-sm mt-1">Cambia tu contraseña</p>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handlePasswordSubmit} className="space-y-5">
                      <Input
                        label="Contraseña actual"
                        type="password"
                        value={passwordData.current}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, current: e.target.value }))}
                        placeholder="••••••••"
                        error={errors.current}
                        autoComplete="current-password"
                      />
                      <Input
                        label="Nueva contraseña"
                        type="password"
                        value={passwordData.new}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, new: e.target.value }))}
                        placeholder="••••••••"
                        error={errors.new}
                        autoComplete="new-password"
                        hint="Mínimo 8 caracteres, una mayúscula, una minúscula y un número"
                      />
                      <Input
                        label="Confirmar nueva contraseña"
                        type="password"
                        value={passwordData.confirm}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, confirm: e.target.value }))}
                        placeholder="••••••••"
                        error={errors.confirm}
                        autoComplete="new-password"
                      />
                      <Button type="submit" variant="primary" isLoading={loading}>
                        <Lock className="w-4 h-4 mr-2" />
                        Cambiar contraseña
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {activeTab === 'preferences' && (
              <motion.div
                key="preferences"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <Card>
                  <CardHeader>
                    <h2 className="font-display font-semibold text-gray-900 dark:text-gray-100">Notificaciones</h2>
                    <p className="text-gray-500 text-sm mt-1">Configura cómo quieres recibir avisos</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {settingsLoading ? <p className="text-sm text-gray-400">Cargando...</p> : (
                      <>
                        <label className="flex items-center justify-between cursor-pointer">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-gray-100">Capítulos nuevos</p>
                            <p className="text-sm text-gray-500">Recibir notificación cuando salga un capítulo de mis obras</p>
                          </div>
                          <input type="checkbox" checked={!!settings?.notifications_new_chapters} onChange={e => handleToggleSetting('notifications_new_chapters', e.target.checked)} className="w-5 h-5 rounded border-gray-300 text-[#8FBC93] focus:ring-[#8FBC93]" />
                        </label>
                        <label className="flex items-center justify-between cursor-pointer">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-gray-100">Actualizaciones semanales</p>
                            <p className="text-sm text-gray-500">Resumen semanal de tu biblioteca</p>
                          </div>
                          <input type="checkbox" checked={!!settings?.notifications_weekly} onChange={e => handleToggleSetting('notifications_weekly', e.target.checked)} className="w-5 h-5 rounded border-gray-300 text-[#8FBC93] focus:ring-[#8FBC93]" />
                        </label>
                        <label className="flex items-center justify-between cursor-pointer">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-gray-100">Recomendaciones</p>
                            <p className="text-sm text-gray-500">Sugerencias basadas en tu biblioteca</p>
                          </div>
                          <input type="checkbox" checked={!!settings?.notifications_recommendations} onChange={e => handleToggleSetting('notifications_recommendations', e.target.checked)} className="w-5 h-5 rounded border-gray-300 text-[#8FBC93] focus:ring-[#8FBC93]" />
                        </label>
                      </>
                    )}
                  </CardContent>
                </Card>

                <Card className="mt-6">
                  <CardHeader>
                    <h2 className="font-display font-semibold text-gray-900 dark:text-gray-100">Apariencia</h2>
                    <p className="text-gray-500 text-sm mt-1">Personaliza la vista</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100 mb-3">Tema</p>
                      <div className="grid grid-cols-3 gap-2">
                        <Button variant={theme === 'light' ? 'primary' : 'outline'} className="flex-col gap-1 px-2" onClick={() => setTheme('light')}>
                          <Sun className="w-4 h-4" />
                          <span className="text-xs">Claro</span>
                        </Button>
                        <Button variant={theme === 'dark' ? 'primary' : 'outline'} className="flex-col gap-1 px-2" onClick={() => setTheme('dark')}>
                          <Moon className="w-4 h-4" />
                          <span className="text-xs">Oscuro</span>
                        </Button>
                        <Button variant={theme === 'system' ? 'primary' : 'outline'} className="flex-col gap-1 px-2" onClick={() => setTheme('system')}>
                          <Monitor className="w-4 h-4" />
                          <span className="text-xs">Sistema</span>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {activeTab === 'danger' && (
              <motion.div
                key="danger"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <Card className="border-red-200">
                  <CardHeader>
                    <h2 className="font-display font-semibold text-red-600 flex items-center gap-2">
                      <Trash2 className="w-6 h-6" />
                      Zona peligrosa
                    </h2>
                    <p className="text-gray-500 text-sm mt-1">Acción irreversible</p>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-800">
                      <h3 className="font-medium text-red-700 dark:text-red-400 mb-2">Eliminar cuenta</h3>
                      <p className="text-red-600 dark:text-red-300 text-sm mb-4">
                        Esta acción eliminará permanentemente tu cuenta, biblioteca, progreso y todos tus datos. No se puede deshacer.
                      </p>
                      <Button 
                        variant="danger" 
                        onClick={() => setShowDeleteConfirm(true)}
                        className="w-full sm:w-auto"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Eliminar mi cuenta
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteAccount}
        title="Eliminar cuenta permanentemente"
        message="¿Estás completamente seguro? Se eliminará tu cuenta, biblioteca, progreso de lectura, favoritos, notas y todo tu historial. Esta acción NO se puede deshacer."
        confirmText="Sí, eliminar mi cuenta"
        cancelText="Cancelar"
        variant="danger"
        isLoading={loading}
      />
    </div>
  )
}
