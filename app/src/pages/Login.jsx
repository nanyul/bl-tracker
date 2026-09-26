import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { BookOpen, Lock } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { useAuth } from '../context/AuthContext'
import { toast } from 'react-hot-toast'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  
  const { login, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  
  const from = location.state?.from?.pathname || '/'

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!email || !password) {
      toast.error('Por favor completa todos los campos')
      return
    }

    const result = await login(email, password)
    
    if (result.success) {
      toast.success('Bienvenido de nuevo')
      navigate(from, { replace: true })
    } else {
      toast.error(result.error)
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
        <Input
          label="Correo electrónico"
          name="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@email.com"
          required
          disabled={loading}
          autoComplete="email"
        />

        <Input
          label="Contraseña"
          name="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          disabled={loading}
          autoComplete="current-password"
        />

        <Button
          type="submit"
          variant="primary"
          className="w-full mt-8 py-3.5 text-lg shadow-bl-rose/20"
          disabled={loading}
          isLoading={loading}
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