import type { RoutePath } from '../types'

type Props = {
  path: RoutePath
}

export function Header({ path }: Props) {
  return (
    <header className="site-header">
      <a href="#/" className="brand">
        <svg viewBox="0 0 64 64" aria-hidden="true">
          <circle cx="32" cy="32" r="18" fill="none" stroke="currentColor" strokeWidth="4" />
          <path
            d="M24 24c6 4 10 4 16 0M24 40c6-4 10-4 16 0"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle cx="32" cy="32" r="4" fill="currentColor" />
        </svg>
        Smash Theater
      </a>
      <nav>
        <a href="#/" className={path === '/' ? 'is-active' : ''}>
          Archive
        </a>
        <a href="#/stats" className={path === '/stats' ? 'is-active' : ''}>
          Stats
        </a>
        <a href="#/add" className={`add-link${path === '/add' ? ' is-active' : ''}`}>
          Add Matches +
        </a>
      </nav>
    </header>
  )
}
