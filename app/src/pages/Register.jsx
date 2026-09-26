import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BookOpen, Mail, Lock, User, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { useAuth } from '../context/AuthContext'

export function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirm_password: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  
  const { register, loading } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    
    if (!formData.name || !formData.email || !formData.password || !formData.confirm_password) {
      setError('Por favor completa todos los campos')
      return
    }

    if (formData.password !== formData.confirm_password) {
      setError('Las contraseñas no coinciden')
      return
    }

    if (formData.password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      return
    }

    const result = await register(formData)
    
    if (result.success) {
      navigate('/')
    } else {
      setError(result.error)
    }
  }

  return (
    <div className="flex flex-col h-full justify-center">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-bl-pink/10 text-bl-pink mb-4">
          <BookOpen className="w-7 h-7" />
        </div>
        <h1 className="text-3xl font-display font-bold text-gray-900 mb-2">
          Crear cuenta
        </h1>
        <p className="text-bl-textLight text-sm">Únete a BL Tracker</p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-100 flex items-start gap-3 text-red-600">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="name" className="label">
            <User className="w-4 h-4 inline mr-2 text-gray-400" />
            Nombre
          </label>
          <input
            id="name"
            type="text"
            required
            className="input"
            placeholder="Tu nombre"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            disabled={loading}
          />
        </div>

        <div>
          <label htmlFor="email" className="label">
            <Mail className="w-4 h-4 inline mr-2 text-gray-400" />
            Correo electrónico
          </label>
          <input
            id="email"
            type="email"
            required
            className="input"
            placeholder="tu@email.com"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            disabled={loading}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="password" className="label">Contraseña</label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                className="input pr-10"
                placeholder="••••••"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="confirm_password" className="label">Confirmar</label>
            <div className="relative">
              <input
                id="confirm_password"
                type={showConfirmPassword ? 'text' : 'password'}
                required
                className="input pr-10"
                placeholder="••••••"
                value={formData.confirm_password}
                onChange={(e) => setFormData(prev => ({ ...prev, confirm_password: e.target.value }))}
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        <Button
          type="submit"
          variant="primary"
          className="w-full mt-6 py-3.5 text-lg shadow-bl-pink/20"
          disabled={loading}
          isLoading={loading}
        >
          Crear cuenta
        </Button>

        <p className="text-center text-sm text-bl-textLight mt-6">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="font-semibold text-bl-pink hover:text-bl-pinkDark transition-colors">
            Inicia sesión
          </Link>
        </p>
      </form>
    </div>
  )
}