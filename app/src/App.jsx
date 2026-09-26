import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { Layout, AuthLayout } from './components/layout/Layout'
import { ProtectedRoute, GuestRoute } from './components/auth/ProtectedRoute'
import { Loader2 } from 'lucide-react'
import { InstallPrompt } from './components/pwa/InstallPrompt'
import { OfflineBanner } from './components/pwa/OfflineBanner'

const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })))
const Library = lazy(() => import('./pages/Library').then(m => ({ default: m.Library })))
const Search = lazy(() => import('./pages/Search').then(m => ({ default: m.Search })))
const ManhwaDetail = lazy(() => import('./pages/ManhwaDetail').then(m => ({ default: m.ManhwaDetail })))
const Favorites = lazy(() => import('./pages/Favorites').then(m => ({ default: m.Favorites })))
const Stats = lazy(() => import('./pages/Stats').then(m => ({ default: m.Stats })))
const Notifications = lazy(() => import('./pages/Notifications').then(m => ({ default: m.Notifications })))
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })))
const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })))
const Register = lazy(() => import('./pages/Register').then(m => ({ default: m.Register })))
const ReaderPage = lazy(() => import('./pages/ReaderPage').then(m => ({ default: m.ReaderPage })))

function PageLoader() {
  return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-bl-sage" /></div>
}

function App() {
  return (
    <>
      <OfflineBanner />
      <InstallPrompt />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#EEEFE8',
            color: '#4A4A4A',
            borderRadius: '1rem',
            padding: '1rem',
            boxShadow: '0 10px 40px -10px rgba(0, 0, 0, 0.1)',
          },
          success: {
            iconTheme: {
              primary: '#8FBC93',
              secondary: '#EEEFE8',
            },
          },
          error: {
            iconTheme: {
              primary: '#E9ACBB',
              secondary: '#EEEFE8',
            },
          },
        }}
      />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/library" element={<ProtectedRoute><Library /></ProtectedRoute>} />
            <Route path="/favorites" element={<ProtectedRoute><Favorites /></ProtectedRoute>} />
            <Route path="/stats" element={<ProtectedRoute><Stats /></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
            <Route path="/search" element={<ProtectedRoute><Search /></ProtectedRoute>} />
            <Route path="/manhwa/:id" element={<ProtectedRoute><ManhwaDetail /></ProtectedRoute>} />
            <Route path="/manhwa/anilist/:anilist_id" element={<ProtectedRoute><ManhwaDetail /></ProtectedRoute>} />
            <Route path="/read/:manhwaId/:chapterId" element={<ProtectedRoute><ReaderPage /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          </Route>
          
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
            <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />
          </Route>
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </>
  )
}

export default App