import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { BookOpen, Eye, EyeOff } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { useAuth } from '../context/AuthContext'
import { toast } from 'react-hot-toast'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  
  const { login, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  
  const from = location.state?.from?.pathname || '/'
  const busy = loading || submitting

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Validación en cliente: nunca dejar la pantalla sin mensaje claro
    const errors = {}
    if (!email.trim()) {
      errors.email = 'Ingresa tu correo electrónico'
    } else if (!EMAIL_RE.test(email.trim())) {
      errors.email = 'Ese correo no tiene un formato válido'
    }
    if (!password) {
      errors.password = 'Ingresa tu contraseña'
    } else if (password.length < 8) {
      errors.password = 'La contraseña debe tener al menos 8 caracteres'
    }
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setSubmitting(true)
    try {
      const result = await login(email.trim(), password)

      if (result.success) {
        toast.success('Bienvenido de nuevo')
        navigate(from, { replace: true })
      } else {
        // Error de negocio (credenciales inválidas, etc.): quedarse en el
        // formulario con mensaje, jamás pantalla en blanco.
        setFieldErrors({ general: result.error || 'Correo o contraseña incorrectos' })
        setPassword('')
        toast.error(result.error || 'Correo o contraseña incorrectos')
      }
    } catch {
      setFieldErrors({ general: 'No se pudo conectar con el servidor. Revisa tu conexión.' })
      toast.error('No se pudo conectar con el servidor')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col h-full justify-center">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-bl-rose/10 text-bl-rose mb-4">
          <BookOpen className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-display font-bold text-gray-900 dark:text-gray-100 mb-2">
          BL Tracker
        </h1>
        <p className="text-bl-sand dark:text-gray-400">Iniciar sesión</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {fieldErrors.general && (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {fieldErrors.general}
          </p>
        )}

        <Input
          label="Correo electrónico"
          name="email"
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setFieldErrors(prev => ({ ...prev, email: undefined, general: undefined })) }}
          placeholder="tu@email.com"
          required
          disabled={busy}
          autoComplete="email"
          error={fieldErrors.email}
        />

        <div className="relative">
          <Input
            label="Contraseña"
            name="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => { setPassword(e.target.value); setFieldErrors(prev => ({ ...prev, password: undefined, general: undefined })) }}
            placeholder="••••••••"
            required
            disabled={busy}
            autoComplete="current-password"
            error={fieldErrors.password}
            className="pr-12"
          />
          <button
            type="button"
            onClick={() => setShowPassword(v => !v)}
            disabled={busy}
            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            className="absolute right-3 top-[26px] flex h-[50px] items-center rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
          >
            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>

        <Button
          type="submit"
          variant="primary"
          className="w-full mt-8 py-3.5 text-lg shadow-bl-rose/20"
          disabled={busy}
          isLoading={busy}
        >
          Iniciar sesión
        </Button>

        <p className="text-center text-sm text-bl-sand dark:text-gray-400 mt-6">
          ¿No tienes cuenta?{' '}
          <Link to="/register" className="font-semibold text-bl-rose hover:text-bl-roseDark transition-colors">
            Regístrate
          </Link>
        </p>
      </form>
    </div>
  )
}