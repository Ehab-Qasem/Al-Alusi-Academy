import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { backend } from '../services/mockBackend';
import { useAuth } from '../App';
import { Exam, UserRole } from '../types';
import { Clock, HelpCircle, Award, AlertTriangle, Play, CheckCircle2, User, Lock, Eye } from 'lucide-react';
import { motion } from 'framer-motion';

const StudentExamInstructions = () => {
    const { examId } = useParams();
    const navigate = useNavigate();
    const { user, isAuthenticated } = useAuth(); // Assuming useAuth is available as per App.tsx
    const [exam, setExam] = useState<Exam | null>(null);
    const [loading, setLoading] = useState(true);
    const [guestName, setGuestName] = useState('');
    const [error, setError] = useState('');

    // Check for Preview Role (Admin/Teacher)
    const isPreviewUser = user && (user.role === 'admin' || user.role === 'teacher');
    const canTakeExam = isPreviewUser || isAuthenticated || exam?.type === 'practice';

    useEffect(() => {
        if (examId) {
            const foundExam = backend.getExam(examId);
            setExam(foundExam || null);
        }
        setLoading(false);
    }, [examId]);

    if (loading) return <div className="p-8 text-center text-gray-500">جاري تحميل بيانات الاختبار...</div>;

    if (!exam) return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-slate-900">
            <AlertTriangle size={48} className="text-red-500 mb-4" />
            <h1 className="text-2xl font-bold dark:text-white mb-2">الاختبار غير موجود</h1>
            <p className="text-gray-500 dark:text-gray-400 mb-6">عذراً، لم نتمكن من العثور على هذا الاختبار. ربما تم حذفه أو الرابط غير صحيح.</p>
            <button onClick={() => navigate('/student/exams')} className="px-6 py-2 bg-gray-200 dark:bg-slate-800 rounded-lg font-bold hover:bg-gray-300 dark:hover:bg-slate-700 dark:text-white transition">
                عودة للاختبارات
            </button>
        </div>
    );

    const totalQuestions = exam.sections.reduce((acc, sec) => acc + sec.questionIds.length, 0);

    const handleStart = () => {
        // Access Control Validation
        if (!isPreviewUser) {
            if (exam.type === 'simulation' && !isAuthenticated) {
                setError('يجب تسجيل الدخول لأداء هذا الاختبار');
                return;
            }

            if (exam.type === 'practice' && !isAuthenticated && !guestName.trim()) {
                setError('الرجاء إدخال اسمك الثلاثي للمتابعة');
                return;
            }
        }

        // Request Fullscreen if supported (Skip for preview)
        const elem = document.documentElement;
        if (!isPreviewUser && elem.requestFullscreen) {
            elem.requestFullscreen().catch(err => console.log('Fullscreen denied:', err));
        }

        // Navigate
        navigate(`/exam/${examId}/play`, {
            state: {
                guestName: guestName.trim(),
                preview: isPreviewUser
            }
        });
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center p-4" dir="rtl">
            <div className="max-w-2xl w-full">
                {/* Header/Banner */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl overflow-hidden border border-gray-100 dark:border-slate-700"
                >
                    <div className="bg-primary-600 h-32 relative flex items-center justify-center overflow-hidden">
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                        <div className="bg-white/10 backdrop-blur-sm p-4 rounded-full border border-white/20 shadow-lg relative z-10">
                            <Award size={48} className="text-white" />
                        </div>
                    </div>

                    <div className="p-8 text-center -mt-4 relative z-20">
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{exam.title}</h1>
                        <div className="text-gray-500 dark:text-gray-400 text-sm mb-6 flex justify-center gap-2">
                            {exam.category && <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-full">{exam.category}</span>}
                            <span className={`px-3 py-1 rounded-full ${exam.type === 'simulation' ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' : 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400'}`}>
                                {exam.type === 'simulation' ? 'اختبار محاكاة' : 'اختبار تجريبي'}
                            </span>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-3 gap-4 mb-8">
                            <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-xl flex flex-col items-center">
                                <Clock className="text-orange-500 mb-2" size={24} />
                                <span className="text-2xl font-bold text-gray-900 dark:text-white">{exam.duration}</span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">دقيقة</span>
                            </div>
                            <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-xl flex flex-col items-center">
                                <HelpCircle className="text-blue-500 mb-2" size={24} />
                                <span className="text-2xl font-bold text-gray-900 dark:text-white">{totalQuestions}</span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">سؤال</span>
                            </div>
                            <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-xl flex flex-col items-center">
                                <CheckCircle2 className="text-green-500 mb-2" size={24} />
                                <span className="text-2xl font-bold text-gray-900 dark:text-white">{exam.passingScore}%</span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">للنجاح</span>
                            </div>
                        </div>

                        {/* Instructions List */}
                        <div className="text-right bg-blue-50 dark:bg-blue-900/10 p-6 rounded-xl border border-blue-100 dark:border-blue-800 mb-8">
                            <h3 className="font-bold text-blue-800 dark:text-blue-400 mb-4 flex items-center gap-2">
                                <AlertTriangle size={18} /> تعليمات هامة قبل البدء:
                            </h3>
                            <ul className="space-y-3 text-sm text-gray-700 dark:text-gray-300 list-disc list-inside">
                                <li>تأكد من استقرار اتصال الإنترنت لديك.</li>
                                <li>بمجرد بدء الاختبار، سيبدأ العد التنازلي ولا يمكن إيقافه.</li>
                                {exam.type === 'simulation' && (
                                    <>
                                        <li>هذا اختبار محاكاة، يرجى عدم الاستعانة بمصادر خارجية.</li>
                                        <li>لا تقم بتحديث الصفحة وإلا قد تفقد تقدمك.</li>
                                    </>
                                )}
                                <li>سيتم حفظ إجاباتك تلقائياً عند الانتقال بين الأسئلة.</li>
                            </ul>
                        </div>

                        {/* Access Control UI */}
                        {!isAuthenticated && !isPreviewUser && (
                            <div className="mb-6 animate-fade-in">
                                {exam.type === 'simulation' ? (
                                    <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-200 dark:border-red-800 text-center">
                                        <Lock className="mx-auto text-red-500 mb-2" size={32} />
                                        <p className="text-red-700 dark:text-red-300 font-bold mb-4">هذا الاختبار متاح فقط للمستخدمين المسجلين</p>
                                        <div className="flex justify-center gap-3">
                                            <button onClick={() => navigate('/login')} className="px-6 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition">
                                                تسجيل الدخول
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-gray-50 dark:bg-slate-700/50 p-4 rounded-xl border border-gray-200 dark:border-slate-700">
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                                            <User size={16} /> الاسم الثلاثي (مطلوب للزوار)
                                        </label>
                                        <input
                                            type="text"
                                            value={guestName}
                                            onChange={(e) => { setGuestName(e.target.value); setError(''); }}
                                            className="w-full p-3 rounded-lg border dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
                                            placeholder="اكتب اسمك هنا..."
                                        />
                                        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Start Button */}
                        {canTakeExam && (
                            <>
                                {exam.type === 'simulation' && !isAuthenticated && !isPreviewUser ? null : (
                                    <button
                                        onClick={handleStart}
                                        className={`w-full py-4 text-white rounded-xl font-bold text-lg shadow-lg transition transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${isPreviewUser ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/30' : 'bg-primary-600 hover:bg-primary-700 shadow-primary-600/30'}`}
                                        disabled={!isPreviewUser && !isAuthenticated && !guestName.trim()}
                                    >
                                        {isPreviewUser ? <Eye size={24} /> : <Play size={24} fill="currentColor" />}
                                        {isPreviewUser ? 'معاينة الاختبار (وضع المشرف)' : 'ابدأ الاختبار الآن'}
                                    </button>
                                )}
                            </>
                        )}
                        <p className="text-xs text-center text-gray-400 mt-4">بالتوفيق والنجاح!</p>

                    </div>
                </motion.div>

            </div >
        </div >
    );
};

export default StudentExamInstructions;
