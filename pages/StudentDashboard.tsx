
import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../App';
import { backend } from '../services/mockBackend';
import { Course, StudentProgress, ExamResult, CertificateTemplate } from '../types';
import { Link } from 'react-router-dom';
import { PlayCircle, Trophy, Target, BookOpen, Download, X, FileText, Image as ImageIcon } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import toast from 'react-hot-toast';
import { LoadingSkeleton } from '../components/LoadingSkeleton';

const StudentDashboard = ({ initialTab = 'home' }: { initialTab?: string }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]);
  const [progressData, setProgressData] = useState<Record<string, StudentProgress>>({});
  const [examResults, setExamResults] = useState<ExamResult[]>([]);
  const [loading, setLoading] = useState(true);

  // Certificate Generation State
  const [isGenerating, setIsGenerating] = useState(false);
  const certRef = useRef<HTMLDivElement>(null);
  const [activeCert, setActiveCert] = useState<{ template: CertificateTemplate, result: ExamResult, examTitle: string } | null>(null);
  const [showFormatModal, setShowFormatModal] = useState(false);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (!user) return;
    const allCourses = backend.getCourses(undefined, true);
    const userEnrolled = allCourses.filter(c => (user.enrolledCourses || []).includes(c.id));
    setEnrolledCourses(userEnrolled);

    const progressMap: Record<string, StudentProgress> = {};
    userEnrolled.forEach(c => {
      progressMap[c.id] = backend.getProgress(user.id, c.id);
    });
    setProgressData(progressMap);
    setExamResults(backend.getResults(user.id).reverse()); // Newest first
    setLoading(false);
  }, [user]);

  const getCompletionPercentage = (course: Course) => {
    const p = progressData[course.id];
    if (!p) return 0;
    let totalItems = 0;
    course.modules.forEach(m => totalItems += m.content.length);
    if (totalItems === 0) return 0;
    return Math.round((p.completedItems.length / totalItems) * 100);
  };

  const calculateAverageScore = () => {
    if (examResults.length === 0) return 0;
    const total = examResults.reduce((acc, res) => acc + (res.score / res.totalQuestions), 0);
    return Math.round((total / examResults.length) * 100);
  };

  const prepareCertificate = (result: ExamResult) => {
    const exam = backend.getExam(result.examId);
    if (!exam) return;

    // Check if passed
    const percentage = Math.round((result.score / result.totalQuestions) * 100);
    if (percentage < exam.passingScore) {
      toast.error('عذراً، لا يمكن إصدار شهادة لاختبار لم يتم اجتيازه.');
      return;
    }

    const templates = backend.getCertificateTemplates();
    const t = templates.find(temp => temp.id === exam.certificateTemplateId) || templates.find(temp => temp.isDefault) || templates[0];

    // Set data for renderer and open modal
    setActiveCert({ template: t, result, examTitle: exam.title });
    setShowFormatModal(true);
  };

  const handleDownload = async (format: 'png' | 'jpeg' | 'pdf') => {
    if (!certRef.current || !activeCert) return;
    setIsGenerating(true);

    try {
      // 1. Generate High Quality Canvas
      const canvas = await html2canvas(certRef.current, {
        scale: 3, // Higher scale for better quality
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      const filename = `Certificate_${user?.fullName}_${activeCert.examTitle}`.replace(/\s+/g, '_');

      if (format === 'pdf') {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('l', 'mm', 'a4'); // Landscape, A4
        const width = pdf.internal.pageSize.getWidth();
        const height = pdf.internal.pageSize.getHeight();
        pdf.addImage(imgData, 'PNG', 0, 0, width, height);
        pdf.save(`${filename}.pdf`);
      } else {
        const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
        const image = canvas.toDataURL(mimeType, 0.95);
        const link = document.createElement("a");
        link.href = image;
        link.download = `${filename}.${format}`;
        link.click();
      }

      toast.success('تم تحميل الشهادة بنجاح');
      setShowFormatModal(false);
      setActiveCert(null); // Clear active cert to unmount hidden div
    } catch (e) {
      console.error(e);
      toast.error('فشل إنشاء الشهادة');
    } finally {
      setIsGenerating(false);
    }
  };

  const getCompletionDetails = (course: Course) => {
    const p = progressData[course.id];
    let totalItems = 0;
    course.modules.forEach(m => totalItems += m.content.length);
    const completed = p ? p.completedItems.length : 0;
    const percentage = totalItems === 0 ? 0 : Math.round((completed / totalItems) * 100);
    return { completed, total: totalItems, percentage };
  };

  const latestCourse = enrolledCourses.length > 0 ? enrolledCourses.slice().sort((a, b) => {
    const pA = progressData[a.id]?.lastAccessed || '0';
    const pB = progressData[b.id]?.lastAccessed || '0';
    return new Date(pB).getTime() - new Date(pA).getTime();
  })[0] : null;

  if (loading) {
    return <LoadingSkeleton type="dashboard" />;
  }

  return (
    <div className="space-y-8 animate-fade-in relative">
      {/* Hidden Certificate Renderer */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        {activeCert && (
          <div
            ref={certRef}
            style={{
              width: '800px',
              height: '600px',
              position: 'relative',
              backgroundColor: 'white',
              backgroundImage: activeCert.template.backgroundImage ? `url(${activeCert.template.backgroundImage})` : 'none',
              backgroundSize: 'cover'
            }}
          >
            {!activeCert.template.backgroundImage && (
              <div className="absolute inset-0 bg-white opacity-95"></div>
            )}

            {activeCert.template.elements.map((el, i) => {
              const percentage = Math.round((activeCert.result.score / activeCert.result.totalQuestions) * 100);
              return (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    left: `${el.x}%`,
                    top: `${el.y}%`,
                    fontSize: `${el.fontSize}px`,
                    color: el.color,
                    fontWeight: el.fontWeight,
                    textAlign: el.align,
                    fontFamily: el.fontFamily,
                    transform: 'translate(-50%, -50%)',
                    whiteSpace: 'nowrap',
                    zIndex: 10
                  }}
                >
                  {el.type === 'studentName' ? user?.fullName :
                    el.type === 'score' ? `${percentage}%` :
                      el.type === 'examTitle' ? activeCert.examTitle :
                        el.type === 'date' ? new Date(activeCert.result.completedAt).toLocaleDateString('ar-SA') :
                          el.text}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Format Selection Modal */}
      {showFormatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-sm border border-gray-200 dark:border-slate-700 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold dark:text-white">تحميل الشهادة</h3>
              <button onClick={() => { setShowFormatModal(false); setActiveCert(null); }} className="text-gray-500 hover:text-gray-700 dark:text-gray-400">
                <X size={24} />
              </button>
            </div>

            <p className="text-gray-600 dark:text-gray-300 mb-6 text-sm">اختر الصيغة المناسبة لتحميل شهادتك:</p>

            <div className="space-y-3">
              <button
                onClick={() => handleDownload('pdf')}
                disabled={isGenerating}
                className="w-full flex items-center p-4 rounded-xl border-2 border-transparent bg-red-50 hover:bg-red-100 hover:border-red-200 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-700 dark:text-red-400 transition group"
              >
                <div className="bg-white dark:bg-slate-800 p-2 rounded-lg shadow-sm ml-4 group-hover:scale-110 transition">
                  <FileText size={24} className="text-red-500" />
                </div>
                <div className="text-right">
                  <div className="font-bold">ملف PDF</div>
                  <div className="text-xs opacity-70">مثالي للطباعة والمشاركة الرسمية</div>
                </div>
              </button>

              <button
                onClick={() => handleDownload('png')}
                disabled={isGenerating}
                className="w-full flex items-center p-4 rounded-xl border-2 border-transparent bg-blue-50 hover:bg-blue-100 hover:border-blue-200 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-400 transition group"
              >
                <div className="bg-white dark:bg-slate-800 p-2 rounded-lg shadow-sm ml-4 group-hover:scale-110 transition">
                  <ImageIcon size={24} className="text-blue-500" />
                </div>
                <div className="text-right">
                  <div className="font-bold">صورة PNG</div>
                  <div className="text-xs opacity-70">جودة عالية بخلفية شفافة</div>
                </div>
              </button>

              <button
                onClick={() => handleDownload('jpeg')}
                disabled={isGenerating}
                className="w-full flex items-center p-4 rounded-xl border-2 border-transparent bg-green-50 hover:bg-green-100 hover:border-green-200 dark:bg-green-900/20 dark:hover:bg-green-900/40 text-green-700 dark:text-green-400 transition group"
              >
                <div className="bg-white dark:bg-slate-800 p-2 rounded-lg shadow-sm ml-4 group-hover:scale-110 transition">
                  <ImageIcon size={24} className="text-green-500" />
                </div>
                <div className="text-right">
                  <div className="font-bold">صورة JPEG</div>
                  <div className="text-xs opacity-70">حجم أصغر للمشاركة السريعة</div>
                </div>
              </button>
            </div>

            {isGenerating && (
              <div className="mt-4 text-center text-sm text-gray-500 animate-pulse">جاري تحضير الملف...</div>
            )}
          </div>
        </div>
      )}

      {/* Profile Header */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-slate-800 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-64 h-64 bg-primary-500/5 dark:bg-primary-500/10 rounded-full -ml-32 -mt-32 blur-3xl"></div>
        <div className="w-24 h-24 bg-primary-100 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center text-3xl font-bold text-primary-600 dark:text-primary-400 rotate-3 shadow-inner">
          {user?.fullName.charAt(0)}
        </div>
        <div className="flex-1 text-center md:text-right relative z-10">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{user?.fullName}</h1>
          <div className="text-gray-500 dark:text-gray-400 mt-2 flex flex-wrap gap-4 justify-center md:justify-start text-sm">
            <span className="bg-gray-100 dark:bg-slate-800 px-3 py-1 rounded-full">{user?.nationalID}</span>
            <span className="bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 px-3 py-1 rounded-full font-bold">
              {user?.gradeLevel || 'ثانوي'}
            </span>
            {user?.classSection && <span className="bg-secondary-50 dark:bg-secondary-900/20 text-secondary-700 dark:text-secondary-400 px-3 py-1 rounded-full">شعبة {user.classSection}</span>}
          </div>
        </div>
        <div className="flex gap-8 relative z-10">
          <div className="text-center">
            <div className="text-4xl font-black text-primary-600 dark:text-primary-400">{calculateAverageScore()}%</div>
            <div className="text-[10px] text-gray-400 dark:text-gray-500 font-black uppercase mt-1 tracking-widest">المستوى العام</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-black text-secondary-500">{examResults.length}</div>
            <div className="text-[10px] text-gray-400 dark:text-gray-500 font-black uppercase mt-1 tracking-widest">اختبارات منجزة</div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Column: Content based on active Tab */}
        <div className="lg:col-span-2 space-y-6">

          {/* Tab Switcher for Mobile/Direct Access */}
          <div className="flex gap-4 border-b border-gray-200 dark:border-slate-800 mb-4">
            <button
              onClick={() => setActiveTab('home')}
              className={`pb-2 px-4 font-bold ${activeTab === 'home' ? 'border-b-2 border-primary-600 text-primary-600 dark:text-primary-400' : 'text-gray-500 dark:text-gray-400'}`}
            >
              نظرة عامة
            </button>
            <button
              onClick={() => setActiveTab('courses')}
              className={`pb-2 px-4 font-bold ${activeTab === 'courses' ? 'border-b-2 border-primary-600 text-primary-600 dark:text-primary-400' : 'text-gray-500 dark:text-gray-400'}`}
            >
              دوراتي ({enrolledCourses.length})
            </button>
          </div>

          {activeTab === 'home' && (
            <div className="space-y-6 animate-fade-in">
              {enrolledCourses.length > 0 ? (
                <>
                  <div 
                    className="rounded-3xl p-6 md:p-8 text-white shadow-xl shadow-primary-500/20 relative overflow-hidden"
                    style={{
                      backgroundImage: latestCourse?.image ? `url(${latestCourse.image})` : 'none',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-primary-900 via-primary-800/90 to-primary-600/60 dark:from-slate-950 dark:via-slate-900/95 dark:to-primary-900/70 z-0"></div>
                    <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl z-0"></div>
                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                      <div>
                        <div className="text-primary-100 font-bold mb-2 flex items-center gap-2">
                          <Target size={18} /> أكمل من حيث توقفت
                        </div>
                        <h3 className="text-2xl md:text-3xl font-black mb-2">
                          {latestCourse?.title || 'استمر في التعلم!'}
                        </h3>
                        <p className="text-primary-100 text-sm">استمر في التقدم نحو هدفك، أنت تفعلها بشكل رائع.</p>
                      </div>
                      {latestCourse && (
                        <Link
                          to={`/course/${latestCourse.id}`}
                          className="bg-white text-primary-600 hover:bg-gray-50 font-bold py-3 px-8 rounded-xl transition shadow-lg shrink-0 flex items-center gap-2"
                        >
                          <PlayCircle size={20} />
                          مواصلة التعلم
                        </Link>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition">
                      <div className="w-12 h-12 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 rounded-xl flex items-center justify-center mb-4">
                        <BookOpen size={24} />
                      </div>
                      <div className="text-3xl font-black text-gray-900 dark:text-white mb-1">{enrolledCourses.length}</div>
                      <div className="text-sm font-bold text-gray-500 dark:text-gray-400">دورات مسجلة</div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition">
                      <div className="w-12 h-12 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-xl flex items-center justify-center mb-4">
                        <Trophy size={24} />
                      </div>
                      <div className="text-3xl font-black text-gray-900 dark:text-white mb-1">
                        {enrolledCourses.filter(c => getCompletionPercentage(c) === 100).length}
                      </div>
                      <div className="text-sm font-bold text-gray-500 dark:text-gray-400">دورات مكتملة</div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-gray-200 dark:border-slate-800">
                  <div className="w-20 h-20 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                    <Target size={32} />
                  </div>
                  <p className="text-gray-500 dark:text-gray-400">يبدو أنك لم تشترك في أي دورة بعد.</p>
                  <Link to="/tracks" className="text-primary-600 dark:text-primary-400 font-bold hover:underline mt-4 inline-block">تصفح مساراتنا التعليمية وابدأ الآن ←</Link>
                </div>
              )}
            </div>
          )}

          {activeTab === 'courses' && (
            <div className="animate-fade-in">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-3">
                <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg text-primary-600">
                  <BookOpen size={20} />
                </div>
                جميع دوراتي
              </h2>

              {enrolledCourses.length > 0 ? (
                <div className="grid md:grid-cols-2 gap-6">
                  {enrolledCourses.map(course => {
                    const { completed, total, percentage } = getCompletionDetails(course);
                    return (
                      <div key={course.id} className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden hover:shadow-xl hover:border-primary-500/30 dark:hover:border-primary-500/20 transition-all group flex flex-col relative">
                        {course.image && (
                           <div className="h-32 w-full overflow-hidden relative">
                             <img src={course.image} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                             <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 to-transparent"></div>
                           </div>
                        )}
                        <div className="p-6 flex-1 flex flex-col relative">
                          <h3 className={`font-bold text-lg mb-4 line-clamp-2 min-h-[56px] leading-tight ${course.image ? '-mt-10 text-white drop-shadow-md z-10' : 'text-gray-900 dark:text-white'}`}>
                            {course.title}
                          </h3>
                          <div className="mt-auto">
                            <div className="flex justify-between items-end text-xs text-gray-500 dark:text-gray-400 mb-2 font-bold">
                              <span>
                                مكتمل <span className="text-gray-700 dark:text-gray-200">{completed}</span> من <span className="text-gray-700 dark:text-gray-200">{total}</span> درس
                              </span>
                              <span className="text-primary-600 dark:text-primary-400 text-sm">{percentage}%</span>
                            </div>
                            <div className="w-full bg-gray-100 dark:bg-slate-800 rounded-full h-2 mb-6 overflow-hidden">
                              <div
                                className="bg-gradient-to-r from-primary-600 to-secondary-500 h-2 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                            <Link
                              to={`/course/${course.id}`}
                              className="w-full bg-gray-50 dark:bg-slate-800 dark:hover:bg-primary-600 hover:bg-primary-600 hover:text-white text-gray-900 dark:text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:gap-4 transition-all"
                            >
                              <PlayCircle size={18} />
                              دخول الدورة
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-20 bg-gray-50 dark:bg-slate-900 rounded-3xl border border-dashed border-gray-200 dark:border-slate-800">
                   <p className="text-gray-500 dark:text-gray-400 mb-2">لا توجد دورات مسجلة.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Results & Certificates */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg text-yellow-600">
              <Trophy size={20} />
            </div>
            سجل الاختبارات والشهادات
          </h2>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 overflow-hidden divide-y dark:divide-slate-800 shadow-sm">
            {examResults.length > 0 ? (
              examResults.map(res => {
                const exam = backend.getExam(res.examId);
                const pct = Math.round((res.score / res.totalQuestions) * 100);
                const isPassed = exam && pct >= exam.passingScore;

                return (
                  <div key={res.id} className="p-4 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="font-bold text-sm text-gray-900 dark:text-white truncate">{exam?.title || 'اختبار مجهول'}</div>
                        <div className="text-[10px] text-gray-400 mt-1">{new Date(res.completedAt).toLocaleDateString('ar-SA')}</div>
                      </div>
                      <div className={`px-3 py-1 rounded-lg text-xs font-black ${pct >= 60 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'}`}>
                        {pct}%
                      </div>
                    </div>

                    {isPassed && (
                      <button
                        onClick={() => prepareCertificate(res)}
                        className="w-full py-2 bg-gradient-to-r from-amber-100 to-yellow-100 dark:from-amber-900/20 dark:to-yellow-900/20 text-amber-800 dark:text-amber-400 text-xs font-bold rounded-lg flex items-center justify-center gap-2 hover:brightness-95 transition"
                      >
                        <Download size={14} />
                        تحميل الشهادة
                      </button>
                    )}
                  </div>
                )
              })
            ) : (
              <div className="p-10 text-center flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-gray-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-4 border border-gray-100 dark:border-slate-700">
                  <FileText size={32} className="text-gray-300 dark:text-gray-600" />
                </div>
                <h4 className="text-gray-700 dark:text-gray-300 font-bold mb-1">لا يوجد نتائج مسجلة</h4>
                <p className="text-gray-400 text-sm mb-4">انطلق وجرب أداء أحد الاختبارات التجريبية لقياس مستواك.</p>
                <Link to="/exams" className="bg-primary-50 hover:bg-primary-100 dark:bg-primary-900/20 dark:hover:bg-primary-900/40 text-primary-600 dark:text-primary-400 px-6 py-2 rounded-xl text-sm font-bold transition">
                  الذهاب للاختبارات
                </Link>
              </div>
            )}
          </div>
          <Link to="/exams" className="block text-center text-sm font-bold text-primary-600 dark:text-primary-400 hover:underline">
            اختبارات تجريبية جديدة
          </Link>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
