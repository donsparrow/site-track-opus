import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import AppSidebar from './AppSidebar';
import MobileSidebar from './MobileSidebar';
import GlobalFooter from './GlobalFooter';
import EmpresaSetup from './EmpresaSetup';

export default function AppLayout() {
  const { user, loading } = useAuth();

  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-accent border-t-transparent rounded-full" /></div>;
  if (!user) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Desktop sidebar - hidden on mobile */}
      <div className="hidden md:block">
        <AppSidebar />
      </div>

      {/* Mobile header/sidebar - hidden on desktop */}
      <MobileSidebar />

      {/* Main content: ml-64 on desktop, no margin + top padding on mobile */}
      <main className="flex-1 pt-14 md:pt-0 md:ml-64">
        <div className="p-4 md:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>

      {/* Footer */}
      <div className="md:ml-64">
        <GlobalFooter />
      </div>
    </div>
  );
}
