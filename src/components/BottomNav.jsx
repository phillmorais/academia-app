import { NavLink } from 'react-router-dom'

const itens = [
  {
    para: '/',
    rotulo: 'Encontros',
    icone: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" stroke="currentColor" className="w-7 h-7">
        <rect x="3" y="4.5" width="18" height="16" rx="2" />
        <path d="M3 9.5h18M8 3v3M16 3v3" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    para: '/prompts',
    rotulo: 'Prompts',
    icone: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" stroke="currentColor" className="w-7 h-7">
        <path d="M20 12a7 7 0 1 1-3.1-5.8" strokeLinecap="round" />
        <path d="M20 4v5h-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    para: '/tutor',
    rotulo: 'Tutor',
    icone: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" stroke="currentColor" className="w-7 h-7">
        <path d="M12 3 2 8l10 5 8-4v6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M6 10.5V15c0 1.7 2.7 3 6 3s6-1.3 6-3v-4.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    para: '/registro',
    rotulo: 'Registro',
    icone: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" stroke="currentColor" className="w-7 h-7">
        <path d="M6 3h9l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" strokeLinejoin="round" />
        <path d="M9 12h6M9 16h6" strokeLinecap="round" />
      </svg>
    ),
  },
]

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 flex justify-around items-stretch z-20 pb-[env(safe-area-inset-bottom)]">
      {itens.map((item) => (
        <NavLink
          key={item.para}
          to={item.para}
          end={item.para === '/'}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-1 py-2.5 flex-1 text-sm font-medium transition-colors ${
              isActive ? 'text-amber-800' : 'text-stone-500'
            }`
          }
        >
          {item.icone}
          <span>{item.rotulo}</span>
        </NavLink>
      ))}
    </nav>
  )
}
