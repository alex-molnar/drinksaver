import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';

const links = [
  ['/recommendations', 'Recommendations'],
  ['/alcohol-types', 'Alcohol types'],
  ['/beer-brands', 'Beer brands'],
  ['/user-defined', 'User-defined'],
  ['/design', 'Design'],
] as const;

export const Workspace = ({ children }: { children: ReactNode }) => (
  <div className="workspace">
    <header className="workspace-header">
      <div className="workspace-header-inner">
        <NavLink className="wordmark" to="/recommendations">DrinkSaver</NavLink>
        <nav className="workspace-nav" aria-label="Primary navigation">
          {links.map(([to, label]) => (
            <NavLink key={to} to={to} end={to === '/recommendations'}>
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
    <main className="workspace-main">{children}</main>
  </div>
);

export default Workspace;
