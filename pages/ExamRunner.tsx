
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { backend } from '../services/mockBackend';
import { Exam, Question, ExamResult, CertificateTemplate } from '../types';
import { useAuth } from '../App';
import { Flag, Clock, ChevronRight, ChevronLeft, User as UserIcon, AlertCircle, Download, X, FileText, Image as ImageIcon, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const ExamRunner = () => {
  const { examId } = useParams<{ examId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [showGuestModal, setShowGuestModal] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [examStarted, setExamStarted] = useState(false);

  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [timeLeft, setTimeLeft] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  // Certificate Ref & State
  const certificateRef = useRef<HTMLDivElement>(null);
  const [isGeneratingCert, setIsGeneratingCert] = useState(false);
  const [certTemplate, setCertTemplate] = useState<CertificateTemplate | null>(null);
  const [showFormatModal, setShowFormatModal] = useState(false);

  const getStorageKey = useCallback(() => {
    return `exam_progress_${examId}_${user ? user.id : 'guest'}`;
  }, [examId, user]);

  useEffect(() => {
    if (!examId) return;
    const e = backend.getExam(examId);
    if (!e) {
      toast.error('الاختبار غير موجود');
      navigate('/exams');
      return;
    }
    const q = backend.getQuestionsForExam(examId);
    setExam(e);
    setQuestions(q);
    setIsLoading(false);

    // Load default template or specific one if assigned
    const templates = backend.getCertificateTemplates();
    const t = templates.find(temp => temp.id === e.certificateTemplateId) || templates.find(temp => temp.isDefault) || templates[0];
    setCertTemplate(t);

    const saved = localStorage.getItem(getStorageKey());
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setAnswers(data.answers || {});
        setFlagged(new Set(data.flagged || []));

        const elapsedSec = Math.floor((Date.now() - data.startTime) / 1000);
        const remaining = (e.duration * 60) - elapsedSec;

        if (remaining > 0) {
          setTimeLeft(remaining);
          setExamStarted(true);
          toast('تم استعادة جلسة الاختبار السابقة', { icon: '🔄' });
        } else {
          setTimeLeft(0);
          setIsFinished(true);
        }
      } catch (err) {
        console.error("Failed to restore exam", err);
      }
    } else {
      if (user) {
        startExam(e.duration);
      } else {
        setShowGuestModal(true);
      }
    }
  }, [examId, navigate, user, getStorageKey]);

  useEffect(() => {
    if (!examStarted || isFinished) return;

    const key = getStorageKey();
    const existing = localStorage.getItem(key);
    let startTime = Date.now();

    if (existing) {
      try {
        const parsed = JSON.parse(existing);
        if (parsed.startTime) startTime = parsed.startTime;
      } catch (e) { }
    }

    const state = {
      startTime,
      answers,
      flagged: Array.from(flagged)
    };

    localStorage.setItem(key, JSON.stringify(state));
  }, [answers, flagged, examStarted, isFinished, getStorageKey]);

  const startExam = (duration: number) => {
    setExamStarted(true);
    const key = getStorageKey();
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, JSON.stringify({
        startTime: Date.now(),
        answers: {},
        flagged: []
      }));
    }
    setTimeLeft(duration * 60);
    toast.success('بدأ الاختبار! بالتوفيق');

    // ALERT FOR GUESTS
    if (!user) {
      toast((t) => (
        <span className="flex items-center gap-2">
          <Save size={18} className="text-blue-500" />
          <b>تنبيه زائر:</b> سيتم حفظ النتيجة محلياً على هذا الجهاز فقط.
        </span>
      ), { duration: 6000, style: { border: '1px solid #3b82f6', background: '#eff6ff', color: '#1e3a8a' } });
    }
  };

  const handleGuestStart = () => {
    if (!guestName.trim()) return;
    setShowGuestModal(false);
    if (exam) startExam(exam.duration);
  };

  useEffect(() => {
    if (!examStarted || isFinished || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, isFinished, examStarted]);

  useEffect(() => {
    if (!examStarted) return;
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    document.addEventListener('contextmenu', handleContextMenu);
    return () => document.removeEventListener('contextmenu', handleContextMenu);
  }, [examStarted]);

  const handleSelectOption = (qId: string, optIndex: number) => {
    setAnswers(prev => ({ ...prev, [qId]: optIndex }));
  };

  const toggleFlag = (qId: string) => {
    const newSet = new Set(flagged);
    if (newSet.has(qId)) newSet.delete(qId);
    else newSet.add(qId);
    setFlagged(newSet);
    toast.success(newSet.has(qId) ? 'تم وضع علامة للمراجعة' : 'تم إزالة العلامة');
  };

  const handleSubmit = () => {
    if (!exam) return;
    localStorage.removeItem(getStorageKey());
    setIsFinished(true);

    let score = 0;
    questions.forEach(q => {
      if (answers[q.id] === q.correctOption) score++;
    });

    const percentage = Math.round((score / questions.length) * 100);
    const isPassed = percentage >= exam.passingScore;

    const result: ExamResult = {
      id: `res_${Date.now()}`,
      examId: exam.id,
      userId: user ? user.id : null,
      guestName: !user ? guestName : undefined,
      score, // This is actually the raw score (number of correct answers)
      correctAnswers: score,
      totalQuestions: questions.length,
      isPassed,
      answers: answers,
      completedAt: new Date().toISOString()
    };

    backend.submitExam(result);
    toast.success('تم تسليم الاختبار بنجاح!');
  };

  const handleDownloadCertificate = async (format: 'png' | 'jpeg' | 'pdf') => {
    if (!certificateRef.current) return;
    setIsGeneratingCert(true);
    try {
      // 1. Generate High Quality Canvas
      const canvas = await html2canvas(certificateRef.current, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      const name = user?.fullName || guestName;
      const filename = `Certificate_${name}`.replace(/\s+/g, '_');

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

      toast.success('تم تحميل الشهادة بنجاح!');
      setShowFormatModal(false);
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ أثناء تحميل الشهادة. حاول مرة أخرى.');
    } finally {
      setIsGeneratingCert(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (isLoading) return <div className="text-center p-10 flex items-center justify-center min-h-[50vh] dark:text-white">جاري تحميل الاختبار...</div>;

  if (!exam) return <div className="text-center p-10 dark:text-white">عفواً، الاختبار غير موجود.</div>;

  if (questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center dark:text-white">
        <AlertCircle size={48} className="text-gray-300 dark:text-gray-600 mb-4" />
        <h2 className="text-xl font-bold text-gray-700 dark:text-gray-300">هذا الاختبار لا يحتوي على أسئلة بعد</h2>
        <button onClick={() => navigate(-1)} className="mt-4 text-primary-600 hover:underline">عودة</button>
      </div>
    );
  }

  if (showGuestModal) {
    return (
      <div className="fixed inset-0 bg-gray-900 bg-opacity-90 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-8 text-center">
          <div className="w-20 h-20 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <UserIcon size={40} className="text-primary-600 dark:text-primary-400" />
          </div>
          <h2 className="text-2xl font-bold mb-2 dark:text-white">مرحباً بك في اختبار {exam.title}</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">لإصدار شهادة النتيجة، يرجى كتابة اسمك الثلاثي</p>
          <input
            type="text"
            className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-white rounded-lg px-4 py-3 mb-6 focus:ring-2 focus:ring-primary-500 outline-none"
            placeholder="الاسم الثلاثي هنا..."
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
          />
          <button
            onClick={handleGuestStart}
            disabled={!guestName.trim()}
            className="w-full bg-primary-600 text-white py-3 rounded-lg font-bold hover:bg-primary-700 disabled:opacity-50"
          >
            بدء الاختبار فوراً
          </button>
        </div>
      </div>
    );
  }

  if (isFinished) {
    const score = questions.reduce((acc, q) => acc + (answers[q.id] === q.correctOption ? 1 : 0), 0);
    const percentage = Math.round((score / questions.length) * 100);
    const passed = percentage >= exam.passingScore;
    const studentName = user?.fullName || guestName;

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        {/* Format Selection Modal */}
        {showFormatModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-sm border border-gray-200 dark:border-slate-700 shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold dark:text-white">تحميل الشهادة</h3>
                <button onClick={() => setShowFormatModal(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400">
                  <X size={24} />
                </button>
              </div>

              <p className="text-gray-600 dark:text-gray-300 mb-6 text-sm">اختر الصيغة المناسبة لتحميل شهادتك:</p>

              <div className="space-y-3">
                <button
                  onClick={() => handleDownloadCertificate('pdf')}
                  disabled={isGeneratingCert}
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
                  onClick={() => handleDownloadCertificate('png')}
                  disabled={isGeneratingCert}
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
                  onClick={() => handleDownloadCertificate('jpeg')}
                  disabled={isGeneratingCert}
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

              {isGeneratingCert && (
                <div className="mt-4 text-center text-sm text-gray-500 animate-pulse">جاري تحضير الملف...</div>
              )}
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg max-w-2xl w-full p-8 text-center border-t-8 border-primary-600 dark:border-primary-500">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">نتيجة الاختبار</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-8">
            المختبر: <span className="font-bold text-gray-900 dark:text-white">{studentName}</span>
          </p>

          {/* Guest Alert in Result Screen too */}
          {!user && (
            <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300 px-4 py-3 rounded-xl text-sm flex items-center justify-center gap-2">
              <Save size={16} />
              <span>تم حفظ النتيجة على هذا الجهاز فقط.</span>
            </div>
          )}

          <div className="py-8 border-y border-gray-100 dark:border-slate-800 mb-8">
            <div className="text-6xl font-black text-primary-600 dark:text-primary-400 mb-2">{percentage}%</div>
            <div className={`text-lg font-bold ${passed ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {passed ? 'اجتزت الاختبار بنجاح 🎉' : 'حاول مرة أخرى 😔'}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded-xl">
              <div className="text-sm text-gray-500 dark:text-gray-400">عدد الأسئلة</div>
              <div className="text-xl font-bold dark:text-white">{questions.length}</div>
            </div>
            <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded-xl">
              <div className="text-sm text-gray-500 dark:text-gray-400">الإجابات الصحيحة</div>
              <div className="text-xl font-bold dark:text-white">{score}</div>
            </div>
          </div>

          {/* Certificate Download Button */}
          {passed && certTemplate && (
            <div className="mb-8">
              <button
                onClick={() => setShowFormatModal(true)}
                disabled={isGeneratingCert}
                className="flex items-center justify-center gap-2 mx-auto bg-gradient-to-r from-yellow-500 to-amber-600 text-white px-6 py-3 rounded-xl font-bold hover:shadow-lg hover:scale-105 transition"
              >
                <Download size={20} />
                تحميل شهادة التخرج 🎓
              </button>

              {/* Dynamic Certificate Template Rendered Off-Screen */}
              <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
                <div
                  ref={certificateRef}
                  style={{
                    width: '800px',
                    height: '600px',
                    position: 'relative',
                    backgroundColor: 'white',
                    backgroundImage: certTemplate.backgroundImage ? `url(${certTemplate.backgroundImage})` : 'none',
                    backgroundSize: 'cover'
                  }}
                >
                  {!certTemplate.backgroundImage && (
                    <div className="absolute inset-0 bg-white opacity-95"></div>
                  )}

                  {certTemplate.elements.map((el, i) => (
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
                      {el.type === 'studentName' ? studentName :
                        el.type === 'score' ? `${percentage}%` :
                          el.type === 'examTitle' ? exam.title :
                            el.type === 'date' ? new Date().toLocaleDateString('ar-SA') :
                              el.text}
                    </div>
                  ))}

                  {/* Hardcoded watermark if not covered by bg */}
                  {!certTemplate.backgroundImage && (
                    <div className="absolute bottom-4 left-4 text-xs text-gray-300">أكاديمية المنارة التعليمية - 2025</div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-4">
            <button onClick={() => navigate(user ? '/dashboard' : '/exams')} className="flex-1 px-6 py-3 border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-slate-800 transition">
              خروج
            </button>
            <button onClick={() => window.location.reload()} className="flex-1 px-6 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition">
              إعادة الاختبار
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentQIndex];
  if (!currentQ) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex flex-col no-select">
      <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 px-4 md:px-6 py-4 flex justify-between items-center sticky top-0 z-30 shadow-sm">
        <div className="flex flex-col">
          <h1 className="font-bold text-gray-800 dark:text-white text-sm md:text-base line-clamp-1">{exam.title}</h1>
          <div className="text-xs text-gray-500 dark:text-gray-400">سؤال {currentQIndex + 1} من {questions.length}</div>
        </div>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono text-lg font-bold ${timeLeft < 60 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-gray-100 dark:bg-slate-800 text-primary-700 dark:text-primary-400'}`}>
            <Clock size={18} />
            {formatTime(timeLeft)}
          </div>
          <button
            onClick={handleSubmit}
            className="hidden md:block px-6 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 font-bold text-sm"
          >
            إنهاء
          </button>
        </div>
      </header>

      <div className="flex-1 max-w-6xl mx-auto w-full p-4 md:p-6 flex gap-6">
        <main className="flex-1 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-800 p-6 md:p-8 flex flex-col">
          {/* Guest Alert inside Exam View */}
          {!user && (
            <div className="mb-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300 px-3 py-2 rounded-lg text-xs flex items-center gap-2 md:hidden">
              <Save size={14} />
              <span>وضع زائر: الحفظ محلي فقط</span>
            </div>
          )}

          <div className="flex justify-between items-start mb-6">
            <span className="bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 px-3 py-1 rounded-full text-xs font-bold">
              {currentQ.subject}
            </span>
            <button
              onClick={() => toggleFlag(currentQ.id)}
              className={`flex items-center gap-1 text-sm ${flagged.has(currentQ.id) ? 'text-yellow-500 font-bold' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
            >
              <Flag size={18} fill={flagged.has(currentQ.id) ? "currentColor" : "none"} />
              <span className="hidden md:inline">تعليم للمراجعة</span>
            </button>
          </div>

          <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white leading-relaxed mb-8">
            {currentQ.text}
          </h2>

          <div className="space-y-4 mb-8">
            {currentQ.options.map((opt, idx) => (
              <label
                key={idx}
                className={`flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition ${answers[currentQ.id] === idx
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-gray-100 dark:border-slate-800 hover:border-gray-200 dark:hover:border-slate-700'
                  }`}
              >
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${answers[currentQ.id] === idx ? 'border-primary-600' : 'border-gray-300 dark:border-gray-600'
                  }`}>
                  {answers[currentQ.id] === idx && <div className="w-3 h-3 bg-primary-600 rounded-full" />}
                </div>
                <input
                  type="radio"
                  name={`q-${currentQ.id}`}
                  className="hidden"
                  onChange={() => handleSelectOption(currentQ.id, idx)}
                  checked={answers[currentQ.id] === idx}
                />
                <span className="text-base md:text-lg text-gray-800 dark:text-gray-200">{opt}</span>
              </label>
            ))}
          </div>

          <div className="mt-auto flex justify-between pt-4 border-t border-gray-100 dark:border-slate-800">
            <button
              onClick={() => setCurrentQIndex(Math.max(0, currentQIndex - 1))}
              disabled={currentQIndex === 0}
              className="px-4 py-2 md:px-6 md:py-3 rounded-xl border border-gray-300 dark:border-slate-700 text-gray-600 dark:text-gray-300 disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-slate-800 flex items-center gap-2"
            >
              <ChevronRight size={20} /> <span className="hidden md:inline">السابق</span>
            </button>

            <button
              onClick={() => {
                if (currentQIndex === questions.length - 1) {
                  handleSubmit();
                } else {
                  setCurrentQIndex(currentQIndex + 1);
                }
              }}
              className={`px-4 py-2 md:px-6 md:py-3 rounded-xl text-white flex items-center gap-2 ${currentQIndex === questions.length - 1 ? 'bg-green-600 hover:bg-green-700' : 'bg-primary-600 hover:bg-primary-700'}`}
            >
              <span className="hidden md:inline">{currentQIndex === questions.length - 1 ? 'إنهاء الاختبار' : 'التالي'}</span>
              <span className="md:hidden">{currentQIndex === questions.length - 1 ? 'إنهاء' : 'التالي'}</span>
              <ChevronLeft size={20} />
            </button>
          </div>
        </main>

        <aside className="w-64 hidden lg:block">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-800 p-4 sticky top-24">
            <h3 className="font-bold text-gray-800 dark:text-white mb-4 text-center">خريطة الأسئلة</h3>
            <div className="grid grid-cols-4 gap-2">
              {questions.map((q, idx) => (
                <button
                  key={q.id}
                  onClick={() => setCurrentQIndex(idx)}
                  className={`aspect-square rounded-lg flex items-center justify-center font-bold text-sm transition relative ${currentQIndex === idx
                      ? 'ring-2 ring-offset-2 ring-primary-500 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 dark:text-white'
                      : answers[q.id] !== undefined
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-700'
                    }`}
                >
                  {idx + 1}
                  {flagged.has(q.id) && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 rounded-full border border-white dark:border-slate-900" />
                  )}
                </button>
              ))}
            </div>

            {!user && (
              <div className="mt-6 pt-4 border-t dark:border-slate-700 text-center">
                <div className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 p-2 rounded border border-blue-100 dark:border-blue-800">
                  أنت في وضع الزائر. سيتم حفظ تقدمك على هذا المتصفح فقط.
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default ExamRunner;
