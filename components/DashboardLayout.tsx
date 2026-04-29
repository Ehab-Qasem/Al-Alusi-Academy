
import React, { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../App';
import { UserRole } from '../types';
import {
  LayoutDashboard, BookOpen, Users, FileText,
  ChevronRight, ChevronLeft, Library, GraduationCap, Award, Layers
} from 'lucide-react';

const DashboardLayout = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  if (!user) return null;

  const isActive = (path: string) => location.pathname === path || (path !== '/dashboard' && location.pathname.startsWith(path));

  return (
    <div className="flex min-h-[calc(100vh-64px)] bg-gray-50 dark:bg-slate-950 transition-colors duration-300">
      {/* Floating Sidebar - DESKTOP ONLY */}
      <aside
        className={`${collapsed ? 'w-20' : 'w-72'} hidden md:flex flex-col transition-all duration-300 sticky top-20 h-[calc(100vh-80px)] ml-4 my-4 rounded-3xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-xl shadow-gray-200/50 dark:shadow-none z-30`}
      >
        <div className="p-6 flex items-center justify-between">
          {!collapsed && (
            <Link to="/" className="flex items-center gap-3 mb-1 group">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-primary-700 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-lg shadow-primary-500/20 group-hover:scale-105 transition-transform">
                م
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-gray-900 dark:text-white leading-tight">أكاديمية المنارة</span>
                <span className="text-[10px] text-gray-400 font-medium">لوحة التحكم</span>
              </div>
            </Link>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl text-gray-400 dark:text-gray-500 transition-colors mx-auto"
          >
            {collapsed ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-2 overflow-y-auto custom-scrollbar">
          {/* STUDENT MENU */}
          {user.role === UserRole.STUDENT && (
            <>
              <SidebarItem to="/dashboard" icon={<LayoutDashboard size={22} />} label="الرئيسية" collapsed={collapsed} active={location.pathname === '/dashboard'} />
              <div className="my-2 border-t border-dashed border-gray-200 dark:border-slate-800 mx-2" />
              <SidebarItem to="/dashboard/courses" icon={<Library size={22} />} label="دوراتي المسجلة" collapsed={collapsed} active={isActive('/dashboard/courses')} />
              <SidebarItem to="/tracks" icon={<GraduationCap size={22} />} label="جميع المسارات" collapsed={collapsed} active={isActive('/tracks')} />
              <SidebarItem to="/exams" icon={<FileText size={22} />} label="الاختبارات التجريبية" collapsed={collapsed} active={isActive('/exams')} />
              <SidebarItem to="/dashboard/certificates" icon={<Award size={22} />} label="شهاداتي" collapsed={collapsed} active={isActive('/dashboard/certificates')} />
            </>
          )}

          {/* TEACHER MENU */}
          {user.role === UserRole.TEACHER && (
            <>
              <SidebarItem to="/teacher" icon={<LayoutDashboard size={22} />} label="لوحة المعلم" collapsed={collapsed} active={location.pathname === '/teacher'} />
              <SidebarItem to="/teacher/courses" icon={<BookOpen size={22} />} label="إدارة الدورات" collapsed={collapsed} active={isActive('/teacher/courses')} />
              <SidebarItem to="/teacher/questions" icon={<FileText size={22} />} label="بنك الأسئلة" collapsed={collapsed} active={isActive('/teacher/questions')} />
              <SidebarItem to="/teacher/exams" icon={<FileText size={22} />} label="إدارة الاختبارات" collapsed={collapsed} active={isActive('/teacher/exams')} />
              <SidebarItem to="/teacher/students" icon={<Users size={22} />} label="احصائيات الطلاب" collapsed={collapsed} active={isActive('/teacher/students')} />
            </>
          )}

          {/* ADMIN MENU */}
          {user.role === UserRole.ADMIN && (
            <>
              <SidebarItem to="/admin" icon={<LayoutDashboard size={22} />} label="لوحة المسؤول" collapsed={collapsed} active={location.pathname === '/admin'} />
              <SidebarItem to="/admin/users" icon={<Users size={22} />} label="إدارة المستخدمين" collapsed={collapsed} active={isActive('/admin/users')} />
              <SidebarItem to="/admin/structure" icon={<Layers size={22} />} label="الهيكلة المدرسية" collapsed={collapsed} active={isActive('/admin/structure')} />
              <SidebarItem to="/admin/content" icon={<BookOpen size={22} />} label="إدارة المحتوى" collapsed={collapsed} active={isActive('/admin/content')} />
              <SidebarItem to="/teacher/questions" icon={<FileText size={22} />} label="بنك الأسئلة (عام)" collapsed={collapsed} active={isActive('/teacher/questions')} />
              <SidebarItem to="/admin/exams" icon={<FileText size={22} />} label="إدارة الاختبارات" collapsed={collapsed} active={isActive('/admin/exams')} />
              <SidebarItem to="/admin/certs" icon={<Award size={22} />} label="تصميم الشهادات" collapsed={collapsed} active={isActive('/admin/certs')} />
            </>
          )}
        </nav>

        {!collapsed && (
          <div className="p-6 mt-auto">
            <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl p-4 text-white shadow-lg shadow-primary-500/30">
              <p className="text-xs opacity-80 mb-1">مسجل كـ</p>
              <p className="font-bold text-sm truncate">{user.fullName}</p>
            </div>
          </div>
        )}
      </aside>

      {/* Content Area */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto w-full pb-24 md:pb-8">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 flex justify-around items-center p-2 z-40 pb-safe">
          {user.role === UserRole.STUDENT && (
            <>
              <MobileNavItem to="/dashboard" icon={<LayoutDashboard size={20} />} label="الرئيسية" active={location.pathname === '/dashboard'} />
              <MobileNavItem to="/dashboard/courses" icon={<Library size={20} />} label="دوراتي" active={isActive('/dashboard/courses')} />
              <MobileNavItem to="/tracks" icon={<GraduationCap size={20} />} label="المسارات" active={isActive('/tracks')} />
              <MobileNavItem to="/exams" icon={<FileText size={20} />} label="اختبارات" active={isActive('/exams')} />
            </>
          )}
          {user.role === UserRole.TEACHER && (
            <>
              <MobileNavItem to="/teacher" icon={<LayoutDashboard size={20} />} label="لوحة المعلم" active={location.pathname === '/teacher'} />
              <MobileNavItem to="/teacher/courses" icon={<BookOpen size={20} />} label="الدورات" active={isActive('/teacher/courses')} />
              <MobileNavItem to="/teacher/exams" icon={<FileText size={20} />} label="اختبارات" active={isActive('/teacher/exams')} />
            </>
          )}
          {user.role === UserRole.ADMIN && (
            <>
              <MobileNavItem to="/admin" icon={<LayoutDashboard size={20} />} label="المسؤول" active={location.pathname === '/admin'} />
              <MobileNavItem to="/admin/users" icon={<Users size={20} />} label="المستخدمين" active={isActive('/admin/users')} />
              <MobileNavItem to="/admin/structure" icon={<Layers size={20} />} label="الهيكلة" active={isActive('/admin/structure')} />
              <MobileNavItem to="/admin/content" icon={<BookOpen size={20} />} label="المحتوى" active={isActive('/admin/content')} />
            </>
          )}
      </div>
    </div >
  );
};

const MobileNavItem = ({ to, icon, label, active }: any) => (
  <Link
    to={to}
    className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${
      active ? 'text-primary-600 dark:text-primary-400 font-bold' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
    }`}
  >
    {icon}
    <span className="text-[10px]">{label}</span>
  </Link>
);

const SidebarItem = ({ to, icon, label, collapsed, active }: any) => (
  <Link
    to={to}
    className={`group relative flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-200 ${active
      ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 font-bold shadow-sm'
      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white'
      } ${collapsed ? 'justify-center' : ''}`}
  >
    <div className={`shrink-0 transition-transform ${active && !collapsed ? 'scale-110' : ''}`}>{icon}</div>

    {!collapsed && <span className="whitespace-nowrap overflow-hidden transition-all text-sm">{label}</span>}

    {collapsed && (
      <div className="absolute right-full top-1/2 -translate-y-1/2 mr-3 px-3 py-1.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-bold rounded-lg shadow-lg opacity-0 group-hover:opacity-100 invisible group-hover:visible transition-all z-50 whitespace-nowrap pointer-events-none">
        {label}
      </div>
    )}
  </Link>
);

export default DashboardLayout;
