
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { backend } from '../services/mockBackend';
import { Question, Subject, Exam, ExamSection, CourseCategory, CertificateTemplate, ExamResult, User, UserRole } from '../types';
import { Plus, Save, Trash2, Search, Filter, Edit2, ArrowUp, ArrowDown, Play, Award, Info, AlertCircle, Lock, Unlock, Copy, Users, BarChart2, X, Check, Printer, FileDown, GripVertical, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { SUBJECT_TRANSLATIONS, CATEGORY_LABELS } from '../constants';
import CustomSelect from '../components/CustomSelect';
import { ConfirmModal } from '../components/ConfirmModal';

import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableQuestionCard(props: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
    opacity: isDragging ? 0.9 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} className="relative z-10">
      {props.children({ attributes, listeners, isDragging })}
    </div>
  );
}

const CategorySubjectMap: Record<string, Subject[]> = {
  [CourseCategory.QUDURAT_GENERAL]: [Subject.QUANT, Subject.VERBAL],
  [CourseCategory.QUDURAT_QUANT]: [Subject.QUANT],
  [CourseCategory.QUDURAT_VERBAL]: [Subject.VERBAL],
  [CourseCategory.TAHSILI_GENERAL]: [Subject.MATH, Subject.PHYSICS, Subject.CHEMISTRY, Subject.BIOLOGY],
  [CourseCategory.TAHSILI_MATH]: [Subject.MATH],
  [CourseCategory.TAHSILI_PHYSICS]: [Subject.PHYSICS],
  [CourseCategory.TAHSILI_BIOLOGY]: [Subject.BIOLOGY],
  [CourseCategory.TAHSILI_CHEMISTRY]: [Subject.CHEMISTRY],
};

const AdminExamBuilder = () => {
  const [view, setView] = useState<'list' | 'create'>('list');
  const [questions, setQuestions] = useState<Question[]>(backend.getQuestions());
  const [templates, setTemplates] = useState<CertificateTemplate[]>([]);

  const handleDuplicate = (id: string) => {
    const duplicated = backend.duplicateExam(id);
    if (duplicated) {
      toast.success('تم نسخ الاختبار بنجاح');
      setView('create');
      setTimeout(() => setView('list'), 10);
    }
  };

  // Modal State
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { },
    type: 'danger' as 'danger' | 'info'
  });

  // --- Exam Statistics State ---
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [selectedStatsExam, setSelectedStatsExam] = useState<Exam | null>(null);
  const [statsResults, setStatsResults] = useState<ExamResult[]>([]);
  const [statsSearch, setStatsSearch] = useState('');
  const [statsSortBy, setStatsSortBy] = useState<'score_desc' | 'name_asc' | 'date_desc'>('score_desc');
  const [statsRoleFilter, setStatsRoleFilter] = useState({ student: true, user: true, guest: true });
  const [statsGrade, setStatsGrade] = useState('');
  const [statsSection, setStatsSection] = useState('');

  const openStatsModal = (exam: Exam) => {
    setSelectedStatsExam(exam);
    setStatsResults(backend.getResults().filter(r => r.examId === exam.id));
    setShowStatsModal(true);
    setStatsSearch('');
    setStatsRoleFilter({ student: true, user: true, guest: true });
    setStatsGrade('');
    setStatsSection('');
  };

  // Create/Edit Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [examTitle, setExamTitle] = useState('');
  const [examDuration, setExamDuration] = useState(60);
  const [examPassingScore, setExamPassingScore] = useState(60);
  const [examCategory, setExamCategory] = useState<CourseCategory | ''>('');
  const [examCertTemplateId, setExamCertTemplateId] = useState<string>('');
  const [isPublished, setIsPublished] = useState(false);

  // Phase 4 Settings
  const [examType, setExamType] = useState<'practice' | 'simulation'>('simulation');
  const [randomizeQuestions, setRandomizeQuestions] = useState(false);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  // Phase 4.5: Advanced Timing
  const [autoDistributeTime, setAutoDistributeTime] = useState(true);

  const [sections, setSections] = useState<ExamSection[]>([
    { id: 's1', title: 'القسم الأول', duration: 60, questionIds: [] } // Default matches examDuration
  ]);

  const handleCategoryChange = (newCat: CourseCategory) => {
    if (!newCat) {
      setExamCategory('');
      return;
    }

    const allowedSubjects = CategorySubjectMap[newCat] || [];
    
    let hasViolation = false;
    sections.forEach(sec => {
      sec.questionIds.forEach(qId => {
        const q = questions.find(qu => qu.id === qId);
        if (q && !allowedSubjects.includes(q.subject as Subject)) {
          hasViolation = true;
        }
      });
    });

    if (hasViolation) {
      setConfirmModal({
        isOpen: true,
        title: 'تغيير فئة الاختبار',
        message: 'تغيير الفئة إلى خيار لا يشمل المواد الحالية سيؤدي إلى إلغاء تحديد بعض الأسئلة المتعارضة. هل تريد المتابعة؟',
        type: 'danger',
        onConfirm: () => {
          const newSections = sections.map(sec => ({
            ...sec,
            questionIds: sec.questionIds.filter(qId => {
              const q = questions.find(qu => qu.id === qId);
              return q && allowedSubjects.includes(q.subject as Subject);
            })
          }));
          setSections(newSections);
          setExamCategory(newCat);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      });
    } else {
      setExamCategory(newCat);
    }
  };

  // Question Selector State
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [searchQ, setSearchQ] = useState('');
  const [questionView, setQuestionView] = useState<'bank' | 'selected' | 'create'>('bank');

  // DND Setup
  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragQuestionEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id && selectedSectionId) {
      setSections(prev => prev.map(s => {
        if (s.id === selectedSectionId) {
          const oldIndex = s.questionIds.indexOf(active.id as string);
          const newIndex = s.questionIds.indexOf(over.id as string);
          if (oldIndex !== -1 && newIndex !== -1) {
            return {
              ...s,
              questionIds: arrayMove(s.questionIds, oldIndex, newIndex)
            };
          }
        }
        return s;
      }));
    }
  };

  // Manual Question Logic
  const [manualQ, setManualQ] = useState<Partial<Question>>({
    text: '',
    options: ['', '', '', ''],
    correctOption: 0,
    subject: '' as any,
    difficulty: 'medium',
  });
  const [addToBank, setAddToBank] = useState(false);

  const handleCancel = () => {
    const isDirty = examTitle !== '' || sections.some(s => s.questionIds.length > 0) || sections.length > 1;
    if (isDirty) {
      setConfirmModal({
        isOpen: true,
        title: 'تغييرات غير محفوظة',
        message: 'لديك تغييرات لم يتم حفظها، هل أنت متأكد من رغبتك بالخروج؟ (ستفقد كل تقدمك)',
        type: 'danger',
        onConfirm: () => {
          resetForm();
          setView('list');
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      });
    } else {
      resetForm();
      setView('list');
    }
  };

  useEffect(() => {
    const isDirty = examTitle !== '' || sections.some(s => s.questionIds.length > 0) || sections.length > 1;
    if (!isDirty || view !== 'create') return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [examTitle, sections, view]);

  // Filters
  const [filterSubject, setFilterSubject] = useState<string>('all');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');

  // Assignment State
  const [assignmentMode, setAssignmentMode] = useState<'all' | 'specific'>('all');
  const [selectedGrade, setSelectedGrade] = useState<string>('');
  const [selectedClassSection, setSelectedClassSection] = useState<string>('');
  const [assignedStudentIds, setAssignedStudentIds] = useState<string[]>([]);

  // Helper to get filtered students for selection
  const getFilteredStudents = () => {
    // backend.users is protected/private in mockBackend usually? 
    // Need backend.getUsers()
    let users = backend.getUsers().filter(u => u.role === 'student');
    if (selectedGrade) users = users.filter(u => u.gradeLevel === selectedGrade);
    if (selectedClassSection) users = users.filter(u => u.classSection === selectedClassSection);
    return users;
  };

  const toggleStudentAssignment = (studentId: string) => {
    setAssignedStudentIds(prev =>
      prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]
    );
  };

  const handleSelectAllStudents = () => {
    const visibleStudents = getFilteredStudents();
    const allIds = visibleStudents.map(s => s.id);
    const allSelected = allIds.every(id => assignedStudentIds.includes(id));

    if (allSelected) {
      setAssignedStudentIds(prev => prev.filter(id => !allIds.includes(id)));
    } else {
      const toAdd = allIds.filter(id => !assignedStudentIds.includes(id));
      setAssignedStudentIds(prev => [...prev, ...toAdd]);
    }
  };

  const handleSaveExam = () => {
    if (!examTitle) return toast.error('أدخل عنوان الاختبار');
    if (sections.length === 0) return toast.error('أضف قسم واحد على الأقل');

    // Validate Time
    const totalSectionTime = calculateTotalSectionTime(sections);
    if (totalSectionTime !== examDuration) {
      return toast.error(`مجموع مدد الأقسام (${totalSectionTime}د) يجب أن يساوي مدة الاختبار (${examDuration}د)`);
    }

    const examData: Partial<Exam> = {
      title: examTitle,
      duration: examDuration,
      passingScore: examPassingScore,
      isPublic: isPublished,
      type: examType,
      category: examCategory as CourseCategory,
      certificateTemplateId: examCertTemplateId || undefined,
      sections: sections,
      randomizeQuestions: randomizeQuestions,
      startTime: startTime || undefined,
      endTime: endTime || undefined,
      assignedTo: assignmentMode === 'specific' ? {
        gradeLevels: selectedGrade ? [selectedGrade] : [],
        classSections: selectedClassSection ? [selectedClassSection] : [],
        studentIds: assignedStudentIds
      } : undefined
    };

    if (editingId) {
      // Update
      const updated = { ...examData, id: editingId } as Exam;
      backend.saveExam(updated);
      toast.success('تم تحديث الاختبار');
    } else {
      backend.createExam(examData);
      toast.success('تم إنشاء الاختبار');
    }
    resetForm();
    setView('list');
  };

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const toastId = toast.loading('جاري استيراد الأسئلة...');
    try {
      const XLSX = await import('xlsx');
      const reader = new FileReader();

      reader.onload = (evt) => {
        try {
          const data = evt.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows: any[] = XLSX.utils.sheet_to_json(firstSheet);
          
          if (rows.length === 0) {
             toast.error('الملف فارغ!', { id: toastId });
             return;
          }

          const newQuestions: Question[] = [];
          
          rows.forEach((row, index) => {
             const text = row['السؤال'] || row['text'] || row['Question'];
             if (!text) return; // Skip invalid row

             const opt1 = row['خيار1'] || row['option1'] || row['Option 1'];
             const opt2 = row['خيار2'] || row['option2'] || row['Option 2'];
             const opt3 = row['خيار3'] || row['option3'] || row['Option 3'];
             const opt4 = row['خيار4'] || row['option4'] || row['Option 4'];
             
             const options = [opt1, opt2, opt3, opt4].filter(Boolean);
             if (options.length < 2) return; // Must have at least 2 options
             
             let correctRaw = row['الاجابة_الصحيحة'] || row['correct'] || row['Correct'];
             let correctIndex = 0;
             if (typeof correctRaw === 'number') {
                correctIndex = Math.max(0, Math.min(options.length - 1, correctRaw - 1));
             } else if (typeof correctRaw === 'string') {
                const parsed = parseInt(correctRaw);
                if (!isNaN(parsed)) {
                   correctIndex = Math.max(0, Math.min(options.length - 1, parsed - 1));
                } else {
                   correctIndex = options.findIndex(o => o == correctRaw);
                   if (correctIndex === -1) correctIndex = 0;
                }
             }

             const diffRaw = row['الصعوبة'] || row['difficulty'];
             const mappedDifficulty = diffRaw === 'صعب' ? 'hard' : (diffRaw === 'سهل' ? 'easy' : 'medium');
             
             newQuestions.push({
                 id: 'q_' + Date.now() + '_' + index + Math.random().toString(36).substr(2, 5),
                 text: String(text),
                 type: 'mcq',
                 options: options.map(String),
                 correctOption: correctIndex,
                 difficulty: mappedDifficulty,
                 subject: examCategory || 'عام',
                 isPrivate: true,
                 authorId: 'admin'
             } as Question);
          });

          if (newQuestions.length > 0) {
             newQuestions.forEach(q => backend.createQuestion(q));
             setQuestions(backend.getQuestions());

             if (selectedSectionId) {
                setSections(prev => prev.map(s => {
                    if (s.id === selectedSectionId) {
                        return { ...s, questionIds: [...s.questionIds, ...newQuestions.map(q => q.id)] };
                    }
                    return s;
                }));
             } else if (sections.length > 0) {
                // If no section selected, assign to first section
                setSections(prev => {
                  const updated = [...prev];
                  updated[0].questionIds = [...updated[0].questionIds, ...newQuestions.map(q => q.id)];
                  return updated;
                });
             }
             toast.success(`تم استيراد ${newQuestions.length} سؤال بنجاح!`, { id: toastId });
             setQuestionView('selected'); 
          } else {
             toast.error('لم يتم العثور على أسئلة صحيحة في الملف.', { id: toastId });
          }
        } catch(e) {
          console.error(e);
          toast.error('خطأ في قراءة ملف الإكسل', { id: toastId });
        }
      };

      reader.readAsBinaryString(file);
    } catch(err) {
      toast.error('أخفق تحميل مكتبة Excel', { id: toastId });
    }
  };
  const resetForm = () => {
    setEditingId(null);
    setExamTitle('');
    setExamDuration(60);
    setExamPassingScore(60);
    setExamCategory('');
    setExamCertTemplateId('');
    setIsPublished(false);
    setExamType('simulation');
    setRandomizeQuestions(false);
    setStartTime('');
    setEndTime('');
    setAutoDistributeTime(true);
    setSections([{ id: 's1', title: 'القسم الأول', duration: 60, questionIds: [] }]);
    setSelectedSectionId(null);
    // Assignment Reset
    setAssignmentMode('all');
    setSelectedGrade('');
    setSelectedClassSection('');
    setAssignedStudentIds([]);
  };

  const handleEdit = (exam: Exam) => {
    setEditingId(exam.id);
    setExamTitle(exam.title);
    setExamDuration(exam.duration);
    setExamPassingScore(exam.passingScore);
    setExamCategory(exam.category || '');
    setExamCertTemplateId(exam.certificateTemplateId || '');
    setIsPublished(exam.isPublic);
    setExamType(exam.type);
    setRandomizeQuestions(exam.randomizeQuestions || false);
    setStartTime(exam.startTime || '');
    setEndTime(exam.endTime || '');
    setSections(exam.sections);
    setAutoDistributeTime(false); // Default to manual when editing existing

    // Assignment Load
    if (exam.assignedTo) {
      setAssignmentMode('specific');
      setSelectedGrade(exam.assignedTo.gradeLevels?.[0] || '');
      setSelectedClassSection(exam.assignedTo.classSections?.[0] || '');
      setAssignedStudentIds(exam.assignedTo.studentIds || []);
    } else {
      setAssignmentMode('all');
      setSelectedGrade('');
      setSelectedClassSection('');
      setAssignedStudentIds([]);
    }

    setTemplates(backend.getCertificateTemplates());
    setView('create');
  };

  const handleDelete = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'حذف الاختبار',
      message: 'هل أنت متأكد من حذف هذا الاختبار؟ لا يمكن التراجع عن هذا الإجراء.',
      type: 'danger',
      onConfirm: () => {
        backend.deleteExam(id);
        toast.success('تم حذف الاختبار');
        setView('create');
        setTimeout(() => setView('list'), 10);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // --- Time Management Functions ---

  const calculateTotalSectionTime = (currentSections: ExamSection[]) => {
    return currentSections.reduce((sum, sec) => sum + sec.duration, 0);
  };

  const distributeTimeEqually = (totalDuration?: number) => {
    const duration = totalDuration || examDuration;
    const count = sections.length;
    if (count === 0) return;

    const perSection = Math.floor(duration / count);
    const remainder = duration % count;

    const newSections = sections.map((s, idx) => ({
      ...s,
      duration: idx === count - 1 ? perSection + remainder : perSection
    }));
    setSections(newSections);
  };

  const handleExamDurationChange = (newDuration: number) => {
    setExamDuration(newDuration);
    if (autoDistributeTime) {
      // Auto redistribute
      const count = sections.length;
      if (count === 0) return;
      const perSection = Math.floor(newDuration / count);
      const remainder = newDuration % count;
      setSections(prev => prev.map((s, idx) => ({
        ...s,
        duration: idx === count - 1 ? perSection + remainder : perSection
      })));
    }
  };

  const addSection = () => {
    if (autoDistributeTime) {
      const newCount = sections.length + 1;
      const perSection = Math.floor(examDuration / newCount);
      const remainder = examDuration % newCount;

      const newSections = sections.map(s => ({ ...s, duration: perSection }));
      newSections.push({
        id: `s${newCount}`,
        title: `القسم ${newCount}`,
        duration: perSection + remainder,
        questionIds: []
      });
      setSections(newSections);
    } else {
      const newCount = sections.length + 1;
      const perSection = Math.floor(examDuration / newCount);
      const remainder = examDuration % newCount;

      const newSections = sections.map(s => ({ ...s, duration: perSection }));
      newSections.push({
        id: `s${newCount}`,
        title: `القسم ${newCount}`,
        duration: perSection + remainder,
        questionIds: []
      });
      setSections(newSections);
    }
  };

  const updateSectionDuration = (id: string, newDuration: number) => {
    if (autoDistributeTime) return; // Locked

    const otherSections = sections.filter(s => s.id !== id);
    const otherTotal = calculateTotalSectionTime(otherSections);
    const maxAllowed = examDuration - otherTotal;

    let validDuration = newDuration;
    if (validDuration > maxAllowed) {
      validDuration = maxAllowed;
      toast.error(`لا يمكن تجاوز مدة الاختبار (${examDuration}د). الحد الأقصى لهذا القسم هو ${maxAllowed}د.`);
    }

    setSections(prev => prev.map(s => s.id === id ? { ...s, duration: validDuration } : s));
  };

  const handleManualDurationBlur = (id: string) => {
    const otherSections = sections.filter(s => s.id !== id);
    const otherTotal = calculateTotalSectionTime(otherSections);
    const currentSection = sections.find(s => s.id === id);
    if (!currentSection) return;

    const total = otherTotal + currentSection.duration;
    if (total < examDuration) {
      toast(`${examDuration - total} دقيقة غير مخصصة`, {
        icon: '⚠️',
        style: { borderRadius: '10px', background: '#333', color: '#fff' },
      });
    }
  };

  const toggleQuestionInSection = (qId: string) => {
    if (!selectedSectionId) return;

    setSections(prev => prev.map(s => {
      if (s.id !== selectedSectionId) return s;
      const ids = s.questionIds.includes(qId)
        ? s.questionIds.filter(id => id !== qId)
        : [...s.questionIds, qId];
      return { ...s, questionIds: ids };
    }));
  };

  const moveQuestion = (qId: string, direction: 'up' | 'down') => {
    if (!selectedSectionId) return;

    setSections(prev => prev.map(s => {
      if (s.id !== selectedSectionId) return s;
      const qIds = [...s.questionIds];
      const index = qIds.indexOf(qId);
      if (index === -1) return s;

      if (direction === 'up' && index === 0) return s;
      if (direction === 'down' && index === qIds.length - 1) return s;

      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      [qIds[index], qIds[targetIndex]] = [qIds[targetIndex], qIds[index]];

      return { ...s, questionIds: qIds };
    }));
  };

  const moveSection = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === sections.length - 1) return;

    const newSections = [...sections];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newSections[index], newSections[targetIndex]] = [newSections[targetIndex], newSections[index]];
    setSections(newSections);
  };

  const deleteSection = (index: number) => {
    if (sections.length <= 1) return toast.error('يجب أن يحتوي الاختبار على قسم واحد على الأقل');
    setConfirmModal({
      isOpen: true,
      title: 'حذف القسم',
      message: 'هل أنت متأكد من حذف هذا القسم؟ سيتم حذف جميع الأسئلة الموجودة فيه.',
      type: 'danger',
      onConfirm: () => {
        const newSections = sections.filter((_, i) => i !== index);
        setSections(newSections);
        if (selectedSectionId === sections[index].id) setSelectedSectionId(null);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };


  const handleCreateManualQuestion = () => {
    // Validate
    if (!manualQ.text || !manualQ.options?.every(o => o) || manualQ.correctOption === undefined) {
      toast.error('الرجاء تعبئة جميع الحقول الأساسية (السؤال، الخيارات، الإجابة الصحيحة)');
      return;
    }

    // If adding to bank, subject is required
    if (addToBank && (!manualQ.subject || manualQ.subject === 'all')) {
      toast.error('الرجاء اختيار مادة صحيحة لإضافة السؤال (لا يمكن ترك المادة فارغة)');
      return;
    }

    const defaultSubject = examCategory && CategorySubjectMap[examCategory]?.[0] ? CategorySubjectMap[examCategory][0] : Subject.MATH;
    const finalSubject = addToBank ? manualQ.subject! : defaultSubject;

    const newQ: Question = {
      id: `q_${Date.now()}`,
      text: manualQ.text,
      options: manualQ.options,
      correctOption: manualQ.correctOption,
      subject: finalSubject,
      difficulty: manualQ.difficulty as any,
      isPrivate: !addToBank,
      examId: !addToBank ? editingId || `temp_${Date.now()}` : undefined
    };

    // Auto-add condition
    if (selectedSectionId) {
      const isAllowed = !addToBank || (examCategory && (CategorySubjectMap[examCategory] || []).includes(newQ.subject as Subject));
      
      if (isAllowed) {
        const newSections = [...sections];
        const sectionIndex = newSections.findIndex(s => s.id === selectedSectionId);
        if (sectionIndex !== -1) {
          newSections[sectionIndex].questionIds.push(newQ.id);
          setSections(newSections);
          toast.success(addToBank ? 'تم إضافة السؤال للبنك وللقسم المختار' : 'تم إضافة السؤال للقسم المختار');
        }
      } else {
        toast.success('تم إضافة السؤال لبنك الأسئلة فقط (لم يُضف للقسم لعدم تطابق المادة)');
      }
    } else {
      toast.error('الرجاء تحديد القسم أولاً');
      return;
    }

    // Add to global state
    setQuestions([...questions, newQ]);

    // In real app: backend.createQuestion(newQ)
    backend.createQuestion(newQ);

    // Reset
    setManualQ({
      text: '',
      options: ['', '', '', ''],
      correctOption: 0,
      subject: '' as any,
      difficulty: 'medium',
    });
    setQuestionView('selected');
  };

  const handleDeletePrivateQuestion = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'حذف السؤال نهائياً',
      message: 'هذا سؤال خاص بهذا الاختبار. هل أنت متأكد من حذفه نهائياً؟',
      type: 'danger',
      onConfirm: () => {
        // Remove from sections
        const newSections = sections.map(s => ({
          ...s,
          questionIds: s.questionIds.filter(qId => qId !== id)
        }));
        setSections(newSections);

        // Remove from questions list
        setQuestions(prev => prev.filter(q => q.id !== id));

        // Remove from backend
        // backend.deleteQuestion(id); 

        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        toast.success('تم حذف السؤال نهائياً');
      }
    });
  };

  const subjectOptions = [
    { value: 'all', label: 'جميع المواد' },
    { value: 'tahsili', label: 'تحصيلي (علمي)' },
    { value: 'qudurat', label: 'قدرات (عام)' },
    ...Object.values(Subject).map(s => ({
      value: s,
      label: SUBJECT_TRANSLATIONS[s] || s
    }))
  ];

  const difficultyOptions = [
    { value: 'all', label: 'كل المستويات' },
    { value: 'easy', label: 'سهل' },
    { value: 'medium', label: 'متوسط' },
    { value: 'hard', label: 'صعب' }
  ];



  // Render Helper for Unallocated Time
  const renderTimeWarning = () => {
    const total = calculateTotalSectionTime(sections);
    const diff = examDuration - total;
    if (diff === 0) return null;

    return (
      <div className={`text-xs mt-1 font-bold flex items-center gap-1 ${diff > 0 ? 'text-orange-500' : 'text-red-500'}`}>
        <AlertCircle size={12} />
        {diff > 0
          ? `متبقي ${diff} دقيقة غير مخصصة`
          : `تجاوزت الوقت بـ ${Math.abs(diff)} دقيقة`}
      </div>
    );
  };





  // Render Helper for Stats Modal
  const renderStatsModal = () => {
    if (!showStatsModal || !selectedStatsExam) return null;

    const allUsersMap = new Map(backend.getUsers().map(u => [u.id, u]));

    let filtered = statsResults.map(r => {
      const u = r.userId ? allUsersMap.get(r.userId) : null;
      return {
        ...r,
        userRef: u,
        role: u ? u.role : (r.userId ? UserRole.EXTERNAL : UserRole.GUEST),
        name: u?.fullName || r.guestName || 'غير معروف',
        grade: u?.gradeLevel || '',
        section: u?.classSection || ''
      };
    });

    // 1. Filter by Role
    filtered = filtered.filter(f => {
      if (f.role === UserRole.STUDENT && !statsRoleFilter.student) return false;
      if (f.role === UserRole.EXTERNAL && !statsRoleFilter.user) return false;
      if (f.role === UserRole.GUEST && !statsRoleFilter.guest) return false;
      // Handle legacy empty string role or fallback
      if (![UserRole.STUDENT, UserRole.EXTERNAL, UserRole.GUEST].includes(f.role as any) && !statsRoleFilter.user) return false;
      return true;
    });

    // 2. Filter by Grade/Section
    if (statsGrade) {
      filtered = filtered.filter(f => f.role !== UserRole.STUDENT || f.grade === statsGrade);
    }
    if (statsSection) {
      filtered = filtered.filter(f => f.role !== UserRole.STUDENT || f.section === statsSection);
    }

    // 3. Search Name
    if (statsSearch) {
      filtered = filtered.filter(f => f.name.toLowerCase().includes(statsSearch.toLowerCase()));
    }

    // 4. Sorting
    filtered.sort((a, b) => {
      if (statsSortBy === 'score_desc') return b.score - a.score;
      if (statsSortBy === 'name_asc') return a.name.localeCompare(b.name, 'ar');
      if (statsSortBy === 'date_desc') {
         return new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime();
      }
      return 0;
    });

    const averageScore = filtered.length > 0 ? (filtered.reduce((sum, r) => sum + r.score, 0) / filtered.length).toFixed(1) : 0;
    const passCount = filtered.filter(r => r.isPassed).length;
    const passRate = filtered.length > 0 ? Math.round((passCount / filtered.length) * 100) : 0;

    const generateReportHTML = (filteredData: any[], wrapperOnly = false) => {
      const content = `
        <div class="report-wrapper" id="pdf-report-content">
          <style>
            ${wrapperOnly ? '.report-wrapper { font-family: Tahoma, Arial, sans-serif; padding: 20px; color: #111; line-height: 1.5; background: #fff; direction: rtl; width: 800px; }' : ''}
            .report-wrapper .header-section { text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 10px; margin-bottom: 20px; }
            .report-wrapper h1 { color: #2563eb; margin: 0 0 5px 0; font-size: 24px; }
            .report-wrapper h2 { color: #4b5563; margin: 0 0 15px 0; font-size: 18px; font-weight: normal; }
            .report-wrapper .exam-info { display: flex; justify-content: space-around; background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 20px; text-align: center; }
            .report-wrapper .exam-info div { font-size: 13px; color: #64748b; }
            .report-wrapper .exam-info div span { display: block; font-weight: bold; color: #1e293b; font-size: 16px; margin-top: 5px; }
            .report-wrapper table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            .report-wrapper th, .report-wrapper td { border: 1px solid #cbd5e1; padding: 10px 12px; text-align: right; font-size: 13px; }
            .report-wrapper th { background-color: #f1f5f9; font-weight: bold; color: #0f172a; }
            .report-wrapper thead { display: table-header-group; }
            .report-wrapper tfoot { display: table-footer-group; }
            .report-wrapper tr { page-break-inside: avoid; break-inside: avoid; }
            .report-wrapper tr:nth-child(even) { background-color: #f8fafc; }
            .report-wrapper .pass { color: #16a34a; font-weight: 700; }
            .report-wrapper .fail { color: #dc2626; font-weight: 700; }
            .report-wrapper .badge { display: inline-block; padding: 3px 6px; border-radius: 4px; font-size: 11px; background: #e0e7ff; color: #4338ca; white-space: nowrap; border: 1px solid #c7d2fe; }
          </style>
          <div class="header-section">
            <h1>تقرير نتائج الاختبار المتقدمة</h1>
            <h2>${selectedStatsExam?.title}</h2>
          </div>
          <div class="exam-info">
            <div>درجة الاجتياز <span>${selectedStatsExam?.passingScore}%</span></div>
            <div>المدة الزمنية <span>${selectedStatsExam?.duration} دقيقة</span></div>
            <div>عدد الأقسام <span>${selectedStatsExam?.sections?.length || 0}</span></div>
            <div>إجمالي المحاولات بالتقرير <span>${filteredData.length} محاولة</span></div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 5%">م</th>
                <th style="width: 35%">المختبر</th>
                <th style="width: 20%">الفئة/الفصل</th>
                <th style="width: 15%">الدرجة</th>
                <th style="width: 10%">الحالة</th>
                <th style="width: 15%">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              ${filteredData.map((row, i) => `
                <tr>
                  <td>${i + 1}</td>
                  <td><strong>${row.name}</strong></td>
                  <td><span class="badge">${row.role === 'student' ? (row.grade || 'طالب') + (row.section ? ' - ' + row.section : '') : row.role === 'guest' ? 'زائر' : 'خارجي'}</span></td>
                  <td dir="ltr" style="text-align: right"><strong>${row.score}%</strong></td>
                  <td class="${row.isPassed ? 'pass' : 'fail'}">${row.isPassed ? 'اجتاز' : 'لم يجتز'}</td>
                  <td dir="ltr" style="text-align: right;">${new Date(row.completedAt).toLocaleString('ar-SA')}</td>
                </tr>
              `).join('')}
              ${filteredData.length === 0 ? '<tr><td colspan="6" style="text-align:center; padding: 20px;">لا توجد بيانات مطابقة للفلاتر الحالية</td></tr>' : ''}
            </tbody>
          </table>
          <div style="margin-top: 30px; font-size: 11px; color: #64748b; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 10px;">
            تم إصدار هذا التقرير آلياً من الإدارة بتاريخ ${new Date().toLocaleString('ar-SA')}
          </div>
        </div>
      `;

      if (wrapperOnly) return `<div dir="rtl">${content}</div>`;

      return `
        <html dir="rtl" lang="ar">
          <head>
            <title>تقرير نتائج الاختبار - ${selectedStatsExam?.title}</title>
            <style>
              @page { size: A4 portrait; margin: 15mm; }
              body { margin: 0; padding: 0; font-family: Tahoma, Arial, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; background: #fff; }
            </style>
          </head>
          <body>${content}</body>
        </html>
      `;
    };

    const handleExport = async (filteredData: any[], mode: 'print' | 'pdf') => {
      if (mode === 'print') {
        const printWindow = window.open('', '', 'width=900,height=600');
        if (!printWindow) return;
        printWindow.document.write(generateReportHTML(filteredData));
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => printWindow.print(), 500);
      } else {
        const toastId = toast.loading('جاري توليد الـ PDF، يرجى الانتظار...');
        try {
          const { default: html2canvas } = await import('html2canvas');
          const { jsPDF } = await import('jspdf');

          const container = document.createElement('div');
          container.style.position = 'absolute';
          container.style.left = '-9999px';
          container.style.top = '0';
          container.innerHTML = generateReportHTML(filteredData, true);
          document.body.appendChild(container);

          await new Promise(res => setTimeout(res, 500)); // wait for DOM rendering

          const element = container.querySelector('#pdf-report-content') as HTMLElement;
          const canvas = await html2canvas(element, { scale: 2, useCORS: true, logging: false });
          document.body.removeChild(container);

          const imgData = canvas.toDataURL('image/jpeg', 1.0);
          const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
          
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pageHeight = pdf.internal.pageSize.getHeight();
          const imgHeight = (canvas.height * pdfWidth) / canvas.width;
          let heightLeft = imgHeight;
          let position = 0;

          pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);
          heightLeft -= pageHeight;

          while (heightLeft > 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);
            heightLeft -= pageHeight;
          }

          pdf.save(`تقرير_${selectedStatsExam?.title}.pdf`);
          toast.success('تم تحميل ملف PDF بنجاح!', { id: toastId });
        } catch (err) {
          console.error(err);
          toast.error('حدث خطأ أثناء تصدير الـ PDF', { id: toastId });
        }
      }
    };

    return createPortal(
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xl animate-in fade-in">
        <div className="bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-2xl w-[98vw] sm:w-[95vw] md:w-full max-w-6xl h-[95vh] rounded-2xl md:rounded-3xl border border-gray-300 dark:border-white/10 shadow-2xl flex flex-col relative overflow-hidden shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)]">
          {/* Background Blobs inside modal for Liquid Glass pop */}
          <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-primary-500/20 blur-[100px] rounded-full pointer-events-none" />
          <div className="absolute bottom-[-10%] left-[-5%] w-96 h-96 bg-blue-500/20 blur-[100px] rounded-full pointer-events-none" />

          {/* Header */}
          <div className="p-4 sm:p-6 border-b border-gray-200/60 dark:border-white/5 flex flex-wrap gap-4 justify-between items-center relative z-10 bg-white/40 dark:bg-slate-800/40 backdrop-blur-md">
            <div>
              <h2 className="text-xl sm:text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300">
                إحصائيات: {selectedStatsExam.title}
              </h2>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleExport(filtered, 'pdf')}
                className="p-2 sm:px-4 sm:py-2 flex items-center gap-2 font-bold text-sm bg-red-600 hover:bg-red-700 text-white rounded-xl transition-all shadow-md transform hover:scale-105"
                title="حفظ كملف PDF"
              >
                <FileDown size={18} />
                <span className="hidden sm:inline">حفظ PDF</span>
              </button>
              <button
                onClick={() => handleExport(filtered, 'print')}
                className="p-2 sm:px-4 sm:py-2 flex items-center gap-2 font-bold text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all shadow-md transform hover:scale-105"
                title="طباعة التقرير"
              >
                <Printer size={18} />
                <span className="hidden sm:inline">طباعة</span>
              </button>
              <div className="w-px bg-gray-300 dark:bg-slate-700 mx-1"></div>
              <button
                onClick={() => setShowStatsModal(false)}
                className="p-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 hover:border-red-200 rounded-xl transition-all shadow-sm group"
                title="إغلاق"
              >
                <X size={20} className="text-gray-600 dark:text-gray-300 group-hover:text-red-600" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 relative z-10 custom-scrollbar">
            {/* KPI Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl border border-gray-200 dark:border-white/5 p-5 rounded-3xl shadow-sm flex items-center justify-between transition-all hover:bg-white/80 dark:hover:bg-slate-800/80">
                <div>
                  <div className="text-sm font-bold text-gray-500 dark:text-gray-400">عدد المحاولات</div>
                  <div className="text-3xl font-black text-gray-800 dark:text-white mt-1">{filtered.length}</div>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-xl ring-4 ring-blue-50 dark:ring-blue-900/20">📝</div>
              </div>
              <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl border border-gray-200 dark:border-white/5 p-5 rounded-3xl shadow-sm flex items-center justify-between transition-all hover:bg-white/80 dark:hover:bg-slate-800/80">
                <div>
                  <div className="text-sm font-bold text-gray-500 dark:text-gray-400">متوسط الدرجات</div>
                  <div className="text-3xl font-black text-gray-800 dark:text-white mt-1">{averageScore}%</div>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold text-xl ring-4 ring-purple-50 dark:ring-purple-900/20">🎯</div>
              </div>
              <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl border border-gray-200 dark:border-white/5 p-5 rounded-3xl shadow-sm flex items-center justify-between transition-all hover:bg-white/80 dark:hover:bg-slate-800/80">
                <div>
                  <div className="text-sm font-bold text-gray-500 dark:text-gray-400">نسبة الاجتياز</div>
                  <div className="text-3xl font-black text-gray-800 dark:text-white mt-1">{passRate}%</div>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-green-100 dark:bg-green-900/40 flex items-center justify-center text-green-600 dark:text-green-400 font-bold text-xl ring-4 ring-green-50 dark:ring-green-900/20">🏆</div>
              </div>
            </div>

            {/* Filters Row */}
            <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl border border-gray-200 dark:border-white/5 p-5 rounded-3xl shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                {/* Search & Sort */}
                <div className="flex gap-3 flex-1 w-full md:w-auto">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="text"
                      className="w-full pl-10 pr-10 py-3 rounded-2xl border-0 bg-white/80 dark:bg-slate-900/60 dark:text-white shadow-inner font-medium focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                      placeholder="ابحث بالاسم..."
                      value={statsSearch}
                      onChange={e => setStatsSearch(e.target.value)}
                    />
                  </div>
                  <select
                    className="py-3 px-4 rounded-2xl border-0 font-medium bg-white/80 dark:bg-slate-900/60 dark:text-white shadow-inner focus:ring-2 focus:ring-primary-500 outline-none cursor-pointer transition-all"
                    value={statsSortBy}
                    onChange={e => setStatsSortBy(e.target.value as any)}
                  >
                    <option value="score_desc">الدرجة: الأفضل أولاً</option>
                    <option value="name_asc">الاسم: أبجدياً</option>
                    <option value="date_desc">التاريخ: الأحدث أولاً</option>
                  </select>
                </div>

                {/* Role Toggles */}
                <div className="flex gap-2 flex-wrap">
                  <label className={`cursor-pointer px-4 py-2.5 rounded-2xl text-sm font-bold flex items-center gap-2 border transition-all ${statsRoleFilter.student ? 'bg-primary-50 border-primary-200 text-primary-700 dark:bg-primary-900/40 dark:border-primary-800 dark:text-primary-300 shadow-sm transform scale-[1.02]' : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100 dark:bg-slate-800/60 dark:border-slate-700 dark:text-gray-400'}`}>
                    <input type="checkbox" className="hidden" checked={statsRoleFilter.student} onChange={e => setStatsRoleFilter(p => ({ ...p, student: e.target.checked }))} />
                    {statsRoleFilter.student && <Check size={16} />} الطلاب
                  </label>
                  <label className={`cursor-pointer px-4 py-2.5 rounded-2xl text-sm font-bold flex items-center gap-2 border transition-all ${statsRoleFilter.user ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/40 dark:border-indigo-800 dark:text-indigo-300 shadow-sm transform scale-[1.02]' : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100 dark:bg-slate-800/60 dark:border-slate-700 dark:text-gray-400'}`}>
                    <input type="checkbox" className="hidden" checked={statsRoleFilter.user} onChange={e => setStatsRoleFilter(p => ({ ...p, user: e.target.checked }))} />
                    {statsRoleFilter.user && <Check size={16} />} مستخدم خارجي
                  </label>
                  <label className={`cursor-pointer px-4 py-2.5 rounded-2xl text-sm font-bold flex items-center gap-2 border transition-all ${statsRoleFilter.guest ? 'bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-900/40 dark:border-orange-800 dark:text-orange-300 shadow-sm transform scale-[1.02]' : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100 dark:bg-slate-800/60 dark:border-slate-700 dark:text-gray-400'}`}>
                    <input type="checkbox" className="hidden" checked={statsRoleFilter.guest} onChange={e => setStatsRoleFilter(p => ({ ...p, guest: e.target.checked }))} />
                    {statsRoleFilter.guest && <Check size={16} />} زوار
                  </label>
                </div>
              </div>

              {/* Class & Section (Only if Student is enabled) */}
              {statsRoleFilter.student && (
                <div className="flex gap-3 pt-4 border-t border-gray-200/60 dark:border-white/5 animate-in slide-in-from-top-2">
                  <select
                    className="py-2.5 px-4 rounded-xl text-sm font-bold border-0 bg-white/80 dark:bg-slate-900/60 dark:text-white shadow-inner focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                    value={statsGrade}
                    onChange={e => { setStatsGrade(e.target.value); setStatsSection(''); }}
                  >
                    <option value="">كل الصفوف</option>
                    {backend.getGrades().map(g => <option key={g.id} value={g.name}>{g.name}</option>)}
                  </select>
                  <select
                    className="py-2.5 px-4 rounded-xl text-sm font-bold border-0 bg-white/80 dark:bg-slate-900/60 dark:text-white shadow-inner focus:ring-2 focus:ring-primary-500 outline-none transition-all disabled:opacity-50"
                    value={statsSection}
                    onChange={e => setStatsSection(e.target.value)}
                    disabled={!statsGrade}
                  >
                    <option value="">كل الشعب</option>
                    {backend.getGrades().find(g => g.name === statsGrade)?.sections.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Leaderboard Table */}
            <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl border border-gray-200 dark:border-white/5 rounded-3xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100/50 dark:bg-slate-900/50 border-b border-gray-200 dark:border-white/5 text-right text-sm font-bold text-gray-500 dark:text-gray-400">
                    <tr>
                      <th className="px-6 py-4">المختبر</th>
                      <th className="px-6 py-4">الفئة/الفصل</th>
                      <th className="px-6 py-4">الدرجة</th>
                      <th className="px-6 py-4">الحالة</th>
                      <th className="px-6 py-4">التاريخ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                    {filtered.length > 0 ? filtered.map((row, idx) => (
                      <tr key={row.id} className="hover:bg-white/80 dark:hover:bg-slate-800/80 transition-colors">
                        <td className="px-6 py-4 font-bold text-gray-800 dark:text-white">
                          <div className="flex items-center gap-3">
                            {idx < 3 && statsSortBy === 'score_desc' && (
                              <span className="text-2xl drop-shadow-sm">
                                {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                              </span>
                            )}
                            <span className={idx < 3 && statsSortBy === 'score_desc' ? 'font-black' : ''}>{row.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {row.role === UserRole.STUDENT ? (
                            <div className="text-xs font-bold text-primary-700 bg-primary-100/80 border border-primary-200 dark:bg-primary-900/30 dark:text-primary-300 dark:border-primary-800/50 px-2.5 py-1 rounded-lg inline-block shadow-sm">
                              {row.grade || 'طالب'} {row.section ? `- ${row.section}` : ''}
                            </div>
                          ) : row.role === UserRole.GUEST ? (
                            <div className="text-xs font-bold text-orange-700 bg-orange-100/80 border border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800/50 px-2.5 py-1 rounded-lg inline-block shadow-sm">
                              زائر
                            </div>
                          ) : (
                            <div className="text-xs font-bold text-indigo-700 bg-indigo-100/80 border border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800/50 px-2.5 py-1 rounded-lg inline-block shadow-sm">
                              مستخدم خارجي
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`font-black ${row.isPassed ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>{row.score}%</span>
                        </td>
                        <td className="px-6 py-4">
                          {row.isPassed ? (
                            <span className="text-xs font-bold text-green-700 bg-green-100/80 border border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800/50 px-2.5 py-1 rounded-lg shadow-sm">اجتاز</span>
                          ) : (
                            <span className="text-xs font-bold text-red-700 bg-red-100/80 border border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800/50 px-2.5 py-1 rounded-lg shadow-sm">لم يجتز</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-500 dark:text-gray-400" dir="ltr">
                          {new Date(row.completedAt).toLocaleString('ar-SA')}
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center">
                          <div className="flex flex-col items-center gap-3 text-gray-400 dark:text-slate-500">
                            <Info size={32} />
                            <span className="font-bold">لا توجد نتائج مطابقة للبحث والفلاتر</span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>,
      document.body
    );
  };


  if (view === 'list') {
    return (
      <div className="bg-slate-50/80 dark:bg-slate-900/60 backdrop-blur-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] p-8 rounded-3xl border border-gray-300 dark:border-slate-700/50 relative overflow-hidden">
        {/* Decorative gradient blobs for list view background */}
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-primary-500/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] bg-blue-500/10 blur-[100px] rounded-full pointer-events-none" />

        <div className="flex justify-between items-center mb-8 border-b border-gray-200/50 dark:border-slate-800/50 pb-6 relative z-10">
          <h2 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300">مكتبة الاختبارات</h2>
          <button
            onClick={() => setView('create')}
            className="bg-primary-600/90 backdrop-blur-md text-white px-5 py-2.5 rounded-2xl flex items-center gap-2 hover:bg-primary-700 hover:shadow-lg hover:shadow-primary-600/20 transition-all duration-300 font-medium"
          >
            <Plus size={18} /> إنشاء اختبار جديد
          </button>
        </div>
        <div className="space-y-4">
          {backend.getExams().map(exam => (
            <div key={exam.id} className="p-5 mb-4 bg-white/40 dark:bg-slate-800/40 backdrop-blur-md border border-white/50 dark:border-slate-700/50 rounded-2xl flex justify-between items-center hover:bg-white/80 dark:hover:bg-slate-800/80 transition-all duration-300 hover:shadow-xl hover:shadow-black/5 hover:-translate-y-0.5 group">
              <div>
                <h3 className="font-bold dark:text-white">{exam.title}</h3>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {exam.sections?.length || 0} أقسام • {exam.duration} دقيقة
                </div>
              </div>
              <span className={`px-2 py-1 rounded text-xs font-bold ${exam.isPublic ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-yellow-100'}`}>
                {exam.isPublic ? 'منشور' : 'مسودة'}
              </span>
              {exam.certificateTemplateId && (
                <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded text-xs font-bold flex items-center gap-1">
                  <Award size={14} /> شهادة
                </span>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => openStatsModal(exam)}
                  className="p-2 text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/30 rounded"
                  title="إحصائيات الاختبار"
                >
                  <BarChart2 size={18} />
                </button>
                <button
                  onClick={() => window.open(`#/exam/${exam.id}`, '_blank')}
                  className="p-2 text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/30 rounded"
                  title="معاينة الاختبار"
                >
                  <Play size={18} />
                </button>
                <button onClick={() => handleDuplicate(exam.id)} className="p-2 text-purple-600 hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-900/30 rounded" title="نسخ الاختبار"><Copy size={18} /></button>
                <button onClick={() => handleEdit(exam)} className="p-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30 rounded"><Edit2 size={18} /></button>
                <button onClick={() => handleDelete(exam.id)} className="p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30 rounded"><Trash2 size={18} /></button>
              </div>
            </div>
          ))}
        </div>
        {/* Modals */}
        {renderStatsModal()}
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
  }

  return (
    <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] p-8 rounded-3xl border border-white/50 dark:border-slate-700/50 relative overflow-hidden">
      {/* Decorative gradient blobs */}
      <div className="absolute top-[-10%] right-[-5%] w-[400px] h-[400px] bg-primary-500/10 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] bg-blue-500/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="flex justify-between items-center mb-8 border-b border-gray-200/50 dark:border-slate-800/50 pb-6 relative z-10">
        <h2 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300">منشئ الاختبارات المتقدم</h2>
        <div className="flex gap-3">
          <button onClick={handleCancel} className="px-5 py-2.5 bg-white/50 dark:bg-slate-800/50 backdrop-blur-md border-white/50 dark:border-slate-700/50 border rounded-2xl hover:bg-gray-50/80 dark:hover:bg-slate-800/80 dark:text-white transition-all duration-300 shadow-sm font-medium">إلغاء</button>
          <button onClick={handleSaveExam} className="px-5 py-2.5 bg-primary-600/90 backdrop-blur-md text-white rounded-2xl hover:bg-primary-700 hover:shadow-lg hover:shadow-primary-600/20 transition-all duration-300 flex items-center gap-2 font-medium">
            <Save size={18} /> {editingId ? 'حفظ التغييرات' : 'إنشاء ونشر'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
        {/* Settings Column */}
        <div className="col-span-1 space-y-6 p-6 bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl border border-white/50 dark:border-slate-700/50 rounded-3xl shadow-sm">
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">عنوان الاختبار</label>
            <input
              className="w-full border-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-lg dark:text-white p-3 rounded-2xl shadow-inner focus:ring-2 focus:ring-primary-500/50 transition-all duration-300"
              value={examTitle}
              onChange={e => setExamTitle(e.target.value)}
              placeholder="مثال: اختبار تحصيلي تجريبي 1"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">المدة (دقيقة)</label>
              <input
                type="number"
                className="w-full border-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-lg dark:text-white p-3 rounded-2xl shadow-inner focus:ring-2 focus:ring-primary-500/50 transition-all duration-300"
                value={examDuration}
                onChange={e => setExamDuration(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">درجة النجاح %</label>
              <input
                type="number"
                className="w-full border-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-lg dark:text-white p-3 rounded-2xl shadow-inner focus:ring-2 focus:ring-primary-500/50 transition-all duration-300"
                value={examPassingScore}
                onChange={e => setExamPassingScore(Number(e.target.value))}
              />
            </div>
          </div>


          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">الفئة (المسار)</label>
            <CustomSelect
              options={Object.values(CourseCategory).map(c => ({ value: c, label: CATEGORY_LABELS[c] || c }))}
              value={examCategory}
              onChange={(val) => handleCategoryChange(val as CourseCategory)}
              placeholder="اختر فئة الاختبار..."
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">قالب الشهادة (اختياري)</label>
            <select
              className="w-full border-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-lg dark:text-white p-3 rounded-2xl shadow-inner outline-none focus:ring-2 focus:ring-primary-500/50 transition-all duration-300"
              value={examCertTemplateId}
              onChange={e => setExamCertTemplateId(e.target.value)}
            >
              <option value="">لا توجد شهادة</option>
              {templates.filter(t => t.category === 'exam').map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <p className="text-xs text-gray-500 mt-1">سيتم منح هذه الشهادة تلقائياً للطالب عند اجتياز الاختبار.</p>
          </div>

          <div className="pt-4 border-t border-gray-200/50 dark:border-slate-700/50">
            <label className="flex items-center gap-4 cursor-pointer p-4 bg-white/50 dark:bg-slate-800/50 backdrop-blur-md rounded-2xl border border-white/40 dark:border-slate-700/40 hover:bg-white/80 dark:hover:bg-slate-800/80 transition-all duration-300 shadow-sm">
              <input
                type="checkbox"
                className="w-5 h-5 text-primary-600 rounded-md focus:ring-primary-500 shadow-sm"
                checked={isPublished}
                onChange={e => setIsPublished(e.target.checked)}
              />
              <div>
                <div className="font-bold text-gray-800 dark:text-white">نشر الاختبار</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">عند التفعيل، سيظهر الاختبار للطلاب المتاح لهم بالتطبيق.</div>
              </div>
            </label>
          </div>

          {/* Assignment UI - Phase 5 */}
          <div className="pt-4 border-t border-gray-200/50 dark:border-slate-700/50 space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <Users size={20} className="text-gray-500" />
              <h3 className="font-bold dark:text-white text-lg">التعيين والوصول</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
              <button
                onClick={() => setAssignmentMode('all')}
                className={`p-3 rounded-2xl border font-bold transition-all duration-300 ${assignmentMode === 'all' ? 'bg-blue-50/80 border-blue-400 text-blue-700 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-400 shadow-md transform scale-[1.02]' : 'bg-white/30 dark:bg-slate-800/30 border-white/40 dark:border-slate-700/50 dark:text-gray-400 backdrop-blur-md'}`}
              >
                الكل (متاح للجميع)
              </button>
              <button
                onClick={() => setAssignmentMode('specific')}
                className={`p-3 rounded-2xl border font-bold transition-all duration-300 ${assignmentMode === 'specific' ? 'bg-purple-50/80 border-purple-400 text-purple-700 dark:bg-purple-900/30 dark:border-purple-700 dark:text-purple-400 shadow-md transform scale-[1.02]' : 'bg-white/30 dark:bg-slate-800/30 border-white/40 dark:border-slate-700/50 dark:text-gray-400 backdrop-blur-md'}`}
              >
                طلاب أو صفوف محددة
              </button>
            </div>

            {assignmentMode === 'specific' && (
              <div className="space-y-4 animate-in slide-in-from-top-2 p-4 bg-white/50 dark:bg-slate-800/50 backdrop-blur-lg rounded-2xl border border-white/60 dark:border-slate-700/60 shadow-sm">
                {/* Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <select
                    className="text-sm p-3 rounded-xl border-0 bg-white/60 dark:bg-slate-900/60 shadow-inner dark:text-white outline-none focus:ring-2 focus:ring-primary-500/50 transition-all duration-300"
                    value={selectedGrade}
                    onChange={e => { setSelectedGrade(e.target.value); setSelectedClassSection(''); }}
                  >
                    <option value="">كل الصفوف</option>
                    {backend.getGrades().map(g => <option key={g.id} value={g.name}>{g.name}</option>)}
                  </select>
                  <select
                    className="text-sm p-3 rounded-xl border-0 bg-white/60 dark:bg-slate-900/60 shadow-inner dark:text-white outline-none focus:ring-2 focus:ring-primary-500/50 transition-all duration-300"
                    value={selectedClassSection}
                    onChange={e => setSelectedClassSection(e.target.value)}
                    disabled={!selectedGrade}
                  >
                    <option value="">كل الشعب</option>
                    {backend.getGrades().find(g => g.name === selectedGrade)?.sections.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                {/* Student List */}
                <div className="flex justify-between items-center px-2">
                  <span className="text-sm font-bold text-gray-500 dark:text-gray-400">قائمة الطلاب ({getFilteredStudents().length})</span>
                  <button onClick={handleSelectAllStudents} className="text-sm font-bold text-primary-600 hover:text-primary-700 bg-primary-50 px-3 py-1 rounded-lg">
                    تحديد/إلغاء الكل
                  </button>
                </div>

                <div className="h-48 overflow-y-auto rounded-xl bg-white/40 dark:bg-slate-900/40 shadow-inner p-2 space-y-1 custom-scrollbar border border-white/20 dark:border-white/5">
                  {getFilteredStudents().length > 0 ? getFilteredStudents().map(student => (
                    <label key={student.id} className="flex items-center gap-3 p-2.5 hover:bg-white/80 dark:hover:bg-slate-800/80 rounded-xl cursor-pointer transition-all duration-200">
                      <input
                         type="checkbox"
                         checked={assignedStudentIds.includes(student.id)}
                         onChange={() => toggleStudentAssignment(student.id)}
                         className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500"
                       />
                      <div className="flex-1">
                        <div className="text-sm font-bold dark:text-gray-200">{student.fullName}</div>
                        <div className="text-xs text-gray-400">{student.gradeLevel || 'بدون صف'} - {student.classSection || 'بدون شعبة'}</div>
                      </div>
                    </label>
                  )) : (
                    <div className="text-center text-gray-400 text-sm py-6">لا يوجد طلاب مطابقين للبحث</div>
                  )}
                </div>
                <div className="text-sm font-medium text-gray-500 text-center bg-gray-100/50 dark:bg-slate-800/50 rounded-lg py-2">
                  تم تحديد <span className="text-primary-600 font-bold">{assignedStudentIds.length}</span> طالب
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-gray-200/50 dark:border-slate-700/50 space-y-5">
            <h3 className="font-bold dark:text-white mb-2 text-lg">الإعدادات والجدولة</h3>

            {/* Exam Type */}
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">نوع الاختبار</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => setExamType('simulation')}
                  className={`p-3 rounded-2xl border font-bold transition-all duration-300 ${examType === 'simulation' ? 'bg-primary-50/80 border-primary-500 text-primary-700 dark:bg-primary-900/30 dark:border-primary-700 dark:text-primary-400 shadow-md' : 'bg-white/30 dark:bg-slate-800/30 border-white/40 dark:border-slate-700/50 dark:text-gray-400 backdrop-blur-md'}`}
                >
                  حقيقي (محاكاة)
                </button>
                <button
                  onClick={() => setExamType('practice')}
                  className={`p-3 rounded-2xl border font-bold transition-all duration-300 ${examType === 'practice' ? 'bg-green-50/80 border-green-500 text-green-700 dark:bg-green-900/30 dark:border-green-700 dark:text-green-400 shadow-md' : 'bg-white/30 dark:bg-slate-800/30 border-white/40 dark:border-slate-700/50 dark:text-gray-400 backdrop-blur-md'}`}
                >
                  تجريبي (تدريب)
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2 px-1">
                {examType === 'simulation' ? 'يتطلب تسجيل دخول، مؤقت صارم، وحساب النتيجة النهائية.' : 'يسمح للضيوف، إظهار الإجابات فوراً، ومرونة في الوقت.'}
              </p>
            </div>

            {/* Randomize */}
            <label className="flex items-center gap-3 cursor-pointer bg-white/50 dark:bg-slate-800/50 p-3 rounded-xl border border-white/40 dark:border-slate-700/40 hover:bg-white/80 dark:hover:bg-slate-800/80 transition-all duration-300 shadow-sm">
              <input
                type="checkbox"
                checked={randomizeQuestions}
                onChange={e => setRandomizeQuestions(e.target.checked)}
                className="w-5 h-5 text-primary-600 rounded-md focus:ring-primary-500"
              />
              <span className="text-sm font-bold dark:text-gray-200">خلط ترتيب الأسئلة عشوائياً للطالب</span>
            </label>

            {/* Scheduling */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-2">تاريخ البدء (اختياري)</label>
                <input
                  type="datetime-local"
                  className="w-full text-xs p-3 border-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-lg rounded-2xl shadow-inner dark:text-white focus:ring-2 focus:ring-primary-500/50 transition-all duration-300 outline-none"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-2">تاريخ الانتهاء (اختياري)</label>
                <input
                  type="datetime-local"
                  className="w-full text-xs p-3 border-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-lg rounded-2xl shadow-inner dark:text-white focus:ring-2 focus:ring-primary-500/50 transition-all duration-300 outline-none"
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-gray-200/50 dark:border-slate-700/50">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold dark:text-white flex items-center gap-2 text-lg">
                أقسام الاختبار
                <div className="group relative">
                  <Info size={16} className="text-gray-400 cursor-help hover:text-primary-500 transition-colors" />
                  <div className="absolute top-8 right-0 w-64 bg-gray-900/95 backdrop-blur-md text-white text-[11px] p-4 rounded-2xl shadow-xl z-20 hidden group-hover:block leading-relaxed border border-white/10">
                    <strong className="text-primary-400 text-sm mb-1 block">قواعد الوقت:</strong>
                    - يجب أن يساوي مجموع مدد الأقسام مدة الاختبار الكلية.<br />
                    - الوضع التلقائي يوزع الوقت بالتساوي.<br />
                    - الوضع اليدوي يسمح بالتخصيص بشرط عدم تجاوز الوقت الكلي.
                  </div>
                </div>
              </h3>
              <button
                onClick={() => {
                  if (!autoDistributeTime) distributeTimeEqually();
                  setAutoDistributeTime(!autoDistributeTime);
                }}
                className={`text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all duration-300 shadow-sm ${autoDistributeTime ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 ring-1 ring-blue-500/20' : 'bg-white/50 text-gray-600 dark:bg-slate-800/50 dark:text-gray-300 border border-white/40 dark:border-slate-700/50'}`}
                title={autoDistributeTime ? 'تعطيل التوزيع التلقائي' : 'تفعيل التوزيع التلقائي'}
              >
                {autoDistributeTime ? <Lock size={12} /> : <Unlock size={12} />}
                {autoDistributeTime ? 'تلقائي' : 'يدوي'}
              </button>
            </div>

            {renderTimeWarning()}

            <div className="flex justify-end mb-4">
              <button onClick={addSection} className="text-sm text-primary-600 dark:text-primary-400 font-bold hover:bg-primary-50 dark:hover:bg-primary-900/20 px-3 py-1.5 rounded-xl transition-colors">+ إضافة قسم</button>
            </div>

            <div className="space-y-3">
              {sections.map(section => (
                <div
                  key={section.id}
                  className={`p-4 rounded-2xl border transition-all duration-300 group cursor-pointer ${selectedSectionId === section.id ? 'border-primary-500/50 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl ring-2 ring-primary-500/30 shadow-lg shadow-primary-500/10 scale-[1.02]' : 'bg-white/40 dark:bg-slate-800/40 backdrop-blur-md border-white/50 dark:border-slate-700/50 hover:bg-white/60 dark:hover:bg-slate-800/60'}`}
                >
                  <div onClick={() => setSelectedSectionId(section.id)}>
                    <div className="flex justify-between text-sm font-bold items-center mb-2">
                      <input
                        value={section.title}
                        onChange={(e) => {
                          const newSections = [...sections];
                          newSections[sections.indexOf(section)].title = e.target.value;
                          setSections(newSections);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-transparent border-b border-transparent hover:border-gray-300/50 focus:border-primary-500 focus:outline-none dark:text-white w-full transition-colors pb-1"
                      />

                      <div className="flex items-center gap-2 w-28 shrink-0">
                        <input
                          type="number"
                          value={section.duration}
                          disabled={autoDistributeTime}
                          onChange={(e) => updateSectionDuration(section.id, Number(e.target.value))}
                          onBlur={() => handleManualDurationBlur(section.id)}
                          onClick={(e) => e.stopPropagation()}
                          className={`w-full text-xs p-2 rounded-xl text-center shadow-inner focus:outline-none transition-all duration-300 ${autoDistributeTime ? 'bg-gray-100/50 dark:bg-slate-900/50 text-gray-400 border-0' : 'bg-white dark:bg-slate-900 dark:text-white border-0 ring-1 ring-primary-300 focus:ring-2 focus:ring-primary-500'}`}
                        />
                        <span className="text-xs text-gray-500 font-medium font-mono">د</span>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                      <span className="inline-block bg-gray-100 dark:bg-slate-900 px-2 py-0.5 rounded-md">{section.questionIds.length}</span> أسئلة مختارة
                    </div>
                  </div>

                  {/* Section Actions */}
                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-200/50 dark:border-slate-700/50 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex gap-1 bg-white/50 dark:bg-slate-900/50 rounded-lg p-0.5">
                      <button onClick={(e) => { e.stopPropagation(); moveSection(sections.indexOf(section), 'up'); }} disabled={sections.indexOf(section) === 0} className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-white dark:hover:bg-slate-800 rounded-md disabled:opacity-30 transition-all"><ArrowUp size={14} /></button>
                      <button onClick={(e) => { e.stopPropagation(); moveSection(sections.indexOf(section), 'down'); }} disabled={sections.indexOf(section) === sections.length - 1} className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-white dark:hover:bg-slate-800 rounded-md disabled:opacity-30 transition-all"><ArrowDown size={14} /></button>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); deleteSection(sections.indexOf(section)); }} className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all"><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>



        {/* Question Bank Column */}
        <div className="col-span-1 lg:col-span-2 relative z-10 lg:pr-8">
          {/* Glass divider effect on desktop */}
          <div className="hidden lg:block absolute right-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-gray-300 dark:via-slate-700 to-transparent" />
          
          {!selectedSectionId ? (
            <div className="h-full min-h-[400px] flex items-center justify-center text-gray-500 dark:text-gray-400 bg-white/30 dark:bg-slate-800/30 backdrop-blur-md border-2 border-dashed border-gray-300/50 dark:border-slate-700/50 rounded-3xl p-10 text-lg font-medium shadow-inner">
              اختر قسماً من القائمة الرئيسية لإضافة الأسئلة إليه
            </div>
          ) : (
            <>
              <div className="space-y-4 mb-6">
                <div className="relative group">
                  <Search className="absolute right-4 top-3.5 text-gray-400 group-focus-within:text-primary-500 transition-colors" size={18} />
                  <input
                    className="w-full border-0 bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl shadow-[0_4px_15px_rgb(0,0,0,0.03)] dark:shadow-none dark:text-white rounded-2xl pr-12 pl-4 py-3 focus:ring-2 focus:ring-primary-500/50 transition-all duration-300 outline-none placeholder-gray-400"
                    placeholder="ابحث في فضاء بنك الأسئلة..."
                    value={searchQ}
                    onChange={e => setSearchQ(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-2xl shadow-sm border border-white/50 dark:border-slate-700/50 p-1">
                    <CustomSelect
                      options={subjectOptions}
                      value={filterSubject}
                      onChange={setFilterSubject}
                      placeholder="المادة"
                    />
                  </div>
                  <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-2xl shadow-sm border border-white/50 dark:border-slate-700/50 p-1">
                    <CustomSelect
                      options={difficultyOptions}
                      value={filterDifficulty}
                      onChange={setFilterDifficulty}
                      placeholder="الصعوبة"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center px-1 mb-4">
                <div className="flex bg-white/40 dark:bg-slate-800/40 backdrop-blur-md p-1.5 rounded-2xl border border-white/40 dark:border-white/5 shadow-inner">
                  <button
                    onClick={() => setQuestionView('bank')}
                    className={`px-4 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 ${questionView === 'bank' ? 'bg-white dark:bg-slate-700 shadow-md text-primary-600 dark:text-primary-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                  >
                    بنك الأسئلة
                  </button>
                  <button
                    onClick={() => setQuestionView('selected')}
                    className={`px-4 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 ${questionView === 'selected' ? 'bg-white dark:bg-slate-700 shadow-md text-primary-600 dark:text-primary-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                  >
                    ({sections.find(s => s.id === selectedSectionId)?.questionIds.length}) مختارة
                  </button>
                  <button
                    onClick={() => setQuestionView('create')}
                    className={`px-4 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 ${questionView === 'create' ? 'bg-white dark:bg-slate-700 shadow-md text-primary-600 dark:text-primary-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                  >
                    سؤال جديد
                  </button>
                </div>
              </div>

              <div className="h-[460px] overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                {questionView === 'bank' ? (
                  // BANK VIEW
                  questions
                    .filter(q => {
                      // Filter by selected exam category limits
                      if (examCategory) {
                        const activeAllowed = CategorySubjectMap[examCategory] || [];
                        if (activeAllowed.length > 0 && !activeAllowed.includes(q.subject as Subject)) {
                          return false; // Skip questions completely out of this exam category scope
                        }
                      }

                      const matchSearch = q.text.includes(searchQ);

                      let matchSub = false;
                      if (filterSubject === 'all') {
                        matchSub = true;
                      } else if (filterSubject === 'tahsili') {
                        matchSub = [Subject.MATH, Subject.PHYSICS, Subject.CHEMISTRY, Subject.BIOLOGY].includes(q.subject as Subject);
                      } else if (filterSubject === 'qudurat') {
                        matchSub = [Subject.QUANT, Subject.VERBAL].includes(q.subject as Subject);
                      } else {
                        matchSub = q.subject === filterSubject;
                      }

                      const matchDiff = filterDifficulty === 'all' || q.difficulty === filterDifficulty;
                      const isNotPrivate = !q.isPrivate;
                      return matchSearch && matchSub && matchDiff && isNotPrivate;
                    })
                    .map(q => {
                      const activeSection = sections.find(s => s.id === selectedSectionId);
                      const isSelected = activeSection?.questionIds.includes(q.id);
                      
                      const otherSectionsWithQ = sections.filter(s => s.id !== selectedSectionId && s.questionIds.includes(q.id));
                      const isUsedElsewhere = otherSectionsWithQ.length > 0;

                      const diffLabels: Record<string, string> = { 'easy': 'سهل', 'medium': 'متوسط', 'hard': 'صعب' };

                      return (
                        <div
                          key={q.id}
                          onClick={() => toggleQuestionInSection(q.id)}
                          className={`p-5 rounded-2xl border transition-all duration-300 cursor-pointer flex gap-4 items-start relative overflow-hidden group ${isSelected ? 'bg-green-50/80 dark:bg-green-900/20 border-green-300 dark:border-green-800 ring-2 ring-green-500/20 shadow-lg shadow-green-500/5' : isUsedElsewhere ? 'bg-red-50/80 dark:bg-red-900/10 border-red-200 dark:border-red-900/50' : 'bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border-white/50 dark:border-white/5 hover:bg-white/70 dark:hover:bg-slate-800/70 hover:shadow-md'}`}
                        >
                          <div className={`w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 transition-all duration-300 ${isSelected ? 'bg-green-500 border-green-500 shadow-sm shadow-green-500/30' : 'bg-white/60 dark:bg-slate-800/60 border-gray-300/70 dark:border-gray-600/70 group-hover:border-primary-400'}`}>
                            {isSelected && <span className="text-white text-xs drop-shadow-md">✓</span>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start mb-3 gap-2">
                              <div className="flex flex-wrap gap-2">
                                <span className="text-xs bg-white/60 dark:bg-slate-800/60 shadow-sm px-2.5 py-1 rounded-lg text-gray-700 dark:text-gray-300 font-medium border border-gray-100 dark:border-white/5">{SUBJECT_TRANSLATIONS[q.subject as string] || q.subject}</span>
                                <span className={`text-xs px-2.5 py-1 rounded-lg shadow-sm font-medium border ${q.difficulty === 'hard' ? 'bg-red-50/80 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-100 dark:border-red-900/50' : 'bg-blue-50/80 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-900/50'}`}>
                                  {diffLabels[q.difficulty] || q.difficulty}
                                </span>
                              </div>
                              {isUsedElsewhere && (
                                <span className="text-[10px] bg-red-100/90 dark:bg-red-900/40 text-red-700 dark:text-red-300 px-2.5 py-1 rounded-lg border border-red-200 dark:border-red-800 shrink-0 font-medium shadow-sm">
                                  سبق اختياره في ({otherSectionsWithQ.map(st => st.title).join('، ')})
                                </span>
                              )}
                            </div>
                            <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm leading-relaxed">{q.text}</p>
                          </div>
                        </div>
                      );
                    })
                ) : questionView === 'selected' ? (
                  // SELECTED VIEW (With Reorder + Private Questions)
                  (() => {
                    const activeSection = sections.find(s => s.id === selectedSectionId);
                    if (!activeSection) return null;

                    const questionMap = new Map<string, Question>();
                    const qSectionMap = new Map<string, ExamSection[]>();

                    sections.forEach(sec => {
                      sec.questionIds.forEach(qId => {
                        if (!questionMap.has(qId)) {
                           const q = questions.find(qu => qu.id === qId);
                           if (q) questionMap.set(qId, q);
                        }
                        const prev = qSectionMap.get(qId) || [];
                        qSectionMap.set(qId, [...prev, sec]);
                      });
                    });

                    const unassignedPrivateQs = questions.filter(q => q.isPrivate && !qSectionMap.has(q.id));
                    unassignedPrivateQs.forEach(q => {
                      questionMap.set(q.id, q);
                    });

                    const activeQsNodes = Array.from(questionMap.values())
                      .filter(q => activeSection.questionIds.includes(q.id))
                      .sort((a,b) => activeSection.questionIds.indexOf(a.id) - activeSection.questionIds.indexOf(b.id));

                    const displayListUnselected = Array.from(questionMap.values())
                      .filter(q => !activeSection.questionIds.includes(q.id))
                      .sort((a, b) => {
                        const aSections = qSectionMap.get(a.id) || [];
                        const bSections = qSectionMap.get(b.id) || [];

                        if (aSections.length > 0 && bSections.length === 0) return -1;
                        if (aSections.length === 0 && bSections.length > 0) return 1;
                      
                        if (aSections.length > 0 && bSections.length > 0) {
                          const aMinSecIdx = Math.min(...aSections.map(s => sections.indexOf(s)));
                          const bMinSecIdx = Math.min(...bSections.map(s => sections.indexOf(s)));
                          if (aMinSecIdx !== bMinSecIdx) return aMinSecIdx - bMinSecIdx;
                        }
                        return 0;
                      });

                    const diffLabels: Record<string, string> = { 'easy': 'سهل', 'medium': 'متوسط', 'hard': 'صعب' };

                    const renderQ = (q: Question, isSortable: boolean, dndProps?: any) => {
                      const isActiveSelected = activeSection?.questionIds.includes(q.id);
                      const qSections = qSectionMap.get(q.id) || [];
                      const activeQs = activeSection.questionIds;
                      const qActiveIdx = activeQs.indexOf(q.id);
                      const isDragging = dndProps?.isDragging;

                      return (
                        <div key={q.id} className={`p-5 rounded-3xl border flex gap-4 items-center transition-all duration-500 ${isDragging ? 'shadow-2xl ring-4 ring-primary-500 bg-white dark:bg-slate-800 scale-[1.02]' : isActiveSelected ? 'bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl ring-2 ring-primary-500/40 border-primary-500/50 shadow-xl shadow-black/5 transform hover:scale-[1.01]' : 'bg-white/30 dark:bg-slate-900/30 backdrop-blur-md border-dashed border-gray-300/60 dark:border-slate-600/60 opacity-60 hover:opacity-100 hover:bg-white/50 dark:hover:bg-slate-800/50'}`}>
                          {isActiveSelected ? (
                            isSortable ? (
                              <div {...dndProps?.listeners} className="p-2 text-gray-400 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg cursor-grab active:cursor-grabbing transition-colors shrink-0 outline-none">
                                <GripVertical size={20} />
                              </div>
                            ) : (
                               <div className="w-8 flex justify-center text-primary-500 font-bold shrink-0">{qActiveIdx + 1}</div>
                            )
                          ) : (
                            <div className="w-8 flex justify-center text-gray-400 shrink-0 opacity-50"><Plus size={20} /></div> 
                          )}

                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap gap-2 mb-3 items-center">
                              <span className={`text-[11px] px-2.5 py-1 rounded-lg font-medium shadow-sm border ${q.difficulty === 'hard' ? 'bg-red-50/80 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-100 dark:border-red-900/50' : 'bg-blue-50/80 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-900/50'}`}>
                                {diffLabels[q.difficulty] || q.difficulty}
                              </span>
                              {q.isPrivate && <span className="text-[11px] bg-purple-100/90 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-2.5 py-1 rounded-lg border border-purple-200 dark:border-purple-800 shadow-sm font-medium">خاص</span>}
                              
                              {qSections.length > 0 && (
                                <span className={`text-[11px] px-2.5 py-1 rounded-lg font-medium shadow-sm border ${isActiveSelected ? 'bg-primary-50/90 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300 border-primary-200 dark:border-primary-800/50' : 'bg-white/60 dark:bg-slate-800/60 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-slate-600'} shrink-0`}>
                                  تم اختياره في: {qSections.map(s => s.title).join('، ')}
                                </span>
                              )}
                            </div>
                            <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm leading-relaxed">{q.text}</p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button onClick={() => toggleQuestionInSection(q.id)} className={`p-2.5 rounded-xl transition-all duration-300 shadow-sm border ${isActiveSelected ? 'text-red-500 hover:text-white hover:bg-red-500 dark:hover:bg-red-600 bg-white/50 dark:bg-slate-800/50 border-red-200 dark:border-red-900/50' : 'text-green-500 hover:text-white hover:bg-green-500 dark:hover:bg-green-600 bg-white/50 dark:bg-slate-800/50 border-green-200 dark:border-green-900/50'}`}>
                              {isActiveSelected ? <Trash2 size={18} /> : <Plus size={18} />}
                            </button>

                            {q.isPrivate && !isActiveSelected && qSections.length === 0 && (
                              <button
                                onClick={() => handleDeletePrivateQuestion(q.id)}
                                className="p-2.5 rounded-xl text-red-500 hover:text-white hover:bg-red-500 border border-red-200 dark:border-red-900/50 bg-white/50 dark:bg-slate-800/50 shadow-sm transition-all duration-300"
                                title="حذف نهائي"
                              >
                                <Trash2 size={18} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    };

                    return (
                      <div className="space-y-3">
                         <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={handleDragQuestionEnd}>
                           <SortableContext items={activeQsNodes.map(q => q.id)} strategy={verticalListSortingStrategy}>
                              {activeQsNodes.map(q => (
                                 <SortableQuestionCard key={q.id} id={q.id}>
                                   {(dndProps: any) => renderQ(q, true, dndProps)}
                                 </SortableQuestionCard>
                              ))}
                           </SortableContext>
                         </DndContext>

                         {displayListUnselected.length > 0 && activeQsNodes.length > 0 && (
                           <div className="mt-8 mb-4 pt-6 border-t border-dashed border-gray-300 dark:border-slate-700 opacity-60 relative w-full flex justify-center">
                              <span className="absolute -top-3 bg-[#f8fafc] dark:bg-[#0f172a] px-4 text-xs font-bold text-gray-500">
                                أسئلة أخرى مختارة مسبقاً (غير مشمولة في هذا القسم)
                              </span>
                           </div>
                         )}

                         {displayListUnselected.map(q => renderQ(q, false))}
                      </div>
                    );
                  })()
                ) : (
                  // CREATE QUESTION VIEW
                  <div className="p-2 space-y-5 animate-in slide-in-from-bottom-2">
                    {/* Excel Bulk Import */}
                    <div className="flex items-center justify-between bg-primary-50/50 dark:bg-primary-900/20 p-5 rounded-3xl border border-primary-100 dark:border-primary-800/50 shadow-[0_4px_20px_rgb(0,0,0,0.03)] dark:shadow-none">
                      <div>
                        <h4 className="font-bold text-primary-700 dark:text-primary-300 text-lg">استيراد سريع من Excel</h4>
                        <p className="text-sm text-primary-600/70 dark:text-primary-400/80 mt-1">ارفع أسئلتك دفعة واحدة بصيغة (السؤال، خيار1، خيار2...، الاجابة_الصحيحة، الصعوبة)</p>
                      </div>
                      <label className="cursor-pointer shrink-0 bg-white dark:bg-slate-800 px-5 py-3 rounded-2xl text-primary-600 dark:text-primary-400 font-bold border border-primary-200 dark:border-primary-700/50 hover:bg-primary-50 dark:hover:bg-slate-700 transition-all shadow-sm flex items-center gap-2 group transform hover:-translate-y-0.5">
                         <Upload size={20} className="group-hover:-translate-y-1 transition-transform" />
                         <span>استيراد أسئلة</span>
                         <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleExcelImport} />
                      </label>
                    </div>

                    <div className="text-center relative">
                      <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-dashed border-gray-300 dark:border-slate-700"></div></div>
                      <span className="relative bg-gray-50 dark:bg-[#0f172a] px-4 text-xs font-bold text-gray-400">أو الإضافة يدوياً</span>
                    </div>

                    <div className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-md p-5 rounded-3xl border border-white/50 dark:border-white/5 shadow-[0_4px_20px_rgb(0,0,0,0.03)] dark:shadow-none space-y-5">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">نص السؤال</label>
                        <textarea
                          className="w-full border-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl shadow-inner dark:text-white p-4 rounded-2xl h-24 focus:ring-2 focus:ring-primary-500/50 transition-all duration-300 outline-none resize-none placeholder-gray-400"
                          value={manualQ.text}
                          onChange={e => setManualQ({ ...manualQ, text: e.target.value })}
                          placeholder="أدخل نص السؤال هنا..."
                        />
                      </div>

                      <div className="space-y-3">
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">الخيارات (حدد الإجابة الصحيحة)</label>
                        {manualQ.options?.map((opt, idx) => (
                          <div key={idx} className="flex gap-3 items-center">
                            <div className="relative flex items-center justify-center">
                              <input
                                type="radio"
                                name="correctOption"
                                checked={manualQ.correctOption === idx}
                                onChange={() => setManualQ({ ...manualQ, correctOption: idx })}
                                className="w-5 h-5 text-primary-600 focus:ring-primary-500/50 transition-all cursor-pointer"
                              />
                            </div>
                            <input
                              className={`w-full border-0 p-3.5 rounded-2xl shadow-inner outline-none transition-all duration-300 ${manualQ.correctOption === idx ? 'bg-primary-50/80 dark:bg-primary-900/20 ring-2 ring-primary-500/50 text-white dark:text-primary-100 font-medium' : 'bg-white/60 dark:bg-slate-900/60 dark:text-white focus:ring-2 focus:ring-primary-500/30'}`}
                              value={opt}
                              onChange={e => {
                                const newOpts = [...(manualQ.options || [])];
                                newOpts[idx] = e.target.value;
                                setManualQ({ ...manualQ, options: newOpts });
                              }}
                              placeholder={`الخيار ${idx + 1}`}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-md p-5 rounded-3xl border border-white/50 dark:border-white/5 shadow-[0_4px_20px_rgb(0,0,0,0.03)] dark:shadow-none space-y-5">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">صعوبة السؤال</label>
                        <div className="bg-white/60 dark:bg-slate-900/60 rounded-2xl shadow-inner p-1">
                          <CustomSelect
                            options={difficultyOptions.filter(o => o.value !== 'all')}
                            value={manualQ.difficulty as string}
                            onChange={val => setManualQ({ ...manualQ, difficulty: val as any })}
                            placeholder="الصعوبة"
                          />
                        </div>
                      </div>

                      {/* Subject Selection - Show only if Adding to Bank */}
                      {addToBank && (
                        <div className="animate-in fade-in slide-in-from-top-1">
                          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">المادة / التخصص</label>
                          <div className="bg-white/60 dark:bg-slate-900/60 rounded-2xl shadow-inner p-1">
                            <CustomSelect
                              options={subjectOptions.filter(o => o.value !== 'all')}
                              value={manualQ.subject as string}
                              onChange={val => setManualQ({ ...manualQ, subject: val })}
                              placeholder="اختر المادة..."
                            />
                          </div>
                        </div>
                      )}

                      <div className="pt-2">
                        <label className="flex items-center gap-3 mb-3 cursor-pointer p-4 rounded-xl bg-white/50 dark:bg-slate-900/50 hover:bg-white/80 dark:hover:bg-slate-900/80 transition-all duration-300">
                          <input
                            type="checkbox"
                            checked={addToBank}
                            onChange={e => {
                              const checked = e.target.checked;
                              setAddToBank(checked);
                              if (checked && examCategory) {
                                const allowed = CategorySubjectMap[examCategory] || [];
                                if (allowed.length === 1) {
                                  setManualQ(prev => ({ ...prev, subject: allowed[0] }));
                                } else {
                                  setManualQ(prev => ({ ...prev, subject: '' as any }));
                                }
                              }
                            }}
                            className="w-5 h-5 rounded-md text-primary-600 focus:ring-primary-500"
                          />
                          <span className="text-sm font-bold dark:text-white">إضافة لبنك الأسئلة العام؟</span>
                        </label>

                        {addToBank && (
                          <div className="animate-fadeIn mt-2 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-lg border border-blue-100 dark:border-blue-900/50">
                            سيتم حفظ السؤال في بنك الأسئلة العام وسيكون متاحاً لجميع الاختبارات، مع مادة: {manualQ.subject ? SUBJECT_TRANSLATIONS[manualQ.subject] : '---'}.
                          </div>
                        )}
                        {!addToBank && (
                          <div className="animate-fadeIn mt-2 text-xs font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 px-3 py-2 rounded-lg border border-purple-100 dark:border-purple-900/50">
                            سيبقى السؤال خاصاً بهذا الاختبار ولن يظهر في بنك الأسئلة العام.
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={handleCreateManualQuestion}
                      className="w-full bg-primary-600/90 backdrop-blur-md text-white py-4 rounded-2xl font-bold hover:bg-primary-700 hover:shadow-lg hover:shadow-primary-600/20 transition-all duration-300 flex items-center justify-center gap-2 transform hover:-translate-y-0.5"
                    >
                      <Plus size={20} /> إضافة السؤال للاختبار
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        type={confirmModal.type}
      />
    </div >
  );
};

export default AdminExamBuilder;
