import { Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import PageSkeleton from "@/components/PageSkeleton";
import { lazyWithReload } from "@/lib/lazyWithReload";
import Auth from "./pages/Auth";
import AppLayout from "./components/AppLayout";

const Dashboard = lazyWithReload(() => import("./pages/Dashboard"));
const ObraDetail = lazyWithReload(() => import("./pages/ObraDetail"));
const Financeiro = lazyWithReload(() => import("./pages/Financeiro"));
const Relatorios = lazyWithReload(() => import("./pages/Relatorios"));
const RelatorioFinal = lazyWithReload(() => import("./pages/RelatorioFinal"));
const DiarioObra = lazyWithReload(() => import("./pages/DiarioObra"));
const Configuracoes = lazyWithReload(() => import("./pages/Configuracoes"));
const Cronograma = lazyWithReload(() => import("./pages/Cronograma"));
const Clientes = lazyWithReload(() => import("./pages/Clientes"));
const Usuarios = lazyWithReload(() => import("./pages/Usuarios"));
const Documentacao = lazyWithReload(() => import("./pages/Documentacao"));
const Empresas = lazyWithReload(() => import("./pages/Empresas"));
const Obras = lazyWithReload(() => import("./pages/Obras"));
const Ferramentas = lazyWithReload(() => import("./pages/Ferramentas"));
const Funcionarios = lazyWithReload(() => import("./pages/Funcionarios"));
const Calendario = lazyWithReload(() => import("./pages/Calendario"));
const CalendarioCallback = lazyWithReload(() => import("./pages/CalendarioCallback"));
const NotFound = lazyWithReload(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 10 * 60_000,
      retry: 2,
      refetchOnWindowFocus: true,
    },
  },
});


const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<PageSkeleton />}>
            <Routes>
              <Route path="/" element={<Auth />} />
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<ProtectedRoute modulo="dashboard"><Dashboard /></ProtectedRoute>} />
                <Route path="/obras" element={<Obras />} />
                <Route path="/obras/:id" element={<ObraDetail />} />
                <Route path="/financeiro" element={<ProtectedRoute modulo="financeiro"><Financeiro /></ProtectedRoute>} />
                <Route path="/diario" element={<ProtectedRoute modulo="diario_obra"><DiarioObra /></ProtectedRoute>} />
                <Route path="/relatorios" element={<ProtectedRoute modulo="relatorios"><Relatorios /></ProtectedRoute>} />
                <Route path="/relatorio-final" element={<ProtectedRoute modulo="relatorio_final"><RelatorioFinal /></ProtectedRoute>} />
                <Route path="/configuracoes" element={<ProtectedRoute modulo="configuracoes"><Configuracoes /></ProtectedRoute>} />
                <Route path="/cronograma" element={<ProtectedRoute modulo="cronograma"><Cronograma /></ProtectedRoute>} />
                <Route path="/clientes" element={<ProtectedRoute modulo="clientes"><Clientes /></ProtectedRoute>} />
                <Route path="/documentacao" element={<ProtectedRoute modulo="documentos"><Documentacao /></ProtectedRoute>} />
                <Route path="/usuarios" element={<ProtectedRoute modulo="usuarios"><Usuarios /></ProtectedRoute>} />
                <Route path="/ferramentas" element={<ProtectedRoute modulo="ferramentas"><Ferramentas /></ProtectedRoute>} />
                <Route path="/funcionarios" element={<ProtectedRoute modulo="funcionarios"><Funcionarios /></ProtectedRoute>} />
                <Route path="/calendario" element={<Calendario />} />
                <Route path="/calendario/callback" element={<CalendarioCallback />} />
                <Route path="/empresas" element={<Empresas />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
