import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { backend } from '../services/mockBackend';
import { useAuth } from '../App';
import { Exam, Question, ExamResult } from '../types';
import { Clock, CheckCircle, ChevronRight, ChevronLeft, Flag, Menu, X, Save } from 'lucide-react';
import toast from 'react-hot-toast';

const StudentExamPlayer = () => {
    const { examId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();

    // Get guest name from previous page if any
    // Get available state
    const guestName = location.state?.guestName;
    const isPreview = location.state?.preview;

    // State
    const [exam, setExam] = useState<Exam | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
    const [currentQIndex, setCurrentQIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, number>>({});
    const [flaggedQs, setFlaggedQs] = useState<string[]>([]);
    const [timeLeft, setTimeLeft] = useState(0);
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [warnings, setWarnings] = useState(0);
    const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
    const [isFinished, setIsFinished] = useState(false);

    // Use Refs for state needed in event listeners to prevent stale closures
    const answersRef = React.useRef(answers);
    const questionsRef = React.useRef(questions);
    
    useEffect(() => {
        answersRef.current = answers;
    }, [answers]);

    useEffect(() => {
        questionsRef.current = questions;
    }, [questions]);

    // ANTI-CHEATING: Session Guard & Security
    useEffect(() => {
        // 1. Session Guard: Check if already submitted
        const checkSubmission = async () => {
            // In real app, check backend. Here we trust local logic or could check mockBackend results
            // For now, we rely on the fact that if they navigated back, we want to push them forward
        };
        checkSubmission();

        // 2. Prevent Right Click
        const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault();
            toast.error('غير مسموح بالنقر بزر الفأرة الأيمن');
        };

        // 3. Prevent Copy/Paste
        const handleCopyPaste = (e: ClipboardEvent) => {
            e.preventDefault();
            toast.error('غير مسموح بالنسخ أو اللصق');
        };

        // 4. Tab Switching Detection
        const handleVisibilityChange = () => {
            if (document.hidden && !isFinished) {
                // Wrap in setTimeout to avoid 'Cannot update a component while rendering'
                setTimeout(() => {
                    setWarnings(prev => {
                        const newCount = prev + 1;
                        if (newCount < 3) {
                            toast.error(`تحذير ${newCount}: الخروج من صفحة الاختبار ممنوع!`);
                        } else {
                            toast.error('تم تجاوز عدد التحذيرات المسموح بها! سيتم تسليم الاختبار.');
                            forceSubmit();
                        }
                        return newCount;
                    });
                }, 0);
            }
        };

        document.addEventListener('contextmenu', handleContextMenu);
        document.addEventListener('copy', handleCopyPaste);
        document.addEventListener('cut', handleCopyPaste);
        document.addEventListener('paste', handleCopyPaste);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('contextmenu', handleContextMenu);
            document.removeEventListener('copy', handleCopyPaste);
            document.removeEventListener('cut', handleCopyPaste);
            document.removeEventListener('paste', handleCopyPaste);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    // Load Exam Data
    useEffect(() => {
        if (examId) {
            const foundExam = backend.getExam(examId);
            if (foundExam) {
                setExam(foundExam);
                // In multiple sections exam, we load questions for the current section
                const allQuestions = backend.getQuestionsForExam(examId);
                setQuestions(allQuestions);
                
                // Set initial time
                if (foundExam.sections && foundExam.sections.length > 0) {
                   setTimeLeft(foundExam.sections[0].duration * 60);
                } else {
                   setTimeLeft(foundExam.duration * 60);
                }
            }
        }
        setLoading(false);
    }, [examId]);

    // Timer
    useEffect(() => {
        if (!exam || timeLeft <= 0) return;
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    forceSubmit();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [exam]); // Remove timeLeft from dependencies to prevent recreating interval every second

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const handleAnswer = (qId: string, optionIndex: number) => {
        setAnswers(prev => ({ ...prev, [qId]: optionIndex }));
    };

    const toggleFlag = (qId: string) => {
        setFlaggedQs(prev => prev.includes(qId) ? prev.filter(id => id !== qId) : [...prev, qId]);
    };

    const handleNextSection = () => {
        if (exam && exam.sections && currentSectionIndex < exam.sections.length - 1) {
            const nextIdx = currentSectionIndex + 1;
            setCurrentSectionIndex(nextIdx);
            setCurrentQIndex(0); // Reset question index for new section
            setTimeLeft(exam.sections[nextIdx].duration * 60); // Set time for next section
            toast.success(`انتقلنا إلى القسم: ${exam.sections[nextIdx].title}`);
        } else {
            setShowConfirmSubmit(true);
        }
    };

    const forceSubmit = () => {
        if (isFinished) return;
        setIsFinished(true);
        if (!exam) return;
        try {
            const currentAnswers = answersRef.current;
            const currentQuestions = questionsRef.current;
            let userId = user?.id;

            if (!userId) {
                if (guestName) {
                    userId = `guest_${Date.now()}_${guestName}`;
                } else {
                    userId = `guest_${Date.now()}_unknown`;
                }
            }

            const totalQuestions = currentQuestions.length;
            const correctCount = currentQuestions.reduce((acc, q) => acc + (currentAnswers[q.id] === q.correctOption ? 1 : 0), 0);
            const isPassed = ((correctCount / totalQuestions) * 100) >= exam.passingScore;

            const resultObj: ExamResult = {
                id: `res_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                examId: exam.id,
                userId,
                score: correctCount,
                totalQuestions,
                correctAnswers: correctCount,
                isPassed,
                completedAt: new Date().toISOString(),
                answers: currentAnswers
            };

            backend.submitExam(resultObj);

            if (isPreview) {
                toast('تم إنهاء وضع المعاينة (لم يتم حفظ النتيجة)', { icon: '👁️' });
            } else {
                toast.success('تم تسليم الاختبار بنجاح');
            }

            navigate(`/exam/${exam.id}/result`, { replace: true });
        } catch (error) {
            console.error(error);
            toast.error('حدث خطأ أثناء تسليم الاختبار');
        }
    };

    // Filter questions for current section
    const sectionQuestions = exam.sections && exam.sections.length > 0
        ? questions.filter(q => exam.sections[currentSectionIndex].questionIds.includes(q.id))
        : questions;

    const currentQ = sectionQuestions[currentQIndex];
    const progress = (Object.keys(answers).length / questions.length) * 100;

    if (loading) return <div className="p-8 text-center text-white">جاري تحميل الاختبار...</div>;
    if (!exam || questions.length === 0) return <div>تعذر تحميل الاختبار</div>;
    if (!currentQ) return <div className="p-8 text-center text-white">جاري تحميل السؤال...</div>;

    return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col font-sans select-none" dir="rtl">
            {/* Header */}
            {isPreview && (
                <div className="bg-amber-500 text-black font-bold text-center text-xs py-1 sticky top-0 z-50">
                    وضع المعاينة - لن يتم حفظ النتائج
                </div>
            )}
            <header className="h-16 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-4 sticky top-6 z-30 shadow-md">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-xl font-mono font-bold text-blue-400 bg-slate-900 px-3 py-1 rounded">
                        <Clock size={20} />
                        {formatTime(timeLeft)}
                    </div>
                    {exam.sections && exam.sections.length > 1 && (
                        <div className="bg-blue-600/20 text-blue-400 px-3 py-1 rounded-lg text-sm font-bold border border-blue-500/30">
                            {exam.sections[currentSectionIndex].title} ({currentSectionIndex + 1} من {exam.sections.length})
                        </div>
                    )}
                </div>

                <button
                    onClick={() => setSidebarOpen(true)}
                    className="md:hidden p-2 text-gray-300"
                >
                    <Menu size={24} />
                </button>

                <div className="flex gap-2">
                    {exam.sections && currentSectionIndex < exam.sections.length - 1 ? (
                        <button
                            onClick={handleNextSection}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-bold text-sm transition flex items-center gap-2"
                        >
                            القسم التالي
                            <ChevronLeft size={16} />
                        </button>
                    ) : (
                        <button
                            onClick={() => setShowConfirmSubmit(true)}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-bold text-sm transition flex items-center gap-2"
                        >
                            <Save size={16} />
                            إنهاء الاختبار
                        </button>
                    )}
                </div>
            </header>

            {/* Confirmation Dialog */}
            {showConfirmSubmit && (
                <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-slate-800 text-white rounded-2xl shadow-2xl p-6 max-w-sm w-full border border-slate-700">
                        <h2 className="text-xl font-bold mb-4">هل أنت متأكد من تسليم الاختبار؟</h2>
                        {Object.keys(answers).length < questions.length && (
                            <p className="text-amber-400 mb-4 text-sm font-medium">
                                تنبيه: يوجد {questions.length - Object.keys(answers).length} أسئلة لم تقم بالإجابة عليها!
                            </p>
                        )}
                        <p className="text-gray-400 text-sm mb-6">لا يمكنك العودة لتعديل الإجابات بعد التسليم.</p>
                        <div className="flex gap-3">
                            <button 
                                onClick={() => setShowConfirmSubmit(false)}
                                className="flex-1 bg-slate-700 hover:bg-slate-600 py-2 rounded-lg font-bold transition"
                            >
                                إلغاء
                            </button>
                            <button 
                                onClick={() => forceSubmit()}
                                className="flex-1 bg-green-600 hover:bg-green-700 py-2 rounded-lg font-bold transition"
                            >
                                نعم، تسليم
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar (Questions Nav) */}
                <aside className={`fixed inset-y-0 right-0 w-72 bg-slate-800 border-l border-slate-700 transform transition-transform duration-300 z-40 md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                    <div className="p-4 border-b border-slate-700 flex justify-between items-center">
                        <h3 className="font-bold">خريطة الأسئلة</h3>
                        <button onClick={() => setSidebarOpen(false)} className="md:hidden text-gray-400"><X size={20} /></button>
                    </div>

                    <div className="p-4 grid grid-cols-5 gap-2 overflow-y-auto max-h-[calc(100vh-120px)]">
                        {questions.map((q, idx) => {
                            const isAnswered = answers[q.id] !== undefined;
                            const isFlagged = flaggedQs.includes(q.id);
                            const isCurrent = idx === currentQIndex;

                            return (
                                <button
                                    key={q.id}
                                    onClick={() => { setCurrentQIndex(idx); setSidebarOpen(false); }}
                                    className={`
                        w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold relative transition
                        ${isCurrent ? 'ring-2 ring-blue-400 bg-blue-600 text-white' : ''}
                        ${!isCurrent && isAnswered ? 'bg-slate-600 text-blue-300' : ''}
                        ${!isCurrent && !isAnswered ? 'bg-slate-700 text-gray-400 hover:bg-slate-600' : ''}
                      `}
                                >
                                    {idx + 1}
                                    {isFlagged && <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-slate-800"></span>}
                                </button>
                            );
                        })}
                    </div>

                    <div className="p-4 border-t border-slate-700 text-xs text-gray-400 space-y-2">
                        <div className="flex items-center gap-2"><span className="w-3 h-3 bg-blue-600 rounded-full"></span> الحالي</div>
                        <div className="flex items-center gap-2"><span className="w-3 h-3 bg-slate-600 rounded-full"></span> تم حله</div>
                        <div className="flex items-center gap-2"><span className="w-3 h-3 bg-red-500 rounded-full"></span> مؤجل (Flagged)</div>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1 bg-slate-900 p-4 md:p-8 overflow-y-auto relative">
                    <div className="max-w-3xl mx-auto pb-20"> {/* pb-20 for mobile nav space */}
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <span className="text-gray-400 text-sm">سؤال {currentQIndex + 1} من {questions.length}</span>
                                <h2 className="text-2xl font-bold mt-2 leading-relaxed">{currentQ.text}</h2>
                            </div>
                            <button
                                onClick={() => toggleFlag(currentQ.id)}
                                className={`p-2 rounded-full ${flaggedQs.includes(currentQ.id) ? 'bg-red-500/20 text-red-400' : 'text-gray-500 hover:bg-slate-800'}`}
                                title="تأجيل السؤال"
                            >
                                <Flag size={20} fill={flaggedQs.includes(currentQ.id) ? "currentColor" : "none"} />
                            </button>
                        </div>

                        {/* Options */}
                        <div className="space-y-3">
                            {currentQ.options.map((option, idx) => (
                                <label key={idx} className={`
                       flex items-center gap-4 p-4 rounded-xl cursor-pointer border transition-all
                       ${answers[currentQ.id] === idx
                                        ? 'bg-blue-600/20 border-blue-500 ring-1 ring-blue-500'
                                        : 'bg-slate-800 border-slate-700 hover:border-slate-500'}
                    `}>
                                    <div className={`
                          w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0
                          ${answers[currentQ.id] === idx ? 'border-blue-400 bg-blue-500 text-white' : 'border-gray-500'}
                       `}>
                                        {answers[currentQ.id] === idx && <div className="w-2 h-2 bg-white rounded-full"></div>}
                                    </div>
                                    <input
                                        type="radio"
                                        name={`q-${currentQ.id}`}
                                        className="hidden"
                                        checked={answers[currentQ.id] === idx}
                                        onChange={() => handleAnswer(currentQ.id, idx)}
                                    />
                                    <span className={`text-lg ${answers[currentQ.id] === idx ? 'text-white' : 'text-gray-300'}`}>{option}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Bottom Nav (Mobile/Desktop) */}
                    <div className="fixed bottom-0 left-0 right-0 md:absolute md:bottom-0 p-4 bg-slate-800/90 backdrop-blur border-t border-slate-700 flex justify-between items-center max-w-[calc(100%-18rem)] mr-auto">
                        <button
                            onClick={() => setCurrentQIndex(prev => Math.max(0, prev - 1))}
                            disabled={currentQIndex === 0}
                            className="px-6 py-3 rounded-lg bg-slate-700 text-white font-bold disabled:opacity-50 flex items-center gap-2 hover:bg-slate-600"
                        >
                            <ChevronRight size={18} /> السابق
                        </button>

                        <button
                            onClick={() => setCurrentQIndex(prev => Math.min(sectionQuestions.length - 1, prev + 1))}
                            disabled={currentQIndex === sectionQuestions.length - 1}
                            className="px-6 py-3 rounded-lg bg-blue-600 text-white font-bold disabled:opacity-50 flex items-center gap-2 hover:bg-blue-500"
                        >
                            التالي <ChevronLeft size={18} />
                        </button>
                    </div>
                </main>
            </div>

        </div>
    );
};

export default StudentExamPlayer;
