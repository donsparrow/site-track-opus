import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  Building2, LayoutDashboard, Wallet, FileText,
  Users, LogOut, HardHat, UserCircle, ClipboardList, Settings, FolderOpen, CalendarRange
} from 'lucide-react';
import { cn } from '@/lib/utils';
import logoJa from '@/assets/logo-ja-gestaopro.jpeg';

const navItemsAll = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'trabalhador', 'cliente', 'sindico', 'super_admin'] },
  { to: '/empresas', label: 'Empresas', icon: Building2, roles: ['super_admin'] },
  { to: '/clientes', label: 'Clientes', icon: UserCircle, roles: ['admin', 'trabalhador', 'super_admin'] },
  { to: '/financeiro', label: 'Financeiro', icon: Wallet, roles: ['admin', 'trabalhador', 'super_admin'] },
  { to: '/diario', label: 'Diário de Obra', icon: ClipboardList, roles: ['admin', 'trabalhador', 'super_admin'] },
  { to: '/cronograma', label: 'Cronograma', icon: CalendarRange, roles: ['admin', 'trabalhador', 'cliente', 'sindico', 'super_admin'] },
  { to: '/relatorios', label: 'Relatórios', icon: FileText, roles: ['admin', 'trabalhador', 'cliente', 'sindico', 'super_admin'] },
  { to: '/documentacao', label: 'Documentação', icon: FolderOpen, roles: ['admin', 'trabalhador', 'cliente', 'sindico', 'super_admin'] },
  { to: '/usuarios', label: 'Usuários', icon: Users, roles: ['admin', 'super_admin'] },
  { to: '/configuracoes', label: 'Configurações', icon: Settings, roles: ['admin', 'super_admin'] },
];

export default function AppSidebar() {
  const { signOut, role, isAdmin, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const visibleItems = navItemsAll.filter(item => role && item.roles.includes(role));

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="flex items-center gap-3 px-6 py-5 border-b border-sidebar-border">
        <img src={logoJa} alt="J&A GestãoPro" className="h-16 w-auto max-w-[120px] rounded-lg object-contain p-1" />
        <div>
          <h1 className="font-display text-base font-bold text-sidebar-foreground">J&A Engenharia</h1>
          <p className="text-xs text-sidebar-foreground/60 capitalize">{{ super_admin: 'Adm. Geral', admin: 'Diretor', trabalhador: 'Funcionário', sindico: 'Síndico', cliente: 'Cliente' }[role || ''] || 'carregando...'}</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {visibleItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
              )
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-sidebar-border px-3 py-4">
        <div className="mb-3 px-3">
          <p className="text-xs text-sidebar-foreground/60 truncate">{user?.email}</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </div>
    </aside>
  );
}
