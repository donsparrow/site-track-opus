import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import AppSidebar from './AppSidebar';
import GlobalFooter from './GlobalFooter';

export default function AppLayout() {
  const { user, loading } = useAuth();

  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-accent border-t-transparent rounded-full" /></div>;
  if (!user) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppSidebar />
      <main className="ml-64 flex-1">
        <div className="p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
      <div className="ml-64">
        <GlobalFooter />
      </div>
    </div>
  );
}
