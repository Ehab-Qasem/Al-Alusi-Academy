
import React, { useState } from 'react';
import { Link, Routes, Route, useParams, useNavigate } from 'react-router-dom';
import { Calculator, Book, Beaker, Zap, Brain, Activity, ArrowRight, LayoutGrid, Layers, Search, Filter } from 'lucide-react';
import { backend } from '../services/mockBackend';
import { CourseCategory, Course, Subject } from '../types';
import { CATEGORY_LABELS, SUBJECT_TRANSLATIONS } from '../constants';
import CustomSelect from '../components/CustomSelect';
import { CourseRegistrationModal } from '../components/CourseRegistrationModal';
import { useAuth } from '../App';

const TrackSelectionPage = () => {
  return (
    <Routes>
      <Route index element={<MainSelection />} />
      <Route path="qudurat" element={<QuduratSelection />} />
      <Route path="tahsili" element={<TahsiliSelection />} />
      <Route path="courses/:category" element={<CourseList />} />
    </Routes>
  );
};

const BackButton = ({ to, label = "عودة للقائمة السابقة" }: { to: string, label?: string }) => (
  <Link 
    to={to} 
    className="inline-flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 font-medium mb-8 transition-colors bg-white dark:bg-slate-900 px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-800 shadow-sm hover:shadow"
  >
    <ArrowRight size={20} />
    {label}
  </Link>
);

const MainSelection = () => (
  <div className="max-w-5xl mx-auto py-12 px-4 animate-fade-in">
    <BackButton to="/" label="عودة للرئيسية" />
    
    <div className="text-center mb-16">
      <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-4">اختر المسار التعليمي</h1>
      <p className="text-lg text-gray-500 dark:text-gray-400">حدد هدفك وابدأ رحلة التفوق مع المنارة</p>
    </div>

    <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
      <Link to="/tracks/qudurat" className="group relative overflow-hidden bg-white dark:bg-slate-900 rounded-3xl shadow-lg border border-gray-100 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-2xl transition-all duration-300 p-8 flex flex-col items-center text-center">
        <div className="absolute inset-0 bg-blue-500/5 dark:bg-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <div className="w-28 h-28 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-300 shadow-inner">
          <Brain size={56} className="text-blue-600 dark:text-blue-400" />
        </div>
        <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">القدرات العامة</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-10 max-w-sm leading-relaxed">
          مسار شامل يغطي الجانب الكمي (الرياضيات) والجانب اللفظي (اللغة العربية) مع تأسيس وتدريب مكثف.
        </p>
        <div className="mt-auto px-8 py-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-bold rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-all w-full">
          دخول المسار
        </div>
      </Link>

      <Link to="/tracks/tahsili" className="group relative overflow-hidden bg-white dark:bg-slate-900 rounded-3xl shadow-lg border border-gray-100 dark:border-slate-800 hover:border-purple-500 dark:hover:border-purple-500 hover:shadow-2xl transition-all duration-300 p-8 flex flex-col items-center text-center">
        <div className="absolute inset-0 bg-purple-500/5 dark:bg-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <div className="w-28 h-28 bg-purple-50 dark:bg-purple-900/30 rounded-full flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-300 shadow-inner">
          <Beaker size={56} className="text-purple-600 dark:text-purple-400" />
        </div>
        <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">التحصيلي</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-10 max-w-sm leading-relaxed">
          مسار المواد العلمية للمرحلة الثانوية: رياضيات، فيزياء، كيمياء، وأحياء، شرح مبسط وشامل.
        </p>
        <div className="mt-auto px-8 py-3 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 font-bold rounded-xl group-hover:bg-purple-600 group-hover:text-white transition-all w-full">
          دخول المسار
        </div>
      </Link>
    </div>
  </div>
);

const QuduratSelection = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  const handleCourseClick = (c: Course) => {
    if (user?.enrolledCourses?.includes(c.id)) { return navigate(`/course/${c.id}`); }
    const guestId = localStorage.getItem('almanara_guest_id');
    const p = localStorage.getItem('almanara_progress') || '';
    if (!user && guestId && p.includes(c.id)) { return navigate(`/course/${c.id}`); }
    setSelectedCourse(c);
  };

  // Fetch general qudurat courses
  const generalCourses = backend.getCourses(CourseCategory.QUDURAT_GENERAL, true);

  return (
    <div className="max-w-6xl mx-auto py-12 px-4 animate-fade-in">
      {selectedCourse && (
        <CourseRegistrationModal 
          course={selectedCourse} 
          onClose={() => setSelectedCourse(null)} 
          onRegister={() => navigate(`/course/${selectedCourse.id}`)} 
        />
      )}
      <BackButton to="/tracks" label="العودة لاختيار المسار" />
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">مسارات القدرات</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">اختر القسم للبدء في الدروس</p>
      </div>
      
      {/* Sub Categories */}
      <div className="grid md:grid-cols-2 gap-6 mb-16">
        <Link to="/tracks/courses/qudurat_quant" className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 transition-all hover:-translate-y-1 flex items-center gap-6 group">
          <div className="bg-blue-100 dark:bg-blue-900/30 p-4 rounded-2xl group-hover:scale-110 transition-transform">
            <Calculator size={36} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">القسم الكمي</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">حساب، هندسة، جبر، وإحصاء</p>
          </div>
        </Link>
        <Link to="/tracks/courses/qudurat_verbal" className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-800 hover:border-green-500 dark:hover:border-green-500 transition-all hover:-translate-y-1 flex items-center gap-6 group">
          <div className="bg-green-100 dark:bg-green-900/30 p-4 rounded-2xl group-hover:scale-110 transition-transform">
            <Book size={36} className="text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">القسم اللفظي</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">تناظر، استيعاب مقروء، إكمال جمل</p>
          </div>
        </Link>
      </div>

      {/* General Courses Display */}
      {generalCourses.length > 0 && (
        <div className="border-t dark:border-slate-800 pt-10">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <Layers className="text-primary-600" />
            دورات القدرات العامة وشاملة
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {generalCourses.map(course => <CourseCard key={course.id} course={course} onClick={handleCourseClick} />)}
          </div>
        </div>
      )}
    </div>
  );
};

const TahsiliSelection = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  const handleCourseClick = (c: Course) => {
    if (user?.enrolledCourses?.includes(c.id)) { return navigate(`/course/${c.id}`); }
    const guestId = localStorage.getItem('almanara_guest_id');
    const p = localStorage.getItem('almanara_progress') || '';
    if (!user && guestId && p.includes(c.id)) { return navigate(`/course/${c.id}`); }
    setSelectedCourse(c);
  };

  // Fetch general tahsili courses
  const generalCourses = backend.getCourses(CourseCategory.TAHSILI_GENERAL, true);

  return (
    <div className="max-w-6xl mx-auto py-12 px-4 animate-fade-in">
      {selectedCourse && (
        <CourseRegistrationModal 
          course={selectedCourse} 
          onClose={() => setSelectedCourse(null)} 
          onRegister={() => navigate(`/course/${selectedCourse.id}`)} 
        />
      )}
      <BackButton to="/tracks" label="العودة لاختيار المسار" />
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">مواد التحصيلي</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">اختر المادة لتصفح الدورات المتاحة</p>
      </div>
      
      {/* Subject Categories */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
        <SubjectCard icon={<Calculator />} title="رياضيات" color="red" to="/tracks/courses/tahsili_math" />
        <SubjectCard icon={<Zap />} title="فيزياء" color="yellow" to="/tracks/courses/tahsili_physics" />
        <SubjectCard icon={<Beaker />} title="كيمياء" color="green" to="/tracks/courses/tahsili_chemistry" />
        <SubjectCard icon={<Activity />} title="أحياء" color="blue" to="/tracks/courses/tahsili_biology" />
      </div>

      {/* General Courses Display */}
      {generalCourses.length > 0 && (
        <div className="border-t dark:border-slate-800 pt-10">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <Layers className="text-primary-600" />
            دورات التحصيلي العامة وشاملة
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {generalCourses.map(course => <CourseCard key={course.id} course={course} onClick={handleCourseClick} />)}
          </div>
        </div>
      )}
    </div>
  );
};

const SubjectCard = ({ icon, title, color, to }: any) => {
  const colors: any = {
    red: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-900/30 hover:border-red-300',
    yellow: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 border-yellow-100 dark:border-yellow-900/30 hover:border-yellow-300',
    green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-100 dark:border-green-900/30 hover:border-green-300',
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/30 hover:border-blue-300'
  };
  return (
    <Link to={to} className={`flex flex-col items-center justify-center p-8 rounded-2xl border transition-all duration-300 hover:-translate-y-2 hover:shadow-lg ${colors[color]}`}>
      <div className="mb-4">{React.cloneElement(icon, { size: 40 })}</div>
      <span className="font-bold text-lg">{title}</span>
    </Link>
  );
};

// Reusable Course Card Component with Category
const CourseCard: React.FC<{ course: Course; onClick: (c: Course) => void }> = ({ course, onClick }) => (
  <button onClick={() => onClick(course)} className="text-right w-full group block bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden hover:shadow-xl hover:border-primary-500/30 transition-all duration-300">
    <div className="h-48 bg-gray-200 dark:bg-slate-800 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10"></div>
      <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
      <span className="absolute bottom-4 right-4 z-20 text-white font-bold text-lg shadow-black/50 drop-shadow-md">{course.title}</span>
    </div>
    <div className="p-6">
      <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-6 leading-relaxed">{course.description}</p>
      <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-slate-800">
         <div className="flex gap-2">
            <span className="text-xs bg-gray-100 dark:bg-slate-800 px-3 py-1 rounded-full text-gray-600 dark:text-gray-300 font-bold">
               {course.modules.length} وحدات
            </span>
            <span className="text-xs bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-full text-blue-600 dark:text-blue-400 font-bold">
               {CATEGORY_LABELS[course.category] || 'عام'}
            </span>
         </div>
         <span className="text-primary-600 dark:text-primary-400 font-bold text-sm group-hover:translate-x-[-4px] transition-transform flex items-center gap-1">
            تفاصيل الدورة <ArrowRight size={16} className="rtl:rotate-180" />
         </span>
      </div>
    </div>
  </button>
);

const CourseList = () => {
  const { category } = useParams<{category: string}>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSubject, setFilterSubject] = useState<string>('all');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  const handleCourseClick = (c: Course) => {
    if (user?.enrolledCourses?.includes(c.id)) { return navigate(`/course/${c.id}`); }
    const guestId = localStorage.getItem('almanara_guest_id');
    const p = localStorage.getItem('almanara_progress') || '';
    if (!user && guestId && p.includes(c.id)) { return navigate(`/course/${c.id}`); }
    setSelectedCourse(c);
  };

  // Filter courses to show ONLY published ones in public view
  const allCourses = backend.getCourses(category as CourseCategory, true);
  
  const filteredCourses = allCourses.filter(c => {
     const matchesSearch = c.title.includes(searchQuery);
     const matchesSubject = filterSubject === 'all' || c.subject === filterSubject;
     return matchesSearch && matchesSubject;
  });

  const handleBack = () => {
    if (category?.includes('qudurat')) {
      navigate('/tracks/qudurat');
    } else if (category?.includes('tahsili')) {
      navigate('/tracks/tahsili');
    } else {
      navigate('/tracks');
    }
  };

  const subjectOptions = [
    { value: 'all', label: 'جميع المواد' },
    ...Object.values(Subject).map(s => ({
      value: s,
      label: SUBJECT_TRANSLATIONS[s] || s
    }))
  ];

  return (
    <div className="max-w-6xl mx-auto py-12 px-4 animate-fade-in relative">
      {selectedCourse && (
        <CourseRegistrationModal 
          course={selectedCourse} 
          onClose={() => setSelectedCourse(null)} 
          onRegister={() => navigate(`/course/${selectedCourse.id}`)} 
        />
      )}
      <button 
        onClick={handleBack} 
        className="inline-flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 font-medium mb-8 transition-colors bg-white dark:bg-slate-900 px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-800 shadow-sm"
      >
        <ArrowRight size={20} />
        عودة للقائمة السابقة
      </button>

      <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <LayoutGrid className="text-primary-600" />
          الدورات المتاحة
        </h1>
        
        <div className="flex gap-2 w-full md:w-auto">
          <div className="w-full md:w-48">
             <CustomSelect 
               options={subjectOptions}
               value={filterSubject}
               onChange={setFilterSubject}
               placeholder="المادة"
               className="text-sm"
             />
          </div>
          <div className="relative flex-1 md:w-64">
            <Search className="absolute right-3 top-2.5 text-gray-400" size={18} />
            <input 
              className="w-full pl-4 pr-10 py-2 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none transition"
              placeholder="بحث في الدورات..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredCourses.map(course => <CourseCard key={course.id} course={course} onClick={handleCourseClick} />)}
        
        {filteredCourses.length === 0 && (
          <div className="col-span-full py-20 text-center border-2 border-dashed border-gray-200 dark:border-slate-800 rounded-2xl">
            <div className="w-20 h-20 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Book size={40} className="text-gray-400" />
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">لا توجد دورات متاحة في هذا القسم حالياً.</p>
            {(searchQuery || filterSubject !== 'all') && (
              <button 
                onClick={() => { setSearchQuery(''); setFilterSubject('all'); }}
                className="mt-2 text-primary-600 hover:underline text-sm"
              >
                مسح البحث والفلتر
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TrackSelectionPage;
