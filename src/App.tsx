import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminRoute from "@/components/AdminRoute";

import Index from "./pages/Index.tsx";
import Login from "./pages/Login.tsx";
import Cadastro from "./pages/Cadastro.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import DiagramList from "./pages/DiagramList.tsx";
import DiagramEditor from "./pages/DiagramEditor.tsx";
import NewDiagram from "./pages/NewDiagram.tsx";
import WorkspaceList from "./pages/boards/WorkspaceList.tsx";
import BoardDetail from "./pages/boards/BoardDetail.tsx";
import AgendaPage from "./pages/AgendaPage.tsx";
import AssinaturasPage from "./pages/AssinaturasPage.tsx";
import Configuracoes from "./pages/Configuracoes.tsx";
import InboxPage from "./pages/InboxPage.tsx";
import PlannerPage from "./pages/PlannerPage.tsx";
import AdminDashboard from "./pages/admin/AdminDashboard.tsx";
import AdminUsers from "./pages/admin/AdminUsers.tsx";
import AdminPlans from "./pages/admin/AdminPlans.tsx";
import AdminSettings from "./pages/admin/AdminSettings.tsx";
import AcceptInvite from "./pages/AcceptInvite.tsx";
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
          <Route path="/diagramas/novo" element={<ProtectedRoute><NewDiagram /></ProtectedRoute>} />
          <Route path="/diagramas/:id" element={<ProtectedRoute><DiagramEditor /></ProtectedRoute>} />
          <Route path="/boards" element={<ProtectedRoute><WorkspaceList /></ProtectedRoute>} />
          <Route path="/boards/:id" element={<ProtectedRoute><BoardDetail /></ProtectedRoute>} />
          <Route path="/agenda" element={<ProtectedRoute><AgendaPage /></ProtectedRoute>} />
          <Route path="/inbox" element={<ProtectedRoute><InboxPage /></ProtectedRoute>} />
          <Route path="/planner" element={<ProtectedRoute><PlannerPage /></ProtectedRoute>} />
          <Route path="/assinaturas" element={<ProtectedRoute><AssinaturasPage /></ProtectedRoute>} />
          <Route path="/configuracoes" element={<ProtectedRoute><Configuracoes /></ProtectedRoute>} />
          {/* Admin */}
          <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/admin/usuarios" element={<AdminRoute><AdminUsers /></AdminRoute>} />
          <Route path="/admin/planos" element={<AdminRoute><AdminPlans /></AdminRoute>} />
          <Route path="/admin/configuracoes" element={<AdminRoute><AdminSettings /></AdminRoute>} />
          <Route path="/convite" element={<AcceptInvite />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <FloatingNavBar />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
