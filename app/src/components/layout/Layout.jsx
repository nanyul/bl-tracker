import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Navbar } from './Navbar' 
import { Footer } from './Footer'
import { useAuth } from '../../context/AuthContext'
import { motion } from 'framer-motion'
import { cn } from '../../utils/helpers'

export function Layout() {
  const { isAuthenticated } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  // Cerrar drawer móvil al cambiar de ruta (fix menú pegado)
  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  // Lock body scroll cuando drawer abierto
  useEffect(() => {
    if (sidebarOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [sidebarOpen])

  return (
    <div className="flex min-h-screen bg-[#EEEFE8] dark:bg-gray-950">
      {isAuthenticated && (
        <>
          {/* Mobile sidebar overlay - CSS transition */}
          <div 
            data-open={sidebarOpen}
            className={cn(
              "fixed inset-0 z-40 bg-black/50 lg:hidden transition-opacity duration-200",
              sidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
            )}
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
          
          {/* Sidebar: always visible on desktop (lg+), drawer on mobile */}
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        </>
      )}

      {/* Navbar: only on mobile (hidden on lg+) */}
      <Navbar className="lg:hidden" onMenuClick={() => setSidebarOpen(true)} />
      
      <main className={cn("flex-1", isAuthenticated ? "lg:ml-64 pt-8" : "pt-16 lg:pt-20")}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="h-full"
        >
          <Outlet />
        </motion.div>
      </main>
    </div>
  )
}

export function AuthLayout() {
  const { pathname } = useLocation()
  const isLogin = pathname.includes('/login')
  const imageSrc = isLogin ? '/auth-login.webp' : '/auth-register.webp'
  const alt = isLogin ? 'BL Tracker Login' : 'BL Tracker Register'
  return (
    <div className="min-h-screen bg-bl-cream dark:bg-gray-950 flex">
      {/* Left side illustration - hidden on mobile */}
      <div className="hidden lg:flex w-1/2 relative overflow-hidden bg-bl-cream dark:bg-gray-800">
        <img src={imageSrc} alt={alt} className="w-full h-full object-cover" loading="eager" decoding="async" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/15 via-transparent to-transparent pointer-events-none" />
        {/* Reemplaza public/auth-login.webp (pareja 800x1200) y public/auth-register.webp (chibis) con tus imágenes reales */}
      </div>

      {/* Right side form */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12 relative bg-bl-cream dark:bg-gray-950">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md bg-white dark:bg-gray-800 p-8 sm:p-10 rounded-[32px] shadow-sm border border-gray-100 dark:border-gray-700"
        >
          <Outlet />
        </motion.div>
      </main>
    </div>
  )
}