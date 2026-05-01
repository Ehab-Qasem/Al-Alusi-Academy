
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { backend } from '../services/mockBackend';
import { Course, CourseCategory, Subject, ContentType, Module, ContentItem, Question, CertificateTemplate, UserRole } from '../types';
import { Plus, Trash2, Save, Video, FileText, Globe, Shield, Settings2, Palette, Layout, ExternalLink, Image as ImageIcon, ChevronDown, ChevronUp, Edit3, Eye, MoreVertical, Upload, Link as LinkIcon, HelpCircle, Search, CheckSquare, ArrowRight, EyeOff, CheckCircle2, List, AlertCircle, GripVertical, Copy, BarChart3, Printer, Download, Users, X, Check, AlertTriangle, FileDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { CATEGORY_LABELS, SUBJECT_TRANSLATIONS } from '../constants';
import CustomSelect from '../components/CustomSelect';

// Drag & Drop Imports
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragOverlay, defaultDropAnimationSideEffects, DragStartEvent, DragEndEvent, DragOverEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SortableModule } from '../components/cms/SortableModule';

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
import { Lock } from 'lucide-react';
import RichTextEditor from '../components/RichTextEditor';
import { BulkUploadDropzone } from '../components/cms/BulkUploadDropzone';
import { uploadFile } from '../services/uploadService';
import { ConfirmModal } from '../components/ConfirmModal';

const TeacherCourseManager = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>(backend.getCourses());
  const [certOptions, setCertOptions] = useState<{value: string, label: string}[]>([{ value: '', label: 'بدون شهادة' }]);

  useEffect(() => {
    const templates = backend.getCertificateTemplates().filter(t => t.category === 'course');
    setCertOptions([
      { value: '', label: 'بدون شهادة' },
      ...templates.map(t => ({ value: t.id, label: t.name }))
    ]);
  }, []);

  const [view, setView] = useState<'list' | 'editor'>('list');
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [initialEditingCourse, setInitialEditingCourse] = useState<Course | null>(null);
  const [editorTab, setEditorTab] = useState<'content' | 'landing'>('content');

  // Warn on unsaved changes on window unload
  React.useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (view === 'editor' && JSON.stringify(editingCourse) !== JSON.stringify(initialEditingCourse)) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [view, editingCourse, initialEditingCourse]);

  // Drag & Drop State
  const [activeDragItem, setActiveDragItem] = useState<any>(null); // For overlay

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

  // Content Modal
  const [showContentModal, setShowContentModal] = useState(false);
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  const [editingContentId, setEditingContentId] = useState<string | null>(null); // New state for editing
  const [newContent, setNewContent] = useState<Partial<ContentItem>>({
    type: ContentType.VIDEO,
    title: '',
    url: '',
    questions: [],
    passingScore: 60,
    content: '' // For Article Type
  });

  // Confirm Modal State
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'danger' as 'danger' | 'info'
  });

  // Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMode, setUploadMode] = useState<'url' | 'file'>('url');

  // Analytics Modal State
  const [statsModalCourse, setStatsModalCourse] = useState<Course | null>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const [statsSearch, setStatsSearch] = useState('');
  const [statsSortBy, setStatsSortBy] = useState<'completion_desc' | 'name_asc' | 'date_desc'>('completion_desc');
  const [statsRoleFilter, setStatsRoleFilter] = useState({ student: true, guest: true });
  const [statsGrade, setStatsGrade] = useState('');
  const [statsSection, setStatsSection] = useState('');

  // --- HANDLERS: Duplicate / Preview / Analytics ---
  const handleDuplicateCourse = async (courseId: string) => {
    const toastId = toast.loading('جاري نسخ الدورة...');
    try {
      const copy = await backend.duplicateCourse(courseId);
      setCourses(backend.getCourses());
      toast.success(`تم نسخ الدورة: "${copy.title}"`, { id: toastId });
    } catch (e: any) {
      toast.error(`فشل النسخ: ${e.message}`, { id: toastId });
    }
  };

  const handlePreviewCourse = (courseId: string) => {
    navigate(`/course/${courseId}`, {
      state: { preview: true, returnUrl: '/dashboard/courses' }
    });
  };

  const handlePrintStats = () => {
    window.print();
  };

  const generateCourseReportHTML = (filteredData: any[], course: Course, wrapperOnly = false) => {
    const content = `
      <div class="report-wrapper" id="pdf-report-content">
        <style>
          ${wrapperOnly ? '.report-wrapper { font-family: Tahoma, Arial, sans-serif; padding: 20px; color: #111; line-height: 1.5; background: #fff; direction: rtl; width: 800px; }' : ''}
          .report-wrapper .header-section { text-align: center; border-bottom: 2px solid #059669; padding-bottom: 10px; margin-bottom: 20px; }
          .report-wrapper h1 { color: #059669; margin: 0 0 5px 0; font-size: 24px; }
          .report-wrapper h2 { color: #4b5563; margin: 0 0 15px 0; font-size: 18px; font-weight: normal; }
          .report-wrapper .info-row { display: flex; justify-content: space-around; background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 20px; text-align: center; }
          .report-wrapper .info-row div { font-size: 13px; color: #64748b; }
          .report-wrapper .info-row div span { display: block; font-weight: bold; color: #1e293b; font-size: 16px; margin-top: 5px; }
          .report-wrapper table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          .report-wrapper th, .report-wrapper td { border: 1px solid #cbd5e1; padding: 10px 12px; text-align: right; font-size: 13px; }
          .report-wrapper th { background-color: #f1f5f9; font-weight: bold; color: #0f172a; }
          .report-wrapper tr { page-break-inside: avoid; break-inside: avoid; }
          .report-wrapper tr:nth-child(even) { background-color: #f8fafc; }
          .report-wrapper .badge { display: inline-block; padding: 3px 6px; border-radius: 4px; font-size: 11px; background: #e0e7ff; color: #4338ca; white-space: nowrap; border: 1px solid #c7d2fe; }
          .report-wrapper .warn { color: #d97706; }
        </style>
        <div class="header-section">
          <h1>\u062a\u0642\u0631\u064a\u0631 \u0625\u062d\u0635\u0627\u0626\u064a\u0627\u062a \u0627\u0644\u062f\u0648\u0631\u0629</h1>
          <h2>${course.title}</h2>
        </div>
        <div class="info-row">
          <div>\u0639\u062f\u062f \u0627\u0644\u0648\u062d\u062f\u0627\u062a <span>${course.modules.length}</span></div>
          <div>\u0639\u062f\u062f \u0627\u0644\u062f\u0631\u0648\u0633 <span>${course.modules.flatMap(m => m.content).length}</span></div>
          <div>\u0639\u062f\u062f \u0627\u0644\u0637\u0644\u0627\u0628 <span>${filteredData.length}</span></div>
        </div>
        <table>
          <thead><tr>
            <th style="width:5%">\u0645</th>
            <th style="width:25%">\u0627\u0644\u0637\u0627\u0644\u0628</th>
            <th style="width:20%">\u0627\u0644\u0641\u0626\u0629/\u0627\u0644\u0641\u0635\u0644</th>
            <th style="width:15%">\u0627\u0644\u0625\u0643\u0645\u0627\u0644</th>
            <th style="width:15%">\u0645\u062a\u0648\u0633\u0637 \u0627\u0644\u0627\u062e\u062a\u0628\u0627\u0631\u0627\u062a</th>
            <th style="width:20%">\u0622\u062e\u0631 \u062f\u062e\u0648\u0644</th>
          </tr></thead>
          <tbody>
            ${filteredData.map((row: any, i: number) => `
              <tr>
                <td>${i + 1}</td>
                <td><strong>${row.name}</strong></td>
                <td><span class="badge">${row.role === 'student' ? (row.grade !== '-' ? row.grade : '\u0637\u0627\u0644\u0628') + (row.section !== '-' ? ' - ' + row.section : '') : '\u0632\u0627\u0626\u0631'}</span></td>
                <td><strong>${row.completion}%</strong></td>
                <td>${row.quizAvg !== null ? row.quizAvg + '%' : '\u0644\u0627 \u064a\u0648\u062c\u062f'}</td>
                <td${row.isInactive ? ' class="warn"' : ''}>${row.lastAccessedStr}${row.isInactive ? ' \u26a0\ufe0f' : ''}</td>
              </tr>
            `).join('')}
            ${filteredData.length === 0 ? '<tr><td colspan="6" style="text-align:center; padding: 20px;">\u0644\u0627 \u062a\u0648\u062c\u062f \u0628\u064a\u0627\u0646\u0627\u062a</td></tr>' : ''}
          </tbody>
        </table>
        <div style="margin-top: 30px; font-size: 11px; color: #64748b; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 10px;">
          \u062a\u0645 \u0625\u0635\u062f\u0627\u0631 \u0647\u0630\u0627 \u0627\u0644\u062a\u0642\u0631\u064a\u0631 \u0622\u0644\u064a\u0627\u064b \u0628\u062a\u0627\u0631\u064a\u062e ${new Date().toLocaleString('ar-SA')}
        </div>
      </div>
    `;
    if (wrapperOnly) return `<div dir="rtl">${content}</div>`;
    return `<html dir="rtl" lang="ar"><head><title>\u062a\u0642\u0631\u064a\u0631 - ${course.title}</title><style>@page{size:A4 portrait;margin:15mm}body{margin:0;padding:0;font-family:Tahoma,Arial,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact;background:#fff}</style></head><body>${content}</body></html>`;
  };

  const handleExportStats = async (filteredData: any[], format: 'print' | 'pdf' | 'csv') => {
    if (!statsModalCourse) return;

    if (format === 'csv') {
      const BOM = '\uFEFF';
      const headers = ['\u0627\u0644\u0627\u0633\u0645', '\u0627\u0644\u0635\u0641', '\u0627\u0644\u0634\u0639\u0628\u0629', '\u0646\u0633\u0628\u0629 \u0627\u0644\u0625\u0643\u0645\u0627\u0644 %', '\u0645\u062a\u0648\u0633\u0637 \u0627\u0644\u0627\u062e\u062a\u0628\u0627\u0631\u0627\u062a %', '\u0622\u062e\u0631 \u062f\u062e\u0648\u0644'].join(',');
      const rows = filteredData.map((r: any) =>
        [r.name, r.grade, r.section, r.completion, r.quizAvg !== null ? r.quizAvg : '-', r.lastAccessedStr].join(',')
      );
      const csvContent = BOM + headers + '\n' + rows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `\u062a\u0642\u0631\u064a\u0631_${statsModalCourse.title}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('\u062a\u0645 \u062a\u062d\u0645\u064a\u0644 \u0645\u0644\u0641 CSV');
      return;
    }

    if (format === 'print') {
      const printWindow = window.open('', '', 'width=900,height=600');
      if (!printWindow) return;
      printWindow.document.write(generateCourseReportHTML(filteredData, statsModalCourse));
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => printWindow.print(), 500);
      return;
    }

    // PDF
    const toastId = toast.loading('\u062c\u0627\u0631\u064a \u062a\u0648\u0644\u064a\u062f \u0627\u0644\u0640 PDF...');
    try {
      const { default: html2canvas } = await import('html2canvas');
      const { jsPDF } = await import('jspdf');
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '0';
      container.innerHTML = generateCourseReportHTML(filteredData, statsModalCourse, true);
      document.body.appendChild(container);
      await new Promise(res => setTimeout(res, 500));
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
      pdf.save(`\u062a\u0642\u0631\u064a\u0631_${statsModalCourse.title}.pdf`);
      toast.success('\u062a\u0645 \u062a\u062d\u0645\u064a\u0644 PDF', { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error('\u062d\u062f\u062b \u062e\u0637\u0623 \u0623\u062b\u0646\u0627\u0621 \u0627\u0644\u062a\u0635\u062f\u064a\u0631', { id: toastId });
    }
  };

  // Quiz Management State
  const [allQuestions, setAllQuestions] = useState<Question[]>(backend.getQuestions());
  const [questionSearch, setQuestionSearch] = useState('');

  // Filters for Quiz Selection
  const [bankFilterSubject, setBankFilterSubject] = useState('all');
  const [bankFilterDifficulty, setBankFilterDifficulty] = useState('all');

  const [quizTab, setQuizTab] = useState<'bank' | 'selected' | 'create'>('bank');
  // New specific subject selection for Qudurat/Tahsili
  const [quizSpecificSubject, setQuizSpecificSubject] = useState<string>('all');
  // Global toggle for private vs public Question
  const [addToBank, setAddToBank] = useState(false);

  // New Question Form State
  const [tempQuestion, setTempQuestion] = useState<Partial<Question>>({
    text: '',
    options: ['', '', '', ''],
    correctOption: 0,
    difficulty: 'medium',
    subject: Subject.MATH
  });

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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleCreateNew = () => {
    const newCourse: Course = {
      id: `c_${Date.now()}`,
      title: 'دورة جديدة بدون عنوان',
      category: CourseCategory.QUDURAT_QUANT,
      subject: Subject.MATH,
      description: '',
      thumbnail: 'https://images.unsplash.com/photo-1513258496098-f1b74a257e8f?w=800&auto=format&fit=crop',
      isPublished: false,
      isPublic: true,
      landingPageConfig: {
        welcomeTitle: 'مرحلة جديدة من التعلم تبدأ هنا',
        descriptionText: 'انضم الآن وابدأ بتطوير مهاراتك من خلال هذه الدورة الشاملة.',
        showLessonCount: true,
        showCategory: true,
        showDuration: true,
        customStats: [],
        registrationButtonText: 'التسجيل في الدورة'
      },
      modules: []
    };
    setEditingCourse(newCourse);
    setInitialEditingCourse(newCourse);
    setView('editor');
  };

  const handleEdit = (course: Course) => {
    setEditingCourse(JSON.parse(JSON.stringify(course))); // Deep copy
    setInitialEditingCourse(JSON.parse(JSON.stringify(course))); // Deep copy
    setView('editor');
  };

  const handleCancelEdit = () => {
    if (JSON.stringify(editingCourse) !== JSON.stringify(initialEditingCourse)) {
      setConfirmModal({
        isOpen: true,
        title: 'تغييرات غير محفوظة',
        message: 'لديك تغييرات لم يتم حفظها، هل أنت متأكد من رغبتك في المغادرة؟',
        type: 'danger',
        onConfirm: () => {
           setView('list');
           setEditingCourse(null);
           setInitialEditingCourse(null);
        }
      });
    } else {
      setView('list');
      setEditingCourse(null);
      setInitialEditingCourse(null);
    }
  };

  const handleDelete = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'حذف الدورة',
      message: 'هل أنت متأكد من حذف هذه الدورة نهائياً؟ لا يمكن التراجع عن هذا الإجراء.',
      type: 'danger',
      onConfirm: async () => {
        try {
          await backend.deleteCourse(id);
          setCourses(backend.getCourses());
          toast.success('تم الحذف بنجاح');
        } catch (e: any) {
          toast.error(`فشل الحذف: ${e.message || 'خطأ غير متوقع'}`);
        }
      }
    });
  };

  const handleSaveCourse = async () => {
    if (!editingCourse) return;
    if (!editingCourse.title) return toast.error('يرجى إدخال عنوان للدورة');

    const emptyModules = editingCourse.modules.filter(m => m.content.length === 0);
    
    if (emptyModules.length > 0) {
      setConfirmModal({
        isOpen: true,
        title: 'تنبيه: وحدات فارغة',
        message: 'يوجد وحدات فارغة بدون دروس. سيتم حذفها تلقائياً عند الحفظ. هل تود المتابعة؟',
        type: 'info',
        onConfirm: async () => {
          const cleanedCourse = {
            ...editingCourse,
            modules: editingCourse.modules.filter(m => m.content.length > 0)
          };
          setEditingCourse(cleanedCourse);
          setInitialEditingCourse(cleanedCourse);
          try {
            await backend.saveCourse(cleanedCourse);
            setCourses(backend.getCourses());
            setView('list');
            toast.success('تم حفظ الدورة وحذف الوحدات الفارغة');
          } catch (e: any) {
            toast.error(`فشل حفظ الدورة في قاعدة البيانات: ${e.message || 'خطأ غير متوقع'}`, { duration: 5000 });
            console.error('Course save failed:', e);
          }
        }
      });
      return; 
    }

    try {
      await backend.saveCourse(editingCourse);
      setInitialEditingCourse(editingCourse);
      setCourses(backend.getCourses());
      setView('list');
      toast.success('تم حفظ الدورة بنجاح');
    } catch (e: any) {
      toast.error(`فشل حفظ الدورة في قاعدة البيانات: ${e.message || 'خطأ غير متوقع'}`, { duration: 5000 });
      console.error('Course save failed:', e);
    }
  };

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && editingCourse) {
      setIsUploading(true);
      try {
        const url = await uploadFile(e.target.files[0]);
        if (url) {
          setEditingCourse({ ...editingCourse, thumbnail: url });
          toast.success('تم رفع الصورة بنجاح');
        }
      } catch (e) {
        // Handled in uploadFile
      }
      setIsUploading(false);
    }
  };

  // --- Module Operations ---
  const addModule = () => {
    if (!editingCourse) return;
    const newModule: Module = {
      id: `m_${Date.now()}`,
      title: `الوحدة ${editingCourse.modules.length + 1}`,
      content: []
    };
    setEditingCourse({
      ...editingCourse,
      modules: [...editingCourse.modules, newModule]
    });
  };

  const deleteModule = (moduleId: string) => {
    if (!editingCourse) return;
    setConfirmModal({
      isOpen: true,
      title: 'حذف الوحدة',
      message: 'هل أنت متأكد من حذف هذه الوحدة وجميع محتوياتها؟',
      type: 'danger',
      onConfirm: () => {
        setEditingCourse(prev => prev ? ({
          ...prev,
          modules: prev.modules.filter(m => m.id !== moduleId)
        }) : null);
      }
    });
  };

  const updateModuleTitle = (moduleId: string, title: string) => {
    if (!editingCourse) return;
    setEditingCourse({
      ...editingCourse,
      modules: editingCourse.modules.map(m => m.id === moduleId ? { ...m, title } : m)
    });
  };

  // --- Drag & Drop Handlers ---
  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragItem(event.active.data.current);
  };

  const handleDragQuizQuestionEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id && newContent.questions) {
      const oldIndex = newContent.questions.indexOf(active.id as string);
      const newIndex = newContent.questions.indexOf(over.id as string);
      if (oldIndex !== -1 && newIndex !== -1) {
        setNewContent({
          ...newContent,
          questions: arrayMove(newContent.questions, oldIndex, newIndex)
        });
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragItem(null);

    if (!over || !editingCourse) return;

    // 1. Module Reordering
    if (active.data.current?.type === 'MODULE') {
      if (active.id !== over.id) {
        setEditingCourse((prev) => {
          if (!prev) return null;
          const oldIndex = prev.modules.findIndex((m) => m.id === active.id);
          const newIndex = prev.modules.findIndex((m) => m.id === over.id);
          return { ...prev, modules: arrayMove(prev.modules, oldIndex, newIndex) };
        });
      }
      return;
    }

    // 2. Content Reordering (Within same module or Cross module)
    if (active.data.current?.type === 'CONTENT') {
      const activeModuleId = active.data.current.moduleId;
      const activeItem = active.data.current.item;

      // Find over module (could be module itself or content inside it)
      let overModuleId;
      if (over.data.current?.type === 'MODULE') {
        overModuleId = over.id;
      } else if (over.data.current?.type === 'CONTENT') {
        overModuleId = over.data.current.moduleId;
      }

      if (!overModuleId) return;

      setEditingCourse((prev) => {
        if (!prev) return null;
        const modules = [...prev.modules];
        const sourceModuleIndex = modules.findIndex(m => m.id === activeModuleId);
        const targetModuleIndex = modules.findIndex(m => m.id === overModuleId);

        if (sourceModuleIndex === -1 || targetModuleIndex === -1) return prev;

        const sourceModule = modules[sourceModuleIndex];
        const targetModule = modules[targetModuleIndex];

        // Same Module Reordering
        if (sourceModuleIndex === targetModuleIndex) {
          const oldIndex = sourceModule.content.findIndex(c => c.id === active.id);
          const newIndex = sourceModule.content.findIndex(c => c.id === over.id);

          if (oldIndex !== newIndex && newIndex !== -1) {
            const newContent = arrayMove(sourceModule.content, oldIndex, newIndex);
            modules[sourceModuleIndex] = { ...sourceModule, content: newContent };
            return { ...prev, modules };
          }
        } else {
          // Cross Module Dragging
          // Remove from source
          const activeContent = sourceModule.content.find(c => c.id === active.id);
          if (!activeContent) return prev;

          modules[sourceModuleIndex] = {
            ...sourceModule,
            content: sourceModule.content.filter(c => c.id !== active.id)
          };

          // Add to target
          const targetContent = [...targetModule.content];
          let newIndex = targetContent.length; // Default to end

          if (over.data.current?.type === 'CONTENT') {
            const overIndex = targetContent.findIndex(c => c.id === over.id);
            if (overIndex >= 0) newIndex = overIndex;
          }

          targetContent.splice(newIndex, 0, activeContent);
          modules[targetModuleIndex] = { ...targetModule, content: targetContent };

          return { ...prev, modules };
        }
        return prev;
      });
    }
  };

  // --- Content Operations ---
  // --- Content Operations ---
  const openContentModal = (moduleId: string, itemToEdit?: ContentItem) => {
    setActiveModuleId(moduleId);
    if (itemToEdit) {
      setEditingContentId(itemToEdit.id);
      setNewContent({
        ...itemToEdit,
        // Ensure content field is populated for articles, even if stored in url previously
        content: itemToEdit.type === ContentType.ARTICLE ? (itemToEdit.content || itemToEdit.url) : itemToEdit.content
      });
      // If video has URL, set mode to url
      if (itemToEdit.type === ContentType.VIDEO && itemToEdit.url) {
        setUploadMode('url');
      }
    } else {
      setEditingContentId(null);
      setNewContent({ type: ContentType.VIDEO, title: '', url: '', questions: [], passingScore: 60, content: '' });
      setUploadMode('url');
    }

    setQuizTab('bank');
    setAllQuestions(backend.getQuestions()); // Refresh questions
    // Reset filters
    setBankFilterSubject('all');
    setBankFilterDifficulty('all');
    setQuestionSearch('');
    setShowContentModal(true);
  };

  const handleContentFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIsUploading(true);
      try {
        const url = await uploadFile(e.target.files[0]);
        if (url) {
          if (newContent.type === ContentType.IMAGE && newContent.url) {
            setNewContent({ ...newContent, url: newContent.url + '\n' + url });
          } else {
            setNewContent({ ...newContent, url: url });
          }
          toast.success('تم رفع الملف');
        }
      } catch (e) {
        // Handled in uploadFile
      }
      setIsUploading(false);
    }
  };

  const toggleQuestionForQuiz = (qId: string) => {
    const currentQs = newContent.questions || [];
    if (currentQs.includes(qId)) {
      setNewContent({ ...newContent, questions: currentQs.filter(id => id !== qId) });
    } else {
      setNewContent({ ...newContent, questions: [...currentQs, qId] });
    }
  };

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const toastId = toast.loading('جاري استيراد الأسئلة...');
    try {
      const XLSX = await import('xlsx');
      const reader = new FileReader();

      reader.onload = async (evt) => {
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
             if (!text) return;

             const opt1 = row['خيار1'] || row['option1'] || row['Option 1'];
             const opt2 = row['خيار2'] || row['option2'] || row['Option 2'];
             const opt3 = row['خيار3'] || row['option3'] || row['Option 3'];
             const opt4 = row['خيار4'] || row['option4'] || row['Option 4'];
             
             const options = [opt1, opt2, opt3, opt4].filter(Boolean);
             if (options.length < 2) return;
             
             let correctRaw = row['الاجابة_الصحيحة'] || row['correct'] || row['Correct'];
             let correctIndex = 0;
             if (typeof correctRaw === 'number') {
                correctIndex = Math.max(0, Math.min(options.length - 1, correctRaw - 1));
             } else if (typeof correctRaw === 'string') {
                const parsed = parseInt(correctRaw);
                if (!isNaN(parsed)) {
                   correctIndex = Math.max(0, Math.min(options.length - 1, parsed - 1));
                } else {
                   correctIndex = options.findIndex(o => String(o) === correctRaw);
                   if (correctIndex === -1) correctIndex = 0;
                }
             }

             const diffRaw = row['الصعوبة'] || row['difficulty'];
             const mappedDifficulty = diffRaw === 'صعب' ? 'hard' : (diffRaw === 'سهل' ? 'easy' : 'medium');
             
             newQuestions.push({
                 id: 'q_' + Date.now() + '_' + index + Math.random().toString(36).substr(2, 5),
                 text: String(text),
                 options: options.map(String),
                 correctOption: correctIndex,
                 difficulty: mappedDifficulty,
                 subject: (quizSpecificSubject && quizSpecificSubject !== 'all') ? quizSpecificSubject : (editingCourse?.subject || Subject.MATH),
                 isPrivate: !addToBank,
             } as Question);
          });

          if (newQuestions.length > 0) {
             for (const q of newQuestions) {
                await backend.createQuestion(q);
             }
             setAllQuestions(backend.getQuestions());

             const newIds = newQuestions.map(q => q.id);
             setNewContent(prev => ({
                ...prev,
                questions: [...(prev.questions || []), ...newIds]
             }));

             toast.success(`تم استيراد ${newQuestions.length} سؤال بنجاح وإضافتها للاختبار!`, { id: toastId });
             setQuizTab('selected'); 
          } else {
             toast.error('لم يتم العثور على أسئلة صحيحة في الملف.', { id: toastId });
          }
        } catch(err: any) {
          console.error(err);
          toast.error(`خطأ في الاستيراد: ${err.message}`, { id: toastId });
        }
      };

      reader.readAsBinaryString(file);
    } catch(err) {
      toast.error('أخفق تحميل مكتبة Excel', { id: toastId });
    }
  };

  const handleCreateAndAddQuestion = async () => {
    if (!tempQuestion.text || !tempQuestion.options || tempQuestion.options.some(o => !o.trim())) {
      return toast.error('يرجى ملء جميع الحقول (السؤال والخيارات)');
    }

    const assignedSubject = (quizSpecificSubject && quizSpecificSubject !== 'all') ? quizSpecificSubject : (editingCourse?.subject || Subject.MATH);

    const newQ: Question = {
      ...tempQuestion,
      subject: tempQuestion.subject || assignedSubject,
      id: `q_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      isPrivate: !addToBank,
    } as Question;
    
    try {
      await backend.createQuestion(newQ);
      setAllQuestions(backend.getQuestions());
      toggleQuestionForQuiz(newQ.id);
      setTempQuestion({
        text: '',
        options: ['', '', '', ''],
        correctOption: 0,
        difficulty: 'medium',
        subject: editingCourse?.subject || Subject.MATH
      });
      toast.success('تم إنشاء السؤال وإضافته للاختبار');
      setQuizTab('selected');
    } catch (e: any) {
      toast.error(`فشل إنشاء السؤال: ${e.message}`);
    }
  };

  const saveContent = () => {
    if (!editingCourse || !activeModuleId) return;
    if (!newContent.title) return toast.error('العنوان مطلوب');

    const contentData: ContentItem = {
      id: editingContentId || `cnt_${Date.now()}`,
      title: newContent.title || 'محتوى جديد',
      type: newContent.type || ContentType.VIDEO,
      url: newContent.url || (newContent.type === ContentType.ARTICLE ? newContent.content : ''),
      duration: newContent.duration || 0,
      questions: newContent.questions,
      passingScore: newContent.passingScore,
      content: newContent.content // Store rich text here
    };

    setEditingCourse(prev => {
      if (!prev) return null;
      return {
        ...prev,
        modules: prev.modules.map(m => {
          if (m.id === activeModuleId) {
            if (editingContentId) {
              // Update existing
              return {
                ...m,
                content: m.content.map(c => c.id === editingContentId ? contentData : c)
              };
            } else {
              // Add new
              return { ...m, content: [...m.content, contentData] };
            }
          }
          return m;
        })
      };
    });
    setShowContentModal(false);
    toast.success(editingContentId ? 'تم تعديل المحتوى' : 'تم إضافة المحتوى');
  };

  const deleteContent = (moduleId: string, contentId: string) => {
    if (!editingCourse) return;
    setConfirmModal({
      isOpen: true,
      title: 'حذف المحتوى',
      message: 'هل أنت متأكد من حذف هذا العنصر؟',
      type: 'danger',
      onConfirm: () => {
        setEditingCourse(prev => prev ? ({
          ...prev,
          modules: prev.modules.map(m => {
            if (m.id === moduleId) {
              return { ...m, content: m.content.filter(c => c.id !== contentId) };
            }
            return m;
          })
        }) : null);
      }
    });
  };

  const handleBulkUploadComplete = (newItems: ContentItem[]) => {
    if (!editingCourse || !activeModuleId) return;

    setEditingCourse({
      ...editingCourse,
      modules: editingCourse.modules.map(m => {
        if (m.id === activeModuleId) {
          return { ...m, content: [...m.content, ...newItems] };
        }
        return m;
      })
    });
    setShowContentModal(false);
    toast.success(`تم إضافة ${newItems.length} عناصر بنجاح!`);
  };

  // Filter Courses Logic
  const filteredCourses = courses.filter(c => {
    const matchSearch = c.title.includes(searchTerm);
    const matchCat = filterCategory === 'all' || c.category === filterCategory;
    return matchSearch && matchCat;
  });

  const filterCategoryOptions = [
    { value: 'all', label: 'جميع التصنيفات' },
    ...Object.values(CourseCategory).map(cat => ({
      value: cat,
      label: CATEGORY_LABELS[cat] || cat
    }))
  ];

  if (view === 'list') {
    return (
      <div className="bg-white/10 dark:bg-slate-900/40 backdrop-blur-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-10 rounded-[3rem] border border-white/20 dark:border-white/10 relative overflow-hidden animate-fade-in min-h-[80vh]">
        {/* Animated Background Orbs */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary-500/20 blur-[120px] rounded-full animate-pulse pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-blue-500/20 blur-[120px] rounded-full animate-pulse delay-1000 pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-500/5 blur-[150px] rounded-full pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-12 gap-6 relative z-10">
          <div>
            <h2 className="text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-gray-900 via-gray-700 to-gray-500 dark:from-white dark:via-gray-200 dark:to-gray-400 tracking-tight">مكتبة الدورات</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-3 text-lg font-medium opacity-80">إدارة وتطوير المحتوى التعليمي بمعايير عالمية</p>
          </div>
          <button
            onClick={handleCreateNew}
            className="group relative overflow-hidden bg-primary-600 hover:bg-primary-500 text-white px-10 py-5 rounded-2xl flex items-center gap-3 transition-all duration-500 shadow-2xl shadow-primary-600/30 hover:shadow-primary-600/50 hover:-translate-y-1 active:scale-95"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            <Plus size={24} strokeWidth={3} /> 
            <span className="font-black text-xl">دورة جديدة</span>
          </button>
        </div>

        {/* Premium Search & Filter Bar */}
        <div className="bg-white/20 dark:bg-slate-800/20 backdrop-blur-2xl p-6 rounded-[2.5rem] border border-white/40 dark:border-white/5 flex flex-col md:flex-row gap-6 items-center mb-12 shadow-xl relative z-10">
          <div className="relative flex-1 w-full group">
            <Search className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors" size={22} />
            <input
              className="w-full pl-6 pr-14 py-5 rounded-[1.5rem] border border-white/20 bg-white/40 dark:bg-slate-900/60 backdrop-blur-md dark:text-white focus:ring-4 focus:ring-primary-500/10 outline-none transition-all duration-500 placeholder:text-gray-400 font-bold text-lg"
              placeholder="عن ماذا تبحث اليوم؟..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="w-full md:w-80">
            <CustomSelect
              options={filterCategoryOptions}
              value={filterCategory}
              onChange={setFilterCategory}
              placeholder="جميع الأقسام"
              className="premium-glass-select"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10 relative z-10">
          {filteredCourses.map(course => (
            <div key={course.id} className="group relative bg-white/30 dark:bg-slate-800/20 backdrop-blur-xl rounded-[3rem] shadow-2xl border border-white/30 dark:border-white/5 overflow-hidden transition-all duration-500 hover:shadow-primary-500/10 hover:-translate-y-3">
              <div className="h-64 bg-gray-200 dark:bg-slate-800 relative overflow-hidden">
                <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-90 transition-opacity duration-500" />
                
                <div className="absolute top-5 right-5 flex gap-2">
                  {course.isPublished ? (
                    <div className="bg-green-500/90 backdrop-blur-md text-white text-[10px] px-4 py-2 rounded-full font-black shadow-lg flex items-center gap-2">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse" /> منشور
                    </div>
                  ) : (
                    <div className="bg-yellow-500/90 backdrop-blur-md text-white text-[10px] px-4 py-2 rounded-full font-black shadow-lg flex items-center gap-2">
                      <EyeOff size={14} /> مسودة
                    </div>
                  )}
                </div>
              </div>

              <div className="p-8 pt-0 -mt-12 relative z-20">
                <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-[2rem] p-6 shadow-xl border border-white/50 dark:border-white/10">
                  <div className="flex gap-2 mb-4">
                    <span className="text-[10px] uppercase tracking-tighter font-black text-primary-600 dark:text-primary-400 bg-primary-500/10 px-3 py-1.5 rounded-lg border border-primary-500/20">
                      {CATEGORY_LABELS[course.category]}
                    </span>
                    <span className="text-[10px] uppercase tracking-tighter font-black text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/5">
                      {course.modules.length} دروس
                    </span>
                  </div>
                  <h3 className="font-black text-2xl text-gray-900 dark:text-white mb-3 line-clamp-1 group-hover:text-primary-600 transition-colors tracking-tight">{course.title}</h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mb-8 line-clamp-2 h-10 leading-relaxed font-medium">{course.description || 'لم يتم إضافة وصف لهذه الدورة بعد. سيظهر الوصف هنا عند إضافته.'}</p>

                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(course)} className="flex-[3] py-3.5 bg-primary-600 text-white rounded-2xl font-black text-sm hover:bg-primary-700 shadow-xl shadow-primary-600/20 hover:shadow-primary-600/40 transition-all active:scale-95 flex items-center justify-center gap-2">
                      <Edit3 size={18} /> تعديل
                    </button>
                    <button onClick={() => handlePreviewCourse(course.id)} title="معاينة" className="flex-1 py-3.5 bg-white/40 dark:bg-slate-800/40 backdrop-blur-md border border-white/50 dark:border-white/10 text-gray-600 dark:text-gray-300 rounded-2xl font-bold transition-all hover:bg-blue-500 hover:text-white hover:border-blue-500 active:scale-95 flex items-center justify-center">
                      <Eye size={18} />
                    </button>
                    <button onClick={() => setStatsModalCourse(course)} title="إحصائيات" className="flex-1 py-3.5 bg-white/40 dark:bg-slate-800/40 backdrop-blur-md border border-white/50 dark:border-white/10 text-gray-600 dark:text-gray-300 rounded-2xl font-bold transition-all hover:bg-emerald-500 hover:text-white hover:border-emerald-500 active:scale-95 flex items-center justify-center">
                      <BarChart3 size={18} />
                    </button>
                    <button onClick={() => handleDuplicateCourse(course.id)} title="نسخ الدورة" className="flex-1 py-3.5 bg-white/40 dark:bg-slate-800/40 backdrop-blur-md border border-white/50 dark:border-white/10 text-gray-600 dark:text-gray-300 rounded-2xl font-bold transition-all hover:bg-purple-500 hover:text-white hover:border-purple-500 active:scale-95 flex items-center justify-center">
                      <Copy size={18} />
                    </button>
                    <button onClick={() => handleDelete(course.id)} title="حذف" className="flex-1 py-3.5 bg-red-50 dark:bg-red-500/10 text-red-500 rounded-2xl font-bold transition-all hover:bg-red-500 hover:text-white active:scale-95 flex items-center justify-center shadow-lg shadow-red-500/5 hover:shadow-red-500/20">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredCourses.length === 0 && (
          <div className="py-32 text-center border-4 border-dashed border-gray-200 dark:border-white/5 rounded-[4rem] animate-pulse relative z-10">
            <div className="bg-gray-100 dark:bg-slate-800 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
               <Search size={40} className="text-gray-300" strokeWidth={1.5} />
            </div>
            <p className="text-3xl font-black text-gray-300">لا توجد دورات متاحة حالياً</p>
            <button onClick={() => {setSearchTerm(''); setFilterCategory('all');}} className="mt-6 text-primary-500 font-bold hover:underline">إعادة ضبط الفلاتر</button>
          </div>
        )}

        {/* Analytics Modal */}
        {statsModalCourse && createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={() => setStatsModalCourse(null)}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />
            <div
              ref={statsRef}
              onClick={e => e.stopPropagation()}
              className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white/10 dark:bg-slate-900/60 backdrop-blur-3xl rounded-[3rem] border border-white/20 dark:border-white/10 shadow-2xl p-10 animate-fade-in"
            >
              {/* Glowing Orbs */}
              <div className="absolute -top-20 -right-20 w-80 h-80 bg-emerald-500/20 blur-[120px] rounded-full pointer-events-none" />
              <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-blue-500/20 blur-[120px] rounded-full pointer-events-none" />

              {/* Header */}
              <div className="flex justify-between items-start mb-10 relative z-10">
                <div>
                  <h2 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-blue-400 tracking-tight flex items-center gap-3">
                    <BarChart3 size={28} /> إحصائيات الدورة
                  </h2>
                  <p className="text-gray-400 mt-1 font-bold">{statsModalCourse.title}</p>
                </div>
                {(() => {
                  const allUsersMap = new Map(backend.getUsers().map(u => [u.id, u]));
                  const allContent = statsModalCourse.modules.flatMap(m => m.content);
                  const totalItems = allContent.length;
                  const quizzes = allContent.filter(c => c.type === ContentType.QUIZ);
                  
                  // Collect raw data for enrolled/progress
                  const rawData = statsModalCourse.enrolledStudents?.map(es => {
                    const id = typeof es === 'string' ? es : es.id;
                    const u = allUsersMap.get(id);
                    const prog = backend.getProgress(id, statsModalCourse.id);
                    
                    const completedCount = prog?.completedItems?.length || 0;
                    const completion = totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0;
                    
                    let quizAvg: number | null = null;
                    if (quizzes.length > 0) {
                      let totalScore = 0;
                      let attempted = 0;
                      quizzes.forEach(q => {
                        const score = prog?.quizScores?.[q.id];
                        if (score !== undefined) {
                          totalScore += score;
                          attempted++;
                        }
                      });
                      if (attempted > 0) quizAvg = Math.round(totalScore / attempted);
                    }
                    
                    const now = new Date().getTime();
                    const lastAcc = prog?.lastAccessed ? new Date(prog.lastAccessed).getTime() : 0;
                    const isInactive = completion < 100 && lastAcc > 0 && (now - lastAcc) > 7 * 24 * 60 * 60 * 1000;
                    
                    // Bottleneck logic: Find first incomplete content item
                    let bottleneckItemId = null;
                    if (completion < 100) {
                      for (const mod of statsModalCourse.modules) {
                        const firstIncomplete = mod.content.find(c => !prog?.completedItems?.includes(c.id));
                        if (firstIncomplete) {
                          bottleneckItemId = firstIncomplete.id;
                          break;
                        }
                      }
                    }

                    return {
                      id,
                      name: u?.fullName || 'غير معروف',
                      role: u?.role || UserRole.STUDENT,
                      grade: u?.gradeLevel || '-',
                      section: u?.classSection || '-',
                      completion,
                      quizAvg,
                      lastAccessed: lastAcc,
                      lastAccessedStr: lastAcc > 0 ? new Date(lastAcc).toLocaleDateString('ar-SA') : '-',
                      isInactive,
                      bottleneckItemId
                    };
                  }) || [];

                  // Apply Filters
                  let filtered = rawData.filter(f => {
                    if (f.role === UserRole.STUDENT && !statsRoleFilter.student) return false;
                    if (f.role === UserRole.EXTERNAL && !statsRoleFilter.user) return false;
                    if (f.role === UserRole.GUEST && !statsRoleFilter.guest) return false;
                    if (![UserRole.STUDENT, UserRole.EXTERNAL, UserRole.GUEST].includes(f.role as any) && !statsRoleFilter.user) return false;
                    return true;
                  });

                  if (statsGrade) filtered = filtered.filter(f => f.role !== UserRole.STUDENT || f.grade === statsGrade);
                  if (statsSection) filtered = filtered.filter(f => f.role !== UserRole.STUDENT || f.section === statsSection);
                  if (statsSearch) filtered = filtered.filter(f => f.name.toLowerCase().includes(statsSearch.toLowerCase()));

                  // Sorting
                  filtered.sort((a, b) => {
                    if (statsSortBy === 'completion_desc') return b.completion - a.completion;
                    if (statsSortBy === 'name_asc') return a.name.localeCompare(b.name, 'ar');
                    if (statsSortBy === 'date_desc') return b.lastAccessed - a.lastAccessed;
                    return 0;
                  });

                  const avgCompletion = rawData.length > 0 ? Math.round(rawData.reduce((a, b) => a + b.completion, 0) / rawData.length) : 0;
                  
                  // Bottleneck Calculation
                  let bottleneckTitle = 'لا يوجد';
                  if (rawData.length > 0) {
                    const bottlenecks: Record<string, number> = {};
                    rawData.forEach(r => {
                      if (r.bottleneckItemId) bottlenecks[r.bottleneckItemId] = (bottlenecks[r.bottleneckItemId] || 0) + 1;
                    });
                    const maxBottleneck = Object.entries(bottlenecks).sort((a, b) => b[1] - a[1])[0];
                    if (maxBottleneck) {
                      const item = allContent.find(c => c.id === maxBottleneck[0]);
                      if (item) bottleneckTitle = item.title;
                    }
                  }

                  return (
                    <>
                      <div className="flex gap-3 absolute top-0 left-0">
                        <button onClick={() => handleExportStats(filtered, 'csv')} className="p-3 bg-white/20 dark:bg-slate-800/40 backdrop-blur-md border border-white/20 rounded-2xl text-gray-300 hover:text-green-400 transition-all active:scale-90" title="تصدير CSV">
                          <FileDown size={20} />
                        </button>
                        <button onClick={() => handleExportStats(filtered, 'print')} className="p-3 bg-white/20 dark:bg-slate-800/40 backdrop-blur-md border border-white/20 rounded-2xl text-gray-300 hover:text-white transition-all active:scale-90" title="طباعة">
                          <Printer size={20} />
                        </button>
                        <button onClick={() => handleExportStats(filtered, 'pdf')} className="p-3 bg-white/20 dark:bg-slate-800/40 backdrop-blur-md border border-white/20 rounded-2xl text-gray-300 hover:text-red-400 transition-all active:scale-90" title="تحميل PDF">
                          <Download size={20} />
                        </button>
                        <div className="w-px bg-white/10 mx-1"></div>
                        <button onClick={() => setStatsModalCourse(null)} className="p-3 bg-white/20 dark:bg-slate-800/40 backdrop-blur-md border border-white/20 rounded-2xl text-gray-300 hover:text-red-500 transition-all active:scale-90" title="إغلاق">
                          <X size={20} />
                        </button>
                      </div>
                    </div>

                    <div className="relative z-10 space-y-8">
                      {/* Stat Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-white/10 dark:bg-slate-800/30 backdrop-blur-xl rounded-[2rem] p-5 border border-white/15 shadow-xl text-center">
                          <Users className="mx-auto mb-2 text-blue-400" size={24} />
                          <p className="text-3xl font-black text-white">{rawData.length}</p>
                          <p className="text-gray-400 text-xs font-bold mt-1">المسجلين الكلي</p>
                        </div>
                        <div className="bg-white/10 dark:bg-slate-800/30 backdrop-blur-xl rounded-[2rem] p-5 border border-white/15 shadow-xl text-center">
                          <CheckCircle2 className="mx-auto mb-2 text-emerald-400" size={24} />
                          <p className="text-3xl font-black text-white">{avgCompletion}%</p>
                          <p className="text-gray-400 text-xs font-bold mt-1">متوسط الإكمال</p>
                          <div className="w-full bg-white/10 rounded-full h-1.5 mt-2">
                            <div className="bg-emerald-500 h-1.5 rounded-full transition-all duration-1000" style={{ width: `${avgCompletion}%` }} />
                          </div>
                        </div>
                        <div className="bg-white/10 dark:bg-slate-800/30 backdrop-blur-xl rounded-[2rem] p-5 border border-white/15 shadow-xl text-center">
                          <HelpCircle className="mx-auto mb-2 text-amber-400" size={24} />
                          <p className="text-3xl font-black text-white">{quizzes.length}</p>
                          <p className="text-gray-400 text-xs font-bold mt-1">عدد الاختبارات بالدورة</p>
                        </div>
                        <div className="bg-white/10 dark:bg-slate-800/30 backdrop-blur-xl rounded-[2rem] p-5 border border-white/15 shadow-xl text-center">
                          <AlertTriangle className="mx-auto mb-2 text-rose-400" size={24} />
                          <p className="text-lg font-black text-white line-clamp-1 truncate" title={bottleneckTitle}>{bottleneckTitle}</p>
                          <p className="text-gray-400 text-xs font-bold mt-1">الدرس الأكثر توقفاً عنده</p>
                        </div>
                      </div>

                      {/* Filters */}
                      <div className="bg-white/5 dark:bg-slate-800/20 backdrop-blur-xl rounded-[2rem] border border-white/10 p-5 space-y-4">
                        <div className="flex flex-col md:flex-row gap-4 justify-between">
                          <div className="flex gap-3 flex-1">
                            <div className="relative flex-1 max-w-sm">
                              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                              <input
                                type="text"
                                className="w-full pl-4 pr-10 py-2.5 rounded-xl border-0 bg-white/10 text-white placeholder-gray-400 shadow-inner focus:ring-2 focus:ring-primary-500 outline-none"
                                placeholder="ابحث بالاسم..."
                                value={statsSearch}
                                onChange={e => setStatsSearch(e.target.value)}
                              />
                            </div>
                            <select
                              className="py-2.5 px-4 rounded-xl text-sm border-0 bg-white/10 text-white shadow-inner focus:ring-2 focus:ring-primary-500 outline-none cursor-pointer"
                              value={statsSortBy}
                              onChange={e => setStatsSortBy(e.target.value as any)}
                            >
                              <option value="completion_desc" className="text-black">الأعلى إنجازاً</option>
                              <option value="name_asc" className="text-black">أبجدياً</option>
                              <option value="date_desc" className="text-black">الأحدث دخولاً</option>
                            </select>
                          </div>
                          
                          <div className="flex gap-2">
                            <label className={`cursor-pointer px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${statsRoleFilter.student ? 'bg-primary-500/20 text-primary-300 border border-primary-500/50' : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'}`}>
                              <input type="checkbox" className="hidden" checked={statsRoleFilter.student} onChange={e => setStatsRoleFilter(p => ({ ...p, student: e.target.checked }))} />
                              {statsRoleFilter.student && <Check size={14} />} الطلاب
                            </label>
                            <label className={`cursor-pointer px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${statsRoleFilter.guest ? 'bg-orange-500/20 text-orange-300 border border-orange-500/50' : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'}`}>
                              <input type="checkbox" className="hidden" checked={statsRoleFilter.guest} onChange={e => setStatsRoleFilter(p => ({ ...p, guest: e.target.checked }))} />
                              {statsRoleFilter.guest && <Check size={14} />} الزوار
                            </label>
                          </div>
                        </div>

                        {statsRoleFilter.student && (
                          <div className="flex gap-3 pt-3 border-t border-white/10 animate-in slide-in-from-top-2">
                            <select
                              className="py-2 px-3 rounded-xl text-xs border-0 bg-white/10 text-white shadow-inner outline-none"
                              value={statsGrade}
                              onChange={e => { setStatsGrade(e.target.value); setStatsSection(''); }}
                            >
                              <option value="" className="text-black">كل الصفوف</option>
                              {backend.getGrades().map(g => <option key={g.id} value={g.name} className="text-black">{g.name}</option>)}
                            </select>
                            <select
                              className="py-2 px-3 rounded-xl text-xs border-0 bg-white/10 text-white shadow-inner outline-none disabled:opacity-50"
                              value={statsSection}
                              onChange={e => setStatsSection(e.target.value)}
                              disabled={!statsGrade}
                            >
                              <option value="" className="text-black">كل الشعب</option>
                              {backend.getGrades().find(g => g.name === statsGrade)?.sections.map(s => (
                                <option key={s} value={s} className="text-black">{s}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>

                      {/* Student Table */}
                      <div className="bg-white/5 dark:bg-slate-800/20 backdrop-blur-xl rounded-[2rem] border border-white/10 overflow-hidden">
                        <div className="p-5 border-b border-white/10">
                          <h3 className="font-black text-white text-lg">تفاصيل المسجلين <span className="text-sm font-normal text-gray-400">({filtered.length})</span></h3>
                        </div>
                        {filtered.length > 0 ? (
                          <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full text-sm text-right">
                              <thead>
                                <tr className="border-b border-white/10 text-gray-400">
                                  <th className="p-4 font-black">الاسم</th>
                                  <th className="p-4 font-black">الفئة/الفصل</th>
                                  <th className="p-4 font-black">الإكمال</th>
                                  <th className="p-4 font-black text-center">متوسط الاختبارات</th>
                                  <th className="p-4 font-black">آخر دخول</th>
                                </tr>
                              </thead>
                              <tbody>
                                {filtered.map((s, idx) => (
                                  <tr key={s.id} className="border-b border-white/5 hover:bg-white/10 transition-colors">
                                    <td className="p-4 text-white font-bold whitespace-nowrap">
                                      <div className="flex items-center gap-2">
                                        {idx < 3 && statsSortBy === 'completion_desc' && (
                                          <span className="text-lg drop-shadow-sm">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}</span>
                                        )}
                                        {s.name}
                                      </div>
                                    </td>
                                    <td className="p-4 whitespace-nowrap">
                                      {s.role === UserRole.STUDENT ? (
                                        <div className="text-xs font-bold text-primary-300 bg-primary-900/40 border border-primary-800/50 px-2 py-1 rounded-lg inline-block">
                                          {s.grade !== '-' ? s.grade : 'طالب'} {s.section !== '-' ? `- ${s.section}` : ''}
                                        </div>
                                      ) : s.role === UserRole.GUEST ? (
                                        <div className="text-xs font-bold text-orange-300 bg-orange-900/40 border border-orange-800/50 px-2 py-1 rounded-lg inline-block">
                                          زائر
                                        </div>
                                      ) : (
                                        <div className="text-xs font-bold text-indigo-300 bg-indigo-900/40 border border-indigo-800/50 px-2 py-1 rounded-lg inline-block">
                                          مستخدم خارجي
                                        </div>
                                      )}
                                    </td>
                                    <td className="p-4 whitespace-nowrap">
                                      <div className="flex items-center gap-3">
                                        <div className="w-24 bg-white/10 rounded-full h-2">
                                          <div className={`h-2 rounded-full ${s.completion >= 80 ? 'bg-emerald-500' : s.completion >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${s.completion}%` }} />
                                        </div>
                                        <span className="text-white font-bold text-xs">{s.completion}%</span>
                                      </div>
                                    </td>
                                    <td className="p-4 text-center font-black whitespace-nowrap">
                                      {s.quizAvg !== null ? (
                                        <span className={s.quizAvg >= 60 ? 'text-emerald-400' : 'text-red-400'}>{s.quizAvg}%</span>
                                      ) : (
                                        <span className="text-gray-500 text-xs">لا يوجد</span>
                                      )}
                                    </td>
                                    <td className="p-4 whitespace-nowrap">
                                      <div className="flex items-center gap-2">
                                        <span className="text-gray-400 text-xs">{s.lastAccessedStr}</span>
                                        {s.isInactive && (
                                          <div title="طالب خامل: لم يكمل الدورة ولم يدخل منذ أكثر من 7 أيام" className="text-rose-400 animate-pulse">
                                            <AlertTriangle size={14} />
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                  </div>
                );
              })()}
            </div>
          </div>,
          document.body
        )}

        <ConfirmModal
          isOpen={confirmModal.isOpen}
          onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
          onConfirm={confirmModal.onConfirm}
          title={confirmModal.title}
          message={confirmModal.message}
          type={confirmModal.type}
        />
      </div>
    );
  }

  if (!editingCourse) return null;

  const categoryOptions = Object.values(CourseCategory).map(cat => ({
    value: cat,
    label: CATEGORY_LABELS[cat] || cat
  }));

  const subjectOptions = Object.values(Subject).map(sub => ({
    value: sub,
    label: SUBJECT_TRANSLATIONS[sub] || sub
  }));

  const difficultyOptions = [
    { value: 'easy', label: 'سهل (درجة منخفضة)' },
    { value: 'medium', label: 'متوسط (درجة متوسطة)' },
    { value: 'hard', label: 'صعب (درجة عالية)' }
  ];

  const bankFilterSubjectOptions = [
    { value: 'all', label: 'جميع المواد' },
    ...subjectOptions
  ];

  const bankFilterDifficultyOptions = [
    { value: 'all', label: 'كل المستويات' },
    { value: 'easy', label: 'سهل' },
    { value: 'medium', label: 'متوسط' },
    { value: 'hard', label: 'صعب' }
  ];

  return (
    <div className="bg-white/10 dark:bg-slate-900/40 backdrop-blur-[40px] shadow-2xl p-10 rounded-[3rem] border border-white/30 dark:border-white/10 relative overflow-hidden animate-fade-in min-h-[90vh]">
      {/* Dynamic Background Effects */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary-500/10 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/10 blur-[150px] rounded-full pointer-events-none" />


      {/* Premium Sticky Header */}
      <div className="sticky top-[-40px] z-[100] bg-white/20 dark:bg-slate-900/40 backdrop-blur-2xl border-b border-white/30 dark:border-white/10 py-6 px-10 -mx-10 mb-10 flex flex-col sm:flex-row gap-6 justify-between items-start sm:items-center shadow-lg">
        <div className="flex items-center gap-6">
          <button onClick={handleCancelEdit} className="group p-3.5 rounded-2xl bg-white/40 dark:bg-slate-800/40 border border-white/50 dark:border-white/10 hover:bg-primary-600 hover:text-white transition-all duration-500 shadow-lg active:scale-90">
            <ArrowRight size={24} strokeWidth={2.5} />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-gray-900 via-gray-700 to-gray-500 dark:from-white dark:via-gray-200 dark:to-gray-400 tracking-tight">محرر المحتوى</h2>
              {!editingCourse.isPublished && (
                <span className="px-3 py-1 bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 text-[10px] font-black rounded-full border border-yellow-500/30 uppercase tracking-widest">مسودة</span>
              )}
            </div>
            <p className="text-gray-500 dark:text-gray-400 mt-1 font-bold opacity-70 flex items-center gap-2">
              <Edit3 size={14} />
              {editingCourse.title || 'دورة تعليمية جديدة'}
            </p>
          </div>
        </div>
        <div className="flex gap-4 w-full sm:w-auto">
          <button onClick={handleCancelEdit} className="flex-1 sm:flex-none px-8 py-4 bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl border border-white/50 dark:border-white/10 rounded-2xl hover:bg-white/60 dark:hover:bg-slate-800/60 transition-all font-black text-gray-700 dark:text-white shadow-lg active:scale-95">إلغاء</button>
          <button onClick={handleSaveCourse} className="flex-1 sm:flex-none px-10 py-4 bg-primary-600 text-white rounded-2xl font-black shadow-xl shadow-primary-600/30 hover:bg-primary-500 hover:-translate-y-1 transition-all active:scale-95 flex items-center justify-center gap-3">
            <Save size={20} strokeWidth={2.5} /> حفظ ونشر التغييرات
          </button>
        </div>
      </div>

      {/* Elegant Tab Switcher */}
      <div className="inline-flex p-2 bg-white/20 dark:bg-slate-800/30 backdrop-blur-3xl rounded-[2rem] border border-white/40 dark:border-white/10 mb-10 shadow-2xl relative z-10">
        <button 
          onClick={() => setEditorTab('content')} 
          className={`px-8 py-4 rounded-[1.5rem] font-black text-sm transition-all duration-500 flex items-center gap-3 ${editorTab === 'content' ? 'bg-primary-600 text-white shadow-xl shadow-primary-600/20' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-slate-700/40'}`}
        >
          <List size={20} /> بناء المنهج
        </button>
        <button 
          onClick={() => setEditorTab('landing')} 
          className={`px-8 py-4 rounded-[1.5rem] font-black text-sm transition-all duration-500 flex items-center gap-3 ${editorTab === 'landing' ? 'bg-primary-600 text-white shadow-xl shadow-primary-600/20' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-slate-700/40'}`}
        >
          <Layout size={20} /> واجهة التسجيل
        </button>
      </div>

      {editorTab === 'content' ? (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10 animate-fade-in">
        {/* Settings Column */}
        <div className="col-span-1 space-y-6 p-8 bg-white/20 dark:bg-slate-800/20 backdrop-blur-2xl border border-white/30 dark:border-white/10 rounded-[2rem] shadow-xl h-fit">
          <h3 className="font-black text-gray-800 dark:text-white border-b border-white/20 dark:border-white/5 pb-3 mb-5 text-xl tracking-tight">بيانات الدورة</h3>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold mb-2 dark:text-gray-300">عنوان الدورة</label>
              <input
                className="w-full border-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-lg dark:text-white p-3 rounded-2xl shadow-inner focus:ring-2 focus:ring-primary-500/50 outline-none transition-all duration-300"
                value={editingCourse.title}
                onChange={e => setEditingCourse({ ...editingCourse, title: e.target.value })}
              />
            </div>
            <div>
              <div className="flex justify-between items-end mb-2">
                <label className="block text-sm font-bold dark:text-gray-300">التصنيف / المادة</label>
                {editingCourse.modules.length > 0 && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-gray-400 bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded-md">
                    <Lock size={10} /> مقفل لوجود محتوى
                  </span>
                )}
              </div>
              <div className={`transition-all duration-300 ${editingCourse.modules.length > 0 ? 'opacity-70 pointer-events-none grayscale' : ''}`}>
                <CustomSelect
                  options={categoryOptions}
                  value={editingCourse.category}
                  onChange={(val) => setEditingCourse({ ...editingCourse, category: val as CourseCategory })}
                />
              </div>
              {editingCourse.modules.length > 0 && (
                <p className="text-[11px] text-gray-500 mt-1">لا يمكن تغيير التصنيف بعد إضافة وحدات ومحتوى للحفاظ على سلامة الأسئلة المربوطة. احذف المحتوى أولاً لتغييره.</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-bold mb-2 dark:text-gray-300">الوصف</label>
              <RichTextEditor
                content={editingCourse.description || ''}
                onChange={(html) => setEditingCourse({ ...editingCourse, description: html })}
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-2 dark:text-gray-300">الصورة المصغرة</label>
              <div className="flex gap-2">
                <input
                  className="flex-1 w-full border-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-lg dark:text-white p-3 rounded-2xl shadow-inner focus:ring-2 focus:ring-primary-500/50 outline-none transition-all duration-300 ltr"
                  value={editingCourse.thumbnail}
                  onChange={e => setEditingCourse({ ...editingCourse, thumbnail: e.target.value })}
                  placeholder="الرابط (URL) أو ارفع صورة"
                />
                <label className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-lg hover:bg-white/80 dark:hover:bg-slate-800/80 text-gray-700 dark:text-white px-4 rounded-2xl flex items-center cursor-pointer transition-all duration-300 shadow-sm border border-white/40 dark:border-slate-700/40">
                  {isUploading ? <div className="animate-spin w-5 h-5 border-2 border-current rounded-full border-t-transparent"></div> : <Upload size={20} />}
                  <input type="file" className="hidden" accept="image/*" onChange={handleThumbnailUpload} disabled={isUploading} />
                </label>
              </div>
            </div>

            <div className="flex items-center justify-between bg-white/50 dark:bg-slate-800/50 p-4 rounded-2xl border border-white/40 dark:border-slate-700/40 shadow-sm transition-all duration-300">
              <div className="flex-1 pl-4">
                <h4 className="font-bold text-gray-900 dark:text-white text-sm mb-2">قالب الشهادة</h4>
                <CustomSelect
                  options={certOptions}
                  value={editingCourse.certificateTemplateId || ''}
                  onChange={(val) => setEditingCourse({ ...editingCourse, certificateTemplateId: val || undefined })}
                  searchable={true}
                  placeholder="اختر شهادة الدورة..."
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  سيتم منح هذه الشهادة للطالب عند إكماله 100% وإصداره لها من شاشة التهنئة.
                </p>
                {editingCourse.certificateTemplateId && (
                  <div className="mt-4">
                    <h4 className="font-bold text-gray-900 dark:text-white text-sm mb-2">نص التهنئة (يظهر في صفحة الإحصائيات الختامية)</h4>
                    <RichTextEditor
                       content={editingCourse.congratulationsText || ''}
                       onChange={(val) => setEditingCourse({ ...editingCourse, congratulationsText: val })}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between bg-white/50 dark:bg-slate-800/50 p-4 rounded-2xl border border-white/40 dark:border-slate-700/40 shadow-sm transition-all duration-300">
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white text-sm">حالة الدورة</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-[200px]">
                  {editingCourse.isPublished ? 'الدورة منشورة حالياً' : 'الدورة مسودة '}
                </p>
              </div>
              <button
                onClick={() => setEditingCourse({ ...editingCourse, isPublished: !editingCourse.isPublished })}
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${editingCourse.isPublished ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
              >
                <span className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition-transform ${editingCourse.isPublished ? '-translate-x-7' : '-translate-x-1'}`} />
              </button>
            </div>
            
            <div className="flex items-center justify-between bg-white/60 dark:bg-slate-900/60 backdrop-blur-lg p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700/50 mt-4">
              <div>
                <h4 className="font-bold flex items-center gap-2 text-gray-900 dark:text-white">
                  {editingCourse.isPublic ? <Globe size={18} className="text-green-500" /> : <Shield size={18} className="text-orange-500" />}
                  صلاحية الدخول
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {editingCourse.isPublic ? 'عامة (متاحة للسياح والمستخدمين للتسجيل المباشر)' : 'خاصة (تتطلب حساب مسجل وموافق عليه)'}
                </p>
              </div>
              <button
                onClick={() => setEditingCourse({ ...editingCourse, isPublic: !editingCourse.isPublic })}
                className={`w-14 w-15 h-8 flex items-center rounded-full p-1 transition-colors ${editingCourse.isPublic ? 'bg-green-500' : 'bg-gray-300 dark:bg-slate-600'}`}
              >
                <span className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition-transform ${editingCourse.isPublic ? '-translate-x-7' : '-translate-x-1'}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Curriculum Builder */}
        <div className="col-span-1 lg:col-span-2 space-y-6">

      {/* Curriculum Builder with DndContext */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      // onDragOver={handleDragOver} // TODO: Add for smoother cross-list animations
      >
        <div className="space-y-4">
          <div className="flex justify-between items-end px-2">
            <h3 className="font-bold text-xl dark:text-white">المنهج الدراسي</h3>
            <button onClick={addModule} className="text-primary-600 dark:text-primary-400 font-bold hover:underline text-sm">+ إضافة وحدة جديدة</button>
          </div>

          <SortableContext items={editingCourse.modules.map(m => m.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-4">
              {editingCourse.modules.map((module, mIdx) => (
                <SortableModule
                  key={module.id}
                  module={module}
                  moduleIndex={mIdx}
                  updateModuleTitle={updateModuleTitle}
                  deleteModule={deleteModule}
                  deleteContent={deleteContent}
                  openContentModal={(mid) => openContentModal(mid)}
                  onEditContent={(mid, item) => openContentModal(mid, item)}
                  modules={editingCourse.modules}
                  onUpdateModulePrerequisite={(moduleId, prereqId) => {
                    setEditingCourse({
                      ...editingCourse,
                      modules: editingCourse.modules.map(m => m.id === moduleId ? { ...m, prerequisiteModuleId: prereqId } : m)
                    });
                  }}
                />
              ))}
            </div>
          </SortableContext>
        </div>

        <DragOverlay>
          {activeDragItem?.type === 'MODULE' && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-xl p-4 opacity-90">
              <div className="font-bold dark:text-white flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-slate-700 flex items-center justify-center font-bold">#</div>
                {activeDragItem.module.title}
              </div>
            </div>
          )}
          {activeDragItem?.type === 'CONTENT' && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-primary-500 shadow-xl p-3 opacity-90 w-64">
              <div className="font-bold dark:text-white flex items-center gap-2">
                <MoreVertical size={16} />
                {activeDragItem.item.title}
              </div>
            </div>
          )}
        </DragOverlay>
      </DndContext>
      </div>
      </div>
      ) : (
        <div className="animate-fade-in relative z-10 w-full mb-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* BUILDER SETTINGS (LEFT) */}
            <div className="space-y-6">
              <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl border border-white/50 dark:border-slate-700/50 rounded-3xl p-6 shadow-sm">
                <h3 className="font-bold text-gray-800 dark:text-white border-b border-gray-200/50 dark:border-slate-800/50 pb-3 mb-6 flex items-center gap-2">
                  <Settings2 className="text-primary-500" size={20} /> الإعدادات العامة للواجهة
                </h3>
                
                <div className="space-y-5">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-bold dark:text-gray-300">صورة غلاف الواجهة (Header Image)</label>
                      <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editingCourse.landingPageConfig?.useMainThumbnail ?? true}
                          onChange={(e) => setEditingCourse({
                            ...editingCourse,
                            landingPageConfig: { ...editingCourse.landingPageConfig, useMainThumbnail: e.target.checked }
                          })}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        استخدام الصورة الأساسية للدورة
                      </label>
                    </div>
                    {!(editingCourse.landingPageConfig?.useMainThumbnail ?? true) && (
                      <input
                        className="w-full border-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-lg dark:text-white p-3 rounded-2xl shadow-inner outline-none text-left focus:ring-2 focus:ring-primary-500/50 transition-all"
                        dir="ltr"
                        value={editingCourse.landingPageConfig?.headerImage || ''}
                        onChange={(e) => setEditingCourse({
                          ...editingCourse,
                          landingPageConfig: { ...editingCourse.landingPageConfig, headerImage: e.target.value }
                        })}
                        placeholder="رابط الصورة (URL)"
                      />
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-bold dark:text-gray-300">فيديو تعريفي (Promo Video)</label>
                      <div className="flex bg-gray-100 dark:bg-slate-700/50 rounded-lg p-0.5">
                        <button
                          onClick={() => setEditingCourse({
                            ...editingCourse,
                            landingPageConfig: { ...editingCourse.landingPageConfig, promoVideoType: 'youtube' }
                          })}
                          className={`px-3 py-1 text-xs font-bold rounded-md transition ${(!editingCourse.landingPageConfig?.promoVideoType || editingCourse.landingPageConfig?.promoVideoType === 'youtube') ? 'bg-white dark:bg-slate-600 shadow-sm text-primary-600 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}
                        >
                          رابط يوتيوب
                        </button>
                        <button
                          onClick={() => setEditingCourse({
                            ...editingCourse,
                            landingPageConfig: { ...editingCourse.landingPageConfig, promoVideoType: 'upload' }
                          })}
                          className={`px-3 py-1 text-xs font-bold rounded-md transition ${editingCourse.landingPageConfig?.promoVideoType === 'upload' ? 'bg-white dark:bg-slate-600 shadow-sm text-primary-600 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}
                        >
                          ملف فيديو (MP4)
                        </button>
                      </div>
                    </div>
                    
                    {(!editingCourse.landingPageConfig?.promoVideoType || editingCourse.landingPageConfig?.promoVideoType === 'youtube') ? (
                       <input
                         className="w-full border-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-lg dark:text-white p-3 rounded-2xl shadow-inner outline-none text-left focus:ring-2 focus:ring-primary-500/50"
                         dir="ltr"
                         value={editingCourse.landingPageConfig?.promoVideoUrl || ''}
                         onChange={(e) => setEditingCourse({
                           ...editingCourse,
                           landingPageConfig: { ...editingCourse.landingPageConfig, promoVideoUrl: e.target.value }
                         })}
                         placeholder="رابط فيديو يوتيوب (سيحول المستخدم إليه عند النقر)"
                       />
                    ) : (
                       <input
                         className="w-full border-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-lg dark:text-white p-3 rounded-2xl shadow-inner outline-none text-left focus:ring-2 focus:ring-primary-500/50"
                         dir="ltr"
                         value={editingCourse.landingPageConfig?.promoVideoUrl || ''}
                         onChange={(e) => setEditingCourse({
                           ...editingCourse,
                           landingPageConfig: { ...editingCourse.landingPageConfig, promoVideoUrl: e.target.value }
                         })}
                         placeholder="رابط ملف فيديو MP4 مباشر (سيتم تشغيله بدل الصورة)"
                       />
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-bold mb-2 dark:text-gray-300">عنوان الترحيب</label>
                    <input
                      className="w-full border-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-lg dark:text-white p-3 rounded-2xl shadow-inner focus:ring-2 focus:ring-primary-500/50 outline-none"
                      value={editingCourse.landingPageConfig?.welcomeTitle || ''}
                      onChange={(e) => setEditingCourse({
                        ...editingCourse,
                        landingPageConfig: { ...editingCourse.landingPageConfig, welcomeTitle: e.target.value }
                      })}
                      placeholder="مثال: دليلك الشامل لاجتياز القدرات.."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold mb-2 dark:text-gray-300">نص تسويقي (Rich Text)</label>
                    <RichTextEditor
                       content={editingCourse.landingPageConfig?.descriptionText || editingCourse.description || ''}
                       onChange={(html) => setEditingCourse({
                          ...editingCourse,
                          landingPageConfig: { ...editingCourse.landingPageConfig, descriptionText: html }
                        })}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mt-6">
                    <label className="flex items-center gap-2 p-3 bg-white/40 dark:bg-slate-900/40 rounded-xl cursor-pointer hover:bg-white/60 dark:hover:bg-slate-800/60 transition">
                      <input 
                        type="checkbox" 
                        checked={editingCourse.landingPageConfig?.showLessonCount ?? true} 
                        onChange={(e) => setEditingCourse({
                          ...editingCourse,
                          landingPageConfig: { ...editingCourse.landingPageConfig, showLessonCount: e.target.checked }
                        })}
                        className="rounded text-primary-600 focus:ring-primary-500" 
                      />
                      <span className="text-sm font-bold dark:text-gray-300">عرض عدد الدروس</span>
                    </label>
                    <label className="flex items-center gap-2 p-3 bg-white/40 dark:bg-slate-900/40 rounded-xl cursor-pointer hover:bg-white/60 dark:hover:bg-slate-800/60 transition">
                      <input 
                        type="checkbox" 
                        checked={editingCourse.landingPageConfig?.showCategory ?? true} 
                        onChange={(e) => setEditingCourse({
                          ...editingCourse,
                          landingPageConfig: { ...editingCourse.landingPageConfig, showCategory: e.target.checked }
                        })}
                        className="rounded text-primary-600 focus:ring-primary-500" 
                      />
                      <span className="text-sm font-bold dark:text-gray-300">عرض التصنيف</span>
                    </label>
                  </div>
                  
                  <div className="mt-4">
                    <label className="block text-sm font-bold mb-2 dark:text-gray-300">نص زر التسجيل</label>
                    <input
                      className="w-full border-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-lg dark:text-white p-3 rounded-2xl shadow-inner focus:ring-2 focus:ring-primary-500/50 outline-none"
                      value={editingCourse.landingPageConfig?.registrationButtonText || 'التسجيل في الدورة'}
                      onChange={(e) => setEditingCourse({
                        ...editingCourse,
                        landingPageConfig: { ...editingCourse.landingPageConfig, registrationButtonText: e.target.value }
                      })}
                    />
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-bold mb-2 dark:text-gray-300 flex items-center justify-between">
                      ميزات أو إحصائيات إضافية <bdo dir="ltr" className="inline-block px-1">(Custom Stats)</bdo>
                      <button 
                         onClick={() => {
                           const arr = editingCourse.landingPageConfig?.customStats || [];
                           setEditingCourse({
                             ...editingCourse,
                             landingPageConfig: { ...editingCourse.landingPageConfig, customStats: [...arr, { id: Date.now().toString(), label: 'ميزة جديدة', iconName: 'CheckCircle2', value: '100%'} ] }
                           })
                         }}
                         className="text-xs text-primary-600 bg-primary-50 hover:bg-primary-100 dark:bg-primary-900/20 px-2 py-1 rounded"
                      >
                         + إضافة ميزة
                      </button>
                    </label>
                    
                    <div className="space-y-3 mt-3">
                      {(editingCourse.landingPageConfig?.customStats || []).map((stat, idx) => (
                         <div key={stat.id || idx} className="flex gap-2 items-center bg-gray-50 dark:bg-slate-900/30 p-2 rounded-xl border border-gray-100 dark:border-slate-700/50">
                            <input 
                               className="flex-1 bg-transparent border-0 outline-none px-2 text-sm dark:text-white"
                               placeholder="الاسم (مثال: تقييمات)"
                               value={stat.label}
                               onChange={(e) => {
                                 const arr = [...(editingCourse.landingPageConfig?.customStats || [])];
                                 arr[idx].label = e.target.value;
                                 setEditingCourse({ ...editingCourse, landingPageConfig: { ...editingCourse.landingPageConfig, customStats: arr } });
                               }}
                            />
                            <div className="w-px h-6 bg-gray-300 dark:bg-slate-700"></div>
                            <input 
                               className="flex-1 bg-transparent border-0 outline-none px-2 text-sm dark:text-white text-center font-bold"
                               placeholder="القيمة (مثال: 4.8)"
                               value={stat.value}
                               onChange={(e) => {
                                 const arr = [...(editingCourse.landingPageConfig?.customStats || [])];
                                 arr[idx].value = e.target.value;
                                 setEditingCourse({ ...editingCourse, landingPageConfig: { ...editingCourse.landingPageConfig, customStats: arr } });
                               }}
                            />
                            <button 
                               onClick={() => {
                                 const arr = [...(editingCourse.landingPageConfig?.customStats || [])];
                                 arr.splice(idx, 1);
                                 setEditingCourse({ ...editingCourse, landingPageConfig: { ...editingCourse.landingPageConfig, customStats: arr } });
                               }}
                               className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                            >
                              <Trash2 size={16} />
                            </button>
                         </div>
                      ))}
                      {(!editingCourse.landingPageConfig?.customStats || editingCourse.landingPageConfig?.customStats.length === 0) && (
                         <p className="text-xs text-gray-400 dark:text-gray-500 py-2 text-center text-dashed border border-gray-200 dark:border-slate-700 rounded-xl">لا توجد ميزات إضافية</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* PREVIEW PANEL (RIGHT) */}
            <div className="space-y-6">
              <div className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl border border-white/50 dark:border-slate-700/50 rounded-3xl p-6 shadow-sm sticky top-24">
                <h3 className="font-bold text-gray-800 dark:text-white border-b border-gray-200/50 dark:border-slate-800/50 pb-3 mb-6 flex items-center gap-2">
                  <Palette className="text-primary-500" size={20} /> معاينة حية لواجهة الدورة
                </h3>
                
                {/* Simulated Modal Layout */}
                <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 transform scale-95 origin-top scale-[0.9]">
                  
                  {/* Header Image Area */}
                  <div className="h-40 w-full relative bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    {editingCourse.landingPageConfig?.promoVideoUrl && editingCourse.landingPageConfig?.promoVideoType === 'upload' ? (
                      <video 
                        src={editingCourse.landingPageConfig.promoVideoUrl} 
                        className="w-full h-full object-cover"
                        controls
                        muted
                      />
                    ) : (
                      <>
                        {editingCourse.landingPageConfig?.promoVideoUrl && (!editingCourse.landingPageConfig?.promoVideoType || editingCourse.landingPageConfig?.promoVideoType === 'youtube') && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-sm z-10 transition">
                             <div className="w-12 h-12 rounded-full bg-primary-600 shadow-lg shadow-primary-500/50 flex items-center justify-center pl-1 cursor-pointer">
                                <Video className="text-white relative z-10" fill="white" size={20} />
                             </div>
                          </div>
                        )}
                        
                        {(editingCourse.landingPageConfig?.useMainThumbnail ?? true) ? (
                            <img src={editingCourse.thumbnail} className="w-full h-full object-cover" alt="Course Header" />
                        ) : editingCourse.landingPageConfig?.headerImage ? (
                            <img src={editingCourse.landingPageConfig.headerImage} className="w-full h-full object-cover" alt="Course Header" />
                        ) : (
                           <ImageIcon size={40} className="text-gray-300 dark:text-slate-600" />
                        )}
                        
                        <div className="absolute bottom-0 inset-x-0 h-1/2 bg-gradient-to-t from-gray-900/80 to-transparent pointer-events-none z-0"></div>
                      </>
                    )}
                  </div>

                  {/* Modal Body */}
                  <div className="p-6">
                    {editingCourse.landingPageConfig?.showCategory && (
                       <span className="inline-block px-2 py-0.5 mb-3 bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 text-[10px] font-bold rounded">
                         {CATEGORY_LABELS[editingCourse.category]}
                       </span>
                    )}

                    <h2 className="text-xl font-black text-gray-900 dark:text-white mb-2 leading-tight">
                      {editingCourse.landingPageConfig?.welcomeTitle || editingCourse.title}
                    </h2>
                    
                    <div 
                      className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3 mb-5 prose dark:prose-invert max-w-none"
                      dangerouslySetInnerHTML={{ __html: editingCourse.landingPageConfig?.descriptionText || editingCourse.description || '<p>لا يوجد وصف...</p>' }}
                    />
                    
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-3 mb-6 relative">
                      {editingCourse.landingPageConfig?.showLessonCount && (
                         <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-3 text-center border border-gray-100 dark:border-slate-700/50">
                            <div className="flex justify-center mb-1 text-blue-500"><List size={18} /></div>
                            <div className="text-[10px] text-gray-500 dark:text-gray-400 font-bold mb-0.5">عدد الدروس</div>
                            <div className="text-sm font-black text-gray-800 dark:text-white">
                              {editingCourse.modules.reduce((acc, m) => acc + m.content.length, 0)} دروس
                            </div>
                         </div>
                      )}
                      {(editingCourse.landingPageConfig?.customStats || []).map((s, idx) => (
                         <div key={idx} className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-3 text-center border border-gray-100 dark:border-slate-700/50">
                            <div className="flex justify-center mb-1 text-primary-500"><CheckCircle2 size={18} /></div>
                            <div className="text-[10px] text-gray-500 dark:text-gray-400 font-bold mb-0.5">{s.label}</div>
                            <div className="text-sm font-black text-gray-800 dark:text-white">{s.value}</div>
                         </div>
                      ))}
                    </div>

                    {/* Button */}
                    <div className="w-full bg-primary-600 py-3 rounded-2xl text-center text-white font-bold opacity-90 relative overflow-hidden group">
                       <span className="relative z-10">{editingCourse.landingPageConfig?.registrationButtonText || 'التسجيل في الدورة'}</span>
                       <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform"></div>
                    </div>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      )}

      {/* Content Modal */}
      {showContentModal && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xl animate-in fade-in" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
          <div className="bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-3xl w-full max-w-2xl p-6 shadow-2xl border border-gray-300 dark:border-white/10 flex flex-col max-h-[90vh] relative overflow-hidden">
            {/* Background Blobs inside modal for Liquid Glass pop */}
            <div className="absolute top-[-10%] right-[-5%] w-64 h-64 bg-primary-500/20 blur-[80px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[-10%] left-[-5%] w-64 h-64 bg-blue-500/20 blur-[80px] rounded-full pointer-events-none" />
            
            <div className="relative z-10 flex flex-col h-full overflow-hidden">
              <h3 className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 mb-4 border-b border-gray-200/50 dark:border-slate-700/50 pb-3">
                {editingContentId ? 'تعديل المحتوى' : 'إضافة محتوى جديد'}
              </h3>
            <div className="space-y-4 overflow-y-auto custom-scrollbar p-1 flex-1">

              {/* Bulk Upload Section */}
              <div className="mb-6 border-b border-gray-100 dark:border-slate-700 pb-6">
                <h4 className="text-sm font-bold mb-3 dark:text-primary-400 text-primary-600">إضافة سريعة (سحب وإفلات)</h4>
                <BulkUploadDropzone onUploadComplete={handleBulkUploadComplete} />
              </div>

              <div className="relative flex items-center gap-4 mb-4">
                <div className="h-px bg-gray-200 dark:bg-slate-700 flex-1"></div>
                <span className="text-xs text-gray-400 font-bold">أو إضافة يدوية</span>
                <div className="h-px bg-gray-200 dark:bg-slate-700 flex-1"></div>
              </div>

              <div>
                <label className="block text-sm font-bold mb-1 dark:text-gray-300">نوع المحتوى</label>
                <div className="grid grid-cols-4 gap-2">
                  <button
                    onClick={() => setNewContent({ ...newContent, type: ContentType.VIDEO })}
                    className={`p-3 rounded-lg border text-center text-sm font-bold transition flex flex-col items-center gap-1 ${newContent.type === ContentType.VIDEO ? 'bg-red-50 border-red-200 text-red-600' : 'border-gray-200 dark:border-slate-700 dark:text-gray-400'}`}
                  >
                    <Video size={20} /> vídeo
                  </button>
                  <button
                    onClick={() => setNewContent({ ...newContent, type: ContentType.PDF })}
                    className={`p-3 rounded-lg border text-center text-sm font-bold transition flex flex-col items-center gap-1 ${newContent.type === ContentType.PDF ? 'bg-blue-50 border-blue-200 text-blue-600' : 'border-gray-200 dark:border-slate-700 dark:text-gray-400'}`}
                  >
                    <FileText size={20} /> PDF
                  </button>
                  <button
                    onClick={() => setNewContent({ ...newContent, type: ContentType.IMAGE })}
                    className={`p-3 rounded-lg border text-center text-sm font-bold transition flex flex-col items-center gap-1 ${newContent.type === ContentType.IMAGE ? 'bg-purple-50 border-purple-200 text-purple-600' : 'border-gray-200 dark:border-slate-700 dark:text-gray-400'}`}
                  >
                    <ImageIcon size={20} /> صور
                  </button>
                  <button
                    onClick={() => setNewContent({ ...newContent, type: ContentType.QUIZ })}
                    className={`p-3 rounded-lg border text-center text-sm font-bold transition flex flex-col items-center gap-1 ${newContent.type === ContentType.QUIZ ? 'bg-green-50 border-green-200 text-green-600' : 'border-gray-200 dark:border-slate-700 dark:text-gray-400'}`}
                  >
                    <HelpCircle size={20} /> اختبار
                  </button>
                  <button
                    onClick={() => setNewContent({ ...newContent, type: ContentType.ARTICLE })}
                    className={`p-3 rounded-lg border text-center text-sm font-bold transition flex flex-col items-center gap-1 ${newContent.type === ContentType.ARTICLE ? 'bg-orange-50 border-orange-200 text-orange-600' : 'border-gray-200 dark:border-slate-700 dark:text-gray-400'}`}
                  >
                    <FileText size={20} /> مقال
                  </button>
                </div>
              </div>

              {/* Dynamic Form based on Type */}
              <div>
                <label className="block text-sm font-bold mb-1 dark:text-gray-300">عنوان الدرس</label>
                <input
                  className="w-full border dark:border-slate-700 p-2 rounded-lg dark:bg-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
                  value={newContent.title}
                  onChange={e => setNewContent({ ...newContent, title: e.target.value })}
                  placeholder="مثال: مقدمة في الجبر (أو عنوان المقال)"
                />
              </div>

              {newContent.type === ContentType.ARTICLE && (
                <div className="mt-4">
                  <label className="block text-sm font-bold mb-1 dark:text-gray-300">محتوى المقال</label>
                  <RichTextEditor
                    content={newContent.content || ''}
                    onChange={(html) => setNewContent({ ...newContent, content: html })}
                  />
                </div>
              )}

              {/* Quiz Builder */}
              {newContent.type === ContentType.QUIZ ? (
                <div className="border dark:border-slate-700 rounded-xl p-4 bg-gray-50 dark:bg-slate-700/30">
                  {/* Quiz Options */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-bold mb-1 dark:text-gray-300">درجة النجاح %</label>
                      <input
                        type="number"
                        className="w-full border dark:border-slate-600 p-2.5 rounded-xl dark:bg-slate-800 dark:text-white"
                        value={newContent.passingScore}
                        onChange={e => setNewContent({ ...newContent, passingScore: Number(e.target.value) })}
                      />
                    </div>
                    {/* Specific Subject Filter for Quodrat / Tahsili General */}
                    {(editingCourse?.category === CourseCategory.QUDURAT_GENERAL || editingCourse?.category === CourseCategory.TAHSILI_GENERAL) && (
                      <div className="animate-in fade-in slide-in-from-top-1">
                        <label className="block text-sm font-bold mb-1 dark:text-gray-300">مادة الاختبار المخصصة (اختياري)</label>
                        <CustomSelect
                          options={[
                            { value: 'all', label: 'شامل لكل مواد التصنيف' },
                            ...(CategorySubjectMap[editingCourse.category] || []).map(s => ({ value: s, label: SUBJECT_TRANSLATIONS[s] || s }))
                          ]}
                          value={quizSpecificSubject}
                          onChange={setQuizSpecificSubject}
                          placeholder="تخصيص المادة..."
                        />
                      </div>
                    )}
                  </div>

                  {/* Tabs for Select vs Create */}
                  <div className="flex gap-2 mb-4 border-b dark:border-slate-700/50">
                    <button
                      onClick={() => setQuizTab('bank')}
                      className={`px-4 py-3 font-bold text-sm border-b-2 transition-all ${quizTab === 'bank' ? 'border-primary-500 text-primary-600 dark:text-primary-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 hover:bg-gray-100/50 dark:hover:bg-slate-800/50'}`}
                    >
                      <Search className="inline-block ml-1 w-4 h-4" /> بنك الأسئلة
                    </button>
                    <button
                      onClick={() => setQuizTab('selected')}
                      className={`px-4 py-3 font-bold text-sm border-b-2 transition-all ${quizTab === 'selected' ? 'border-primary-500 text-primary-600 dark:text-primary-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 hover:bg-gray-100/50 dark:hover:bg-slate-800/50'}`}
                    >
                      <CheckSquare className="inline-block ml-1 w-4 h-4" /> مختارة ({newContent.questions?.length})
                    </button>
                    <button
                      onClick={() => setQuizTab('create')}
                      className={`px-4 py-3 font-bold text-sm border-b-2 transition-all ${quizTab === 'create' ? 'border-primary-500 text-primary-600 dark:text-primary-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 hover:bg-gray-100/50 dark:hover:bg-slate-800/50'}`}
                    >
                      <Plus className="inline-block ml-1 w-4 h-4" /> إضافة جديد
                    </button>
                  </div>

                  <div className="mt-4">
                    {quizTab === 'bank' && (
                      <div className="space-y-4 animate-in fade-in">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="sm:col-span-2 relative group">
                            <Search className="absolute right-4 top-3.5 text-gray-400 group-focus-within:text-primary-500 transition-colors" size={18} />
                            <input
                              className="w-full border-0 bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl shadow-sm dark:shadow-none dark:text-white rounded-2xl pr-12 pl-4 py-3 focus:ring-2 focus:ring-primary-500/50 transition-all duration-300 outline-none placeholder-gray-400"
                              placeholder="ابحث في فضاء بنك الأسئلة..."
                              value={questionSearch}
                              onChange={e => setQuestionSearch(e.target.value)}
                            />
                          </div>
                          <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-2xl shadow-sm border border-white/50 dark:border-slate-700/50 p-1">
                            <CustomSelect
                              options={[
                                { value: 'all', label: 'كل المستويات' },
                                { value: 'easy', label: 'سهل' },
                                { value: 'medium', label: 'متوسط' },
                                { value: 'hard', label: 'صعب' }
                              ]}
                              value={bankFilterDifficulty}
                              onChange={setBankFilterDifficulty}
                              placeholder="الصعوبة"
                            />
                          </div>
                        </div>

                        <div className="h-[300px] overflow-y-auto space-y-3 pr-2 custom-scrollbar border border-dashed border-gray-200 dark:border-slate-700 p-2 rounded-2xl bg-white/30 dark:bg-slate-900/10">
                          {(() => {
                            const questionUsageMap = new Map<string, { moduleTitle: string, quizTitle: string }[]>();
                            if (editingCourse) {
                              editingCourse.modules.forEach(m => {
                                m.content.forEach(c => {
                                   if (c.id === editingContentId) return; // Skip current editing content
                                   if (c.type === ContentType.QUIZ && c.questions) {
                                      c.questions.forEach(qId => {
                                         const existing = questionUsageMap.get(qId) || [];
                                         existing.push({ moduleTitle: m.title, quizTitle: c.title });
                                         questionUsageMap.set(qId, existing);
                                      });
                                   }
                                });
                              });
                            }

                            const filteredQuestions = allQuestions.filter(q => {
                              // Filter by selected course category limits
                              if (editingCourse?.category) {
                                const allowedSubjects = CategorySubjectMap[editingCourse.category] || [];
                                // If specific quiz subject is selected, enforce it
                                if (quizSpecificSubject && quizSpecificSubject !== 'all') {
                                  if (q.subject !== quizSpecificSubject) return false;
                                } else {
                                  // Otherwise just enforce course category limits
                                  if (allowedSubjects.length > 0 && !allowedSubjects.includes(q.subject as Subject)) {
                                    return false;
                                  }
                                }
                              }

                              const matchSearch = q.text.includes(questionSearch);
                              const matchDiff = bankFilterDifficulty === 'all' || q.difficulty === bankFilterDifficulty;
                              const isNotPrivate = !q.isPrivate;
                              return matchSearch && matchDiff && isNotPrivate;
                            });

                            if (filteredQuestions.length === 0) {
                              return <div className="h-full flex items-center justify-center text-gray-400 text-sm text-center">لا توجد أسئلة.</div>;
                            }

                            return filteredQuestions.map(q => {
                              const isSelected = newContent.questions?.includes(q.id);
                              const diffLabels: Record<string, string> = { 'easy': 'سهل', 'medium': 'متوسط', 'hard': 'صعب' };
                              const usages = questionUsageMap.get(q.id) || [];

                              return (
                                <div
                                  key={q.id}
                                  onClick={() => {
                                    const currentQs = newContent.questions || [];
                                    setNewContent({
                                      ...newContent,
                                      questions: isSelected 
                                        ? currentQs.filter(id => id !== q.id) 
                                        : [...currentQs, q.id]
                                    });
                                  }}
                                  className={`p-4 rounded-xl border transition-all cursor-pointer flex gap-3 items-start relative group ${isSelected ? 'bg-green-50/80 dark:bg-green-900/20 border-green-300 dark:border-green-800 ring-1 ring-green-500/20 shadow-sm' : usages.length > 0 ? 'bg-orange-50/50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-900/50 hover:bg-orange-100/50 dark:hover:bg-orange-900/20' : 'bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border-white/50 dark:border-white/5 hover:bg-white/70 dark:hover:bg-slate-800/70 hover:shadow-md'}`}
                                >
                                  <div className={`w-5 h-5 mt-1 rounded-md border flex items-center justify-center shrink-0 transition-all ${isSelected ? 'bg-green-500 border-green-500' : 'bg-white/60 dark:bg-slate-800/60 border-gray-300 dark:border-gray-600 group-hover:border-primary-400'}`}>
                                    {isSelected && <CheckSquare size={12} className="text-white drop-shadow" />}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap gap-2 mb-2 items-center">
                                      <span className="text-[10px] bg-white/60 dark:bg-slate-800/60 shadow-sm px-2 py-0.5 rounded text-gray-700 dark:text-gray-300 font-medium border border-gray-100 dark:border-white/5">
                                        {SUBJECT_TRANSLATIONS[q.subject as string] || q.subject}
                                      </span>
                                      <span className={`text-[10px] px-2 py-0.5 rounded shadow-sm font-medium border ${q.difficulty === 'hard' ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-100 dark:border-red-900/50' : 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-900/50'}`}>
                                        {diffLabels[q.difficulty] || q.difficulty}
                                      </span>
                                      {usages.length > 0 && (
                                        <span className="text-[10px] bg-orange-100/90 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 px-2 py-0.5 rounded shadow-sm font-medium border border-orange-200 dark:border-orange-800">
                                          سبق اختياره في: {usages.map(u => `الوحدة (${u.moduleTitle}) / (${u.quizTitle})`).join('، ')}
                                        </span>
                                      )}
                                    </div>
                                    <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm leading-relaxed">{q.text}</p>
                                  </div>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </div>
                    )}

                    {quizTab === 'selected' && (
                      <div className="animate-in fade-in space-y-3">
                         <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragQuizQuestionEnd}>
                           <SortableContext items={newContent.questions || []} strategy={verticalListSortingStrategy}>
                              {(newContent.questions || []).map((qId, idx) => {
                                 const q = allQuestions.find(qu => qu.id === qId);
                                 if (!q) return null;
                                 const diffLabels: Record<string, string> = { 'easy': 'سهل', 'medium': 'متوسط', 'hard': 'صعب' };
                                 return (
                                   <SortableQuestionCard key={qId} id={qId}>
                                     {(dndProps: any) => {
                                        const { isDragging } = dndProps;
                                        return (
                                          <div className={`p-4 rounded-2xl border flex gap-4 items-center transition-all ${isDragging ? 'shadow-2xl ring-2 ring-primary-500 bg-white dark:bg-slate-800 scale-[1.02]' : 'bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border-gray-200 dark:border-slate-700 hover:shadow-md'}`}>
                                            <div {...dndProps.listeners} className="p-2 text-gray-400 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg cursor-grab active:cursor-grabbing outline-none shrink-0" onPointerDown={e => e.stopPropagation()}>
                                              <GripVertical size={20} />
                                            </div>
                                            <div className="w-6 flex justify-center text-primary-500 font-bold shrink-0 text-sm">
                                              {idx + 1}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                              <div className="flex flex-wrap gap-2 mb-2 items-center">
                                                <span className="text-[10px] bg-white/60 dark:bg-slate-800/60 shadow-sm px-2 py-0.5 rounded text-gray-700 dark:text-gray-300 font-medium border border-gray-100 dark:border-white/5">
                                                  {SUBJECT_TRANSLATIONS[q.subject as string] || q.subject}
                                                </span>
                                                <span className={`text-[10px] px-2 py-0.5 rounded shadow-sm font-medium border ${q.difficulty === 'hard' ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-100 dark:border-red-900/50' : 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-900/50'}`}>
                                                  {diffLabels[q.difficulty] || q.difficulty}
                                                </span>
                                                {q.isPrivate && <span className="text-[10px] bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded shadow-sm font-medium">خاص بك</span>}
                                              </div>
                                              <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm">{q.text}</p>
                                            </div>
                                            <button
                                              onClick={(e) => { e.stopPropagation(); toggleQuestionForQuiz(q.id); }}
                                              className="p-2 shrink-0 rounded-xl text-red-500 hover:text-white hover:bg-red-500 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 transition-colors"
                                            >
                                              <Trash2 size={16} />
                                            </button>
                                          </div>
                                        );
                                     }}
                                   </SortableQuestionCard>
                                 );
                              })}
                           </SortableContext>
                         </DndContext>
                         {(!newContent.questions || newContent.questions.length === 0) && (
                           <div className="text-center p-8 border border-dashed border-gray-300 dark:border-slate-700 rounded-2xl text-gray-400">
                             لم تقم باختيار أي أسئلة بعد
                           </div>
                         )}
                      </div>
                    )}

                    {quizTab === 'create' && (
                      <div className="animate-in fade-in bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-5 rounded-2xl border border-white/50 dark:border-slate-700/50 shadow-sm space-y-5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200/50 dark:border-slate-700/50 pb-4">
                           <h4 className="font-bold text-gray-800 dark:text-white">إضافة إما يدوياً أو بواسطة Excel</h4>
                           
                           <div className="flex items-center gap-3">
                             <div className="flex items-center gap-2">
                               <label className="text-xs font-bold text-gray-500 dark:text-gray-400 cursor-pointer select-none">
                                 نشر في البنك العام؟
                               </label>
                               <button
                                 onClick={() => setAddToBank(!addToBank)}
                                 className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${addToBank ? 'bg-primary-500' : 'bg-gray-300 dark:bg-slate-600'}`}
                               >
                                 <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${addToBank ? 'translate-x-1' : 'translate-x-5'}`} />
                               </button>
                             </div>

                             <div className="h-6 w-px bg-gray-300 dark:bg-slate-700"></div>

                             <label className="flex items-center gap-2 bg-green-50 hover:bg-green-100 dark:bg-green-900/30 dark:hover:bg-green-900/50 text-green-700 dark:text-green-400 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer border border-green-200 dark:border-green-800 transition-colors">
                               <Upload size={14} />
                               استيراد Excel
                               <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleExcelImport} />
                             </label>
                           </div>
                        </div>

                        <div>
                          <label className="block text-sm font-bold mb-1.5 dark:text-gray-300">نص السؤال</label>
                          <textarea
                            className="w-full border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm p-3 rounded-xl dark:text-white text-sm focus:ring-2 focus:ring-primary-500/50 shadow-inner resize-none transition-all"
                            rows={3}
                            value={tempQuestion.text}
                            onChange={e => setTempQuestion({ ...tempQuestion, text: e.target.value })}
                            placeholder="اكتب السؤال هنا..."
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-bold mb-2 dark:text-gray-300">الخيارات (حدد الإجابة الصحيحة)</label>
                          <div className="grid gap-3">
                            {tempQuestion.options?.map((opt, idx) => (
                              <div key={idx} className="flex items-center gap-3">
                                <label className="relative flex cursor-pointer items-center rounded-full">
                                  <input
                                    type="radio"
                                    name="correctOpt"
                                    checked={tempQuestion.correctOption === idx}
                                    onChange={() => setTempQuestion({ ...tempQuestion, correctOption: idx })}
                                    className="peer h-5 w-5 cursor-pointer appearance-none rounded-full border border-gray-300 dark:border-slate-600 checked:border-primary-500 dark:checked:border-primary-400 transition-all checked:bg-primary-500/20"
                                  />
                                  <span className="absolute bg-primary-500 w-2.5 h-2.5 rounded-full opacity-0 peer-checked:opacity-100 transition-opacity duration-200 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"></span>
                                </label>
                                <input
                                  className={`flex-1 border-0 p-2.5 rounded-xl text-sm shadow-inner transition-all ${tempQuestion.correctOption === idx ? 'bg-primary-50/80 dark:bg-primary-900/20 ring-1 ring-primary-300 text-primary-900 dark:text-primary-100' : 'bg-white/80 dark:bg-slate-900/80 dark:text-white focus:ring-2 focus:ring-primary-500/50'}`}
                                  value={opt}
                                  onChange={e => {
                                    const newOpts = [...(tempQuestion.options || [])];
                                    newOpts[idx] = e.target.value;
                                    setTempQuestion({ ...tempQuestion, options: newOpts });
                                  }}
                                  placeholder={`الخيار ${idx + 1}`}
                                />
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-200/50 dark:border-slate-700/50">
                          <CustomSelect
                            label="درجة الصعوبة"
                            options={[
                              { value: 'easy', label: 'سهل' },
                              { value: 'medium', label: 'متوسط' },
                              { value: 'hard', label: 'صعب' }
                            ]}
                            value={tempQuestion.difficulty as string}
                            onChange={(val) => setTempQuestion({ ...tempQuestion, difficulty: val as 'easy'|'medium'|'hard' })}
                          />
                          {(editingCourse?.category === CourseCategory.QUDURAT_GENERAL || editingCourse?.category === CourseCategory.TAHSILI_GENERAL) ? (
                              <CustomSelect
                                label="المادة"
                                options={(CategorySubjectMap[editingCourse.category] || []).map(s => ({ value: s, label: SUBJECT_TRANSLATIONS[s] || s }))}
                                value={tempQuestion.subject as string}
                                onChange={(val) => setTempQuestion({ ...tempQuestion, subject: val as Subject })}
                              />
                          ) : (
                              <div className="opacity-50 pointer-events-none">
                                <CustomSelect
                                  label="المادة (مغلق)"
                                  options={[{ value: editingCourse?.subject as string, label: SUBJECT_TRANSLATIONS[editingCourse?.subject as string] || editingCourse?.subject as string }]}
                                  value={editingCourse?.subject as string}
                                  onChange={() => {}}
                                />
                              </div>
                          )}
                        </div>

                        <button
                          onClick={handleCreateAndAddQuestion}
                          className="w-full bg-primary-600/90 backdrop-blur-md text-white py-3.5 rounded-xl text-sm font-bold hover:bg-primary-700 hover:shadow-lg hover:-translate-y-0.5 hover:shadow-primary-600/20 transition-all mt-4 flex items-center justify-center gap-2"
                        >
                          <CheckCircle2 size={18} /> حفظ وإضافة للاختبار
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : newContent.type !== ContentType.ARTICLE ? (
                /* File / URL Uploader */
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-bold dark:text-gray-300">
                      {newContent.type === ContentType.IMAGE ? 'المصدر (صور)' : 'المصدر (ملف/رابط)'}
                    </label>
                    <div className="flex bg-gray-100 dark:bg-slate-700 rounded-lg p-0.5">
                      <button
                        onClick={() => setUploadMode('url')}
                        className={`px-3 py-1 text-xs font-bold rounded-md transition ${uploadMode === 'url' ? 'bg-white dark:bg-slate-600 shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
                      >
                        <LinkIcon size={12} className="inline ml-1" /> رابط
                      </button>
                      <button
                        onClick={() => setUploadMode('file')}
                        className={`px-3 py-1 text-xs font-bold rounded-md transition ${uploadMode === 'file' ? 'bg-white dark:bg-slate-600 shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
                      >
                        <Upload size={12} className="inline ml-1" /> رفع
                      </button>
                    </div>
                  </div>

                  {uploadMode === 'url' ? (
                    newContent.type === ContentType.IMAGE ? (
                      <textarea
                        className="w-full border dark:border-slate-700 p-2 rounded-lg dark:bg-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-primary-500 h-24 text-sm ltr"
                        value={newContent.url}
                        onChange={e => setNewContent({ ...newContent, url: e.target.value })}
                        placeholder="https://example.com/img1.png"
                      />
                    ) : (
                      <div className="space-y-2">
                        {newContent.type === ContentType.VIDEO && (
                          <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 p-3 rounded-lg text-xs flex items-start gap-2">
                            <AlertCircle size={16} className="mt-0.5 shrink-0" />
                            <div>
                              <p className="font-bold">نصيحة: استخدم YouTube لتقليل استهلاك المساحة</p>
                              <p>قم برفع الفيديو على قناتك في يوتيوب (يمكنك جعله "Unlisted" لخصوصية أكبر)، ثم انسخ الرابط والصقه هنا.</p>
                            </div>
                          </div>
                        )}
                        <input
                          className="w-full border dark:border-slate-700 p-2 rounded-lg dark:bg-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-primary-500 ltr"
                          value={newContent.url}
                          onChange={e => setNewContent({ ...newContent, url: e.target.value })}
                          placeholder={newContent.type === ContentType.VIDEO ? "https://youtube.com/watch?v=..." : "https://..."}
                        />
                      </div>
                    )
                  ) : (
                    <div className="border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-xl p-6 text-center hover:bg-gray-50 dark:hover:bg-slate-800/50 transition cursor-pointer relative">
                      {isUploading ? (
                        <div className="flex flex-col items-center">
                          <div className="animate-spin w-8 h-8 border-4 border-primary-500 rounded-full border-t-transparent mb-2"></div>
                          <span className="text-sm text-gray-500">جاري الرفع...</span>
                        </div>
                      ) : (
                        <>
                          <Upload className="mx-auto text-gray-400 mb-2" size={32} />
                          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">اضغط لرفع ملف من جهازك</p>
                          <p className="text-xs text-gray-400 mt-1">يدعم الصور، PDF، والفيديو</p>
                          <input
                            type="file"
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            onChange={handleContentFileUpload}
                          />
                        </>
                      )}
                    </div>
                  )}

                  {/* URL Preview if uploading */}
                  {uploadMode === 'file' && newContent.url && !isUploading && (
                    <div className="mt-2 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 p-2 rounded flex items-center gap-2">
                      <CheckSquare size={12} /> تم رفع الملف: ...{newContent.url.slice(-20)}
                    </div>
                  )}

                  <p className="text-xs text-gray-400 mt-2">
                    {newContent.type === ContentType.VIDEO ? 'يدعم Youtube و MP4 (مباشر أو رفع)' :
                      newContent.type === ContentType.IMAGE ? 'يمكنك رفع صور متعددة لإنشاء معرض' : 'ملفات PDF للعرض المباشر'}
                  </p>
                </div>
              ) : null}

              <div className="flex gap-2 mt-6">
                <button onClick={saveContent} className="flex-1 bg-primary-600 text-white py-3 rounded-xl font-bold hover:bg-primary-700">
                  إضافة المحتوى
                </button>
                <button onClick={() => setShowContentModal(false)} className="flex-1 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 font-bold py-3 rounded-xl hover:bg-gray-200 dark:hover:bg-slate-600">
                  إلغاء
                </button>
              </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
      />
    </div>
  );
};

export default TeacherCourseManager;
