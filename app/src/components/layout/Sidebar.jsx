import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { BookOpen, Search, Heart, BarChart2, Bell, User, LogOut, Home, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { cn } from '../../utils/helpers'

export function Sidebar({ isOpen, onClose }) {
  const { logout, isAuthenticated } = useAuth()
  const location = useLocation()

  const navLinks = [
    { path: '/', label: 'Inicio', icon: Home },
    { path: '/library', label: 'Mi biblioteca', icon: BookOpen },
    { path: '/search', label: 'Buscar', icon: Search },
    { path: '/favorites', label: 'Favoritos', icon: Heart },
    { path: '/stats', label: 'Estadísticas', icon: BarChart2 },
    { path: '/notifications', label: 'Notificaciones', icon: Bell },
    { path: '/settings', label: 'Mi perfil', icon: User },
  ]

  // Cerrar automáticamente al cambiar de ruta (fix menú pegado en móvil)
  useEffect(() => {
    if (isOpen) onClose()
  }, [location.pathname])

  if (!isAuthenticated) return null

  const pillActive = 'bg-[#C9B297] text-white shadow-sm dark:bg-[#8FBC93] dark:text-white'
  const pillIdle = 'text-[#8A8A8A] dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100 bg-white/60 dark:bg-gray-800/60 border border-transparent'

  return (
    <>
      {/* Mobile sidebar drawer - only renders on mobile, CSS transition */}
      <aside
        data-open={isOpen}
        className={cn(
          "fixed left-0 top-0 h-screen w-64 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-700 flex flex-col pt-8 pb-6 shadow-xl z-50 lg:hidden transition-transform duration-200 ease-out will-change-transform",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
        aria-hidden={!isOpen}
      >
            <div className="flex items-center justify-between px-4 mb-6">
              <Link to="/" className="flex items-center gap-2 text-xl font-display font-bold text-gray-900 dark:text-gray-100">
                <span className="w-8 h-8 rounded-lg bg-[#E9ACBB] flex items-center justify-center text-white"><BookOpen className="w-5 h-5" /></span>
                BL Tracker
              </Link>
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label="Cerrar menú"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <nav className="flex-1 px-3 space-y-1">
              {navLinks.map(({ path, label, icon: Icon }) => {
                const isActive = location.pathname === path || (path !== '/' && location.pathname.startsWith(path))
                return (
                  <Link
                    key={path}
                    to={path}
                    onClick={onClose}
                    className={cn(
                      'flex items-center gap-3 px-3 py-3 rounded-xl text-[15px] font-medium transition-all',
                      isActive ? pillActive : pillIdle
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    {label}
                  </Link>
                )
              })}
            </nav>

            <div className="px-4 pt-4 border-t border-gray-100 dark:border-gray-700 mt-4">
              <button 
                onClick={() => { logout(); onClose(); }} 
                className="flex items-center gap-3 text-[15px] font-medium text-gray-400 hover:text-[#E9ACBB] transition-colors w-full"
              >
                <LogOut className="w-5 h-5" />
                Cerrar sesión
              </button>
            </div>
          </aside>

      {/* Desktop sidebar - always visible on lg+ */}
      <aside className="hidden lg:fixed lg:left-0 lg:top-0 lg:flex lg:flex-col lg:h-screen lg:w-64 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-700 lg:flex-col lg:pt-6 lg:pb-6 lg:z-40">
        <div className="px-4 mb-6">
          <Link to="/" className="flex items-center gap-2 text-[20px] font-display font-bold text-gray-900 dark:text-gray-100">
            <span className="w-8 h-8 rounded-lg bg-[#E9ACBB] flex items-center justify-center text-white"><BookOpen className="w-5 h-5" /></span>
            BL Tracker
          </Link>
          <p className="text-xs text-gray-400 mt-1 leading-none px-1">Tu biblioteca de manhwas BL</p>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          {navLinks.map(({ path, label, icon: Icon }) => {
            const isActive = location.pathname === path || (path !== '/' && location.pathname.startsWith(path))
            return (
              <Link
                key={path}
                to={path}
                className={cn(
                  'flex items-center gap-3 px-3 py-3 rounded-xl text-[15px] font-medium transition-all',
                  isActive ? pillActive : pillIdle
                )}
              >
                <Icon className="w-5 h-5" />
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="px-4 pt-4 border-t border-gray-100 dark:border-gray-700 mt-4">
          <button 
            onClick={logout} 
            className="flex items-center gap-3 text-[15px] font-medium text-gray-400 hover:text-[#E9ACBB] transition-colors w-full"
          >
            <LogOut className="w-5 h-5" />
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  )
}

