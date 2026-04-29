
import React, { useEffect, useState } from 'react';
import { useAuth } from '../App';
import { backend } from '../services/mockBackend';
import { Course, Exam, StudentProgress, ExamResult } from '../types';
import { Link } from 'react-router-dom';
import { PlayCircle, CheckCircle, Clock, Trophy } from 'lucide-react';
import { CATEGORY_LABELS } from '../constants';
import toast from 'react-hot-toast';
import { CourseRegistrationModal } from '../components/CourseRegistrationModal';
import { LoadingSkeleton } from '../components/LoadingSkeleton';

const DashboardPage = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [progressData, setProgressData] = useState<Record<string, StudentProgress>>({});
  const [examResults, setExamResults] = useState<ExamResult[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    const allCourses = backend.getCourses();
    setCourses(allCourses);
    const userEnrolled = allCourses.filter(c => (user.enrolledCourses || []).includes(c.id));
    setEnrolledCourses(userEnrolled);

    const progressMap: Record<string, StudentProgress> = {};
    userEnrolled.forEach(c => {
      progressMap[c.id] = backend.getProgress(user.id, c.id);
    });
    setProgressData(progressMap);

    setExams(backend.getExams(true));
    setExamResults(backend.getResults(user.id));
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleEnroll = (courseId: string) => {
    if (!user) return;
    backend.enrollUser(user.id, courseId);
    toast.success('تم التسجيل في الدورة بنجاح!');
    // Refresh local state instead of reload
    fetchData();
  };

  const getCompletionPercentage = (course: Course) => {
    const p = progressData[course.id];
    if (!p) return 0;

    let totalItems = 0;
    course.modules.forEach(m => totalItems += m.content.length);
    if (totalItems === 0) return 0;

    return Math.round((p.completedItems.length / totalItems) * 100);
  };

  const getExamQuestionCount = (exam: Exam) => {
    // Fix: Calculate total questions from sections to avoid crash
    if (exam.sections && Array.isArray(exam.sections)) {
      return exam.sections.reduce((acc, section) => acc + section.questionIds.length, 0);
    }
    return 0;
  };

  if (loading) {
    return (
      <div className="space-y-8 pb-12">
        <header>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">لوحة المعلومات</h1>
          <p className="text-gray-500 dark:text-gray-400">متابعة تقدمك التعليمي ونتائج الاختبارات</p>
        </header>
        <LoadingSkeleton type="dashboard" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 relative animate-fade-in">
      {selectedCourse && (
        <CourseRegistrationModal 
          course={selectedCourse} 
          onClose={() => setSelectedCourse(null)} 
          onRegister={() => {
            setSelectedCourse(null);
            fetchData();
          }} 
        />
      )}
      <header>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">لوحة المعلومات</h1>
        <p className="text-gray-500 dark:text-gray-400">متابعة تقدمك التعليمي ونتائج الاختبارات</p>
      </header>

      {/* Enrolled Courses Section */}
      <section>
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
          <PlayCircle className="text-primary-600 dark:text-primary-400" />
          دوراتي الحالية
        </h2>
        {enrolledCourses.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {enrolledCourses.map(course => {
              const percent = getCompletionPercentage(course);
              return (
                <div key={course.id} className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden flex flex-col hover:border-primary-500/30 transition">
                  <div className="h-32 bg-gray-200 dark:bg-slate-800 relative">
                    <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover opacity-90 hover:opacity-100 transition" />
                    {!course.isPublished && (
                      <div className="absolute top-2 left-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded shadow">قيد التعديل</div>
                    )}
                  </div>
                  <div className="p-5 flex-1 flex flex-col">
                    <span className="text-xs font-semibold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 px-2 py-1 rounded w-fit mb-2">
                      {CATEGORY_LABELS[course.category]}
                    </span>
                    <h3 className="font-bold text-lg mb-2 text-gray-900 dark:text-white">{course.title}</h3>

                    {/* Progress Bar */}
                    <div className="mt-auto pt-4">
                      <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mb-1">
                        <span>التقدم</span>
                        <span>{percent}%</span>
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-primary-500 to-secondary-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${percent}%` }}
                        ></div>
                      </div>
                      <Link
                        to={`/course/${course.id}`}
                        className="mt-4 block w-full text-center bg-primary-600 hover:bg-primary-700 text-white py-2 rounded-lg transition"
                      >
                        {percent === 100 ? 'عرض الإحصائيات' : percent > 0 ? 'استئناف الدراسة' : 'ابدأ الدورة'}
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 p-8 rounded-xl border border-dashed border-gray-300 dark:border-slate-700 text-center">
            <p className="text-gray-500 dark:text-gray-400 mb-4">لست مسجلاً في أي دورة حالياً</p>
            <button className="text-primary-600 dark:text-primary-400 font-semibold hover:underline">استعراض الدورات المتاحة</button>
          </div>
        )}
      </section>

      {/* Available Exams Section */}
      <section>
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
          <Clock className="text-primary-600 dark:text-primary-400" />
          الاختبارات المتاحة
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {exams.map(exam => (
            <div key={exam.id} className="bg-white dark:bg-slate-900 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 hover:border-primary-500/30 transition">
              <h3 className="font-bold text-lg mb-2 text-gray-900 dark:text-white">{exam.title}</h3>
              <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
                <span>⏱ {exam.duration} دقيقة</span>
                <span>📝 {getExamQuestionCount(exam)} سؤال</span>
              </div>
              <Link
                to={`/exam/${exam.id}`}
                className="block w-full text-center border border-primary-600 text-primary-600 dark:text-primary-400 dark:border-primary-400 py-2 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 transition"
              >
                بدء الاختبار
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Results History */}
      {examResults.length > 0 && (
        <section>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <Trophy className="text-yellow-500" />
            سجل النتائج
          </h2>
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800">
              <thead className="bg-gray-50 dark:bg-slate-800">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">الاختبار</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">النتيجة</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">التاريخ</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-800">
                {examResults.map(res => {
                  const exam = backend.getExam(res.examId);
                  const percentage = Math.round((res.score / res.totalQuestions) * 100);
                  return (
                    <tr key={res.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{exam?.title || 'اختبار محذوف'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${percentage >= 80 ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : percentage >= 50 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
                          {percentage}%
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{new Date(res.completedAt).toLocaleDateString('ar-SA')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Available Courses (Not Enrolled) - FILTERED TO PUBLISHED ONLY */}
      <section>
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">جميع الدورات</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.filter(c => !enrolledCourses.find(ec => ec.id === c.id) && c.isPublished).map(course => (
            <div key={course.id} className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 p-5 opacity-90 hover:opacity-100 transition flex flex-col justify-between">
              <div>
                 <h3 className="font-bold text-gray-900 dark:text-white">{course.title}</h3>
                 <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 mb-4 line-clamp-2">{course.description}</p>
              </div>
              <button
                onClick={() => setSelectedCourse(course)}
                className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-2 rounded-xl transition shadow-md"
              >
                التفاصيل والتسجيل
              </button>
            </div>
          ))}
          {courses.filter(c => !enrolledCourses.find(ec => ec.id === c.id) && c.isPublished).length === 0 && (
            <div className="col-span-full py-10 text-center text-gray-400 border border-dashed rounded-xl dark:border-slate-800">
              لا توجد دورات جديدة متاحة حالياً.
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default DashboardPage;
