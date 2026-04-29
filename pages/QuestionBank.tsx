
import React, { useState, useEffect } from 'react';
import { backend } from '../services/mockBackend';
import { aiService } from '../services/aiService';
import { Question, Subject } from '../types';
import { Search, Plus, Filter, Sparkles, Trash2, Check, X, Edit2, FileSpreadsheet } from 'lucide-react';
import toast from 'react-hot-toast';
import { SUBJECT_TRANSLATIONS } from '../constants';
import CustomSelect from '../components/CustomSelect';
import ImportQuestionsModal from '../components/ImportQuestionsModal';
import { ConfirmModal } from '../components/ConfirmModal';

const QuestionBank = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [search, setSearch] = useState('');
  const [filterSubject, setFilterSubject] = useState<string>('all');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');
  const [loadingAI, setLoadingAI] = useState(false);

  // Modal State
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { },
    type: 'danger' as 'danger' | 'info'
  });

  // New Question Form
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newQ, setNewQ] = useState<Partial<Question>>({
    text: '', options: ['', '', '', ''], correctOption: 0, subject: Subject.MATH, difficulty: 'medium'
  });

  // Bulk / AI Modal
  const [showAIModal, setShowAIModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [aiParams, setAiParams] = useState({ subject: 'Math', count: 3, topic: '' });

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = () => {
    setQuestions(backend.getQuestions());
  };

  const handleSaveQuestion = () => {
    if (!newQ.text) {
      toast.error('الرجاء إدخال نص السؤال');
      return;
    }

    if (editingId) {
      // Update existing question in-place (preserves ID references in exams)
      backend.updateQuestion(editingId, newQ as Question);
      toast.success('تم تحديث السؤال بنجاح');
    } else {
      // Create new
      backend.createQuestion(newQ as Question);
      toast.success('تم إضافة السؤال بنجاح');
    }

    setIsAdding(false);
    setEditingId(null);
    refreshData();
    setNewQ({ text: '', options: ['', '', '', ''], correctOption: 0, subject: Subject.MATH, difficulty: 'medium' });
  };

  const handleEdit = (q: Question) => {
    setNewQ(q);
    setEditingId(q.id);
    setIsAdding(true);
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll to form
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setNewQ({ text: '', options: ['', '', '', ''], correctOption: 0, subject: Subject.MATH, difficulty: 'medium' });
  }

  // ... (keep handleGenerateAI)

  const handleGenerateAI = async () => {
    setLoadingAI(true);
    try {
      const generated = await aiService.generateQuestions(aiParams.subject, aiParams.count, aiParams.topic);
      // Ensure unique questions (basic check)
      const existingTexts = new Set(questions.map(q => q.text));

      let addedCount = 0;
      generated.forEach((q: any) => {
        if (!existingTexts.has(q.text)) {
          backend.createQuestion({
            ...q,
            subject: aiParams.subject,
            tags: ['ai-generated', aiParams.topic]
          });
          addedCount++;
        }
      });
      toast.success(`تم توليد وإضافة ${addedCount} سؤال بنجاح!`);
      setShowAIModal(false);
      refreshData();
    } catch (e) {
      toast.error("حدث خطأ أثناء التوليد");
    } finally {
      setLoadingAI(false);
    }
  };

  const handleDelete = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'حذف السؤال',
      message: 'هل أنت متأكد من حذف هذا السؤال؟',
      type: 'danger',
      onConfirm: () => {
        backend.deleteQuestion(id);
        refreshData();
        toast.success('تم حذف السؤال');
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // ... (rest of filtering logic)
  const filteredQuestions = questions.filter(q => {
    // Filter out private questions (logic for Exam Builder specific questions)
    if (q.isPrivate) return false;

    const matchesSearch = q.text.includes(search) || q.tags?.some(t => t.includes(search));

    let matchesSubject = false;
    if (filterSubject === 'all') {
      matchesSubject = true;
    } else if (filterSubject === 'tahsili') {
      matchesSubject = [Subject.MATH, Subject.PHYSICS, Subject.CHEMISTRY, Subject.BIOLOGY].includes(q.subject as Subject);
    } else if (filterSubject === 'qudurat') {
      matchesSubject = [Subject.QUANT, Subject.VERBAL].includes(q.subject as Subject);
    } else {
      matchesSubject = q.subject === filterSubject;
    }

    const matchesDifficulty = filterDifficulty === 'all' || q.difficulty === filterDifficulty;
    return matchesSearch && matchesSubject && matchesDifficulty;
  });

  const subjectOptions = Object.values(Subject).map(s => ({
    value: s,
    label: SUBJECT_TRANSLATIONS[s] || s
  }));

  const filterSubjectOptions = [
    { value: 'all', label: 'جميع المواد' },
    { value: 'tahsili', label: 'تحصيلي (علمي)' },
    { value: 'qudurat', label: 'قدرات (عام)' },
    ...subjectOptions
  ];

  const difficultyOptions = [
    { value: 'easy', label: 'سهل' },
    { value: 'medium', label: 'متوسط' },
    { value: 'hard', label: 'صعب' }
  ];

  const filterDifficultyOptions = [
    { value: 'all', label: 'كل المستويات' },
    ...difficultyOptions
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">بنك الأسئلة المركزي</h1>
        <div className="flex gap-2 w-full md:w-auto">
          <button
            onClick={() => setShowAIModal(true)}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition shadow-sm text-sm font-bold"
          >
            <Sparkles size={18} />
            توليد ذكي
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition shadow-sm text-sm font-bold"
          >
            <FileSpreadsheet size={18} />
            استيراد
          </button>
          <button
            onClick={() => { setIsAdding(!isAdding); setEditingId(null); setNewQ({ text: '', options: ['', '', '', ''], correctOption: 0, subject: Subject.MATH, difficulty: 'medium' }); }}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition shadow-sm text-sm font-bold"
          >
            <Plus size={18} />
            {isAdding && !editingId ? 'إخفاء النموذج' : 'إضافة سؤال'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-800 flex flex-col md:flex-row gap-4 items-center">
        <div className="flex-1 relative w-full">
          <Search className="absolute right-3 top-3 text-gray-400" size={18} />
          <input
            className="w-full pl-4 pr-10 py-3 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none transition"
            placeholder="بحث في نص السؤال..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <div className="w-1/2 md:w-48">
            <CustomSelect
              options={filterSubjectOptions}
              value={filterSubject}
              onChange={setFilterSubject}
              placeholder="المادة"
            />
          </div>
          <div className="w-1/2 md:w-40">
            <CustomSelect
              options={filterDifficultyOptions}
              value={filterDifficulty}
              onChange={setFilterDifficulty}
              placeholder="الصعوبة"
            />
          </div>
        </div>
      </div>

      {/* Add/Edit Form */}
      {isAdding && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border-2 border-primary-100 dark:border-slate-700 shadow-sm animate-fade-in">
          <h3 className="font-bold mb-4 dark:text-white">{editingId ? 'تعديل السؤال' : 'إضافة سؤال جديد'}</h3>
          <div className="grid gap-4">
            <textarea
              className="w-full border dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white p-2 rounded-lg"
              placeholder="نص السؤال..."
              value={newQ.text}
              onChange={e => setNewQ({ ...newQ, text: e.target.value })}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {newQ.options?.map((opt, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <input
                    type="radio"
                    name="correct"
                    checked={newQ.correctOption === idx}
                    onChange={() => setNewQ({ ...newQ, correctOption: idx })}
                  />
                  <input
                    className="flex-1 border dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white p-2 rounded"
                    placeholder={`الخيار ${idx + 1}`}
                    value={opt}
                    onChange={e => {
                      const newOpts = [...(newQ.options || [])];
                      newOpts[idx] = e.target.value;
                      setNewQ({ ...newQ, options: newOpts });
                    }}
                  />
                </div>
              ))}
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <CustomSelect
                options={subjectOptions}
                value={newQ.subject as string}
                onChange={(val) => setNewQ({ ...newQ, subject: val })}
                placeholder="المادة"
              />
              <CustomSelect
                options={difficultyOptions}
                value={newQ.difficulty as string}
                onChange={(val) => setNewQ({ ...newQ, difficulty: val as any })}
                placeholder="الصعوبة"
              />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={handleCancel} className="px-4 py-2 text-gray-500 dark:text-gray-400">إلغاء</button>
              <button onClick={handleSaveQuestion} className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700">
                {editingId ? 'حفظ التغييرات' : 'حفظ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Question List */}
      <div className="grid gap-4">
        {filteredQuestions.map(q => (
          <div key={q.id} className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-gray-200 dark:border-slate-800 hover:shadow-sm transition group relative">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex gap-2 mb-2">
                  <span className="text-xs bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded text-gray-600 dark:text-gray-300 font-bold">{SUBJECT_TRANSLATIONS[q.subject as string] || q.subject}</span>
                  <span className={`text-xs px-2 py-1 rounded font-bold ${q.difficulty === 'hard' ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'}`}>
                    {q.difficulty === 'easy' ? 'سهل' : q.difficulty === 'medium' ? 'متوسط' : 'صعب'}
                  </span>
                  {q.tags?.includes('ai-generated') && (
                    <span className="text-xs bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-2 py-1 rounded flex items-center gap-1">
                      <Sparkles size={10} /> AI
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-lg text-gray-800 dark:text-white mb-3">{q.text}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-400">
                  {q.options.map((opt, idx) => (
                    <div key={idx} className={`flex items-center gap-2 ${idx === q.correctOption ? 'text-green-600 dark:text-green-400 font-bold' : ''}`}>
                      {idx === q.correctOption ? <Check size={14} /> : <div className="w-3.5" />}
                      {opt}
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition absolute left-4 top-4 md:static md:flex-row md:items-start bg-white dark:bg-slate-900 p-1 rounded shadow md:shadow-none">
                <button
                  onClick={() => handleEdit(q)}
                  className="text-gray-400 hover:text-blue-600 p-2"
                >
                  <Edit2 size={20} />
                </button>
                <button
                  onClick={() => handleDelete(q.id)}
                  className="text-gray-400 hover:text-red-500 p-2"
                >
                  <Trash2 size={20} />
                </button>
              </div>

            </div>
          </div>
        ))}
        {filteredQuestions.length === 0 && (
          <div className="text-center py-10 text-gray-400 dark:text-gray-500 border-2 border-dashed border-gray-200 dark:border-slate-800 rounded-xl">
            لا توجد أسئلة تطابق البحث
          </div>
        )}
      </div>

      {/* AI Modal */}
      {showAIModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md p-6 border dark:border-slate-700">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2 dark:text-white">
              <Sparkles className="text-purple-600" /> توليد أسئلة
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-1 dark:text-gray-300">المادة</label>
                <CustomSelect
                  options={subjectOptions}
                  value={aiParams.subject}
                  onChange={(val) => setAiParams({ ...aiParams, subject: val })}
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1 dark:text-gray-300">الموضوع (اختياري)</label>
                <input
                  className="w-full border dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-white p-2 rounded"
                  placeholder="مثال: الجبر، الكهرباء الساكنة"
                  value={aiParams.topic}
                  onChange={e => setAiParams({ ...aiParams, topic: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1 dark:text-gray-300">العدد</label>
                <input
                  type="number"
                  className="w-full border dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-white p-2 rounded"
                  min="1" max="10"
                  value={aiParams.count}
                  onChange={e => setAiParams({ ...aiParams, count: Number(e.target.value) })}
                />
              </div>
              <button
                onClick={handleGenerateAI}
                disabled={loadingAI}
                className="w-full bg-purple-600 text-white py-3 rounded-lg font-bold hover:bg-purple-700 disabled:opacity-50 flex justify-center items-center gap-2"
              >
                {loadingAI ? 'جاري التوليد والتحقق...' : 'توليد الأسئلة'}
              </button>
              <button onClick={() => setShowAIModal(false)} className="w-full text-gray-500 dark:text-gray-400 py-2 hover:text-gray-700 dark:hover:text-gray-200">إلغاء</button>
            </div>
          </div>
        </div>
      )}
      <ImportQuestionsModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={refreshData}
        existingQuestions={questions}
      />
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        type={confirmModal.type}
      />
    </div>
  );
};

export default QuestionBank;
