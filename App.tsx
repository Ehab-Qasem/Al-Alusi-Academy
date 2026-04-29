
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom';
import { User, UserRole, AuthState } from './types';
import { authService } from './services/authService';
import { auth } from './services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { backend } from './services/mockBackend';
import { Loader2 } from 'lucide-react';
import { Toaster } from 'react-hot-toast';

// --- COMPONENTS ---
import Layout from './components/Layout';
import DashboardLayout from './components/DashboardLayout';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import AdminLoginPage from './pages/AdminLoginPage';
import StudentDashboard from './pages/StudentDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import TeacherCourseManager from './pages/TeacherCourseManager';
import QuestionBank from './pages/QuestionBank';
import CoursePlayer from './pages/CoursePlayer';
import StudentExamInstructions from './pages/StudentExamInstructions';
import StudentExamPlayer from './pages/StudentExamPlayer';
import StudentExamResult from './pages/StudentExamResult';
import AdminDashboard from './pages/AdminDashboard';
import AdminUsersPage from './pages/AdminUsersPage';
import SchoolStructureManager from './pages/SchoolStructureManager';
import TrackSelectionPage from './pages/TrackSelectionPage';
import PublicExamListPage from './pages/PublicExamListPage';
import AdminExamBuilder from './pages/AdminExamBuilder';
import AdminCertificateEditor from './pages/AdminCertificateEditor';
import StudentCertificatesPage from './pages/StudentCertificatesPage';
import ForceChangePasswordModal from './components/ForceChangePasswordModal';
import ErrorBoundary from './components/ErrorBoundary';

// --- THEME CONTEXT ---

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};

// --- AUTH CONTEXT ---

interface AuthContextType extends AuthState {
  login: (id: string, pass: string) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

const AuthProvider = ({ children }: { children?: ReactNode }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true
  });

  const [backendReady, setBackendReady] = useState(false);

  useEffect(() => {
    const initBackend = async () => {
      const success = await backend.init();
      if (success) setBackendReady(true);
      else setTimeout(initBackend, 3000);
    };
    initBackend();
  }, []);

  useEffect(() => {
    if (!backendReady) return;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // 1. Try Local Session First (Offline/Mock Priority)
      const localSession = authService.checkSession();
      if (localSession) {
        setState({ user: localSession, isAuthenticated: true, isLoading: false });
        return;
      }

      // 2. Fallback to Firebase (Online Mode)
      if (firebaseUser) {
        try {
          const profile = await authService.getUserProfile(firebaseUser.uid);
          if (profile) {
            await backend.syncUserData(profile.id);
            if (profile.role === UserRole.ADMIN || profile.role === UserRole.TEACHER) {
              await backend.syncAllUsers();
            }
            setState({ user: profile, isAuthenticated: true, isLoading: false });
          } else {
            setState({ user: null, isAuthenticated: false, isLoading: false });
          }
        } catch (e) {
          setState({ user: null, isAuthenticated: false, isLoading: false });
        }
      } else {
        setState({ user: null, isAuthenticated: false, isLoading: false });
      }
    });

    return () => unsubscribe();
  }, [backendReady]);

  const login = async (nationalID: string, pass: string) => {
    const user = await authService.login(nationalID, pass);
    setState(prev => ({ ...prev, user, isAuthenticated: true, isLoading: false }));
  };

  const logout = async () => {
    await authService.logout();
    setState({ user: null, isAuthenticated: false, isLoading: false });
  };

  const updateUser = (user: User) => {
    setState(prev => ({ ...prev, user }));
  };

  const refreshProfile = async () => {
    if (state.user?.id) {
      const profile = await authService.getUserProfile(state.user.id);
      if (profile) updateUser(profile);
    }
  };

  if (!backendReady) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-slate-950 text-primary-600">
        <Loader2 size={48} className="animate-spin mb-4" />
        <h2 className="text-xl font-bold dark:text-gray-300">جاري الاتصال بالخادم التعليمي...</h2>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ ...state, login, logout, updateUser, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

// --- COMBINED PROVIDER ---

const ThemeProvider = ({ children }: { children?: ReactNode }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme') as Theme;
    return saved || 'system';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    localStorage.setItem('theme', theme);

    const applyTheme = (isDark: boolean) => {
      if (isDark) root.classList.add('dark');
      else root.classList.remove('dark');
    };

    if (theme === 'system') {
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)');
      applyTheme(systemDark.matches);

      const listener = (e: MediaQueryListEvent) => applyTheme(e.matches);
      systemDark.addEventListener('change', listener);
      return () => systemDark.removeEventListener('change', listener);
    } else {
      applyTheme(theme === 'dark');
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// --- ROUTE GUARDS ---

const RequireAuth = ({ roles }: { roles?: UserRole[] }) => {
  const { isAuthenticated, user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <div className="p-10 text-center dark:text-gray-400">جاري التحقق...</div>;

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && !roles.includes(user.role)) {
    if (user.role === UserRole.ADMIN) return <Navigate to="/admin" replace />;
    if (user.role === UserRole.TEACHER) return <Navigate to="/teacher" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

const App = () => {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Toaster
            position="top-center"
            containerStyle={{ zIndex: 99999999999 }}
            toastOptions={{
              style: {
                borderRadius: '10px',
                background: '#333',
                color: '#fff',
                fontFamily: 'Tajawal, sans-serif'
              },
              success: {
                style: { background: '#10b981' },
              },
              error: {
                style: { background: '#ef4444' },
              }
            }}
          />
          <Routes>
            <Route path="/admin-login" element={<AdminLoginPage />} />

            {/* Student Exam Flow */}
            <Route path="/exam/:examId/start" element={<StudentExamInstructions />} />
            <Route path="/exam/:examId/play" element={<StudentExamPlayer />} />
            <Route path="/exam/:examId/result" element={<StudentExamResult />} />

            <Route element={<Layout />}>
              <Route path="/" element={<LandingPage />} />
              <Route path="/tracks/*" element={<TrackSelectionPage />} />
              <Route path="/exams" element={<PublicExamListPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/course/:courseId" element={<CoursePlayer />} />

              {/* STUDENT ROUTES */}
              <Route element={<RequireAuth roles={[UserRole.STUDENT]} />}>
                <Route element={<DashboardLayout />}>
                  <Route path="/dashboard" element={<StudentDashboard initialTab="home" />} />
                  <Route path="/dashboard/courses" element={<StudentDashboard initialTab="courses" />} />
                  <Route path="/dashboard/certificates" element={<StudentCertificatesPage />} />
                </Route>
              </Route>

              {/* TEACHER ROUTES */}
              <Route element={<RequireAuth roles={[UserRole.TEACHER, UserRole.ADMIN]} />}>
                <Route element={<DashboardLayout />}>
                  <Route path="/teacher" element={<TeacherDashboard initialTab="home" />} />
                  <Route path="/teacher/courses" element={<TeacherCourseManager />} />
                  <Route path="/teacher/questions" element={<QuestionBank />} />
                  <Route path="/teacher/students" element={<TeacherDashboard initialTab="students" />} />
                  <Route path="/teacher/exams" element={<AdminExamBuilder />} />
                </Route>
              </Route>

              {/* ADMIN ROUTES */}
              <Route element={<RequireAuth roles={[UserRole.ADMIN]} />}>
                <Route element={<DashboardLayout />}>
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/admin/users" element={<AdminUsersPage />} />
                  <Route path="/admin/exams" element={<AdminExamBuilder />} />
                  <Route path="/admin/structure" element={<SchoolStructureManager />} />
                  <Route path="/admin/certs" element={<AdminCertificateEditor />} />
                  <Route path="/admin/content" element={<TeacherCourseManager />} />
                </Route>
              </Route>

            </Route>
          </Routes>
          <ForceChangePasswordModal />
        </HashRouter>
      </AuthProvider>
    </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;
