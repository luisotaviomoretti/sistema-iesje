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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <EnrollmentProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/identificacao" element={<IdentificacaoAluno />} />
            <Route path="/rematricula/:id" element={<RematriculaAluno />} />
            <Route path="/rematricula" element={<Rematricula />} />
            <Route path="/nova-matricula" element={<NovaMatricula />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </EnrollmentProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
