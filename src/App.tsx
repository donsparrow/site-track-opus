import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Auth from "./pages/Auth";
import AppLayout from "./components/AppLayout";
import Dashboard from "./pages/Dashboard";
import ObraDetail from "./pages/ObraDetail";
import Financeiro from "./pages/Financeiro";
import Relatorios from "./pages/Relatorios";
import DiarioObra from "./pages/DiarioObra";
import Configuracoes from "./pages/Configuracoes";
import Cronograma from "./pages/Cronograma";
import Clientes from "./pages/Clientes";
import Usuarios from "./pages/Usuarios";
import Documentacao from "./pages/Documentacao";
import Empresas from "./pages/Empresas";
import Obras from "./pages/Obras";
import Ferramentas from "./pages/Ferramentas";
import Calendario from "./pages/Calendario";
import CalendarioCallback from "./pages/CalendarioCallback";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Auth />} />
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<ProtectedRoute modulo="dashboard"><Dashboard /></ProtectedRoute>} />
              <Route path="/obras" element={<Obras />} />
              <Route path="/obras/:id" element={<ObraDetail />} />
              <Route path="/financeiro" element={<ProtectedRoute modulo="financeiro"><Financeiro /></ProtectedRoute>} />
              <Route path="/diario" element={<ProtectedRoute modulo="diario_obra"><DiarioObra /></ProtectedRoute>} />
              <Route path="/relatorios" element={<ProtectedRoute modulo="relatorios"><Relatorios /></ProtectedRoute>} />
              <Route path="/configuracoes" element={<ProtectedRoute modulo="configuracoes"><Configuracoes /></ProtectedRoute>} />
              <Route path="/cronograma" element={<ProtectedRoute modulo="cronograma"><Cronograma /></ProtectedRoute>} />
              <Route path="/clientes" element={<ProtectedRoute modulo="clientes"><Clientes /></ProtectedRoute>} />
              <Route path="/documentacao" element={<ProtectedRoute modulo="documentos"><Documentacao /></ProtectedRoute>} />
              <Route path="/usuarios" element={<ProtectedRoute modulo="usuarios"><Usuarios /></ProtectedRoute>} />
              <Route path="/ferramentas" element={<ProtectedRoute modulo="ferramentas"><Ferramentas /></ProtectedRoute>} />
              <Route path="/calendario" element={<Calendario />} />
              <Route path="/calendario/callback" element={<CalendarioCallback />} />
              <Route path="/empresas" element={<Empresas />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
