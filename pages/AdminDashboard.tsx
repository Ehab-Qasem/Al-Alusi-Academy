import React from 'react';
import { backend } from '../services/mockBackend';
import { UserRole } from '../types';
import { useAuth } from '../App';
import { Users, BookOpen, FileText, CheckCircle, Plus, Layers, GraduationCap, Award, Crown, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { LoadingSkeleton } from '../components/LoadingSkeleton';

const AdminDashboard = () => {
  const { user } = useAuth();

  // Dashboard Stats
  const studentsCount = backend.getUsers(UserRole.STUDENT).length;
  const teachersCount = backend.getUsers(UserRole.TEACHER).length;
  const coursesCount = backend.getCourses().length;
  const examsCount = backend.getExams().length;

  // Orphan Check
  const unassignedStudents = backend.getUsers(UserRole.STUDENT).filter(s => !s.gradeLevel || !s.classSection).length;
  
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return <LoadingSkeleton type="dashboard" />;
  }

  return (
    <div className="space-y-8 animate-fade-in pb-10">

      {/* ALERT FOR UNASSIGNED STUDENTS */}
      {unassignedStudents > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-xl flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-3">
            <div className="bg-red-100 dark:bg-red-800 p-2 rounded-full text-red-600 dark:text-red-200">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h3 className="font-bold text-red-800 dark:text-red-300">تنبيه: يوجد {unassignedStudents} طالب غير محدد الصف/الشعبة!</h3>
              <p className="text-sm text-red-600 dark:text-red-400">يرجى الذهاب لإدارة المستخدمين لتسكينهم في فصولهم.</p>
            </div>
          </div>
          <Link to="/admin/users" className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-700 transition">
            حل المشكلة
          </Link>
        </div>
      )}


      {/* 1. Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 to-slate-800 text-white p-8 md:p-12 shadow-2xl">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M0 100 C 20 0 50 0 100 100 Z" fill="white" />
          </svg>
        </div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 bg-primary-500/20 text-primary-300 text-xs font-bold rounded-full border border-primary-500/30 flex items-center gap-1">
                <Crown size={12} /> نسخة المدير المميزة
              </span>
            </div>
            <h1 className="text-3xl md:text-5xl font-black mb-2 tracking-tight">مرحباً، {user?.fullName} 👋</h1>
            <p className="text-slate-400 text-lg">إليك نظرة عامة على أداء الأكاديمية اليوم.</p>
          </div>
          <div className="flex gap-3">
            <Link to="/admin/users" className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-primary-900/50 transition transform hover:-translate-y-1">
              إدارة المستخدمين
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="الطلاب المسجلين"
          value={studentsCount}
          icon={<GraduationCap size={24} className="text-blue-500" />}
          color="bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30"
        />
        <StatCard
          title="الكادر التعليمي"
          value={teachersCount}
          icon={<Users size={24} className="text-purple-500" />}
          color="bg-purple-50 dark:bg-purple-900/10 border-purple-100 dark:border-purple-900/30"
        />
        <StatCard
          title="المسارات التعليمية"
          value={coursesCount}
          icon={<BookOpen size={24} className="text-green-500" />}
          color="bg-green-50 dark:bg-green-900/10 border-green-100 dark:border-green-900/30"
        />
        <StatCard
          title="الاختبارات النشطة"
          value={examsCount}
          icon={<FileText size={24} className="text-orange-500" />}
          color="bg-orange-50 dark:bg-orange-900/10 border-orange-100 dark:border-orange-900/30"
        />
      </div>

      {/* 3. Quick Actions */}
      <h2 className="text-xl font-bold text-gray-800 dark:text-white mt-8 flex items-center gap-2">⚡ إجراءات سريعة</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <QuickAction to="/admin/users" icon={<Plus size={20} />} label="إضافة مستخدم" color="text-blue-600 dark:text-blue-400" bg="bg-blue-50 dark:bg-blue-900/10" />
        <QuickAction to="/admin/exams" icon={<FileText size={20} />} label="إنشاء اختبار" color="text-orange-600 dark:text-orange-400" bg="bg-orange-50 dark:bg-orange-900/10" />
        <QuickAction to="/admin/structure" icon={<Layers size={20} />} label="إدارة الصفوف" color="text-purple-600 dark:text-purple-400" bg="bg-purple-50 dark:bg-purple-900/10" />
        <QuickAction to="/admin/certs" icon={<Award size={20} />} label="تصميم شهادة" color="text-green-600 dark:text-green-400" bg="bg-green-50 dark:bg-green-900/10" />
      </div>

    </div>
  );
};

const StatCard = ({ title, value, icon, color }: any) => (
  <div className={`p-6 rounded-2xl border ${color} transition hover:shadow-lg group`}>
    <div className="flex justify-between items-start mb-4">
      <div className="p-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm group-hover:scale-110 transition duration-300">{icon}</div>
    </div>
    <div className="text-3xl font-black text-gray-800 dark:text-white mb-1 group-hover:translate-x-1 transition">{value}</div>
    <div className="text-sm font-bold text-gray-500 dark:text-gray-400">{title}</div>
  </div>
);

const QuickAction = ({ to, icon, label, color, bg }: any) => (
  <Link to={to} className={`flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border border-transparent hover:border-gray-200 dark:hover:border-slate-700 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition group`}>
    <div className={`w-12 h-12 rounded-full ${bg} ${color} flex items-center justify-center group-hover:scale-110 transition duration-300`}>
      {icon}
    </div>
    <span className="font-bold text-gray-700 dark:text-gray-300 text-sm">{label}</span>
  </Link>
);

export default AdminDashboard;
