import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import RematriculaPage from "./features/rematricula-v2/pages/RematriculaPage";
import NovaMatricula from "./features/matricula-nova/pages/NovaMatricula";
import TestDiscountSync from "./pages/TestDiscountSync";
import TestDiscountDocuments from "./pages/TestDiscountDocuments";
import TestIntegrationDocuments from "./pages/TestIntegrationDocuments";
import TestAdminDocuments from "./pages/TestAdminDocuments";
import TestPDFV2 from "./pages/TestPDFV2";
import TestPDFMinimal from "./pages/TestPDFMinimal";
import TestPDFCompact from "./pages/TestPDFCompact";
import TestEdgeFunction from "./pages/TestEdgeFunction";
import TestUserDetection from "./pages/TestUserDetection";
import TestEnrollmentTracking from "./pages/TestEnrollmentTracking";
// import RematriculaAluno from "./pages/RematriculaAluno";
import IdentificacaoAluno from "./pages/Identificacao";
// import ResumoMatricula from "./pages/ResumoMatricula";
// import ResumoMatriculaProfissional from "./pages/ResumoMatriculaProfissional";
import MatriculasRecentes from "./pages/MatriculasRecentes";

// Admin imports
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import EnrollmentsList from "./pages/admin/EnrollmentsList";
import EnrollmentEdit from "./pages/admin/EnrollmentEdit";
import DiscountManagement from "./pages/admin/DiscountManagement";
import CepManagement from "./pages/admin/CepManagement";
import SeriesManagement from "./pages/admin/SeriesManagement";
import TrackManagement from "./pages/admin/TrackManagement";
import MatriculaUsersManagement from "./pages/admin/MatriculaUsersManagement";
import MatriculaLogin from "./pages/MatriculaLogin";
import MatriculaRoute from "./features/matricula/components/MatriculaRoute";
// import TestElegibilidade from "./pages/TestElegibilidade";
// import TestEligibilityIntegration from "./pages/TestEligibilityIntegration";
// import TesteRPC from "./pages/TesteRPC";
import AdminRoute from "./features/admin/components/AdminRoute";
import AdminLayout from "./features/admin/components/AdminLayout";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={
              <MatriculaRoute>
                <Index />
              </MatriculaRoute>
            } />
            <Route path="/identificacao" element={<IdentificacaoAluno />} />
            
            <Route path="/matriculas-recentes" element={
              <MatriculaRoute>
                <MatriculasRecentes />
              </MatriculaRoute>
            } />
            <Route path="/matricula/login" element={<MatriculaLogin />} />
            {/*
            <Route path="/test-elegibilidade" element={<TestElegibilidade />} />
            <Route path="/test-integration" element={<TestEligibilityIntegration />} />
            <Route path="/teste-rpc" element={<TesteRPC />} /> */}
            
            {/* Nova Matrícula V2 */}
            <Route path="/nova-matricula" element={
              <MatriculaRoute>
                <NovaMatricula />
              </MatriculaRoute>
            } />

            {/* Rematrícula V2 - Nova arquitetura independente */}
            <Route path="/rematricula" element={
              <MatriculaRoute>
                <RematriculaPage />
              </MatriculaRoute>
            } />
            
            {/* Test Routes */}
            <Route path="/test-discount-sync" element={<TestDiscountSync />} />
            <Route path="/test-documents" element={<TestDiscountDocuments />} />
            <Route path="/test-integration" element={<TestIntegrationDocuments />} />
            <Route path="/test-admin" element={<TestAdminDocuments />} />
            <Route path="/test-pdf" element={<TestPDFV2 />} />
            <Route path="/test-pdf-minimal" element={<TestPDFMinimal />} />
            <Route path="/test-pdf-compact" element={<TestPDFCompact />} />
            <Route path="/test-edge" element={<TestEdgeFunction />} />
            <Route path="/test-user" element={<TestUserDetection />} />
            <Route path="/test-tracking" element={<TestEnrollmentTracking />} />
            
            {/* Admin Routes */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={
              <AdminRoute>
                <AdminLayout />
              </AdminRoute>
            }>
              <Route index element={<AdminDashboard />} />
              <Route path="matriculas" element={
                <AdminRoute requiredRole="operador">
                  <EnrollmentsList />
                </AdminRoute>
              } />
              <Route path="matriculas/:id" element={
                <AdminRoute requiredRole="coordenador">
                  <EnrollmentEdit />
                </AdminRoute>
              } />
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
                <AdminRoute requiredRole="coordenador">
                  <MatriculaUsersManagement />
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
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
