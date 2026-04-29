import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Course, UserRole } from '../types';
import { X, Video, Image as ImageIcon, Briefcase, List, CheckCircle2, ShieldAlert } from 'lucide-react';
import { CATEGORY_LABELS } from '../constants';
import { useAuth } from '../App';
import { backend } from '../services/mockBackend';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

interface Props {
  course: Course;
  onClose: () => void;
  onRegister: () => void;
}

export const CourseRegistrationModal: React.FC<Props> = ({ course, onClose, onRegister }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const config = course.landingPageConfig || {};
  const [guestName, setGuestName] = useState('');
  const [showNameInput, setShowNameInput] = useState(false);

  const handleRegisterClick = () => {
    if (user && (user.role === UserRole.TEACHER || user.role === UserRole.ADMIN)) {
      toast.error('عذراً، لا يمكنك التسجيل في الدورة بصفتك (معلم / مدير) للحفاظ على نزاهة بيانات الطلاب والإحصائيات.', { duration: 4000 });
      return;
    }

    if (!course.isPublic && !user) {
       toast.error('هذه الدورة خاصة وتتطلب امتلاك حساب وتسجيل الدخول.');
       return;
    }

    if (!user) {
       setShowNameInput(true);
       return;
    }

    // Direct registration for logged in user
    backend.enrollUser(user.id, course.id);
    toast.success('تم التسجيل في الدورة بنجاح!');
    onRegister();
  };

  const handleGuestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) {
      toast.error('الرجاء إدخال اسمك أولاً.');
      return;
    }
    
    try {
      // Check if guest exists in local storage
      let guestId = localStorage.getItem('almanara_guest_id');
      if (!guestId) {
        const gUser = backend.createGuestUser(guestName);
        guestId = gUser.id;
        localStorage.setItem('almanara_guest_id', guestId);
        localStorage.setItem('almanara_guest_name', guestName);
      }
      
      backend.enrollUser(guestId, course.id);
      toast.success('تم تسجيلك كزائر بنجاح! يتم حفظ تقدمك على متصفحك الحالي.');
      onRegister();
    } catch (error) {
      console.warn("localStorage is disabled or not available, proceeding without persistence.", error);
      // Still allow them to enroll in memory
      const gUser = backend.createGuestUser(guestName);
      backend.enrollUser(gUser.id, course.id);
      toast.success('تم تسجيلك كزائر بنجاح! (الوضع الخفي يمنع حفظ التقدم)');
      onRegister();
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 p-safe bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative animate-in fade-in zoom-in-95 duration-300">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 left-4 z-50 w-10 h-10 bg-black/50 hover:bg-black/70 text-white rounded-full flex justify-center items-center backdrop-blur-md transition-all"
        >
          <X size={20} />
        </button>

        {/* Header Media */}
        <div className="relative h-56 sm:h-72 w-full bg-slate-100 dark:bg-slate-800">
          {config.promoVideoUrl && config.promoVideoType === 'upload' ? (
            <video 
              src={config.promoVideoUrl} 
              className="w-full h-full object-cover"
              controls
              muted
            />
          ) : (
            <>
              {config.promoVideoUrl && (!config.promoVideoType || config.promoVideoType === 'youtube') && (
                <a 
                  href={config.promoVideoUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="absolute inset-0 bg-black/40 flex justify-center items-center group z-10 transition cursor-pointer"
                >
                  <div className="w-16 h-16 rounded-full bg-primary-600/90 text-white flex justify-center items-center shadow-2xl group-hover:scale-110 group-hover:bg-primary-500 transition-all pl-1">
                     <Video size={30} fill="white" />
                  </div>
                </a>
              )}

              {(config.useMainThumbnail ?? true) ? (
                 <img src={course.thumbnail} className="w-full h-full object-cover" alt={course.title} />
              ) : config.headerImage ? (
                 <img src={config.headerImage} className="w-full h-full object-cover" alt={course.title} />
              ) : (
                <div className="w-full h-full flex justify-center items-center text-gray-300">
                  <ImageIcon size={60} />
                </div>
              )}
            </>
          )}
          <div className="absolute bottom-0 inset-x-0 h-1/2 bg-gradient-to-t from-gray-900/90 to-transparent pointer-events-none"></div>
        </div>

        {/* Body */}
        <div className="p-6 sm:p-8 relative -mt-10 z-20">
          
          <div className="flex justify-between items-start mb-4">
             {config.showCategory ?? true ? (
               <span className="bg-primary-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
                 {CATEGORY_LABELS[course.category] || 'عام'}
               </span>
             ) : <div />}
             
             {!course.isPublic && (
                <span className="flex items-center gap-1 text-[10px] bg-amber-100 text-amber-700 px-2 py-1 rounded font-bold border border-amber-200">
                  <ShieldAlert size={12} /> تتطلب حساب
                </span>
             )}
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white mb-2 leading-tight">
            {config.welcomeTitle || course.title}
          </h2>

          <div 
            className="prose dark:prose-invert max-w-none text-gray-600 dark:text-gray-300 mb-8"
            dangerouslySetInnerHTML={{ __html: config.descriptionText || course.description || 'لا يوجد وصف.' }}
          />

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
             {(config.showLessonCount ?? true) && (
                <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-2xl text-center border border-gray-100 dark:border-slate-800">
                  <List className="mx-auto text-primary-500 mb-2" size={24} />
                  <div className="text-[11px] font-bold text-gray-500 dark:text-gray-400">عدد الدروس</div>
                  <div className="text-lg font-black text-gray-900 dark:text-white">
                    {course.modules.reduce((a, m) => a + m.content.length, 0)} درس
                  </div>
                </div>
             )}
             
             {config.customStats?.map((stat: any, idx: number) => (
               <div key={idx} className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-2xl text-center border border-gray-100 dark:border-slate-800">
                  <CheckCircle2 className="mx-auto text-blue-500 mb-2" size={24} />
                  <div className="text-[11px] font-bold text-gray-500 dark:text-gray-400">{stat.label}</div>
                  <div className="text-lg font-black text-gray-900 dark:text-white">{stat.value}</div>
               </div>
             ))}
          </div>

          {/* Registration Section */}
          <div className="bg-gray-50 dark:bg-slate-800/80 p-6 rounded-3xl border border-gray-100 dark:border-slate-700 text-center">
            
            {showNameInput ? (
               <form onSubmit={handleGuestSubmit} className="animate-fade-in text-right">
                 <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                   يرجى إدخال اسمك للبدء وتحليل نتائجك:
                 </label>
                 <input 
                   type="text"
                   autoFocus
                   value={guestName}
                   onChange={e => setGuestName(e.target.value)}
                   placeholder="الاسم الكامل"
                   className="w-full border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 dark:text-white rounded-xl p-3 mb-4 focus:ring-2 focus:ring-primary-500 outline-none"
                   required
                 />
                 <button type="submit" className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 rounded-xl shadow-lg transition-all">
                   تأكيد الاسم ودخول الدورة
                 </button>
                 <button type="button" onClick={() => setShowNameInput(false)} className="w-full mt-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                   تراجع
                 </button>
               </form>
            ) : (
               <>
                 <button onClick={handleRegisterClick} className="w-full bg-primary-600 hover:bg-primary-700 hover:scale-[1.02] text-white font-bold py-4 rounded-2xl shadow-xl shadow-primary-600/20 transition-all text-lg mb-3">
                   {(user?.enrolledCourses?.includes(course.id) || (localStorage.getItem('almanara_guest_id') && (localStorage.getItem('almanara_progress') || '').includes(course.id))) ? 'الدخول للدورة' : (config.registrationButtonText || 'التسجيل في الدورة')}
                 </button>
                 {!user && course.isPublic && (
                   <p className="text-xs text-gray-500 dark:text-gray-400">
                     ✨ دخول كزائر: يتم حفظ تقدمك محلياً في متصفحك.
                   </p>
                 )}
               </>
            )}

          </div>

        </div>
      </div>
    </div>,
    document.body
  );
};
