
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { backend } from '../services/mockBackend';
import { Course, Module, ContentItem, ContentType, Question } from '../types';
import { useAuth } from '../App';
import ReactPlayer from 'react-player';
import { Play, FileText, CheckCircle, Circle, ChevronDown, Lock, ArrowRight, ExternalLink, Download, AlertCircle, Award, X, Image as ImageIcon, ChevronLeft, ChevronRight as ChevronRightIcon, HelpCircle, Save, Check, Gauge, PictureInPicture, PictureInPicture2, Trophy, PlayCircle, CheckCircle2, List } from 'lucide-react';
import toast from 'react-hot-toast';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import html2pdf from 'html2pdf.js';
import { StudentCertificateRenderer } from '../components/StudentCertificateRenderer';
import { CertificateTemplate } from '../types';

const CourseStatsPanel = ({ course, activeUserId, onRestart }: { course: Course, activeUserId: string, onRestart: () => void }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const progress = backend.getProgress(activeUserId, course.id);
  const quizScores = progress?.quizScores || {};
  
  // Calculate stats
  const allModules = course.modules;
  const allContent = allModules.flatMap(m => m.content);
  const totalLessons = allContent.length;
  const completedLessons = progress?.completedItems?.length || 0;
  const completionPercentage = Math.round((completedLessons / Math.max(1, totalLessons)) * 100);
  
  // Collect quizzes
  const quizzes = allContent.filter(c => c.type === ContentType.QUIZ);

  const [isGeneratingCert, setIsGeneratingCert] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState<CertificateTemplate | null>(null);

  const handleIssueCert = async () => {
    if (!course.certificateTemplateId) return;
    const template = backend.getCertificateTemplates().find(t => t.id === course.certificateTemplateId);
    if (!template) {
        toast.error('قالب الشهادة غير موجود');
        return;
    }
    
    setIsGeneratingCert(true);
    setActiveTemplate(template);
    
    const toastId = toast.loading('جاري تجهيز وتوليد الشهادة...');

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
            pdf.save(`Certificate_${course.title}.pdf`);

            toast.success('تم تحميل الشهادة بنجاح', { id: toastId });
        } catch (e) {
            console.error(e);
            toast.error('فشل تحميل الشهادة', { id: toastId });
        } finally {
            setIsGeneratingCert(false);
            setActiveTemplate(null);
        }
    }, 100);
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-10 shadow-xl border border-gray-100 dark:border-slate-800 animate-in fade-in zoom-in-95">
      <div className="text-center mb-10">
        <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <Trophy size={48} />
        </div>
        <h2 className="text-3xl font-black mb-2 dark:text-white">إحصائيات الدورة</h2>
        <p className="text-gray-500">نظرة عامة على أدائك وإنجازاتك في "{course.title}"</p>
      </div>

      {course.congratulationsText && (
        <div className="mb-10 bg-primary-50 dark:bg-primary-900/20 p-6 rounded-2xl border border-primary-100 dark:border-primary-900/30">
          <div 
             className="prose prose-primary dark:prose-invert max-w-none text-center"
             dangerouslySetInnerHTML={{ __html: course.congratulationsText }} 
          />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        <div className="bg-gray-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-gray-100 dark:border-slate-800">
          <h3 className="text-lg font-bold mb-4 dark:text-white flex items-center gap-2">
            <CheckCircle2 className="text-green-500" />
            نسبة الإنجاز
          </h3>
          <div className="flex items-end gap-2 mb-2">
            <span className="text-4xl font-black text-gray-900 dark:text-white">{completionPercentage}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2 mb-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all duration-1000"
              style={{ width: `${completionPercentage}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-500">تم إكمال {completedLessons} من أصل {totalLessons} درس</p>
        </div>

        <div className="bg-gray-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-gray-100 dark:border-slate-800">
          <h3 className="text-lg font-bold mb-4 dark:text-white flex items-center gap-2">
            <List className="text-blue-500" />
            محتوى الدورة
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center text-gray-600 dark:text-gray-400">
              <span>إجمالي الوحدات:</span>
              <span className="font-bold text-gray-900 dark:text-white">{allModules.length}</span>
            </div>
            <div className="flex justify-between items-center text-gray-600 dark:text-gray-400">
              <span>إجمالي الدروس:</span>
              <span className="font-bold text-gray-900 dark:text-white">{totalLessons - quizzes.length}</span>
            </div>
            <div className="flex justify-between items-center text-gray-600 dark:text-gray-400">
              <span>إجمالي الاختبارات:</span>
              <span className="font-bold text-gray-900 dark:text-white">{quizzes.length}</span>
            </div>
          </div>
        </div>
      </div>

      {quizzes.length > 0 && (
        <div className="mb-10">
          <h3 className="text-xl font-bold mb-6 dark:text-white flex items-center gap-2">
            <HelpCircle className="text-orange-500" />
            أداء الاختبارات القصيرة
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quizzes.map(quiz => {
              const score = quizScores[quiz.id];
              const isPassed = score >= (quiz.passingScore || 60);
              return (
                <div key={quiz.id} className="border border-gray-200 dark:border-slate-800 p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-gray-800 dark:text-white">{quiz.title}</h4>
                    <p className="text-xs text-gray-500 mt-1">{quiz.questions?.length || 0} أسئلة • نسبة النجاح: {quiz.passingScore || 60}%</p>
                  </div>
                  {score !== undefined ? (
                    <div className={`px-3 py-1.5 rounded-lg text-sm font-bold ${isPassed ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                      {Math.round(score)}%
                    </div>
                  ) : (
                    <div className="px-3 py-1.5 rounded-lg text-sm bg-gray-100 text-gray-500 dark:bg-slate-800">
                      لم يُحل
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center gap-4 pt-6 border-t border-gray-100 dark:border-slate-800">
        {course.certificateTemplateId && completionPercentage === 100 && (
          <button 
             onClick={handleIssueCert}
             className="w-full sm:w-auto flex-1 bg-primary-600 text-white px-6 py-3.5 rounded-xl font-bold hover:bg-primary-700 flex justify-center items-center gap-2 shadow-lg hover:shadow-xl transition"
          >
            <Award size={20} />
            إصدار الشهادة
          </button>
        )}
        
        {course.certificateTemplateId && completionPercentage === 100 && (
          <button 
             onClick={() => navigate('/dashboard/certificates')}
             className="w-full sm:w-auto bg-white dark:bg-slate-800 text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-slate-700 flex-1 px-6 py-3.5 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-slate-700 focus:outline-none flex justify-center items-center gap-2 transition"
          >
            الانتقال للشهادات
          </button>
        )}

        <button 
           onClick={onRestart}
           className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition"
        >
          إعادة الدورة
        </button>
      </div>

      {activeTemplate && (
          <div className="absolute top-0 left-[-9999px] opacity-0 pointer-events-none" aria-hidden="true">
              <div id="cert-hidden-render">
                  <StudentCertificateRenderer 
                      template={activeTemplate}
                      data={{
                          studentName: user?.fullName || 'زائر',
                          courseTitle: course.title,
                          date: new Date().toLocaleDateString('ar-SA'),
                          score: `${completionPercentage}%`,
                      }}
                  />
              </div>
          </div>
      )}
    </div>
  );
};

const CoursePlayer = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [activeModuleId, setActiveModuleId] = useState<string>('');
  const [activeContent, setActiveContent] = useState<ContentItem | null>(null);
  const [completedItems, setCompletedItems] = useState<string[]>([]);
  const [isShowingStats, setIsShowingStats] = useState(false);
  
  const guestId = localStorage.getItem('almanara_guest_id');
  const activeUserId = user?.id || guestId;

  // Video & Progress State
  const [playedSeconds, setPlayedSeconds] = useState(0);
  const playerRef = useRef<ReactPlayer>(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const progressSaveTimeout = useRef<any>(null);

  // Video Controls State
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [pip, setPip] = useState(false);

  // Image Gallery State
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [currentImgIndex, setCurrentImgIndex] = useState(0);

  // Video Unlock Logic
  const [isVideoUnlocked, setIsVideoUnlocked] = useState(false);

  useEffect(() => {
    setIsVideoUnlocked(false);
    if (activeContent?.type === ContentType.VIDEO) {
      const timer = setTimeout(() => {
        setIsVideoUnlocked(true);
      }, 3 * 60 * 1000); // 3 minutes
      return () => clearTimeout(timer);
    }
  }, [activeContent]);

  // Quiz State
  const [quizQuestions, setQuizQuestions] = useState<Question[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);

  // Certificate State
  const [showCertModal, setShowCertModal] = useState(false);
  const certRef = useRef<HTMLDivElement>(null);
  const [isGeneratingCert, setIsGeneratingCert] = useState(false);

  // Article PDF Download
  const handleDownloadArticlePDF = async () => {
    const articleTitle = activeContent?.title || 'مقال';
    const element = document.getElementById('article-content-wrapper');
    if (!element) return;
    
    const toastId = toast.loading('جاري تجهيز المقال كملف PDF...');
    
    try {
        const opt = {
          margin:       10, // 10mm ~ 1cm margin
          filename:     `${articleTitle}.pdf`,
          image:        { type: 'jpeg' as const, quality: 0.98 },
          html2canvas:  { scale: 2, useCORS: true, logging: false },
          jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
          pagebreak:    { mode: ['css', 'legacy'] }
        };

        // Temporarily add a title element inside the wrapper
        const titleEl = document.createElement('h1');
        titleEl.innerText = articleTitle;
        titleEl.style.borderBottom = '2px solid #eee';
        titleEl.style.paddingBottom = '10px';
        titleEl.style.marginBottom = '20px';
        titleEl.style.fontSize = '24pt';
        
        // Save original styles
        const originalBg = element.style.backgroundColor;
        const originalColor = element.style.color;
        
        // Force light mode styles on the wrapper for the PDF
        element.style.backgroundColor = '#ffffff';
        element.style.color = '#000000';
        element.insertBefore(titleEl, element.firstChild);

        // Inject css rules to prevent breaking
        const styleEl = document.createElement('style');
        styleEl.innerHTML = `
          #article-content-wrapper img { max-width: 100%; height: auto; page-break-inside: avoid; }
          #article-content-wrapper p, #article-content-wrapper h2, #article-content-wrapper h3, #article-content-wrapper h4, #article-content-wrapper h5, #article-content-wrapper h6, #article-content-wrapper ul, #article-content-wrapper ol, #article-content-wrapper li, #article-content-wrapper blockquote { page-break-inside: avoid; }
          /* Fix for html2canvas Arabic font baseline issue with highlights */
          #article-content-wrapper mark {
            padding-bottom: 0.35em !important;
          }
        `;
        document.head.appendChild(styleEl);

        // html2pdf will capture the real element shown on the screen
        await html2pdf().set(opt).from(element).save();

        // Restore original state
        element.removeChild(titleEl);
        element.style.backgroundColor = originalBg;
        element.style.color = originalColor;
        document.head.removeChild(styleEl);

        toast.success('تم تحميل المقال بنجاح!', { id: toastId });
    } catch (e) {
        console.error(e);
        toast.error('حدث خطأ أثناء تحميل المقال.', { id: toastId });
    }
  };

  useEffect(() => {
    if (!courseId) return;
    const c = backend.getCourse(courseId);
    if (!c) {
      navigate('/tracks');
      return;
    }

    // Strict Draft Visibility Check
    if (!c.isPublished && user?.role === 'student') {
      toast.error('عذراً، هذه الدورة غير متاحة للعرض حالياً.');
      navigate('/dashboard');
      return;
    }

    setCourse(c);

    if (activeUserId) {
      const p = backend.getProgress(activeUserId, c.id);
      setCompletedItems(p.completedItems);
    } else if (!c.isPublic) {
       // if no user/guest and course is private, redirect
       toast.error('هذه الدورة تتطلب تسجيل الدخول.');
       navigate('/login');
       return;
    }

    // Fix Loading Logic: Handle empty course
    if (c.modules.length > 0) {
      // Find first module with content
      const firstModWithContent = c.modules.find(m => m.content.length > 0);
      if (firstModWithContent) {
        setActiveModuleId(firstModWithContent.id);
        setActiveContent(firstModWithContent.content[0]);
      } else {
        // Course has modules but no content
        setActiveModuleId(c.modules[0].id);
      }
    }
  }, [courseId, user, navigate]);

  // Handle Content Change
  useEffect(() => {
    if (!activeContent) return;

    // Reset Quiz State
    setQuizSubmitted(false);
    setQuizAnswers({});
    setQuizScore(0);

    // Reset Video State
    setPlaybackRate(1.0);
    setPip(false);

    if (activeContent.type === ContentType.IMAGE && activeContent.url) {
      const imgs = activeContent.url.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
      setGalleryImages(imgs);
      setCurrentImgIndex(0);
      // Auto-complete if single image
      if (imgs.length <= 1) handleToggleCompletion(true);
    } else if (activeContent.type === ContentType.QUIZ && activeContent.questions) {
      // Load quiz questions
      const allQs = backend.getQuestions();
      const qs = allQs.filter(q => activeContent.questions?.includes(q.id));
      setQuizQuestions(qs);
    } else if (activeContent.type === ContentType.PDF) {
      handleToggleCompletion(true);
    }

  }, [activeContent]);

  const handleToggleCompletion = (forceComplete = false) => {
    if (!activeUserId || !course || !activeContent) return;

    // Check if it's a video and enforce logic
    if (activeContent.type === ContentType.VIDEO && !completedItems.includes(activeContent.id) && !forceComplete) {
      // Check if watched until end (95%) or 3 mins passed
      const watchedEnough = isVideoUnlocked || (videoDuration > 0 && playedSeconds >= videoDuration * 0.95);
      if (!watchedEnough) {
         toast.error('يجب مشاهدة الفيديو بالكامل لتحديده كمكتمل.');
         return;
      }
    }

    let isNowComplete = false;

    if (forceComplete) {
      if (!completedItems.includes(activeContent.id)) {
        backend.markContentComplete(activeUserId, course.id, activeContent.id);
        setCompletedItems(prev => [...prev, activeContent.id]);
        isNowComplete = true;
      }
    } else {
      // Manual Toggle
      const newState = backend.toggleContentCompletion(activeUserId, course.id, activeContent.id);
      if (newState) {
        setCompletedItems(prev => [...prev, activeContent.id]);
        isNowComplete = true;
      } else {
        setCompletedItems(prev => prev.filter(id => id !== activeContent!.id));
      }
    }

    if (isNowComplete) {
      toast.success('تم إكمال الدرس!');
      // Give state a moment to process the array append, then check for graduation
      setTimeout(issueCertificateIfNeeded, 500); 
    }
  };

  const handleGalleryNext = () => {
    if (currentImgIndex < galleryImages.length - 1) {
      setCurrentImgIndex(prev => prev + 1);
      // If we just reached the last image, mark complete
      if (currentImgIndex + 1 === galleryImages.length - 1) {
        handleToggleCompletion(true);
      }
    } else {
      setCurrentImgIndex(0);
    }
  };

  const handleProgress = (state: { playedSeconds: number, played: number, loaded: number }) => {
    setPlayedSeconds(state.playedSeconds);

    // Auto-complete video if 90% watched
    if (activeContent?.type === ContentType.VIDEO && state.played > 0.9 && !completedItems.includes(activeContent.id)) {
      handleToggleCompletion(true);
    }

    // Debounced Progress Save to Backend
    if (activeUserId && course && activeContent) {
      if (progressSaveTimeout.current) clearTimeout(progressSaveTimeout.current);
      progressSaveTimeout.current = setTimeout(() => {
        backend.updateVideoProgress(activeUserId, course.id, activeContent.id, state.playedSeconds);
      }, 2000);
    }
  };

  const handleQuizSubmit = () => {
    if (!activeContent) return;
    let score = 0;
    quizQuestions.forEach(q => {
      if (quizAnswers[q.id] === q.correctOption) score++;
    });
    setQuizScore(score);
    setQuizSubmitted(true);

    const percentage = (score / quizQuestions.length) * 100;
    const passing = activeContent.passingScore || 60;

    if (activeUserId && course) {
      backend.saveQuizScore(activeUserId, course.id, activeContent.id, percentage);
    }

    if (percentage >= passing) {
      handleToggleCompletion(true);
      toast.success(`أحسنت! نتيجتك ${Math.round(percentage)}%`);
    } else {
      toast.error(`للأسف، نتيجتك ${Math.round(percentage)}%. حاول مرة أخرى.`);
    }
  };

  const changeContent = (item: ContentItem) => {
    setIsShowingStats(false);
    setActiveContent(item);
  };

  const isLastLessonObj = () => {
    if (!course || !activeModuleId || !activeContent) return false;
    const modIdx = course.modules.findIndex(m => m.id === activeModuleId);
    if (modIdx === -1) return false;
    const module = course.modules[modIdx];
    const currIdx = module.content.findIndex(c => c.id === activeContent.id);
    return modIdx === course.modules.length - 1 && currIdx === module.content.length - 1;
  };

  const nextLesson = () => {
    if (isShowingStats) return; // In stats view already
    if (!course || !activeModuleId || !activeContent) return;
    
    // If we're at the extremely last lesson, mark autocomplete and show stats
    if (isLastLessonObj()) {
      const totalItemsCount = course.modules.reduce((a, b) => a + b.content.length, 0);
      const currentCompleted = new Set(completedItems);
      if (!currentCompleted.has(activeContent.id)) {
        currentCompleted.add(activeContent.id);
      }
      
      if (currentCompleted.size < totalItemsCount) {
        toast.error('يجب إكمال جميع الدروس والوحدات السابقة لإنهاء الدورة.');
        return;
      }
      
      // Auto issue certificate
      if (course.certificateTemplateId) {
         const existingCerts = backend.getStudentCertificates(activeUserId || '');
         const alreadyIssued = existingCerts.some(c => c.templateId === course.certificateTemplateId);
         
         if (!alreadyIssued) {
             backend.issueCertificate({
                studentId: activeUserId || 'guest',
                templateId: course.certificateTemplateId,
                metadata: {
                    studentName: user?.fullName || 'زائر',
                    courseTitle: course.title,
                    date: new Date().toLocaleDateString('ar-SA')
                }
             });
             toast.success('تمت إضافة الشهادة إلى سجلك بنجاح!', { duration: 4000, icon: '🎓' });
         }
      }

      handleToggleCompletion(true);
      setIsShowingStats(true);
      return;
    }

    const module = course.modules.find(m => m.id === activeModuleId);
    if (!module) return;

    const currIdx = module.content.findIndex(c => c.id === activeContent.id);
    if (currIdx < module.content.length - 1) {
      setActiveContent(module.content[currIdx + 1]);
    } else {
      // Find next module
      const modIdx = course.modules.findIndex(m => m.id === activeModuleId);
      if (modIdx < course.modules.length - 1) {
        const nextMod = course.modules[modIdx + 1];

        if (isModuleLocked(nextMod)) {
          toast('انتهيت من هذه الوحدة! أكمل جميع الدروس لفتح الوحدة التالية.', { icon: '🔒' });
          return;
        }

        setActiveModuleId(nextMod.id);
        if (nextMod.content.length > 0) setActiveContent(nextMod.content[0]);
      }
    }
  };

  // Certificate Logic
  const issueCertificateIfNeeded = () => {
    if (!course || !course.certificateTemplateId) return;

    // Check if truly completed all items
    const allItems = course.modules.flatMap(m => m.content).map(item => item.id);
    const completedCount = allItems.filter(id => completedItems.includes(id)).length;
    // Add current one if not registered yet natively
    const totalCount = allItems.length;

    if (completedCount >= totalCount) {
        // Automatically issue if needed
        const existingCerts = backend.getStudentCertificates(activeUserId || '');
        const alreadyIssued = existingCerts.some(c => c.templateId === course.certificateTemplateId);

        if (!alreadyIssued) {
            backend.issueCertificate({
                studentId: activeUserId || 'guest',
                templateId: course.certificateTemplateId,
                metadata: {
                    studentName: user?.fullName || 'زائر',
                    courseTitle: course.title,
                    date: new Date().toLocaleDateString('ar-SA')
                }
            });
            // Removed automatic toast notification for issuing to keep it to manual checking in stats
        }
    }
  };

  const isModuleLocked = (module: Module): boolean => {
    if (!module.prerequisiteModuleId || !course) return false;

    // Admin/Teacher bypass
    if (user?.role === 'admin' || user?.role === 'teacher') return false;

    const prereqModule = course.modules.find(m => m.id === module.prerequisiteModuleId);
    if (!prereqModule) return false;

    // Check if all content in prerequisite module is completed
    const isPrereqComplete = prereqModule.content.every(c => completedItems.includes(c.id));
    return !isPrereqComplete;
  };

  if (!course) return <div className="p-8 text-center dark:text-white">جاري التحميل...</div>;

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-gray-100 dark:bg-slate-950">

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden flex-col lg:flex-row">

        {/* RIGHT: Content Player */}
        <div className="flex-1 overflow-y-auto bg-black flex flex-col items-center justify-start relative scrollbar-hide">

          <div className="w-full max-w-5xl mx-auto my-auto p-4 md:p-8">
            {isShowingStats ? (
                <CourseStatsPanel 
                   course={course} 
                   activeUserId={activeUserId || ''} 
                   onRestart={() => {
                       if (window.confirm('هل أنت متأكد من إعادة الدورة وحذف جميع التقدم السابق؟')) {
                           backend.resetCourseProgress(activeUserId || '', course.id);
                           setCompletedItems([]);
                           setIsShowingStats(false);
                           if (course.modules?.[0]?.content?.[0]) {
                               setActiveModuleId(course.modules[0].id);
                               setActiveContent(course.modules[0].content[0]);
                           }
                           toast.success('تم إعادة ضبط الدورة بنجاح');
                       }
                   }}
                />
            ) : activeContent ? (
              <>
                {/* VIDEO PLAYER */}
                {activeContent.type === ContentType.VIDEO && (
                  <div className="space-y-4">
                    <div className="relative bg-black rounded-xl overflow-hidden shadow-2xl aspect-video group">
                      <ReactPlayer
                        ref={playerRef}
                        url={activeContent.url}
                        width="100%"
                        height="100%"
                        controls={true}
                        playing={true}
                        playbackRate={playbackRate}
                        pip={pip}
                        onProgress={handleProgress}
                        onDuration={setVideoDuration}
                        config={{
                          youtube: { playerVars: { showinfo: 0 } },
                          file: { attributes: { controlsList: 'nodownload' } }
                        }}
                      />
                    </div>

                    {/* Video Controls Bar */}
                    <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-3 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm animate-fade-in">
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-bold text-gray-500 dark:text-gray-400 flex items-center gap-2">
                          <Gauge size={16} /> سرعة التشغيل:
                        </span>
                        <div className="flex bg-gray-100 dark:bg-slate-800 rounded-lg p-1">
                          {[0.5, 1.0, 1.5, 2.0].map(rate => (
                            <button
                              key={rate}
                              onClick={() => setPlaybackRate(rate)}
                              className={`px-3 py-1 text-xs font-bold rounded-md transition ${playbackRate === rate ? 'bg-white dark:bg-slate-600 shadow text-primary-600 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
                            >
                              {rate}x
                            </button>
                          ))}
                        </div>
                      </div>

                      <button
                        onClick={() => setPip(!pip)}
                        className={`p-2 rounded-lg transition ${pip ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800'}`}
                        title="صورة داخل صورة"
                      >
                        {pip ? <PictureInPicture2 size={20} /> : <PictureInPicture size={20} />}
                      </button>
                    </div>
                  </div>
                )}

                {/* ARTICLE VIEWER */}
                {activeContent.type === ContentType.ARTICLE && (
                  <div className="bg-white dark:bg-slate-900 rounded-xl p-6 sm:p-10 shadow-lg border dark:border-slate-800 animate-in fade-in zoom-in-95">
                    <div className="flex justify-between items-start border-b dark:border-slate-800 pb-4 mb-8">
                        <h2 className="text-3xl font-black dark:text-white">{activeContent.title}</h2>
                        <button 
                            onClick={handleDownloadArticlePDF}
                            className="flex items-center gap-2 bg-gradient-to-r from-primary-500 to-secondary-500 hover:from-primary-600 hover:to-secondary-600 text-white px-4 py-2.5 rounded-xl font-bold transition-all duration-300 shadow-lg shadow-primary-500/30 hover:shadow-primary-500/50 hover:-translate-y-0.5 text-sm backdrop-blur-md"
                            title="تحميل كملف PDF"
                        >
                            <Download size={18} />
                            <span className="hidden sm:inline">تحميل كملف PDF</span>
                        </button>
                    </div>
                    <div 
                      id="article-content-wrapper"
                      className="prose dark:prose-invert max-w-none prose-lg"
                      dangerouslySetInnerHTML={{ __html: activeContent.content || '' }} 
                    />
                    
                    {/* Mark as complete button for article */}
                    {!completedItems.includes(activeContent.id) && (
                      <div className="mt-12 flex justify-center">
                        <button 
                           onClick={() => handleToggleCompletion(true)}
                           className="bg-primary-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-primary-700 transition"
                        >
                          إنهاء الدرس والمتابعة
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* PDF VIEWER */}
                {activeContent.type === ContentType.PDF && (
                  <div className="bg-white dark:bg-slate-900 rounded-xl h-[80vh] flex flex-col items-center justify-center p-8 text-center border dark:border-slate-800">
                    <FileText size={64} className="text-gray-300 mb-4" />
                    <h3 className="text-xl font-bold mb-2 dark:text-white">ملف PDF مرفق</h3>
                    <p className="text-gray-500 mb-6">للحصول على أفضل تجربة، يمكنك تحميل الملف أو عرضه خارجياً.</p>
                    <a
                      href={activeContent.url}
                      target="_blank"
                      rel="noreferrer"
                      className="bg-primary-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-primary-700 flex items-center gap-2"
                    >
                      <ExternalLink size={18} /> فتح الملف
                    </a>
                  </div>
                )}

                {/* QUIZ PLAYER */}
                {activeContent.type === ContentType.QUIZ && (
                  <div className="bg-white dark:bg-slate-900 rounded-xl p-8 max-w-2xl mx-auto shadow-lg border dark:border-slate-800">
                    <div className="text-center mb-8">
                      <h2 className="text-2xl font-bold mb-2 dark:text-white">{activeContent.title}</h2>
                      <div className="text-sm text-gray-500">أجب على الأسئلة التالية لاجتياز الدرس</div>
                    </div>

                    {quizSubmitted ? (
                      <div className="text-center py-8">
                        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${quizScore / quizQuestions.length >= (activeContent.passingScore || 60) / 100 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                          <Trophy size={40} />
                        </div>
                        <h3 className="text-2xl font-bold mb-2 dark:text-white">
                          {quizScore / quizQuestions.length >= (activeContent.passingScore || 60) / 100 ? 'أحسنت!' : 'حاول مرة أخرى'}
                        </h3>
                        <p className="text-gray-500 mb-6">نتيجتك: {Math.round((quizScore / quizQuestions.length) * 100)}%</p>
                        <button onClick={() => { setQuizSubmitted(false); setQuizAnswers({}); }} className="text-primary-600 hover:underline">إعادة المحاولة</button>
                      </div>
                    ) : (
                      <div className="space-y-8">
                        {quizQuestions.map((q, idx) => (
                          <div key={q.id} className="border-b dark:border-slate-800 pb-6 last:border-0">
                            <h4 className="font-bold text-lg mb-4 dark:text-white flex gap-2">
                              <span className="text-primary-500">#{idx + 1}</span> {q.text}
                            </h4>
                            <div className="space-y-2">
                              {q.options.map((opt, optIdx) => (
                                <label key={optIdx} className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition ${quizAnswers[q.id] === optIdx ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800'}`}>
                                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${quizAnswers[q.id] === optIdx ? 'border-primary-500' : 'border-gray-300'}`}>
                                    {quizAnswers[q.id] === optIdx && <div className="w-2.5 h-2.5 bg-primary-500 rounded-full" />}
                                  </div>
                                  <input
                                    type="radio"
                                    name={`q-${q.id}`}
                                    className="hidden"
                                    checked={quizAnswers[q.id] === optIdx}
                                    onChange={() => setQuizAnswers({ ...quizAnswers, [q.id]: optIdx })}
                                  />
                                  <span className="dark:text-gray-200">{opt}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        ))}
                        <button
                          onClick={handleQuizSubmit}
                          disabled={Object.keys(quizAnswers).length < quizQuestions.length}
                          className="w-full bg-primary-600 text-white py-3 rounded-xl font-bold hover:bg-primary-700 disabled:opacity-50"
                        >
                          تسليم الإجابات
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* IMAGE GALLERY */}
                {activeContent.type === ContentType.IMAGE && galleryImages.length > 0 && (
                  <div className="relative bg-black rounded-xl overflow-hidden h-[70vh] flex items-center justify-center group">
                    <img
                      src={galleryImages[currentImgIndex]}
                      className="max-w-full max-h-full object-contain"
                      alt="Slide"
                    />

                    {galleryImages.length > 1 && (
                      <>
                        <button
                          onClick={() => setCurrentImgIndex(prev => prev > 0 ? prev - 1 : galleryImages.length - 1)}
                          className="absolute left-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/80 opacity-0 group-hover:opacity-100 transition"
                        >
                          <ChevronLeft />
                        </button>
                        <button
                          onClick={handleGalleryNext}
                          className="absolute right-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/80 opacity-0 group-hover:opacity-100 transition"
                        >
                          <ChevronRightIcon />
                        </button>
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 px-3 py-1 rounded-full text-white text-xs">
                          {currentImgIndex + 1} / {galleryImages.length}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-[50vh] text-gray-500">
                <PlayCircle size={64} className="mb-4 opacity-50" />
                <h2 className="text-xl font-bold">اختر درساً للبدء</h2>
              </div>
            )}

            {/* Bottom Navigation */}
            {activeContent && (
              <div className="flex justify-between items-center mt-6">
                <button
                  onClick={() => handleToggleCompletion()}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition ${completedItems.includes(activeContent.id) ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-gray-300 hover:bg-gray-200'}`}
                >
                  {completedItems.includes(activeContent.id) ? <CheckCircle size={20} /> : <Circle size={20} />}
                  {completedItems.includes(activeContent.id) ? 'مكتمل' : 'تحديد كمكتمل'}
                </button>

                <button
                  onClick={nextLesson}
                  className="flex items-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-primary-700 transition shadow-lg hover:shadow-xl hover:-translate-y-1"
                >
                  {isLastLessonObj() ? 'إنهاء الدورة' : 'الدرس التالي'}
                  {isLastLessonObj() ? <CheckCircle size={20} /> : <ArrowRight size={20} className="rtl:rotate-180" />}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* LEFT: Sidebar (Curriculum) */}
        <div className="w-full lg:w-96 bg-white dark:bg-slate-900 border-t lg:border-t-0 lg:border-r border-gray-200 dark:border-slate-800 flex flex-col h-[40vh] lg:h-full z-10">
          <div className="p-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900">
            <h2 className="font-bold text-gray-800 dark:text-white line-clamp-1">{course.title}</h2>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex justify-between">
              <span>{completedItems.length} من {course.modules.reduce((a, b) => a + b.content.length, 0)} درس</span>
              <span>{Math.round((completedItems.length / Math.max(1, course.modules.reduce((a, b) => a + b.content.length, 0))) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-slate-800 rounded-full h-1 mt-2">
              <div
                className="bg-green-500 h-1 rounded-full transition-all duration-500"
                style={{ width: `${(completedItems.length / Math.max(1, course.modules.reduce((a, b) => a + b.content.length, 0))) * 100}%` }}
              ></div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {course.modules.map((module) => (
              <div key={module.id} className="border-b border-gray-100 dark:border-slate-800 last:border-0 relative">
                <button
                  onClick={() => {
                    if (isModuleLocked(module)) {
                      toast.error('يجب إكمال الوحدة السابقة أولاً لفتح هذه الوحدة.');
                      return;
                    }
                    setIsShowingStats(false);
                    setActiveModuleId(activeModuleId === module.id ? '' : module.id);
                  }}
                  className={`w-full flex items-center justify-between p-4 transition text-right ${isModuleLocked(module) ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-slate-900' : 'hover:bg-gray-50 dark:hover:bg-slate-800'}`}
                >
                  <span className="font-bold text-sm text-gray-800 dark:text-gray-200 flex items-center gap-2">
                    {isModuleLocked(module) && <Lock size={14} className="text-gray-500" />}
                    {module.title}
                  </span>
                  {activeModuleId === module.id && !isShowingStats ? <ChevronDown size={16} /> : <ChevronLeft size={16} className="rtl:rotate-180" />}
                </button>

                {activeModuleId === module.id && !isShowingStats && (
                  <div className="bg-gray-50 dark:bg-slate-950/50 pb-2">
                    {module.content.map((item) => {
                      const isActive = activeContent?.id === item.id;
                      const isCompleted = completedItems.includes(item.id);
                      return (
                        <button
                          key={item.id}
                          onClick={() => changeContent(item)}
                          className={`w-full flex items-center gap-3 p-3 pl-4 pr-6 text-sm transition border-r-4 ${isActive
                            ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 border-primary-600'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 border-transparent'
                            }`}
                        >
                          <div className={`shrink-0 ${isCompleted ? 'text-green-500' : 'text-gray-400'}`}>
                            {isCompleted ? <CheckCircle size={16} /> :
                              item.type === ContentType.VIDEO ? <Play size={16} /> :
                                item.type === ContentType.QUIZ ? <HelpCircle size={16} /> :
                                  <FileText size={16} />}
                          </div>
                          <span className="flex-1 text-right line-clamp-1">{item.title}</span>
                          {item.duration && <span className="text-xs opacity-60">{item.duration}د</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
            
            {/* Statistics Tab */}
            {(completedItems.length >= course.modules.reduce((a, b) => a + b.content.length, 0) || isShowingStats) && (
              <div className="border-t-4 border-primary-500 dark:border-primary-600 bg-primary-50 dark:bg-primary-900/10">
                <button
                  onClick={() => setIsShowingStats(true)}
                  className={`w-full flex items-center justify-between p-4 transition text-right hover:bg-primary-100 dark:hover:bg-primary-900/30 ${isShowingStats ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 font-bold' : ''}`}
                >
                  <span className="font-bold text-sm flex items-center gap-2">
                    <Trophy size={16} className="text-yellow-500" />
                    الإحصائيات
                  </span>
                </button>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-gray-200 dark:border-slate-800 text-center flex flex-col gap-2">
            {!user && guestId && (
              <div className="text-xs text-amber-600 dark:text-amber-400 font-bold mb-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded">
                 أنت تتصفح كزائر. تقدمك محفوظ محلياً. 
                 <Link to="/login" className="underline mr-1 hover:text-amber-800 dark:hover:text-amber-200">سجل حساباً</Link>
                 لحفظ تقدمك دائماً.
              </div>
            )}
            <button onClick={() => navigate(-1)} className="text-sm text-gray-500 hover:text-gray-800 dark:hover:text-white">
              العودة للخلف
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoursePlayer;
