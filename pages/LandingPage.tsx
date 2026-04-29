
import React from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, Trophy, BarChart, ArrowRight, BookOpen } from 'lucide-react';

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-transparent">
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary-900 via-primary-700 to-primary-600 dark:from-slate-900 dark:via-primary-950 dark:to-primary-900 text-white rounded-3xl mx-auto my-4 shadow-2xl max-w-7xl mx-4 lg:mx-auto">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full text-sm font-medium mb-8 border border-white/20">
             ✨ نظام متكامل يحاكي بيئة قياس 2025
          </div>
          <h1 className="text-4xl md:text-7xl font-extrabold tracking-tight mb-6 leading-tight">
            أكاديمية المنارة
            <br />
            <span className="text-primary-200 text-3xl md:text-5xl mt-2 block">بوابتك للدرجة الكاملة</span>
          </h1>
          <p className="text-xl md:text-2xl text-primary-100 dark:text-gray-300 max-w-3xl mx-auto mb-10 leading-relaxed font-light">
            دليلك الشامل لاجتياز اختبارات القدرات والتحصيلي بأحدث الاستراتيجيات والذكاء الاصطناعي.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-6">
            <Link to="/tracks" className="flex items-center justify-center gap-3 px-8 py-5 bg-white text-primary-900 font-bold rounded-2xl hover:bg-gray-100 transition shadow-xl text-lg group">
              <BookOpen size={24} />
              ابدأ مسارك التعليمي
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform rtl:rotate-180" />
            </Link>
            <Link to="/exams" className="flex items-center justify-center gap-3 px-8 py-5 bg-primary-800/50 backdrop-blur-md text-white font-bold rounded-2xl hover:bg-primary-900/60 transition border border-white/20 text-lg">
              <Trophy size={24} className="text-yellow-400" />
              اختبارات تجريبية
            </Link>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="py-20 max-w-7xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">لماذا المنارة؟</h2>
          <p className="mt-4 text-gray-500 dark:text-gray-400">نحن لا نعلمك فقط، بل نجهزك للتفوق</p>
        </div>
        <div className="grid md:grid-cols-3 gap-10">
          <FeatureCard 
            icon={<Trophy size={40} className="text-yellow-500" />}
            title="محاكاة قياس 100%"
            desc="بيئة اختبار مطابقة تماماً لنظام قياس الحقيقي، مع مؤقت وضوابط أمنية، متاحة للجميع."
          />
          <FeatureCard 
            icon={<BarChart size={40} className="text-primary-500" />}
            title="تحليل فوري للنتائج"
            desc="احصل على شهادة فورية بدرجتك مع تحليل لنقاط القوة والضعف بعد كل اختبار."
          />
          <FeatureCard 
            icon={<GraduationCap size={40} className="text-secondary-500" />}
            title="تأسيس شامل"
            desc="دروس مسجلة وملاحظات تغطي كافة معايير القدرات (الكمي واللفظي) والتحصيلي."
          />
        </div>
      </div>
    </div>
  );
};

const FeatureCard = ({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) => (
  <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800 hover:shadow-2xl hover:border-primary-500/50 transition-all text-center hover:-translate-y-2 group">
    <div className="mb-4 flex justify-center p-4 bg-gray-50 dark:bg-slate-800 rounded-2xl w-fit mx-auto group-hover:bg-primary-500/10 transition">
      {icon}
    </div>
    <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">{title}</h3>
    <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm">{desc}</p>
  </div>
);

export default LandingPage;
