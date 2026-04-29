
import React, { useState } from 'react';
import { backend } from '../services/mockBackend';
import { UserRole } from '../types';
import { Users, FileText, BookOpen, BarChart3, AlertCircle, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import TeacherCourseManager from './TeacherCourseManager';
import { LoadingSkeleton } from '../components/LoadingSkeleton';

const TeacherDashboard = ({ initialTab = 'home' }: { initialTab?: 'home' | 'courses' | 'students' }) => {
  const [studentSearch, setStudentSearch] = useState('');
  const [filterGrade, setFilterGrade] = useState('all');
  const [filterSection, setFilterSection] = useState('all');

  const students = backend.getUsers(UserRole.STUDENT);
  const courses = backend.getCourses(undefined, true);
  const questions = backend.getQuestions();
  const grades = backend.getGrades();
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    // Simulate loading for smoother experience
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return <LoadingSkeleton type="dashboard" />;
  }

  if (initialTab === 'courses') {
    return <TeacherCourseManager />;
  }

  if (initialTab === 'students') {
    const filteredStudents = students.filter(s => {
      const matchesSearch = s.fullName.includes(studentSearch) || s.nationalID.includes(studentSearch);
      const matchesGrade = filterGrade === 'all' || !s.gradeLevel || s.gradeLevel === filterGrade;
      const matchesSection = filterSection === 'all' || !s.classSection || s.classSection === filterSection;
      return matchesSearch && matchesGrade && matchesSection;
    });

    return (
      <div className="space-y-6 animate-fade-in">
        <header className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">قائمة الطلاب</h1>
            <p className="text-gray-500 dark:text-gray-400">متابعة الأداء والنتائج</p>
          </div>
          <Link to="/teacher" className="text-primary-600 hover:underline">عودة للرئيسية</Link>
        </header>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-2.5 text-gray-400" size={18} />
            <input
              className="w-full pl-4 pr-10 py-2 border dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg dark:text-white"
              placeholder="بحث عن طالب..."
              value={studentSearch}
              onChange={e => setStudentSearch(e.target.value)}
            />
          </div>

          <div className="w-40">
            <select
              className="w-full border dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white rounded-lg px-2 py-2 outline-none"
              value={filterGrade}
              onChange={e => { setFilterGrade(e.target.value); setFilterSection('all'); }}
            >
              <option value="all">كل الصفوف</option>
              {grades.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}
            </select>
          </div>

          {filterGrade !== 'all' && (
            <div className="w-40 animate-fade-in">
              <select
                className="w-full border dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white rounded-lg px-2 py-2 outline-none"
                value={filterSection}
                onChange={e => setFilterSection(e.target.value)}
              >
                <option value="all">كل الشعب</option>
                {grades.find(g => g.name === filterGrade)?.sections.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-slate-800">
              <tr>
                <th className="p-4 text-right font-bold text-gray-500 dark:text-gray-400 text-sm">الاسم</th>
                <th className="p-4 text-right font-bold text-gray-500 dark:text-gray-400 text-sm">الهوية</th>
                <th className="p-4 text-right font-bold text-gray-500 dark:text-gray-400 text-sm">الدورات المسجلة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {filteredStudents.map(s => (
                <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                  <td className="p-4 font-bold text-gray-800 dark:text-white">{s.fullName}</td>
                  <td className="p-4 text-gray-600 dark:text-gray-400 font-mono">{s.nationalID}</td>
                  <td className="p-4 text-gray-600 dark:text-gray-400">{s.enrolledCourses?.length || 0}</td>
                </tr>
              ))}
              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-gray-400">لا يوجد طلاب</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <header>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">لوحة المعلم</h1>
        <p className="text-gray-500 dark:text-gray-400">إدارة المحتوى ومتابعة الطلاب</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard icon={<Users className="text-blue-500" />} title="الطلاب" value={students.length.toString()} link="/teacher/students" />
        <StatCard icon={<BookOpen className="text-green-500" />} title="الدورات النشطة" value={courses.length.toString()} link="/teacher/courses" />
        <StatCard icon={<FileText className="text-purple-500" />} title="بنك الأسئلة" value={questions.length.toString()} link="/teacher/questions" />
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm hover:border-primary-500/20 transition">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-lg dark:text-white">أداء الطلاب مؤخراً</h2>
            <Link to="/teacher/students" className="text-sm text-primary-600 dark:text-primary-400 hover:underline">عرض الكل</Link>
          </div>
          <div className="space-y-3">
            {backend.getResults().slice(-5).reverse().map(res => {
              const student = backend.getUsers().find(u => u.id === res.userId);
              return (
                <div key={res.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border border-transparent dark:border-slate-700">
                  <div>
                    <div className="font-bold text-sm dark:text-white">{student?.fullName || res.guestName || 'زائر'}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{new Date(res.completedAt).toLocaleDateString('ar-SA')}</div>
                  </div>
                  <div className="font-bold text-primary-700 dark:text-primary-400">{Math.round((res.score / res.totalQuestions) * 100)}%</div>
                </div>
              )
            })}
            {backend.getResults().length === 0 && (
              <div className="text-center text-gray-400 dark:text-gray-500 py-4 text-sm">لا توجد نتائج حديثة</div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm hover:border-primary-500/20 transition">
          <h2 className="font-bold text-lg mb-4 dark:text-white">إجراءات سريعة</h2>
          <div className="grid grid-cols-2 gap-4">
            <Link to="/teacher/questions" className="p-4 border dark:border-slate-700 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 flex flex-col items-center text-center gap-2 transition-colors">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center text-purple-600 dark:text-purple-400"><FileText size={20} /></div>
              <span className="font-bold text-sm dark:text-gray-200">إضافة سؤال جديد</span>
            </Link>
            <Link to="/teacher/exams" className="p-4 border dark:border-slate-700 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 flex flex-col items-center text-center gap-2 transition-colors">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400"><BarChart3 size={20} /></div>
              <span className="font-bold text-sm dark:text-gray-200">إنشاء اختبار</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon, title, value, link }: any) => (
  <Link to={link} className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 flex items-center gap-4 hover:shadow-md transition hover:border-primary-500/30">
    <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">{icon}</div>
    <div>
      <div className="text-sm text-gray-500 dark:text-gray-400">{title}</div>
      <div className="text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
    </div>
  </Link>
);

export default TeacherDashboard;
