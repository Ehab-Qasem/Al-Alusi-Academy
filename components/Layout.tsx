
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth, useTheme } from '../App';
import { UserRole } from '../types';
import { 
  LogOut, Sun, Moon, User as UserIcon, LayoutDashboard, ChevronDown, ShieldAlert,
  Menu, X, Home, BookOpen, FileText, Users, Library, GraduationCap, BarChart2, Award, Layers
} from 'lucide-react';
import { APP_NAME } from '../constants';
import AIChatWidget from './AIChatWidget';
import NotificationBell from './NotificationBell';
import { backend } from '../services/mockBackend';
import toast from 'react-hot-toast';

const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  
  // Mobile Menu State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getDashboardPath = () => {
    if (!user) return '/login';
    if (user.role === UserRole.ADMIN) return '/admin';
    if (user.role === UserRole.TEACHER) return '/teacher';
    return '/dashboard';
  };

  const toggleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else setTheme('light');
  };

  const isActive = (path: string) => location.pathname === path || (path !== '/' && location.pathname.startsWith(path));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex flex-col font-sans transition-colors duration-300">
      
      {/* --- DESKTOP HEADER (Hidden on Mobile) --- */}
      <nav className="hidden md:block bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-gray-200 dark:border-slate-800 sticky top-0 z-50 h-16 transition-all">
        <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-primary-500/30 group-hover:scale-105 transition-transform">
              م
            </div>
            <span className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">{APP_NAME}</span>
          </Link>

          <div className="flex items-center gap-8 bg-gray-50 dark:bg-slate-800 px-6 py-2 rounded-full border border-gray-100 dark:border-slate-700">
             <Link to="/tracks" className="text-sm font-bold text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition">المسارات</Link>
             <div className="w-px h-4 bg-gray-300 dark:bg-slate-600"></div>
             <Link to="/exams" className="text-sm font-bold text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition">الاختبارات</Link>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={toggleTheme} className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-slate-800 transition">
              {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            <NotificationBell />
            {user ? (
              <div className="relative">
                <button onClick={() => setIsProfileOpen(!isProfileOpen)} className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-full border border-gray-200 dark:border-slate-700 hover:border-primary-500 transition bg-white dark:bg-slate-900">
                  <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center text-primary-700 dark:text-primary-400 font-bold text-xs">
                    {user.fullName.charAt(0)}
                  </div>
                  <ChevronDown size={14} className="text-gray-400" />
                </button>
                {isProfileOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsProfileOpen(false)}></div>
                    <div className="absolute left-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-gray-100 dark:border-slate-800 p-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                      <Link to={getDashboardPath()} onClick={() => setIsProfileOpen(false)} className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-600 transition">
                        <LayoutDashboard size={18} /> لوحة التحكم
                      </Link>
                      
                      {user.role === UserRole.STUDENT && (
                        <button 
                          onClick={async () => {
                            setIsProfileOpen(false);
                            try {
                              await backend.requestPasswordReset(user.id);
                              toast.success('تم إرسال طلب للمدير لتغيير كلمة المرور. سيصلك إشعار عند الموافقة.');
                            } catch (e) {
                              toast.error('حدث خطأ أثناء إرسال الطلب');
                            }
                          }} 
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-orange-600 dark:text-orange-400 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20 transition mt-1"
                        >
                          <ShieldAlert size={18} /> طلب تغيير الباسورد
                        </button>
                      )}

                      <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition mt-1">
                        <LogOut size={18} /> تسجيل الخروج
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <Link to="/login" className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2 rounded-full font-bold text-sm shadow-md shadow-primary-500/20 transition-all hover:-translate-y-0.5">تسجيل الدخول</Link>
            )}
          </div>
        </div>
      </nav>

      {/* --- MOBILE HEADER (Minimal) --- */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-30 border-b border-gray-100 dark:border-slate-800">
         <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center text-white font-bold shadow-md">م</div>
            <span className="font-bold text-gray-900 dark:text-white">{APP_NAME}</span>
         </Link>
         {!user && (
            <Link to="/login" className="text-xs font-bold bg-primary-50 dark:bg-slate-800 text-primary-600 dark:text-primary-400 px-3 py-1.5 rounded-lg border border-primary-100 dark:border-slate-700">
              دخول
            </Link>
         )}
      </div>

      {/* --- MOBILE FLOATING ACTION BUTTON (The Menu Trigger) --- */}
      <button 
        onClick={() => setIsMobileMenuOpen(true)}
        className="md:hidden fixed bottom-6 right-6 z-40 w-14 h-14 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-300"
      >
        <Menu size={26} />
      </button>

      {/* --- MOBILE FULL SCREEN MENU OVERLAY --- */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-white dark:bg-slate-950 animate-in slide-in-from-bottom-5 duration-300">
           {/* Menu Header */}
           <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-slate-800">
              <h2 className="text-2xl font-black text-gray-900 dark:text-white">القائمة</h2>
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-10 h-10 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-gray-500 dark:text-gray-400"
              >
                <X size={20} />
              </button>
           </div>

           <div className="flex-1 overflow-y-auto p-6 space-y-8">
              
              {/* 1. User Profile Section (Top of Menu) */}
              {user ? (
                <div className="bg-gray-50 dark:bg-slate-900 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 flex items-center gap-4">
                   <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400 font-bold text-xl">
                      {user.fullName.charAt(0)}
                   </div>
                   <div className="flex-1 min-w-0">
                      <div className="font-bold text-gray-900 dark:text-white truncate">{user.fullName}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{user.role === UserRole.STUDENT ? 'طالب' : user.role === UserRole.TEACHER ? 'معلم' : 'مدير'}</div>
                   </div>
                   <button onClick={toggleTheme} className="p-2 rounded-full bg-white dark:bg-slate-800 border dark:border-slate-700 text-gray-500 dark:text-gray-400">
                      {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
                   </button>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                   <div className="flex justify-between items-center">
                      <span className="font-bold dark:text-white">المظهر</span>
                      <button onClick={toggleTheme} className="flex items-center gap-2 bg-gray-100 dark:bg-slate-800 px-3 py-1 rounded-full text-xs">
                        {theme === 'dark' ? <><Moon size={14}/> ليلي</> : <><Sun size={14}/> نهاري</>}
                      </button>
                   </div>
                   <Link to="/login" className="w-full py-3 bg-primary-600 text-white rounded-xl font-bold text-center">تسجيل الدخول</Link>
                </div>
              )}

              {/* 2. Main Navigation (Sidebar Items adapted) */}
              {!user && (
                <div>
                   <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">التنقل</h3>
                   <div className="space-y-2">
                      <MobileMenuLink to="/" icon={<Home size={20} />} label="الرئيسية" active={isActive('/')} />
                      <MobileMenuLink to="/tracks" icon={<GraduationCap size={20} />} label="المسارات التعليمية" active={isActive('/tracks')} />
                      <MobileMenuLink to="/exams" icon={<FileText size={20} />} label="اختبارات تجريبية" active={isActive('/exams')} />
                   </div>
                </div>
              )}

              {/* 3. Dashboard Links (If logged in) */}
              {user && (
                <div>
                   <h3 className="text-xs font-bold text-primary-600 dark:text-primary-400 uppercase tracking-wider mb-4">خدماتي</h3>
                   <div className="space-y-2">
                      {user.role === UserRole.STUDENT && (
                        <>
                          <MobileMenuLink to="/dashboard" icon={<LayoutDashboard size={20} />} label="لوحة الطالب" active={isActive('/dashboard')} />
                          <MobileMenuLink to="/dashboard/courses" icon={<Library size={20} />} label="دوراتي المسجلة" active={isActive('/dashboard/courses')} />
                          <MobileMenuLink to="/tracks" icon={<GraduationCap size={20} />} label="جميع المسارات" active={isActive('/tracks')} />
                          <MobileMenuLink to="/exams" icon={<FileText size={20} />} label="الاختبارات التجريبية" active={isActive('/exams')} />
                          <MobileMenuLink to="/dashboard/certificates" icon={<Award size={20} />} label="شهاداتي" active={isActive('/dashboard/certificates')} />
                        </>
                      )}
                      {user.role === UserRole.TEACHER && (
                        <>
                          <MobileMenuLink to="/teacher" icon={<LayoutDashboard size={20} />} label="لوحة المعلم" active={isActive('/teacher')} />
                          <MobileMenuLink to="/teacher/courses" icon={<BookOpen size={20} />} label="إدارة الدورات" active={isActive('/teacher/courses')} />
                          <MobileMenuLink to="/teacher/questions" icon={<FileText size={20} />} label="بنك الأسئلة" active={isActive('/teacher/questions')} />
                          <MobileMenuLink to="/teacher/exams" icon={<FileText size={20} />} label="إدارة الاختبارات" active={isActive('/teacher/exams')} />
                          <MobileMenuLink to="/teacher/students" icon={<Users size={20} />} label="الطلاب" active={isActive('/teacher/students')} />
                        </>
                      )}
                      {user.role === UserRole.ADMIN && (
                        <>
                          <MobileMenuLink to="/admin" icon={<LayoutDashboard size={20} />} label="لوحة المسؤول" active={isActive('/admin')} />
                          <MobileMenuLink to="/admin/users" icon={<Users size={20} />} label="المستخدمين" active={isActive('/admin/users')} />
                          <MobileMenuLink to="/admin/structure" icon={<Layers size={20} />} label="الهيكلة المدرسية" active={isActive('/admin/structure')} />
                          <MobileMenuLink to="/admin/content" icon={<BookOpen size={20} />} label="إدارة المحتوى" active={isActive('/admin/content')} />
                          <MobileMenuLink to="/teacher/questions" icon={<FileText size={20} />} label="بنك الأسئلة (عام)" active={isActive('/teacher/questions')} />
                          <MobileMenuLink to="/admin/exams" icon={<FileText size={20} />} label="إدارة الاختبارات" active={isActive('/admin/exams')} />
                          <MobileMenuLink to="/admin/certs" icon={<Award size={20} />} label="تصميم الشهادات" active={isActive('/admin/certs')} />
                        </>
                      )}
                   </div>
                </div>
              )}
           </div>

           {/* Footer Action */}
           {user && (
             <div className="p-6 border-t border-gray-100 dark:border-slate-800 flex flex-col gap-3">
               {user.role === UserRole.STUDENT && (
                 <button 
                   onClick={async () => {
                     setIsMobileMenuOpen(false);
                     try {
                       await backend.requestPasswordReset(user.id);
                       toast.success('تم إرسال طلب للمدير لتغيير كلمة المرور. سيصلك إشعار عند الموافقة.');
                     } catch (e) {
                       toast.error('حدث خطأ أثناء إرسال الطلب');
                     }
                   }} 
                   className="w-full py-3 flex items-center justify-center gap-2 text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 rounded-xl font-bold"
                 >
                   <ShieldAlert size={20} /> طلب تغيير كلمة المرور
                 </button>
               )}
               <button onClick={handleLogout} className="w-full py-3 flex items-center justify-center gap-2 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-xl font-bold">
                 <LogOut size={20} /> تسجيل الخروج
               </button>
             </div>
           )}
        </div>
      )}

      {/* Main Content Render */}
      <main className="flex-1 w-full mx-auto">
        <Outlet />
      </main>

      {/* Global AI Chat */}
      <AIChatWidget />
    </div>
  );
};

const MobileMenuLink = ({ to, icon, label, active }: any) => (
  <Link 
    to={to} 
    className={`flex items-center gap-4 p-4 rounded-xl transition-all ${
      active 
        ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 font-bold border border-primary-100 dark:border-primary-900/30' 
        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800'
    }`}
  >
    <div className={active ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400'}>{icon}</div>
    <span className="text-base">{label}</span>
    {active && <div className="mr-auto w-2 h-2 rounded-full bg-primary-600 dark:bg-primary-400"></div>}
  </Link>
);

export default Layout;
