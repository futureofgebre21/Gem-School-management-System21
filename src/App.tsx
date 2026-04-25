import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/auth";
import Index from "./pages/Index";
import AuthPage from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import Students from "./pages/Students";
import Teachers from "./pages/Teachers";
import Schools from "./pages/Schools";
import AcademicStructure from "./pages/AcademicStructure";
import Attendance from "./pages/Attendance";
import Grades from "./pages/Grades";
import Fees from "./pages/Fees";
import ParentPortal from "./pages/ParentPortal";
import Announcements from "./pages/Announcements";
import DataImport from "./pages/DataImport";
import QuestionBank from "./pages/QuestionBank";
import ExamManagement from "./pages/ExamManagement";
import ExamPractice from "./pages/ExamPractice";
import Support from "./pages/Support";
import DashboardLayout from "./components/DashboardLayout";
import NotFound from "./pages/NotFound";
import HR from "./pages/HR";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, userRole, schoolId } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
  if (!user) return <Navigate to="/auth" replace />;
  // Only redirect to onboarding if user has NO role AND NO school
  if (!userRole || !schoolId) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}

function OnboardingPage() {
  const { user, loading, userRole, schoolId } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
  if (!user) return <Navigate to="/auth" replace />;
  // If user already has a role and school, skip onboarding
  if (userRole && schoolId) return <Navigate to="/dashboard" replace />;
  return <Onboarding />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/dashboard" element={<OnboardingGuard><DashboardLayout /></OnboardingGuard>}>
              <Route index element={<Dashboard />} />
              <Route path="students" element={<Students />} />
              <Route path="teachers" element={<Teachers />} />
              <Route path="schools" element={<Schools />} />
              <Route path="academics" element={<AcademicStructure />} />
              <Route path="attendance" element={<Attendance />} />
              <Route path="grades" element={<Grades />} />
              <Route path="fees" element={<Fees />} />
              <Route path="hr" element={<HR />} />
              <Route path="parent" element={<ParentPortal />} />
              <Route path="announcements" element={<Announcements />} />
              <Route path="import" element={<DataImport />} />
              <Route path="question-bank" element={<QuestionBank />} />
              <Route path="exam-management" element={<ExamManagement />} />
              <Route path="exam-practice" element={<ExamPractice />} />
              <Route path="support" element={<Support />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
