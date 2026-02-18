import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import StudentDashboard from "./pages/student/StudentDashboard";
import TestTakingPage from "./pages/student/TestTakingPage";
import ResultsPage from "./pages/student/ResultsPage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminTests from "./pages/admin/AdminTests";
import AdminQuestions from "./pages/admin/AdminQuestions";
import AdminStudents from "./pages/admin/AdminStudents";
import AdminResults from "./pages/admin/AdminResults";
import SetupPage from "./pages/SetupPage";
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
            <Route path="/login" element={<LoginPage />} />
            <Route path="/setup" element={<SetupPage />} />
            <Route path="/" element={<Navigate to="/login" replace />} />

            {/* Student routes */}
            <Route path="/dashboard" element={<ProtectedRoute allowedRole="student"><StudentDashboard /></ProtectedRoute>} />
            <Route path="/dashboard/tests" element={<ProtectedRoute allowedRole="student"><StudentDashboard /></ProtectedRoute>} />
            <Route path="/dashboard/test/:testId" element={<ProtectedRoute allowedRole="student"><TestTakingPage /></ProtectedRoute>} />
            <Route path="/dashboard/results" element={<ProtectedRoute allowedRole="student"><StudentDashboard /></ProtectedRoute>} />
            <Route path="/dashboard/results/:testId" element={<ProtectedRoute allowedRole="student"><ResultsPage /></ProtectedRoute>} />

            {/* Admin routes */}
            <Route path="/admin" element={<ProtectedRoute allowedRole="admin"><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/tests" element={<ProtectedRoute allowedRole="admin"><AdminTests /></ProtectedRoute>} />
            <Route path="/admin/tests/:testId/questions" element={<ProtectedRoute allowedRole="admin"><AdminQuestions /></ProtectedRoute>} />
            <Route path="/admin/students" element={<ProtectedRoute allowedRole="admin"><AdminStudents /></ProtectedRoute>} />
            <Route path="/admin/results" element={<ProtectedRoute allowedRole="admin"><AdminResults /></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
