import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, BookOpen, Heart, Search, User, LogOut, Bell, ChevronDown, Sun, Moon } from 'lucide-react'
import { Button } from '../ui/Button'
import { useAuth } from '../../context/AuthContext'
import { cn } from '../../utils/helpers'

export function Navbar({ onMenuClick, className }) {
  const [isScrolled, setIsScrolled] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [theme, setTheme] = useState(() => localStorage.getItem('bl_theme') || 'light')
  const { user, logout, isAuthenticated } = useAuth()
  const location = useLocation()

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const root = document.documentElement
    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    root.classList.toggle('dark', isDark)
    localStorage.setItem('bl_theme', theme)
  }, [theme])

  const toggleTheme = () => {
    const themes = ['light', 'dark', 'system']
    const currentIndex = themes.indexOf(theme)
    setTheme(themes[(currentIndex + 1) % themes.length])
  }

  const navLinks = [
    { path: '/', label: 'Inicio', icon: BookOpen },
    { path: '/library', label: 'Biblioteca', icon: Heart },
    { path: '/search', label: 'Buscar', icon: Search },
  ]

return (
    <header className={cn(
      'fixed top-0 left-0 right-0 z-40 transition-all duration-300',
      isScrolled 
        ? 'bg-bl-cream/95 dark:bg-gray-950/95 backdrop-blur-md shadow-soft border-b border-bl-sand/20 dark:border-gray-700' 
        : 'bg-transparent',
      className
    )}>
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" aria-label="Navegación principal">
        <div className="flex items-center justify-between h-16 lg:h-18">
          <Link to="/" className="flex items-center gap-2 text-xl font-display font-bold text-gray-900 dark:text-gray-100" aria-label="BL Tracker - Inicio">
            <span className="text-bl-sage">BL</span> Tracker
          </Link>

          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200',
                  location.pathname === path
                    ? 'bg-bl-sage text-white shadow-soft'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-bl-sand/10 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
                )}
                aria-current={location.pathname === path ? 'page' : undefined}
              >
                <Icon className="w-4 h-4" aria-hidden="true" />
                {label}
              </Link>
            ))}
          </div>

          <div className="hidden lg:flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/library?filter=favorites" className="flex items-center gap-2">
                    <Heart className="w-4 h-4" />
                    Favoritos
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" onClick={toggleTheme} className="p-2 rounded-xl" aria-label="Cambiar tema">
                  {theme === 'dark' ? <Moon className="w-5 h-5" /> : theme === 'light' ? <Sun className="w-5 h-5" /> : <span className="text-xs font-medium">S</span>}
                </Button>
                <div className="relative">
                  <Button variant="ghost" size="sm" onClick={() => setShowUserMenu(!showUserMenu)} className="gap-2">
                    <span className="w-8 h-8 rounded-full bg-bl-sage flex items-center justify-center text-white font-medium text-sm">
                      {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </span>
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                  <AnimatePresence>
                    {showUserMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute right-0 mt-2 w-48 bg-bl-cream dark:bg-gray-900 rounded-xl shadow-elevated border border-bl-sand/20 dark:border-gray-700 py-2 z-50"
                      >
                        <div className="px-4 py-2 border-b border-bl-sand/20 dark:border-gray-700">
                          <p className="font-medium text-gray-900 dark:text-gray-100">{user?.name}</p>
                          <p className="text-sm text-bl-sand dark:text-gray-400">{user?.email}</p>
                        </div>
                        <Link to="/settings" className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-bl-sand/10 dark:hover:bg-gray-800">
                          Configuración
                        </Link>
                        <button onClick={logout} className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
                          <LogOut className="w-4 h-4 inline mr-2" />
                          Cerrar sesión
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/login">Iniciar sesión</Link>
                </Button>
                <Button variant="primary" size="sm" asChild>
                  <Link to="/register">Registrarse</Link>
                </Button>
              </div>
            )}
          </div>

          <button
            className="lg:hidden p-2 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-bl-sand/10 dark:hover:bg-gray-800"
            onClick={onMenuClick}
            aria-label="Abrir menú"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </nav>
      </header>
  )
}