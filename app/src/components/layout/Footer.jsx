import { Link } from 'react-router-dom'
import { Heart, BookOpen, Github, Moon, Sun } from 'lucide-react'

export function Footer() {
  return (
    <footer className="bg-white border-t border-bl-sand/20 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <Link to="/" className="flex items-center gap-2 text-xl font-display font-bold text-gray-900 mb-4">
              <span className="text-bl-sage">BL</span> Tracker
            </Link>
            <p className="text-bl-sand text-sm leading-relaxed max-w-xs">
              Tu biblioteca personal de manhwas, mangas y webtoons BL.
              Rastrea tu progreso, descubre nuevas obras y nunca te pierdas un capítulo nuevo.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Enlaces rápidos</h3>
            <nav aria-label="Enlaces del pie de página">
              <ul className="space-y-2">
                <li><Link to="/search" className="text-bl-sand hover:text-bl-sageDark transition-colors text-sm">Buscar obras</Link></li>
                <li><Link to="/library" className="text-bl-sand hover:text-bl-sageDark transition-colors text-sm">Mi biblioteca</Link></li>
                <li><Link to="/favorites" className="text-bl-sand hover:text-bl-sageDark transition-colors text-sm">Favoritos</Link></li>
                <li><Link to="/stats" className="text-bl-sand hover:text-bl-sageDark transition-colors text-sm">Estadísticas</Link></li>
              </ul>
            </nav>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Conectar</h3>
            <div className="flex gap-4">
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="p-2 rounded-xl bg-bl-sand/10 text-bl-sand hover:bg-bl-sand/20 transition-colors" aria-label="GitHub">
                <Github className="w-5 h-5" />
              </a>
              <a href="https://anilist.co" target="_blank" rel="noopener noreferrer" className="p-2 rounded-xl bg-bl-sand/10 text-bl-sand hover:bg-bl-sand/20 transition-colors" aria-label="AniList">
                <BookOpen className="w-5 h-5" />
              </a>
            </div>
            <p className="mt-4 text-xs text-bl-sand">
              Datos proporcionados por <a href="https://anilist.co" target="_blank" rel="noopener noreferrer" className="underline hover:text-bl-sageDark">AniList</a> y <a href="https://mangadex.org" target="_blank" rel="noopener noreferrer" className="underline hover:text-bl-sageDark">MangaDex</a>
            </p>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-bl-sand/20 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-bl-sand">
            Hecho con <Heart className="w-4 h-4 inline text-bl-rose" /> para la comunidad BL
          </p>
          <div className="flex items-center gap-4 text-sm text-bl-sand">
            <span>Tema:</span>
            <button className="p-2 rounded-xl bg-bl-sand/10 hover:bg-bl-sand/20 transition-colors" aria-label="Modo claro">
              <Sun className="w-4 h-4" />
            </button>
            <button className="p-2 rounded-xl bg-bl-sand/10 hover:bg-bl-sand/20 transition-colors" aria-label="Modo oscuro">
              <Moon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  )
}