
import React, { useEffect, useState } from 'react';
import { backend } from '../services/mockBackend';
import { Exam, CourseCategory } from '../types';
import { Link } from 'react-router-dom';
import { Clock, CheckCircle, PlayCircle, ArrowRight, Search, Filter } from 'lucide-react';
import { CATEGORY_LABELS } from '../constants';
import CustomSelect from '../components/CustomSelect';

const PublicExamListPage = () => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [filteredExams, setFilteredExams] = useState<Exam[]>([]);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    const allExams = backend.getExams(true);
    setExams(allExams);
    setFilteredExams(allExams);
  }, []);

  useEffect(() => {
    let result = exams;

    // Filter by Search
    if (searchQuery) {
      result = result.filter(e => e.title.includes(searchQuery));
    }

    // Filter by Category
    if (selectedCategory !== 'all') {
      result = result.filter(e => e.category === selectedCategory);
    }

    setFilteredExams(result);
  }, [searchQuery, selectedCategory, exams]);

  const categoryOptions = [
    { value: 'all', label: 'جميع التصنيفات' },
    ...Object.entries(CATEGORY_LABELS).map(([key, label]) => ({
      value: key,
      label: label
    }))
  ];

  return (
    <div className="max-w-6xl mx-auto py-12 px-4 animate-fade-in">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 font-medium mb-8 transition-colors bg-white dark:bg-slate-900 px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-800 shadow-sm"
      >
        <ArrowRight size={20} />
        عودة للرئيسية
      </Link>

      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">اختبارات تجريبية عامة</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">جرب مستواك في اختبارات تحاكي قياس تماماً</p>
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-800 mb-8 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute right-3 top-3 text-gray-400" size={20} />
          <input
            className="w-full pl-4 pr-10 py-3 border border-gray-200 dark:border-slate-700 rounded-xl bg-gray-50 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none transition"
            placeholder="بحث عن اختبار..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="w-full md:w-64">
          <CustomSelect
            options={categoryOptions}
            value={selectedCategory}
            onChange={setSelectedCategory}
            placeholder="التصنيف"
            className="w-full"
          />
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredExams.map(exam => (
          <div key={exam.id} className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-800 p-6 flex flex-col relative overflow-hidden group hover:shadow-lg transition-all">
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary-50 dark:bg-primary-900/10 rounded-bl-[60px] -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>

            <div className="relative z-10">
              {exam.category && (
                <span className="inline-block px-2 py-1 mb-2 text-xs font-bold text-primary-600 bg-primary-100 dark:bg-primary-900/30 dark:text-primary-400 rounded-md">
                  {CATEGORY_LABELS[exam.category] || 'عام'}
                </span>
              )}
              <h3 className="font-bold text-xl text-gray-900 dark:text-white mb-4 line-clamp-1">{exam.title}</h3>
              <div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400 mb-8">
                <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-slate-800 px-3 py-1.5 rounded-lg">
                  <Clock size={16} className="text-primary-500" />
                  {exam.duration} دقيقة
                </div>
                <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-slate-800 px-3 py-1.5 rounded-lg">
                  <CheckCircle size={16} className="text-green-500" />
                  النجاح {exam.passingScore}%
                </div>
              </div>

              <div className="mt-auto">
                <Link
                  to={`/exam/${exam.id}/start`}
                  className="w-full flex items-center justify-center gap-2 bg-primary-600 text-white py-3.5 rounded-xl font-bold hover:bg-primary-700 transition shadow-md hover:shadow-lg hover:-translate-y-0.5"
                >
                  <PlayCircle size={20} />
                  بدء الاختبار الآن
                </Link>
                <p className="text-xs text-center text-gray-400 dark:text-gray-500 mt-3">لا يلزم تسجيل الدخول</p>
              </div>
            </div>
          </div>
        ))}

        {filteredExams.length === 0 && (
          <div className="col-span-full py-16 text-center border-2 border-dashed border-gray-200 dark:border-slate-800 rounded-2xl">
            <div className="mx-auto w-16 h-16 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 text-gray-400">
              <Filter size={32} />
            </div>
            <p className="text-gray-500 dark:text-gray-400 font-medium">لا توجد اختبارات تطابق بحثك.</p>
            <button
              onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}
              className="mt-4 text-primary-600 font-bold hover:underline"
            >
              إعادة تعيين الفلتر
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicExamListPage;
