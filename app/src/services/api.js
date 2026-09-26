import axios from 'axios'
import { jwtDecode } from 'jwt-decode'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('bl_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('bl_token')
      localStorage.removeItem('bl_user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Helper to unwrap API response {success, data, message}
function unwrap(response) {
  const { data } = response
  if (data.success !== undefined) {
    if (!data.success) {
      const error = new Error(data.message || 'Error en la petición')
      error.response = response
      error.data = data
      throw error
    }
    return data.data
  }
  return data
}

export const authService = {
  async login(email, password) {
    const response = await api.post('/auth/login', { email, password })
    const { token, user } = unwrap(response)
    localStorage.setItem('bl_token', token)
    localStorage.setItem('bl_user', JSON.stringify(user))
    return { token, user }
  },

  async register(name, email, password) {
    const response = await api.post('/auth/register', { name, email, password, confirm_password: password })
    const { token, user } = unwrap(response)
    localStorage.setItem('bl_token', token)
    localStorage.setItem('bl_user', JSON.stringify(user))
    return { token, user }
  },

  logout() {
    localStorage.removeItem('bl_token')
    localStorage.removeItem('bl_user')
  },

  getToken() {
    return localStorage.getItem('bl_token')
  },

  getUser() {
    const user = localStorage.getItem('bl_user')
    return user ? JSON.parse(user) : null
  },

  isAuthenticated() {
    const token = this.getToken()
    if (!token) return false
    try {
      const decoded = jwtDecode(token)
      return decoded.exp * 1000 > Date.now()
    } catch {
      return false
    }
  },
}

export const manhwaService = {
  async search(query, page = 1, perPage = 20, filters = {}) {
    const response = await api.get('/manhwa/search', {
      params: {
        q: query,
        page,
        per_page: perPage,
      },
    })
    return unwrap(response)
  },

  async getById(id) {
    const response = await api.get(`/manhwa/${id}`)
    return unwrap(response)
  },

  async getByAniListId(anilistId) {
    const response = await api.get(`/manhwa/anilist/${anilistId}`)
    return unwrap(response)
  },

  async getByMangaDexId(mangadexId) {
    const response = await api.get(`/manhwa/mangadex/${mangadexId}`)
    return unwrap(response)
  },

  async getGenres() {
    const response = await api.get('/manhwa/genres')
    return unwrap(response)
  },

  async getTags() {
    const response = await api.get('/manhwa/tags')
    return unwrap(response)
  },

  async getOrCreateFromAniList(anilistId) {
    const response = await api.post('/manhwa/from-anilist', { anilist_id: anilistId })
    return unwrap(response)
  },

  async updateChapters(id) {
    const response = await api.post(`/manhwa/${id}/update-chapters`)
    return unwrap(response)
  },
}

export const libraryService = {
  async getMyLibrary(filters = {}) {
    const response = await api.get('/library', { params: filters })
    return unwrap(response)
  },

  async getLibraryEntry(manhwaId) {
    const response = await api.get(`/library/${manhwaId}`)
    return unwrap(response)
  },

  async addToLibrary(data) {
    const response = await api.post('/library', data)
    return unwrap(response)
  },

  async updateLibraryEntry(manhwaId, data) {
    const response = await api.put(`/library/${manhwaId}`, data)
    return unwrap(response)
  },

  async removeFromLibrary(manhwaId) {
    const response = await api.delete(`/library/${manhwaId}`)
    return unwrap(response)
  },

  async updateProgress(manhwaId, chapter) {
    const response = await api.patch(`/library/${manhwaId}/progress`, { chapter })
    return unwrap(response)
  },

  async toggleFavorite(manhwaId) {
    const response = await api.patch(`/library/${manhwaId}/favorite`)
    return unwrap(response)
  },

  async getStats() {
    const response = await api.get('/library/stats')
    return unwrap(response)
  },

  async getNewChapters() {
    const response = await api.get('/library/new-chapters')
    return unwrap(response)
  },
}

export const chapterService = {
  async getChapters(manhwaId) {
    const response = await api.get(`/chapters/${manhwaId}`)
    return unwrap(response)
  },

  async getChapter(manhwaId, chapterId) {
    const response = await api.get(`/chapters/${manhwaId}/${chapterId}`)
    return unwrap(response)
  },

  async getPages(manhwaId, chapterId) {
    const response = await api.get(`/chapters/${manhwaId}/${chapterId}/pages`)
    return unwrap(response)
  },

  async updateChapters(manhwaId) {
    const response = await api.post(`/chapters/${manhwaId}/update`)
    return unwrap(response)
  },

  async getNewChapters() {
    const response = await api.get('/chapters/new')
    return unwrap(response)
  },

  async markAsRead(chapterId) {
    const response = await api.patch(`/chapters/${chapterId}/read`)
    return unwrap(response)
  },

  getImageProxyUrl(imagePath) {
    // Mantener extensión para que MangaDex CDN resuelva correctamente
    // imagePath ej: data/<hash>/page.jpg o data-saver/<hash>/page.jpg
    const cleanPath = imagePath.replace(/^\/+/, '')
    return `/api/proxy/mangadex/image/${cleanPath}`
  },
}

export const userService = {
  async getProfile() {
    const response = await api.get('/user/profile')
    return unwrap(response)
  },

  async updateProfile(data) {
    const response = await api.put('/user/profile', data)
    return unwrap(response)
  },

  async updatePassword(data) {
    const response = await api.put('/user/password', data)
    return unwrap(response)
  },

  async getSettings() {
    const response = await api.get('/user/settings')
    return unwrap(response)
  },

  async updateSettings(data) {
    const response = await api.put('/user/settings', data)
    return unwrap(response)
  },

  async deleteAccount() {
    const response = await api.delete('/auth/account')
    return unwrap(response)
  },
}

export default api