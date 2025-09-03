import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Rematricula from "./pages/Rematricula";
import NovaMatricula from "./pages/NovaMatricula";
import RematriculaAluno from "./pages/RematriculaAluno";
import { EnrollmentProvider } from "./features/enrollment/context/EnrollmentContext";
import IdentificacaoAluno from "./pages/Identificacao";
import ResumoMatricula from "./pages/ResumoMatricula";
import ResumoMatriculaProfissional from "./pages/ResumoMatriculaProfissional";
import MatriculasRecentes from "./pages/MatriculasRecentes";

// Admin imports
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import DiscountManagement from "./pages/admin/DiscountManagement";
import CepManagement from "./pages/admin/CepManagement";
import SeriesManagement from "./pages/admin/SeriesManagement";
import TrackManagement from "./pages/admin/TrackManagement";
import TestElegibilidade from "./pages/TestElegibilidade";
import TestEligibilityIntegration from "./pages/TestEligibilityIntegration";
import TesteRPC from "./pages/TesteRPC";
import AdminRoute from "./features/admin/components/AdminRoute";
import AdminLayout from "./features/admin/components/AdminLayout";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <EnrollmentProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Index />} />
            <Route path="/identificacao" element={<IdentificacaoAluno />} />
            <Route path="/rematricula/:id" element={<RematriculaAluno />} />
            <Route path="/rematricula/:id/resumo" element={<ResumoMatricula />} />
            <Route path="/rematricula" element={<Rematricula />} />
            <Route path="/nova-matricula" element={<NovaMatricula />} />
            <Route path="/nova-matricula/resumo" element={<ResumoMatriculaProfissional />} />
            <Route path="/nova-matricula/resumo-simples" element={<ResumoMatricula />} />
            <Route path="/matriculas-recentes" element={<MatriculasRecentes />} />
            <Route path="/test-elegibilidade" element={<TestElegibilidade />} />
            <Route path="/test-integration" element={<TestEligibilityIntegration />} />
            <Route path="/teste-rpc" element={<TesteRPC />} />
            
            {/* Admin Routes */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={
              <AdminRoute>
                <AdminLayout />
              </AdminRoute>
            }>
              <Route index element={<AdminDashboard />} />
              <Route path="descontos" element={
                <AdminRoute requiredRole="coordenador">
                  <DiscountManagement />
                </AdminRoute>
              } />
              <Route path="ceps" element={
                <AdminRoute requiredRole="coordenador">
                  <CepManagement />
                </AdminRoute>
              } />
              <Route path="series" element={
                <AdminRoute requiredRole="coordenador">
                  <SeriesManagement />
                </AdminRoute>
              } />
              <Route path="trilhos" element={
                <AdminRoute requiredRole="operador">
                  <TrackManagement />
                </AdminRoute>
              } />
              <Route path="usuarios" element={
                <AdminRoute requiredRole="super_admin">
                  <div>Gerenciamento de Usuários (Em breve)</div>
                </AdminRoute>
              } />
              <Route path="configuracoes" element={
                <AdminRoute requiredRole="super_admin">
                  <div>Configurações do Sistema (Em breve)</div>
                </AdminRoute>
              } />
            </Route>
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </EnrollmentProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
