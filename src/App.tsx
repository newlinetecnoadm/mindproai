import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index.tsx";
import Login from "./pages/Login.tsx";
import Cadastro from "./pages/Cadastro.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import DiagramList from "./pages/DiagramList.tsx";
import DiagramEditor from "./pages/DiagramEditor.tsx";
import WorkspaceList from "./pages/boards/WorkspaceList.tsx";
import BoardDetail from "./pages/boards/BoardDetail.tsx";
import AgendaPage from "./pages/AgendaPage.tsx";
import AssinaturasPage from "./pages/AssinaturasPage.tsx";
import Configuracoes from "./pages/Configuracoes.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/cadastro" element={<Cadastro />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/diagramas" element={<ProtectedRoute><DiagramList /></ProtectedRoute>} />
          <Route path="/diagramas/:id" element={<ProtectedRoute><DiagramEditor /></ProtectedRoute>} />
          <Route path="/boards" element={<ProtectedRoute><WorkspaceList /></ProtectedRoute>} />
          <Route path="/agenda" element={<ProtectedRoute><AgendaPage /></ProtectedRoute>} />
          <Route path="/assinaturas" element={<ProtectedRoute><AssinaturasPage /></ProtectedRoute>} />
          <Route path="/configuracoes" element={<ProtectedRoute><Configuracoes /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
