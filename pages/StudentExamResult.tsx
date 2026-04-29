import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { backend } from '../services/mockBackend';
import { Exam, ExamResult } from '../types';
import { CheckCircle, XCircle, Home, RotateCcw, Award, Share2, Download, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import Confetti from 'react-confetti';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { StudentCertificateRenderer } from '../components/StudentCertificateRenderer';
import { useAuth } from '../App';
import toast from 'react-hot-toast';
import { LoadingSkeleton } from '../components/LoadingSkeleton';

const StudentExamResult = () => {
    const { user } = useAuth();
    const { examId } = useParams();
    const [result, setResult] = useState<ExamResult | null>(null);
    const [exam, setExam] = useState<Exam | null>(null);
    const [loading, setLoading] = useState(true);
    const [template, setTemplate] = useState<any>(null);
    const [downloading, setDownloading] = useState(false);

    useEffect(() => {
        if (examId) {
            const foundExam = backend.getExam(examId);
            setExam(foundExam || null);

            const currentUserId = user?.id || localStorage.getItem('almanara_guest_id');
            const results = backend.getResults().filter(r => r.examId === examId && r.userId === currentUserId);
            if (results.length > 0) {
                const lastResult = results[results.length - 1];
                setResult(lastResult);

                // Load Template if passed
                if (lastResult.isPassed && foundExam?.certificateTemplateId) {
                    const tpl = backend.getCertificateTemplates().find(t => t.id === foundExam.certificateTemplateId);
                    setTemplate(tpl);

                    // Auto-issue certificate to DB if not already done
                    if (user?.id) {
                        const issueCert = async () => {
                            try {
                                const existing = backend.getStudentCertificates(user.id);
                                const alreadyIssued = existing.find(c => c.templateId === tpl.id && c.metadata?.examId === examId);
                                if (!alreadyIssued) {
                                    await fetch('/api/student-certificates', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                            userId: user.id,
                                            templateId: tpl.id,
                                            metadata: {
                                                studentName: user.fullName,
                                                examTitle: foundExam.title,
                                                score: `${Math.round((lastResult.score / lastResult.totalQuestions) * 100)}%`,
                                                date: new Date().toLocaleDateString('ar-SA'),
                                                examId: examId
                                            }
                                        })
                                    });
                                }
                            } catch (e) { console.error('Auto-issue failed', e); }
                        };
                        issueCert();
                    }
                }
            }
        }
        setLoading(false);
    }, [examId, user?.id]);

    const handleDownloadCertificate = async () => {
        if (!result || !template) return;
        setDownloading(true);
        const toastId = toast.loading('جاري إصدار الشهادة...');

        try {
            const element = document.getElementById('cert-hidden-render');
            if (!element) throw new Error('Render node not found');

            await new Promise(resolve => setTimeout(resolve, 1000)); // Grace period for fonts

            const canvas = await html2canvas(element, {
                scale: 3,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            });

            const imgData = canvas.toDataURL('image/jpeg', 0.90);
            const pdf = new jsPDF({
                orientation: (template.widthMm || 297) >= (template.heightMm || 210) ? 'landscape' : 'portrait',
                unit: 'mm',
                format: [template.widthMm || 297, template.heightMm || 210]
            });

            pdf.addImage(imgData, 'JPEG', 0, 0, template.widthMm || 297, template.heightMm || 210);
            pdf.save(`Certificate_${result.userId || 'guest'}_${result.examId}.pdf`);

            toast.success('تم تحميل الشهادة بنجاح', { id: toastId });
        } catch (e) {
            console.error(e);
            toast.error('حدث خطأ أثناء تحميل الشهادة', { id: toastId });
        } finally {
            setDownloading(false);
        }
    };

    if (loading) return <LoadingSkeleton type="exam" />;

    if (!result || !exam) return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-slate-900">
            <h1 className="text-2xl font-bold dark:text-white mb-4">لم يتم العثور على نتيجة</h1>
            <Link to="/" className="text-primary-500 hover:underline">عودة للرئيسية</Link>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-12 px-4" dir="rtl">
            {result.isPassed && <Confetti recycle={false} numberOfPieces={500} />}

            <div className="max-w-2xl mx-auto">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl overflow-hidden border border-gray-100 dark:border-slate-700"
                >
                    {/* Header Status */}
                    <div className={`p-8 text-center ${result.isPassed ? 'bg-green-500' : 'bg-red-500'} text-white`}>
                        <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                            {result.isPassed ? <CheckCircle size={48} /> : <XCircle size={48} />}
                        </div>
                        <h1 className="text-4xl font-bold mb-2">{result.isPassed ? 'مبارك، لقد اجتزت الاختبار!' : 'للأسف، لم تجتز الاختبار'}</h1>
                        <p className="opacity-90">{exam.title}</p>
                    </div>

                    <div className="p-8">
                        {/* Score Circle */}
                        <div className="flex justify-center mb-8">
                            <div className="relative w-48 h-48">
                                <svg className="w-full h-full transform -rotate-90">
                                    <circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-gray-100 dark:text-slate-700" />
                                    <circle
                                        cx="96" cy="96" r="88"
                                        stroke="currentColor"
                                        strokeWidth="12"
                                        fill="transparent"
                                        strokeDasharray={2 * Math.PI * 88}
                                        strokeDashoffset={2 * Math.PI * 88 * (1 - (result.score / result.totalQuestions))}
                                        className={`${result.isPassed ? 'text-green-500' : 'text-red-500'} transition-all duration-1000 ease-out`}
                                        strokeLinecap="round"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-5xl font-bold dark:text-white">{Math.round((result.score / result.totalQuestions) * 100)}%</span>
                                    <span className={`text-sm font-bold mt-1 ${result.isPassed ? 'text-green-500' : 'text-red-500'}`}>
                                        {(() => {
                                            const pct = Math.round((result.score / result.totalQuestions) * 100);
                                            if (pct >= 90) return 'تقدير: ممتاز';
                                            if (pct >= 80) return 'تقدير: جيد جداً';
                                            if (pct >= 70) return 'تقدير: جيد';
                                            if (pct >= 60) return 'تقدير: مقبول';
                                            return 'تقدير: ضعيف';
                                        })()}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-4 mb-8">
                            <div className="p-4 bg-gray-50 dark:bg-slate-700/30 rounded-xl text-center">
                                <div className="text-gray-500 dark:text-gray-400 text-sm mb-1">الإجابات الصحيحة</div>
                                <div className="text-xl font-bold text-green-600 dark:text-green-400">{result.correctAnswers} / {result.totalQuestions}</div>
                            </div>
                            <div className="p-4 bg-gray-50 dark:bg-slate-700/30 rounded-xl text-center">
                                <div className="text-gray-500 dark:text-gray-400 text-sm mb-1">درجة الاجتياز</div>
                                <div className="text-xl font-bold text-gray-900 dark:text-white">{exam.passingScore}%</div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="space-y-3">
                            {result.isPassed && template && (
                                <button
                                    onClick={handleDownloadCertificate}
                                    disabled={downloading}
                                    className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold shadow-lg shadow-amber-500/30 transition flex items-center justify-center gap-2 disabled:opacity-70"
                                >
                                    {downloading ? <Loader2 size={20} className="animate-spin" /> : <Award size={20} />}
                                    {downloading ? 'جاري التحميل...' : 'تحميل الشهادة'}
                                </button>
                            )}

                            <div className="grid grid-cols-2 gap-3">
                                <Link to={`/exam/${examId}/start`} className="flex items-center justify-center gap-2 py-3 border border-gray-200 dark:border-slate-700 rounded-xl font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition">
                                    <RotateCcw size={18} /> إعادة المحاولة
                                </Link>
                                <Link to="/" className="flex items-center justify-center gap-2 py-3 bg-gray-100 dark:bg-slate-700 rounded-xl font-bold text-gray-700 dark:text-white hover:bg-gray-200 dark:hover:bg-slate-600 transition">
                                    <Home size={18} /> العودة للرئيسية
                                </Link>
                            </div>
                        </div>

                        {/* Hidden Renderer */}
                        {template && result && (
                            <div className="fixed -z-50 pointer-events-none opacity-0" style={{ left: '-9999px', top: '-9999px' }}>
                                <div id="cert-hidden-render">
                                    <StudentCertificateRenderer
                                        template={template}
                                        data={{
                                            studentName: user?.fullName || result.guestName || result.userId || 'زائر',
                                            date: new Date().toLocaleDateString('ar-SA'),
                                            score: `${Math.round((result.score / result.totalQuestions) * 100)}%`,
                                            examTitle: exam.title,
                                            courseTitle: 'الدورة التدريبية',
                                            grade: (() => { const pct = Math.round((result.score / result.totalQuestions) * 100); return pct >= 90 ? 'ممتاز' : pct >= 80 ? 'جيد جداً' : 'جيد'; })(),
                                            qrCodeUrl: `https://almanara.com/verify/${result.id}`
                                        }}
                                    />
                                </div>
                            </div>
                        )}

                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default StudentExamResult;
