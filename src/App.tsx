import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import Auth from "./pages/Auth";
import AppLayout from "./components/AppLayout";
import Dashboard from "./pages/Dashboard";
import ObraDetail from "./pages/ObraDetail";
import Financeiro from "./pages/Financeiro";
import Relatorios from "./pages/Relatorios";
import DiarioObra from "./pages/DiarioObra";
import Configuracoes from "./pages/Configuracoes";
import Clientes from "./pages/Clientes";
import Usuarios from "./pages/Usuarios";
import Documentacao from "./pages/Documentacao";
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
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/obras/:id" element={<ObraDetail />} />
              <Route path="/financeiro" element={<Financeiro />} />
              <Route path="/diario" element={<DiarioObra />} />
              <Route path="/relatorios" element={<Relatorios />} />
              <Route path="/configuracoes" element={<Configuracoes />} />
              <Route path="/clientes" element={<Clientes />} />
              <Route path="/usuarios" element={<Usuarios />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
