import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  Building2, LayoutDashboard, Wallet, FileText,
  Users, LogOut, HardHat, UserCircle, ClipboardList, Settings, FolderOpen, CalendarRange, Menu, X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
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

export default function MobileSidebar() {
  const { signOut, role, user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    setOpen(false);
    await signOut();
    navigate('/');
  };

  const visibleItems = navItemsAll.filter(item => role && item.roles.includes(role));

  return (
    <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-sidebar border-b border-sidebar-border">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <img src={logoJa} alt="J&A GestãoPro" className="h-10 w-10 rounded-lg object-contain" />
          <h1 className="font-display text-sm font-bold text-sidebar-foreground">J&A Engenharia</h1>
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button className="p-2 text-sidebar-foreground hover:bg-sidebar-accent rounded-lg transition-colors">
              <Menu className="h-6 w-6" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0 bg-sidebar border-sidebar-border">
            <div className="flex items-center gap-3 px-6 py-5 border-b border-sidebar-border">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sidebar-primary">
                <HardHat className="h-5 w-5 text-sidebar-primary-foreground" />
              </div>
              <div>
                <h1 className="font-display text-base font-bold text-sidebar-foreground">J&A Engenharia</h1>
                <p className="text-xs text-sidebar-foreground/60 capitalize">{role || 'carregando...'}</p>
              </div>
            </div>

            <nav className="flex-1 px-3 py-4 space-y-1">
              {visibleItems.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
                    )
                  }
                >
                  <Icon className="h-5 w-5" />
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
                className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground transition-colors"
              >
                <LogOut className="h-5 w-5" />
                Sair
              </button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
