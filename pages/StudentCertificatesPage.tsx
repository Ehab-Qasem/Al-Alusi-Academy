import React, { useState, useEffect } from 'react';
import { backend } from '../services/mockBackend';
import { StudentCertificate, CertificateTemplate } from '../types';
import { Download, Calendar, Award } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../App';
import { LoadingSkeleton } from '../components/LoadingSkeleton';

// Simplified Renderer for PDF Generation (Reuses logic conceptually)
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { StudentCertificateRenderer } from '../components/StudentCertificateRenderer';

const StudentCertificatesPage = () => {
    const [certificates, setCertificates] = useState<StudentCertificate[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeDownloadId, setActiveDownloadId] = useState<string | null>(null);
    const [activeTemplate, setActiveTemplate] = useState<CertificateTemplate | null>(null);
    const [activeMetadata, setActiveMetadata] = useState<any>(null);

    // Get current user
    const { user } = useAuth();

    useEffect(() => {
        if (!user) return;
        const certs = backend.getStudentCertificates(user.id);
        setCertificates(certs);
        setLoading(false);
    }, [user?.id]);

    const handleDownload = async (cert: StudentCertificate) => {
        if (activeDownloadId) return;
        setActiveDownloadId(cert.id);
        
        const template = backend.getCertificateTemplates().find(t => t.id === cert.templateId);
        if (!template) {
            toast.error('قالب الشهادة غير موجود');
            setActiveDownloadId(null);
            return;
        }

        setActiveTemplate(template);
        setActiveMetadata(cert.metadata || {});

        const toastId = toast.loading('جاري تجهيز وتوليد الشهادة...');

        // Short delay to let React mount the hidden renderer component
        setTimeout(async () => {
            try {
                const element = document.getElementById('cert-hidden-render');
                if (!element) throw new Error('Render node not found');

                await new Promise(resolve => setTimeout(resolve, 1500)); // Grace period for fonts & images

                const canvas = await html2canvas(element, {
                    scale: 3,
                    useCORS: true,
                    logging: false,
                    backgroundColor: '#ffffff'
                });

                const imgData = canvas.toDataURL('image/jpeg', 0.90);
                const isLandscape = (template.widthMm || 297) >= (template.heightMm || 210);
                
                const pdf = new jsPDF({
                    orientation: isLandscape ? 'landscape' : 'portrait',
                    unit: 'mm',
                    format: [template.widthMm || 297, template.heightMm || 210]
                });

                pdf.addImage(imgData, 'JPEG', 0, 0, template.widthMm || 297, template.heightMm || 210);
                pdf.save(`Certificate_${cert.id}.pdf`);

                toast.success('تم تحميل الشهادة بنجاح', { id: toastId });
            } catch (e) {
                console.error(e);
                toast.error('فشل تحميل الشهادة', { id: toastId });
            } finally {
                setActiveDownloadId(null);
                setActiveTemplate(null);
            }
        }, 100);
    };

    if (loading) return <LoadingSkeleton type="card" count={3} />;

    return (
        <div className="max-w-5xl mx-auto p-6 space-y-8 animate-fade-in">
            <header className="flex items-center gap-4 border-b pb-6 dark:border-slate-800">
                <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 rounded-2xl">
                    <Award size={32} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold dark:text-white">شهاداتي</h1>
                    <p className="text-gray-500 dark:text-gray-400">سجل الإنجازات والشهادات الحاصل عليها.</p>
                </div>
            </header>

            {certificates.length === 0 ? (
                <div className="text-center py-20 bg-gray-50 dark:bg-slate-900 rounded-3xl border border-dashed border-gray-200 dark:border-slate-800">
                    <Award size={48} className="mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-bold text-gray-400">لا توجد شهادات بعد</h3>
                    <p className="text-gray-400 text-sm">أكمل الدورات والاختبارات للحصول على الشهادات.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {certificates.map(cert => {
                        const template = backend.getCertificateTemplates().find(t => t.id === cert.templateId);
                        return (
                            <div key={cert.id} className="bg-white dark:bg-slate-900 rounded-2xl border dark:border-slate-800 shadow-sm overflow-hidden group hover:shadow-lg transition-all duration-300">
                                {/* Preview Thumbnail (Mock) */}
                                <div className="h-40 bg-gray-100 dark:bg-slate-800 relative flex items-center justify-center overflow-hidden">
                                    {template?.backgroundImage ? (
                                        <img src={template.backgroundImage} className="w-full h-full object-cover opacity-80" />
                                    ) : (
                                        <Award size={40} className="text-gray-300" />
                                    )}
                                    <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition" />
                                </div>

                                <div className="p-5">
                                    <h3 className="font-bold text-lg dark:text-white mb-1 truncate">{template?.name || 'شهادة'}</h3>
                                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
                                        <Calendar size={14} />
                                        <span>{cert.metadata?.date || cert.issueDate.split('T')[0]}</span>
                                    </div>

                                    <button
                                        onClick={() => handleDownload(cert)}
                                        disabled={activeDownloadId === cert.id}
                                        className="w-full bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary-100 dark:hover:bg-primary-900/40 transition disabled:opacity-50"
                                    >
                                        <Download size={18} /> {activeDownloadId === cert.id ? 'جاري التحميل...' : 'تحميل PDF'}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Hidden Renderer for PDF Canvas Export */}
            <div className="fixed -z-50 pointer-events-none opacity-0" style={{ left: '-9999px', top: '-9999px' }}>
                {activeTemplate && (
                    <div id="cert-hidden-render">
                        <StudentCertificateRenderer
                            template={activeTemplate}
                            data={{
                                studentName: activeMetadata?.studentName || user?.fullName || 'زائر',
                                date: activeMetadata?.date || new Date().toLocaleDateString('ar-SA'),
                                courseTitle: activeMetadata?.courseTitle || '',
                                examTitle: activeMetadata?.examTitle || '',
                                score: activeMetadata?.score || '',
                            }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudentCertificatesPage;
