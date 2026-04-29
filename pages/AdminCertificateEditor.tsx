import React, { useState, useRef, useEffect, useCallback } from 'react';
import { backend } from '../services/mockBackend';
import { CertificateTemplate, CertificateElement } from '../types';
import {
  Save, Type, Image as ImageIcon, Trash2, Move,
  ZoomIn, ZoomOut, AlignLeft, AlignCenter, AlignRight,
  Undo, Redo, Copy, Sliders, AlertTriangle, X,
  BookOpen as BookOpenIcon, GraduationCap as GraduationCapIcon, Calendar as CalendarIcon, ScanFace as ScanFaceIcon,
  Bold, Italic, Underline, HelpCircle, ImagePlus, Wallpaper, Plus,
  Layers, Eye, EyeOff, Lock, Unlock, ArrowUp, ArrowDown,
  RotateCcw, RotateCw, History, FileDown,
  Award, Percent, FileText, QrCode, Grid, Check, Link as LinkIcon
} from 'lucide-react';
import toast from 'react-hot-toast';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import CustomSelect from '../components/CustomSelect';

// --- UTILS ---

const MOCK_PREVIEW_DATA: Record<string, string> = {
  '{الطالب}': 'أحمد محمد علي',
  '{الدورة}': 'مقدمة في الذكاء الاصطناعي',
  '{الاختبار}': 'اختبار منتصف الفصل',
  '{الدرجة}': '95%',
  '{التقدير}': 'ممتاز',
  '{التاريخ}': new Date().toLocaleDateString('ar-EG'),
  '{QR}': 'https://example.com/certificate/123'
};

const MM_TO_PX = 3.7795275591; // 1mm = ~3.78px

const uploadFile = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  try {
    const response = await fetch('/api/upload', { method: 'POST', body: formData });
    if (!response.ok) throw new Error('Upload failed');
    const data = await response.json();
    return data.url;
  } catch (error) {
    console.warn('Using local URL fallback');
    return URL.createObjectURL(file);
  }
};

const GOOGLE_FONTS = [
  'Tajawal', 'Cairo', 'Amiri', 'Reem Kufi', 'Lateef',
  'Scheherazade New', 'Changa', 'El Messiri', 'Almarai', 'IBM Plex Sans Arabic'
];

// --- COMPONENTS ---
const FontLoader = () => (
  <style>
    {`@import url('https://fonts.googleapis.com/css2?family=Almarai:wght@300;400;700&family=Amiri:ital,wght@0,400;0,700;1,400&family=Cairo:wght@300;400;700&family=Changa:wght@300;400;700&family=El+Messiri:wght@400;700&family=IBM+Plex+Sans+Arabic:wght@300;400;700&family=Lateef&family=Reem+Kufi:wght@400;700&family=Scheherazade+New:wght@400;700&family=Tajawal:wght@300;400;700&display=swap');`}
  </style>
);

const AdminCertificateEditor = () => {
  // --- STATE ---
  const [templates, setTemplates] = useState<CertificateTemplate[]>(backend.getCertificateTemplates());
  const [activeTemplateId, setActiveTemplateId] = useState<string>(templates[0]?.id || '');
  const [template, setTemplate] = useState<CertificateTemplate | null>(null);

  // Sync template from list
  useEffect(() => {
    const found = templates.find(t => t.id === activeTemplateId);
    if (found) setTemplate(JSON.parse(JSON.stringify(found)));
  }, [activeTemplateId, templates]);

  // Canvas State & Transform
  const [zoom, setZoom] = useState(0.6);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingElementId, setEditingElementId] = useState<string | null>(null);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [uploadType, setUploadType] = useState<'bg' | 'image'>('bg');
  const [showLayers, setShowLayers] = useState(false);
  const [guides, setGuides] = useState<{ x?: number, y?: number } | null>(null);

  // Interaction State
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null); // 'nw', 'ne', 'sw', 'se'

  // Refs for interactions
  // Refs for interactions
  const dragStartPos = useRef({ x: 0, y: 0 });
  const elementStartPos = useRef({ x: 0, y: 0, width: 0, height: 0 }); // Primary Element Start
  const dragStartElements = useRef<Record<string, { x: number, y: number }>>({}); // All Selected Elements Start

  // History Cache (Per Template)
  const historyCache = useRef<Record<string, { stack: { state: CertificateTemplate, desc: string }[], index: number }>>({});

  // History
  const [history, setHistory] = useState<{ state: CertificateTemplate, desc: string }[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showHistory, setShowHistory] = useState(false);
  const [isPreview, setIsPreview] = useState(false);

  const replacePlaceholders = (str: string = '') => {
    let s = str;
    Object.entries(MOCK_PREVIEW_DATA).forEach(([k, v]) => {
      s = s.replaceAll(k, v);
    });
    return s;
  };

  // Modal State
  type ModalType = 'none' | 'delete' | 'rename' | 'duplicate' | 'shortcuts' | 'create' | 'gallery';
  const [modalState, setModalState] = useState<{
    type: ModalType;
    title?: string;
    inputValue?: string;
    onConfirm: (val?: any) => void
  }>({ type: 'none', onConfirm: () => { } });

  // New Template State
  const [newTemplateData, setNewTemplateData] = useState({ name: '', widthCm: 29.7, heightCm: 21.0, category: 'course' as 'course' | 'exam' });

  const canvasRef = useRef<HTMLDivElement>(null);

  // Initialize/Load History on Template Change
  useEffect(() => {
    if (!template) return;

    if (historyCache.current[template.id]) {
      // Load from cache
      const cached = historyCache.current[template.id];
      setHistory(cached.stack);
      setHistoryIndex(cached.index);
    } else {
      // Initialize new history if not exists
      const initialStack = [{ state: JSON.parse(JSON.stringify(template)), desc: 'الحالة الأصلية' }];
      setHistory(initialStack);
      setHistoryIndex(0);
      historyCache.current[template.id] = { stack: initialStack, index: 0 };
    }
  }, [template?.id]);

  // --- ACTIONS ---
  const saveToHistory = (newState: CertificateTemplate, desc: string) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ state: JSON.parse(JSON.stringify(newState)), desc });
    if (newHistory.length > 100) newHistory.shift(); // Limit to 100
    setHistory(newHistory);
    const newIndex = newHistory.length - 1;
    setHistoryIndex(newIndex);

    // Update Cache
    if (newState.id) {
      historyCache.current[newState.id] = { stack: newHistory, index: newIndex };
    }
  };

  const undo = () => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      setTemplate(JSON.parse(JSON.stringify(prev.state)));
      setHistoryIndex(historyIndex - 1);
      // Update Cache Index
      if (prev.state.id) {
        historyCache.current[prev.state.id] = { stack: history, index: historyIndex - 1 };
      }
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      setTemplate(JSON.parse(JSON.stringify(next.state)));
      setHistoryIndex(historyIndex + 1);
      // Update Cache Index
      if (next.state.id) {
        historyCache.current[next.state.id] = { stack: history, index: historyIndex + 1 };
      }
    }
  };

  const jumpToHistory = (index: number) => {
    const targetState = history[index].state;
    setTemplate(JSON.parse(JSON.stringify(targetState)));
    setHistoryIndex(index);
    setShowHistory(false);
    // Update Cache Index
    if (targetState.id) {
      historyCache.current[targetState.id] = { stack: history, index: index };
    }
  };

  const handleCreateTemplate = () => {
    const w = Number(newTemplateData.widthCm) * 10; // cm to mm
    const h = Number(newTemplateData.heightCm) * 10; // cm to mm
    if (!newTemplateData.name || w <= 0 || h <= 0) return toast.error('بيانات غير صحيحة');

    const newTpl: CertificateTemplate = {
      id: `t_${Date.now()}`,
      name: newTemplateData.name,
      category: newTemplateData.category,
      widthMm: w,
      heightMm: h,
      backgroundImage: '',
      elements: [],
      isDefault: false
    };
    backend.saveCertificateTemplate(newTpl);
    setTemplates(backend.getCertificateTemplates());
    setActiveTemplateId(newTpl.id);
    setModalState({ type: 'none', onConfirm: () => { } });
    toast.success('تم إنشاء القالب بنجاح');
  };

  const updateTemplate = (updates: Partial<CertificateTemplate>, useHistory = true, desc = 'تعديل القالب') => {
    if (!template) return;
    const newTemplate = { ...template, ...updates };
    setTemplate(newTemplate);
    if (useHistory) saveToHistory(newTemplate, desc);
  };

  const saveToServer = () => {
    if (!template) return;
    backend.saveCertificateTemplate(template);
    setTemplates(backend.getCertificateTemplates());
    toast.success('تم حفظ القالب بنجاح');
  };

  const handleExportPDF = async () => {
    if (!template) return;
    const toastId = toast.loading('جاري تصدير الشهادة PDF...');

    // Clear UI clutter
    setSelectedIds([]);
    setShowGrid(false);
    setGuides(null);

    // Wait for React render
    await new Promise(resolve => setTimeout(resolve, 200));

    try {
      const element = document.getElementById('certificate-canvas');
      if (!element) throw new Error('Canvas element not found');

      // Clone Node to remove Transforms (Zoom) for clean capture
      const clone = element.cloneNode(true) as HTMLElement;
      document.body.appendChild(clone);
      clone.style.position = 'fixed';
      clone.style.top = '-10000px';
      clone.style.left = '-10000px';
      clone.style.transform = 'none'; // Reset Zoom
      clone.style.margin = '0';
      clone.style.boxShadow = 'none';
      clone.style.border = 'none';

      // Ensure Fonts are loaded in clone? (Usually inherits)

      const canvas = await html2canvas(clone, {
        scale: 4, // 4 is sufficient (High Res)
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        allowTaint: true,
        windowWidth: clone.scrollWidth,
        windowHeight: clone.scrollHeight
      });

      document.body.removeChild(clone);

      const imgData = canvas.toDataURL('image/jpeg', 0.90);
      const pdf = new jsPDF({
        orientation: template.widthMm >= template.heightMm ? 'landscape' : 'portrait',
        unit: 'mm',
        format: [template.widthMm, template.heightMm]
      });

      pdf.addImage(imgData, 'JPEG', 0, 0, template.widthMm, template.heightMm);

      // Add Hyperlinks Overlay
      template.elements.forEach(el => {
        if (el.link && !el.isHidden) {
          const widthMm = (el.width || 100) / MM_TO_PX;
          const heightMm = (el.height || 50) / MM_TO_PX;
          const xMm = ((el.x / 100) * template.widthMm) - (widthMm / 2);
          const yMm = ((el.y / 100) * template.heightMm) - (heightMm / 2);

          pdf.link(xMm, yMm, widthMm, heightMm, { url: el.link });
        }
      });

      pdf.save(`${template.name}.pdf`);
      toast.success('تم تصدير ملف PDF بنجاح', { id: toastId });
    } catch (e) {
      console.error(e);
      toast.error('حدث خطأ أثناء التصدير', { id: toastId });
    }
  };

  const updateElement = (id: string, updates: Partial<CertificateElement>, desc?: string) => {
    if (!template) return;
    const newElements = template.elements.map(el => (el.id === id ? { ...el, ...updates } : el));
    const newTemplate = { ...template, elements: newElements };
    setTemplate(newTemplate);
    if (desc) saveToHistory(newTemplate, desc);
  };


  const deleteSelectedElements = () => {
    if (!template || selectedIds.length === 0) return;

    // Prevent deleting locked elements
    const toDelete = selectedIds.filter(id => {
      const el = template.elements.find(e => e.id === id);
      return el && !el.isLocked;
    });

    if (toDelete.length === 0) return;

    setModalState({
      type: 'delete',
      title: toDelete.length > 1 ? `حذف ${toDelete.length} عناصر؟` : 'حذف العنصر؟',
      onConfirm: () => {
        const newElements = template.elements.filter(el => !toDelete.includes(el.id));
        updateTemplate({ elements: newElements }, true, 'حذف عناصر');
        setSelectedIds([]);
        setModalState({ type: 'none', onConfirm: () => { } });
      }
    });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editingElementId) return; // Don't delete while typing
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const activeTag = document.activeElement?.tagName.toLowerCase();
        if (activeTag === 'input' || activeTag === 'textarea' || document.activeElement?.getAttribute('contenteditable')) return;
        deleteSelectedElements();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds, editingElementId, template]);

  // --- LAYERS ACTIONS ---
  const moveElement = (index: number, direction: 'up' | 'down') => {
    if (!template) return;
    const newElements = [...template.elements];
    if (direction === 'up' && index < newElements.length - 1) {
      [newElements[index], newElements[index + 1]] = [newElements[index + 1], newElements[index]];
    } else if (direction === 'down' && index > 0) {
      [newElements[index], newElements[index - 1]] = [newElements[index - 1], newElements[index]];
    }
    updateTemplate({ elements: newElements }, true, 'تغيير ترتيب الطبقات');
  };

  // --- MOUSE HANDLERS (Drag & Resize) ---
  const handleMouseDown = (e: React.MouseEvent, id: string, handle?: string) => {
    e.stopPropagation();
    if (!template) return;

    const el = template.elements.find(e => e.id === id);
    if (!el || el.isLocked) return;

    // If we are already editing this element, let default behavior happen (text selection)
    if (editingElementId === id) return;

    let newSelection = [...selectedIds];
    if (e.shiftKey || e.ctrlKey) {
      if (newSelection.includes(id)) {
        newSelection = newSelection.filter(i => i !== id);
      } else {
        newSelection.push(id);
      }
    } else {
      if (!newSelection.includes(id)) {
        newSelection = [id];
      }
    }

    setSelectedIds(newSelection);
    // Prepare for Drag
    dragStartPos.current = { x: e.clientX, y: e.clientY };

    // Store start pos for PRIMARY element (for snapping logic)
    elementStartPos.current = {
      x: el.x, y: el.y,
      width: el.width || 200,
      height: el.height || 100
    };

    // Store start pos for ALL selected elements (for group move)
    const startPositions: Record<string, { x: number, y: number }> = {};
    if (template) {
      template.elements.forEach(elm => {
        if (newSelection.includes(elm.id)) {
          startPositions[elm.id] = { x: elm.x, y: elm.y };
        }
      });
    }
    dragStartElements.current = startPositions;

    if (handle) {
      setIsResizing(true);
      setResizeHandle(handle);
    } else {
      setIsDragging(true);
    }
  };



  useEffect(() => {
    if (!isDragging && !isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!template || selectedIds.length === 0) return;
      const elId = selectedIds[0];
      const el = template.elements.find(e => e.id === elId);
      if (!el || el.isLocked) return;

      const deltaX = e.clientX - dragStartPos.current.x;
      const deltaY = e.clientY - dragStartPos.current.y;

      const pageWidthPx = (template.widthMm || 297) * MM_TO_PX;
      const pageHeightPx = (template.heightMm || 210) * MM_TO_PX;

      // Convert screen pixels to canvas percentages/pixels based on zoom
      const dxPercent = (deltaX / (pageWidthPx * zoom)) * 100;
      const dyPercent = (deltaY / (pageHeightPx * zoom)) * 100;
      const dxPx = deltaX / zoom;
      // const dyPx = deltaY / zoom; // Unused for width-only resize

      if (isDragging) {
        let newX = elementStartPos.current.x + dxPercent;
        let newY = elementStartPos.current.y + dyPercent;

        // Smart Guides & Snapping (Edges & Center)
        const SNAP_THRESHOLD_PX = 5; // Snap within 5px
        let activeGuides: { x?: number, y?: number } = {};

        // Helper: Convert % to PX
        const toPxX = (pct: number) => (pct / 100) * pageWidthPx;
        const toPxY = (pct: number) => (pct / 100) * pageHeightPx;
        // Helper: Convert PX to %
        const toPctX = (px: number) => (px / pageWidthPx) * 100;
        const toPctY = (px: number) => (px / pageHeightPx) * 100;

        // Current Element Edges (in Px)
        const curW = elementStartPos.current.width; // Px
        const curH = elementStartPos.current.height; // Px
        // Proposed Center (Px)
        let curX_Px = toPxX(elementStartPos.current.x + dxPercent);
        let curY_Px = toPxY(elementStartPos.current.y + dyPercent);

        // Edges: Left, Center, Right | Top, Middle, Bottom
        // We calculate "candidates" for snapping. 
        // We want to adjust curX_Px such that an edge aligns.

        let snappedX = curX_Px;
        let snappedY = curY_Px;
        let snapDiffX = SNAP_THRESHOLD_PX;
        let snapDiffY = SNAP_THRESHOLD_PX;

        // Canvas Center Snap
        const canvasCenterX = pageWidthPx / 2;
        const canvasCenterY = pageHeightPx / 2;

        if (Math.abs(curX_Px - canvasCenterX) < snapDiffX) {
          snappedX = canvasCenterX;
          snapDiffX = Math.abs(curX_Px - canvasCenterX);
          activeGuides.x = 50;
        }
        if (Math.abs(curY_Px - canvasCenterY) < snapDiffY) {
          snappedY = canvasCenterY;
          snapDiffY = Math.abs(curY_Px - canvasCenterY);
          activeGuides.y = 50;
        }

        // Loop Others
        if (!activeGuides.x || !activeGuides.y) {
          template.elements.forEach(other => {
            if (other.id === elId || other.isHidden) return;

            // Other Metrics
            const oX = toPxX(other.x);
            const oY = toPxY(other.y);
            const oW = (other.width || 100);
            const oH = (other.height || 50);

            // X Alignments (Vertical Lines)
            // My Center vs Other Center
            if (Math.abs(curX_Px - oX) < snapDiffX) { snappedX = oX; snapDiffX = Math.abs(curX_Px - oX); activeGuides.x = other.x; }
            // My Left vs Other Left
            const myLeft = curX_Px - curW / 2; const otherLeft = oX - oW / 2;
            if (Math.abs(myLeft - otherLeft) < snapDiffX) { snappedX = otherLeft + curW / 2; snapDiffX = Math.abs(myLeft - otherLeft); activeGuides.x = toPctX(otherLeft); }
            // My Left vs Other Right
            const otherRight = oX + oW / 2;
            if (Math.abs(myLeft - otherRight) < snapDiffX) { snappedX = otherRight + curW / 2; snapDiffX = Math.abs(myLeft - otherRight); activeGuides.x = toPctX(otherRight); }
            // My Right vs Other Right
            const myRight = curX_Px + curW / 2;
            if (Math.abs(myRight - otherRight) < snapDiffX) { snappedX = otherRight - curW / 2; snapDiffX = Math.abs(myRight - otherRight); activeGuides.x = toPctX(otherRight); }
            // My Right vs Other Left
            if (Math.abs(myRight - otherLeft) < snapDiffX) { snappedX = otherLeft - curW / 2; snapDiffX = Math.abs(myRight - otherLeft); activeGuides.x = toPctX(otherLeft); }

            // Y Alignments (Horizontal Lines)
            // My Center vs Other Center
            if (Math.abs(curY_Px - oY) < snapDiffY) { snappedY = oY; snapDiffY = Math.abs(curY_Px - oY); activeGuides.y = other.y; }
            // My Top vs Other Top
            const myTop = curY_Px - curH / 2; const otherTop = oY - oH / 2;
            if (Math.abs(myTop - otherTop) < snapDiffY) { snappedY = otherTop + curH / 2; snapDiffY = Math.abs(myTop - otherTop); activeGuides.y = toPctY(otherTop); }
            // My Top vs Other Bottom
            const otherBot = oY + oH / 2;
            if (Math.abs(myTop - otherBot) < snapDiffY) { snappedY = otherBot + curH / 2; snapDiffY = Math.abs(myTop - otherBot); activeGuides.y = toPctY(otherBot); }
            // My Bottom vs Other Bottom
            const myBot = curY_Px + curH / 2;
            if (Math.abs(myBot - otherBot) < snapDiffY) { snappedY = otherBot - curH / 2; snapDiffY = Math.abs(myBot - otherBot); activeGuides.y = toPctY(otherBot); }
            // My Bottom vs Other Top
            if (Math.abs(myBot - otherTop) < snapDiffY) { snappedY = otherTop - curH / 2; snapDiffY = Math.abs(myBot - otherTop); activeGuides.y = toPctY(otherTop); }
          });
        }

        setGuides(Object.keys(activeGuides).length > 0 ? activeGuides : null);

        updateElement(elId, {
          x: toPctX(snappedX),
          y: toPctY(snappedY)
        });

        // Apply Delta to OTHER selected elements
        if (selectedIds.length > 1) {
          const primaryStart = dragStartElements.current[elId];
          if (primaryStart) {
            const deltaX_Pct = toPctX(snappedX) - primaryStart.x;
            const deltaY_Pct = toPctY(snappedY) - primaryStart.y;

            selectedIds.forEach(subId => {
              if (subId === elId) return; // Already updated
              const subStart = dragStartElements.current[subId];
              if (subStart) {
                updateElement(subId, {
                  x: subStart.x + deltaX_Pct,
                  y: subStart.y + deltaY_Pct
                });
              }
            });
          }
        }
      } else if (isResizing && resizeHandle) {
        // Resizing Logic (Centered Symmetric for now or Directional)
        let newWidth = elementStartPos.current.width;

        if (resizeHandle.includes('e')) newWidth += dxPx * 2;
        if (resizeHandle.includes('w')) newWidth -= dxPx * 2;

        updateElement(elId, {
          width: Math.max(50, newWidth)
        });
      }
    };

    const handleMouseUp = () => {
      if (template) saveToHistory(template, isResizing ? 'تحجيم عنصر' : 'تحريك عنصر');
      setIsDragging(false);
      setIsResizing(false);
      setResizeHandle(null);
      setGuides(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, template, zoom, selectedIds, resizeHandle]);

  // --- RICH TEXT ACTIONS ---
  const handleExecCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
  };

  // --- RENDERING ---

  if (!templates.length) return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)] bg-gray-50 dark:bg-slate-950">
      <div className="text-center space-y-4">
        <div className="bg-blue-100 dark:bg-blue-900/30 p-4 rounded-full w-fit mx-auto text-blue-600 dark:text-blue-400">
          <Award size={48} />
        </div>
        <h2 className="text-xl font-bold dark:text-white">لا توجد قوالب شهادات</h2>
        <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
          لم يتم إنشاء أي قوالب بعد. ابدأ بإنشاء قالب جديد لتخصيص شهادات الطلاب.
        </p>
        <button
          onClick={() => { setNewTemplateData({ name: '', widthCm: 29.7, heightCm: 21.0, category: 'course' }); setModalState({ type: 'create', onConfirm: handleCreateTemplate }); }}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          <Plus size={20} />
          <span>إنشاء قالب جديد</span>
        </button>
      </div>

      {modalState.type === 'create' && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl border dark:border-slate-800 p-6 space-y-4">
            <h3 className="text-lg font-bold dark:text-white">إنشاء قالب جديد</h3>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">اسم القالب</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 rounded-lg border dark:border-slate-700 bg-gray-50 dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
                  placeholder="مثال: شهادة إتمام دورة"
                  value={newTemplateData.name}
                  onChange={e => setNewTemplateData({ ...newTemplateData, name: e.target.value })}
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">العرض (سم)</label>
                  <input
                    type="number"
                    className="w-full px-4 py-2 rounded-lg border dark:border-slate-700 bg-gray-50 dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
                    value={newTemplateData.widthCm}
                    onChange={e => setNewTemplateData({ ...newTemplateData, widthCm: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الارتفاع (سم)</label>
                  <input
                    type="number"
                    className="w-full px-4 py-2 rounded-lg border dark:border-slate-700 bg-gray-50 dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
                    value={newTemplateData.heightCm}
                    onChange={e => setNewTemplateData({ ...newTemplateData, heightCm: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">نوع الشهادة</label>
                <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-lg">
                  <button
                    onClick={() => setNewTemplateData({ ...newTemplateData, category: 'course' })}
                    className={`flex-1 py-1.5 text-sm rounded-md transition ${newTemplateData.category === 'course' ? 'bg-white dark:bg-slate-700 shadow text-blue-600 dark:text-blue-400 font-bold' : 'text-gray-500 dark:text-gray-400'}`}
                  >
                    شهادة دورة
                  </button>
                  <button
                    onClick={() => setNewTemplateData({ ...newTemplateData, category: 'exam' })}
                    className={`flex-1 py-1.5 text-sm rounded-md transition ${newTemplateData.category === 'exam' ? 'bg-white dark:bg-slate-700 shadow text-blue-600 dark:text-blue-400 font-bold' : 'text-gray-500 dark:text-gray-400'}`}
                  >
                    شهادة اختبار
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={modalState.onConfirm} className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-bold transition">إنشاء</button>
              <button onClick={() => setModalState({ type: 'none', onConfirm: () => { } })} className="flex-1 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 transition">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
  if (!template) return <div className="p-10 text-center dark:text-gray-300">جاري التحميل...</div>;

  const activeElement = selectedIds.length === 1 ? template.elements.find(e => e.id === selectedIds[0]) : null;
  const pageWidthPx = (template.widthMm || 297) * MM_TO_PX;
  const pageHeightPx = (template.heightMm || 210) * MM_TO_PX;

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-gray-100 dark:bg-slate-950 font-sans" dir="rtl">
      <FontLoader />

      {/* TOP BAR */}
      <div className="h-16 bg-white dark:bg-slate-900 border-b dark:border-slate-800 flex items-center justify-between px-4 z-30 shrink-0 shadow-sm relative overflow-x-auto custom-scrollbar gap-4">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-xs text-gray-400 font-bold mb-1">القالب الحالي</span>
            <button
              onClick={() => setModalState({ type: 'gallery', onConfirm: () => { } })}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors border dark:border-slate-700 min-w-[160px] max-w-[200px]"
              title="استعراض جميع القوالب"
            >
              <Grid size={16} className="text-gray-500 dark:text-gray-400" />
              <span className="flex-1 text-right truncate font-bold text-sm text-gray-700 dark:text-gray-200 hidden sm:inline">{template.name}</span>
            </button>
          </div>
          <div className="h-8 w-px bg-gray-200 dark:bg-slate-700 mx-2"></div>
          <div className="flex items-center gap-2">
            <button onClick={() => setModalState({ type: 'rename', title: 'تغيير الاسم', inputValue: template.name, onConfirm: (n) => n && updateTemplate({ name: n }) })} className="text-sm font-bold hover:text-blue-600 dark:text-white dark:hover:text-blue-400 truncate max-w-[150px] transition-colors">{template.name}</button>
            <button onClick={() => { setNewTemplateData({ name: '', widthCm: 29.7, heightCm: 21.0, category: 'course' }); setModalState({ type: 'create', onConfirm: handleCreateTemplate }); }} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded text-gray-500" title="قالب جديد"><Plus size={18} /></button>
            <button onClick={() => setModalState({ type: 'duplicate', title: 'نسخ', inputValue: template.name + ' (نسخة)', onConfirm: (n) => { if (n) { const t = { ...template, id: `t_${Date.now()}`, name: n }; backend.saveCertificateTemplate(t); setTemplates(backend.getCertificateTemplates()); setActiveTemplateId(t.id); } } })} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded text-gray-500" title="نسخ"><Copy size={18} /></button>
            <button onClick={() => setModalState({ type: 'delete', onConfirm: () => { backend.deleteCertificateTemplate(template.id); const rem = backend.getCertificateTemplates(); setTemplates(rem); if (rem.length) setActiveTemplateId(rem[0].id); else { setTemplate(null); setActiveTemplateId(''); } setModalState({ type: 'none', onConfirm: () => { } }); } })} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 rounded transition" title="حذف"><Trash2 size={18} /></button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Undo/Redo & History */}
          <div className="flex items-center bg-gray-100 dark:bg-slate-800 rounded-lg p-1 relative">
            <button onClick={undo} disabled={historyIndex <= 0} className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded text-gray-600 dark:text-gray-300 disabled:opacity-30 transition" title="تراجع"><RotateCcw size={18} /></button>
            <button onClick={() => setShowHistory(!showHistory)} className={`p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded transition mx-1 ${showHistory ? 'bg-white dark:bg-slate-700 text-blue-600' : 'text-gray-600 dark:text-gray-300'}`} title="السجل"><History size={18} /></button>
            <button onClick={redo} disabled={historyIndex >= history.length - 1} className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded text-gray-600 dark:text-gray-300 disabled:opacity-30 transition" title="إعادة"><RotateCw size={18} /></button>

            {/* History Dropdown */}
            {showHistory && (
              <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-48 bg-white dark:bg-slate-900 border dark:border-slate-800 shadow-xl rounded-lg py-2 z-[60] max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-100">
                <div className="text-xs font-bold text-gray-400 px-3 mb-2">سجل التعديلات</div>
                {[...history].reverse().map((h, i) => {
                  const realIndex = history.length - 1 - i;
                  return (
                    <button key={realIndex} onClick={() => jumpToHistory(realIndex)} className={`w-full text-right px-3 py-2 text-xs flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-800 ${realIndex === historyIndex ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 font-bold' : 'text-gray-600 dark:text-gray-300'}`}>
                      <span className="truncate">{h.desc}</span>
                      {realIndex === historyIndex && <Check size={12} />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>



          <button onClick={() => setIsPreview(!isPreview)} className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg font-bold transition-all ${isPreview ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400' : 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-gray-300 hover:bg-gray-200'}`} title="معاينة">
            {isPreview ? <EyeOff size={18} /> : <Eye size={18} />} <span className="hidden md:inline">معاينة</span>
          </button>

          <button onClick={() => setShowLayers(!showLayers)} className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg font-bold transition-all ${showLayers ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400' : 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-gray-300 hover:bg-gray-200'}`} title="الطبقات">
            <Layers size={18} /> <span className="hidden md:inline">الطبقات</span>
          </button>
          <button onClick={saveToServer} className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white px-3 md:px-6 py-2.5 rounded-xl font-bold hover:shadow-lg hover:shadow-blue-500/20 transition-all shadow-md" title="حفظ التغييرات">
            <Save size={18} /> <span className="hidden md:inline">حفظ التغييرات</span>
          </button>
          <button onClick={handleExportPDF} className="flex items-center gap-2 bg-gray-800 dark:bg-slate-700 text-white px-3 md:px-4 py-2.5 rounded-xl font-bold hover:bg-gray-700 dark:hover:bg-slate-600 transition-all" title="تصدير">
            <FileDown size={18} /> <span className="hidden md:inline">تصدير</span>
          </button>
        </div>
      </div>


      {/* CONTEXT TOOLBAR - SIMPLIFIED FOR RICH TEXT */}
      {
        activeElement && !activeElement.isLocked && (
          <div className="h-14 bg-white dark:bg-slate-900 border-b dark:border-slate-800 flex items-center px-4 gap-4 overflow-x-auto shrink-0 z-40 animate-in slide-in-from-top-2 duration-200">
            {/* Common Properties */}
            {activeElement.type !== 'image' && (
              <select
                className="w-32 bg-transparent text-sm font-medium outline-none dark:text-gray-200"
                value={activeElement.fontFamily}
                onChange={(e) => updateElement(activeElement.id, { fontFamily: e.target.value }, 'تغيير الخط')}
              >
                {GOOGLE_FONTS.map(f => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
              </select>
            )}

            {activeElement.type !== 'image' && (
              <div className="flex items-center border dark:border-slate-700 rounded-lg">
                <button onClick={() => updateElement(activeElement.id, { fontSize: activeElement.fontSize - 1 }, 'تصغير الخط')} className="px-2 hover:bg-gray-100 dark:hover:bg-slate-800 dark:text-gray-300">-</button>
                <span className="w-8 text-center text-sm dark:text-gray-300">{activeElement.fontSize}</span>
                <button onClick={() => updateElement(activeElement.id, { fontSize: activeElement.fontSize + 1 }, 'تكبير الخط')} className="px-2 hover:bg-gray-100 dark:hover:bg-slate-800 dark:text-gray-300">+</button>
              </div>
            )}

            {/* Add Color Picker for Base Style */}
            {activeElement.type !== 'image' && (
              <div className="flex items-center gap-2 relative group cursor-pointer border rounded p-1 dark:border-slate-700">
                <div className="w-4 h-4 rounded-full border shadow-sm" style={{ backgroundColor: activeElement.color }}></div>
                <input type="color" className="absolute inset-0 opacity-0 cursor-pointer" value={activeElement.color} onChange={e => updateElement(activeElement.id, { color: e.target.value }, 'تغيير اللون')} />
              </div>
            )}

            {/* Link Input */}
            {showLinkInput ? (
              <div className="flex items-center gap-1 animate-in fade-in slide-in-from-right-2 bg-gray-50 dark:bg-slate-800 p-1 rounded-lg border dark:border-slate-700">
                <input
                  type="text"
                  placeholder="https://..."
                  className="bg-transparent outline-none text-xs w-48 dark:text-white ltr"
                  defaultValue={activeElement.link || ''}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      updateElement(activeElement.id, { link: e.currentTarget.value }, 'إضافة رابط');
                      setShowLinkInput(false);
                    }
                  }}
                  autoFocus
                />
                <button onClick={() => setShowLinkInput(false)} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
              </div>
            ) : (
              <button
                onClick={() => setShowLinkInput(true)}
                className={`p-2 rounded hover:bg-gray-100 dark:hover:bg-slate-800 transition ${activeElement.link ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'text-gray-400 dark:text-gray-400'}`}
                title={activeElement.link || "إضافة رابط"}
              >
                <LinkIcon size={18} />
              </button>
            )}

            <div className="flex-1"></div>
            <button onClick={() => { setSelectedIds([]); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><Check size={20} /></button>
          </div>
        )
      }

      {/* WORKSPACE */}
      <div className="flex flex-1 overflow-hidden relative">

        {/* SIDEBAR */}
        <div className="w-20 bg-white dark:bg-slate-900 border-l dark:border-slate-800 shadow-xl z-30 flex flex-col items-center py-6 gap-6 overflow-y-auto custom-scrollbar">
          <div className="text-[10px] font-bold text-gray-400 mb-[-10px] mt-2">إضافة</div>
          {[
            { id: 'staticText', icon: <Type size={20} />, label: 'نص حر', show: true },
            { id: 'studentName', icon: <ScanFaceIcon size={20} />, label: 'الطالب', show: true },
            { id: 'courseTitle', icon: <BookOpenIcon size={20} />, label: 'الدورة', show: template.category === 'course' },
            { id: 'examTitle', icon: <BookOpenIcon size={20} />, label: 'الاختبار', show: template.category === 'exam' },
            { id: 'score', icon: <Percent size={20} />, label: 'الدرجة', show: template.category === 'exam' },
            { id: 'grade', icon: <Award size={20} />, label: 'التقدير', show: template.category === 'exam' },
            { id: 'date', icon: <CalendarIcon size={20} />, label: 'التاريخ', show: true },
            { id: 'qrCode', icon: <QrCode size={20} />, label: 'QR', show: true },
            { id: 'image', icon: <ImagePlus size={20} />, label: 'صورة', show: true },
            { id: 'bg', icon: <Wallpaper size={20} />, label: 'خلفية', show: true }
          ].filter(t => t.show).map(tool => (
            <button
              key={tool.id}
              onClick={() => {
                if (tool.id === 'image') {
                  setUploadType('image');
                  document.getElementById('img-upload')?.click();
                } else if (tool.id === 'bg') {
                  setUploadType('bg');
                  document.getElementById('img-upload')?.click();
                }
                else {
                  // Add Element Logic
                  const id = `el-${Date.now()}`;
                  const newEl: CertificateElement = {
                    id, type: tool.id as any, label: tool.label,
                    text: tool.id === 'staticText' ? 'نص جديد' : `{${tool.label}}`,
                    htmlContent: tool.id === 'staticText' ? 'نص جديد' : undefined,
                    x: 50, y: 50, width: 300, fontSize: 24, align: 'center', color: '#000000', fontFamily: 'Tajawal', opacity: 1, rotation: 0, fontWeight: 'normal'
                  };
                  updateTemplate({ elements: [...template.elements, newEl] }, true, `إضافة ${tool.label}`);
                  setSelectedIds([id]);
                }
              }}
              className="flex flex-col items-center gap-2 group w-full"
            >
              <div className={`p-3 rounded-xl transition-all shadow-sm ${tool.id === 'bg' ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400' : 'bg-gray-50 dark:bg-slate-800 group-hover:bg-blue-600 group-hover:text-white dark:text-gray-400 group-hover:shadow-blue-500/30'}`}>
                {tool.icon}
              </div>
              <span className="text-[9px] font-bold text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400">{tool.label}</span>
            </button>
          ))}
          <input id="img-upload" type="file" hidden accept="image/*" onChange={async (e) => {
            if (e.target.files?.[0]) {
              const url = await uploadFile(e.target.files[0]);
              if (uploadType === 'bg') {
                updateTemplate({ backgroundImage: url }, true, 'تغيير الخلفية');
              } else {
                // Add Image Element
                const id = `el-${Date.now()}`;
                const newEl: CertificateElement = {
                  id, type: 'image', label: 'Image',
                  src: url,
                  x: 50, y: 50, width: 200, fontSize: 0, align: 'center', color: '', fontFamily: '', opacity: 1, rotation: 0, fontWeight: 'normal'
                };
                updateTemplate({ elements: [...template.elements, newEl] }, true, 'إضافة صورة');
                setSelectedIds([id]);
              }
            }
          }} />
        </div>

        {/* LAYERS PANEL */}
        {showLayers && (
          <div className="w-64 bg-white dark:bg-slate-900 border-l dark:border-slate-800 shadow-xl z-30 flex flex-col absolute left-0 top-0 bottom-0 animate-in slide-in-from-left duration-200">
            <div className="p-4 border-b dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-gray-700 dark:text-white flex items-center gap-2">
                <Layers size={18} /> الطبقات
              </h3>
              <button onClick={() => setShowLayers(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
              {[...template.elements].reverse().map((el, i) => {
                const globalIndex = template.elements.length - 1 - i;
                const isSelected = selectedIds.includes(el.id);
                return (
                  <div
                    key={el.id}
                    onClick={() => setSelectedIds([el.id])}
                    className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all border ${isSelected ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-700' : 'bg-gray-50 border-transparent dark:bg-slate-800 hover:border-gray-200 dark:hover:border-slate-700'}`}
                  >
                    <div className="text-gray-500">
                      {el.type === 'staticText' ? <Type size={14} /> : el.type === 'image' ? <ImageIcon size={14} /> : <ScanFaceIcon size={14} />}
                    </div>
                    <span className="text-xs font-bold truncate flex-1 dark:text-gray-200 select-none">{el.label} {el.text?.substring(0, 10)}</span>
                    <div className="flex items-center gap-1">
                      <button onClick={(e) => { e.stopPropagation(); updateElement(el.id, { isLocked: !el.isLocked }, el.isLocked ? 'فك القفل' : 'قفل العنصر'); }} className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-slate-700 ${el.isLocked ? 'text-red-500' : 'text-gray-400'}`}>
                        {el.isLocked ? <Lock size={12} /> : <Unlock size={12} />}
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); updateElement(el.id, { isHidden: !el.isHidden }, el.isHidden ? 'إظهار العنصر' : 'إخفاء العنصر'); }} className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-slate-700 ${el.isHidden ? 'text-gray-400' : 'text-blue-500'}`}>
                        {el.isHidden ? <EyeOff size={12} /> : <Eye size={12} />}
                      </button>
                      <div className="flex flex-col">
                        <button onClick={(e) => { e.stopPropagation(); moveElement(globalIndex, 'up'); }} disabled={globalIndex === template.elements.length - 1} className="text-gray-400 hover:text-blue-600 disabled:opacity-30"><ArrowUp size={10} /></button>
                        <button onClick={(e) => { e.stopPropagation(); moveElement(globalIndex, 'down'); }} disabled={globalIndex === 0} className="text-gray-400 hover:text-blue-600 disabled:opacity-30"><ArrowDown size={10} /></button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {template.elements.length === 0 && <div className="text-center text-xs text-gray-400 py-4">لا توجد عناصر</div>}
            </div>
          </div>
        )}

        {/* CANVAS SCROLLABLE CONTAINER */}
        <div
          className="flex-1 bg-gray-200 dark:bg-[#1a1b26] relative overflow-auto custom-scrollbar"
          ref={canvasRef}
          onClick={() => setSelectedIds([])}
          dir="ltr"
        >
          {/* ZOOM CONTROLS */}
          <div className="fixed bottom-6 left-28 bg-white dark:bg-slate-800 shadow-2xl rounded-full px-4 py-2 flex items-center gap-4 z-50 border border-gray-100 dark:border-slate-700">
            <button onClick={() => setZoom(Math.max(0.2, zoom - 0.1))} className="hover:text-blue-600 dark:hover:text-blue-400 p-1 dark:text-gray-300"><ZoomOut size={18} /></button>
            <span className="text-sm font-mono font-bold w-12 text-center dark:text-white">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(Math.min(3.0, zoom + 0.1))} className="hover:text-blue-600 dark:hover:text-blue-400 p-1 dark:text-gray-300"><ZoomIn size={18} /></button>
            <div className="h-4 w-px bg-gray-300 dark:bg-slate-600 mx-1"></div>
            <button onClick={() => setModalState({ type: 'shortcuts', onConfirm: () => { } })} className="p-1 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400" title="اختصارات لوحة المفاتيح"><HelpCircle size={18} /></button>

            <button onClick={() => setShowGrid(!showGrid)} className={`p-1 ${showGrid ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`}><Grid size={18} /></button>
          </div>

          {/* SIZER WRAPPER (Centers when small, scrolls when large) */}
          <div className="min-w-full min-h-full flex items-center justify-center p-20">
            <div
              className="relative transition-all duration-75 ease-out"
              style={{
                width: `${pageWidthPx * zoom}px`,
                height: `${pageHeightPx * zoom}px`,
              }}
            >
              {/* THE CANVAS */}
              <div
                id="certificate-canvas"
                className="bg-white shadow-2xl relative origin-top-left"
                style={{
                  width: `${pageWidthPx}px`,
                  height: `${pageHeightPx}px`,
                  transform: `scale(${zoom})`,
                  backgroundImage: template.backgroundImage ? `url(${template.backgroundImage})` : 'none',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  filter: template.bgFilters ? `brightness(${template.bgFilters.brightness}%) contrast(${template.bgFilters.contrast}%) opacity(${template.bgFilters.opacity}%)` : 'none'
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {showGrid && <div className="absolute inset-0 pointer-events-none opacity-20" style={{ backgroundImage: `linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)`, backgroundSize: '40px 40px' }}></div>}

                {/* Smart Guides */}
                {guides?.x !== undefined && <div className="absolute top-0 bottom-0 border-l-2 border-dashed border-pink-500 z-[60]" style={{ left: `${guides.x}%` }}></div>}
                {guides?.y !== undefined && <div className="absolute left-0 right-0 border-t-2 border-dashed border-pink-500 z-[60]" style={{ top: `${guides.y}%` }}></div>}

                {template.elements.map(el => {
                  if (el.isHidden) return null;
                  const isSelected = selectedIds.includes(el.id);
                  const isRichText = el.type === 'staticText';
                  const isImage = el.type === 'image';

                  return (
                    <div
                      key={el.id}
                      onMouseDown={(e) => handleMouseDown(e, el.id)}
                      className={`absolute group ${isSelected ? 'z-50' : 'z-10'}`}
                      style={{
                        left: `${el.x}%`,
                        top: `${el.y}%`,
                        transform: `translate(-50%, -50%) rotate(${el.rotation || 0}deg)`,
                        width: el.width ? `${el.width}px` : 'auto',
                        opacity: el.opacity ?? 1,
                        userSelect: isRichText && isSelected ? 'text' : 'none'
                      }}
                    >
                      <div
                        className={`relative ${isSelected ? 'outline outline-2 outline-blue-600' : 'hover:outline hover:outline-1 hover:outline-blue-400'}`}
                      >
                        {/* CONTENT */}
                        {isImage ? (
                          <img
                            src={el.src}
                            alt="Cert Element"
                            className="w-full h-auto pointer-events-none"
                            style={{ display: 'block' }}
                          />
                        ) : (
                          <div
                            contentEditable={isRichText && editingElementId === el.id}
                            suppressContentEditableWarning
                            onDoubleClick={(e) => {
                              if (isRichText) {
                                e.stopPropagation();
                                setEditingElementId(el.id);
                                // Optional: Focus logic handled by contentEditable browser behavior?
                                // We might need to ensure focus if not automatic
                              }
                            }}
                            onMouseDown={(e) => {
                              if (isRichText && editingElementId === el.id) {
                                e.stopPropagation(); // Allow text selection
                              } else {
                                handleMouseDown(e, el.id);
                              }
                            }}
                            onBlur={(e) => {
                              if (isRichText) {
                                updateElement(el.id, { htmlContent: e.currentTarget.innerHTML }, 'تعديل النص');
                                setEditingElementId(null);
                              }
                            }}
                            dangerouslySetInnerHTML={{ __html: isPreview ? replacePlaceholders(el.htmlContent || el.text) : (el.htmlContent || el.text || `{${el.label}}`) }}
                            style={{
                              fontFamily: el.fontFamily,
                              fontSize: `${el.fontSize}px`,
                              color: el.color,
                              fontWeight: el.fontWeight,
                              textAlign: el.align,
                              whiteSpace: 'pre-wrap',
                              direction: 'rtl',
                              width: '100%',
                              minHeight: '1em',
                              outline: 'none',
                              wordBreak: 'break-word',
                              cursor: isRichText && isSelected ? 'text' : 'grab'
                            }}
                          />
                        )}

                        {/* SELECTION UI & HANDLES */}
                        {isSelected && (
                          <>
                            {/* Resize Handles (Corners) - 4 Corners */}
                            <div onMouseDown={(e) => handleMouseDown(e, el.id, 'nw')} className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border border-blue-600 rounded-full cursor-nw-resize z-50 hover:bg-blue-100"></div>
                            <div onMouseDown={(e) => handleMouseDown(e, el.id, 'ne')} className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border border-blue-600 rounded-full cursor-ne-resize z-50 hover:bg-blue-100"></div>
                            <div onMouseDown={(e) => handleMouseDown(e, el.id, 'sw')} className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border border-blue-600 rounded-full cursor-sw-resize z-50 hover:bg-blue-100"></div>
                            <div onMouseDown={(e) => handleMouseDown(e, el.id, 'se')} className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border border-blue-600 rounded-full cursor-se-resize z-50 hover:bg-blue-100"></div>

                            {/* Floating Rich Text Menu (Only for Static Text) */}
                            {isRichText && (
                              <div
                                className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-900 text-white p-1 rounded-lg flex items-center shadow-xl animate-in fade-in zoom-in-95 duration-100 gap-1 z-[60]"
                                onMouseDown={(e) => e.preventDefault()}
                              >

                                <button onClick={(e) => { e.preventDefault(); handleExecCommand('bold'); }} className="p-1.5 hover:bg-slate-700 rounded text-xs"><Bold size={14} /></button>
                                <button onClick={(e) => { e.preventDefault(); handleExecCommand('italic'); }} className="p-1.5 hover:bg-slate-700 rounded text-xs"><Italic size={14} /></button>
                                <button onClick={(e) => { e.preventDefault(); handleExecCommand('underline'); }} className="p-1.5 hover:bg-slate-700 rounded text-xs"><Underline size={14} /></button>
                                <div className="w-px h-4 bg-slate-700 mx-1"></div>
                                {['justifyRight', 'justifyCenter', 'justifyLeft'].map(cmd => (
                                  <button key={cmd} onClick={(e) => { e.preventDefault(); handleExecCommand(cmd); }} className="p-1.5 hover:bg-slate-700 rounded text-xs">
                                    {cmd === 'justifyRight' ? <AlignRight size={14} /> : cmd === 'justifyCenter' ? <AlignCenter size={14} /> : <AlignLeft size={14} />}
                                  </button>
                                ))}
                                <div className="w-px h-4 bg-slate-700 mx-1"></div>
                                <div className="relative w-6 h-6 flex items-center justify-center cursor-pointer hover:bg-slate-700 rounded">
                                  <div className="w-4 h-4 rounded appearance-none border border-slate-500 overflow-hidden relative">
                                    <input type="color" className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" onChange={(e) => handleExecCommand('foreColor', e.target.value)} />
                                    <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to right, red,blue,green)' }}></div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- GALLERY MODAL --- */}
      {
        modalState.type === 'gallery' && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden border dark:border-slate-700">
              <div className="p-5 border-b dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-slate-900">
                <div>
                  <h3 className="text-2xl font-bold flex items-center gap-2 dark:text-white">
                    <Grid className="text-blue-600" /> معرض القوالب
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">اختر قالباً للتعديل عليه أو أنشئ قالباً جديداً</p>
                </div>
                <button onClick={() => setModalState({ type: 'none', onConfirm: () => { } })} className="p-2 hover:bg-gray-200 dark:hover:bg-slate-800 rounded-full transition-colors text-gray-500 dark:text-gray-400"><X /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 bg-gray-100 dark:bg-[#0f111a] custom-scrollbar">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                  {/* Create New Card */}
                  <button
                    onClick={() => { setNewTemplateData({ name: '', widthCm: 29.7, heightCm: 21.0, category: 'course' }); setModalState({ type: 'create', onConfirm: handleCreateTemplate }); }}
                    className="aspect-[1.4/1] bg-white dark:bg-slate-800 border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-xl flex flex-col items-center justify-center gap-3 text-gray-400 hover:text-blue-600 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group"
                  >
                    <div className="p-4 rounded-full bg-gray-50 dark:bg-slate-900 group-hover:bg-blue-100 dark:group-hover:bg-blue-800 transition-colors">
                      <Plus size={32} />
                    </div>
                    <span className="font-bold">قالب جديد</span>
                  </button>

                  {/* Template Cards */}
                  {templates.map(t => (
                    <div
                      key={t.id}
                      onClick={() => { setActiveTemplateId(t.id); setModalState({ type: 'none', onConfirm: () => { } }); }}
                      className={`group relative aspect-[1.4/1] bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer border-2 ${activeTemplateId === t.id ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-transparent dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700'}`}
                    >
                      {/* Preview / Placeholder */}
                      <div className="h-2/3 bg-gray-200 dark:bg-slate-900 bg-cover bg-center relative" style={{ backgroundImage: t.backgroundImage ? `url(${t.backgroundImage})` : 'none' }}>
                        {!t.backgroundImage && (
                          <div className="absolute inset-0 flex items-center justify-center text-gray-300 dark:text-slate-700">
                            <ImageIcon size={48} opacity={0.5} />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"></div>

                        {/* Active Checkmark */}
                        {activeTemplateId === t.id && (
                          <div className="absolute top-2 right-2 bg-blue-500 text-white p-1 rounded-full shadow-lg z-10">
                            <Check size={14} strokeWidth={3} />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="p-3 h-1/3 flex flex-col justify-center">
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="font-bold text-gray-800 dark:text-gray-100 truncate text-sm flex-1 ml-2" title={t.name}>{t.name}</h4>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap ${t.category === 'exam' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300'}`}>
                            {t.category === 'exam' ? 'اختبار' : 'دورة'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                          <span>{t.widthMm / 10} × {t.heightMm / 10} cm</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* --- GENERIC MODALS --- */}
      {
        modalState.type !== 'none' && modalState.type !== 'gallery' && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-6 w-full max-w-sm">
              {modalState.type === 'shortcuts' ? (
                <div className="text-right">
                  <h3 className="font-bold text-lg mb-4 dark:text-white flex items-center gap-2"><HelpCircle size={20} /> اختصارات لوحة المفاتيح</h3>
                  <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
                    <div className="flex justify-between items-center bg-gray-50 dark:bg-slate-800 p-2 rounded"><span>حذف العنصر</span> <kbd className="bg-white dark:bg-slate-700 px-2 py-0.5 rounded shadow text-xs font-mono">Delete / Backspace</kbd></div>
                    <div className="flex justify-between items-center bg-gray-50 dark:bg-slate-800 p-2 rounded"><span>تحريك العنصر</span> <kbd className="bg-white dark:bg-slate-700 px-2 py-0.5 rounded shadow text-xs font-mono">الأسهم</kbd></div>
                    <div className="flex justify-between items-center bg-gray-50 dark:bg-slate-800 p-2 rounded"><span>تحريك دقيق</span> <kbd className="bg-white dark:bg-slate-700 px-2 py-0.5 rounded shadow text-xs font-mono">Shift + الأسهم</kbd></div>
                    <div className="flex justify-between items-center bg-gray-50 dark:bg-slate-800 p-2 rounded"><span>تعديل النص الحر</span> <kbd className="bg-white dark:bg-slate-700 px-2 py-0.5 rounded shadow text-xs font-mono">Double Click</kbd></div>
                  </div>
                  <button onClick={() => setModalState({ type: 'none', onConfirm: () => { } })} className="w-full mt-6 py-2 bg-blue-600 text-white rounded-lg font-bold">حسناً</button>
                </div>
              ) : modalState.type === 'create' ? (
                <div className="text-right">
                  <h3 className="font-bold text-lg mb-4 dark:text-white flex items-center gap-2"><Plus size={20} /> قالب جديد</h3>

                  <div className="space-y-4">
                    <label className="block text-xs font-bold text-gray-500 mb-1">اسم القالب</label>
                    <input className="w-full border rounded-lg p-2 dark:bg-slate-800 dark:text-white dark:border-slate-700 border-gray-200 outline-none focus:ring-2 focus:ring-blue-500"
                      value={newTemplateData.name} onChange={e => setNewTemplateData({ ...newTemplateData, name: e.target.value })} placeholder="مثال: شهادة شكر" />


                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1">نوع الشهادة</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => setNewTemplateData({ ...newTemplateData, category: 'course' })} className={`p-2 rounded-lg border flex items-center justify-center gap-2 transition-all ${newTemplateData.category === 'course' ? 'bg-blue-50 border-blue-500 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400' : 'border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800'}`}>
                          <BookOpenIcon size={16} /> <span>دورة</span>
                        </button>
                        <button onClick={() => setNewTemplateData({ ...newTemplateData, category: 'exam' })} className={`p-2 rounded-lg border flex items-center justify-center gap-2 transition-all ${newTemplateData.category === 'exam' ? 'bg-purple-50 border-purple-500 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400' : 'border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800'}`}>
                          <GraduationCapIcon size={16} /> <span>اختبار</span>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">العرض (cm)</label>
                        <input type="number" className="w-full border rounded-lg p-2 dark:bg-slate-800 dark:text-white dark:border-slate-700 border-gray-200 outline-none focus:ring-2 focus:ring-blue-500"
                          value={newTemplateData.widthCm} onChange={e => setNewTemplateData({ ...newTemplateData, widthCm: Number(e.target.value) })} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">الارتفاع (cm)</label>
                        <input type="number" className="w-full border rounded-lg p-2 dark:bg-slate-800 dark:text-white dark:border-slate-700 border-gray-200 outline-none focus:ring-2 focus:ring-blue-500"
                          value={newTemplateData.heightCm} onChange={e => setNewTemplateData({ ...newTemplateData, heightCm: Number(e.target.value) })} />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-2">مقاسات جاهزة</label>
                      <div className="flex gap-2 flex-wrap">
                        <button onClick={() => setNewTemplateData({ ...newTemplateData, widthCm: 29.7, heightCm: 21.0 })} className="px-3 py-1 bg-gray-100 dark:bg-slate-800 rounded text-xs hover:bg-blue-100 dark:hover:bg-blue-900/30 transition dark:text-gray-300">A4 عرضي</button>
                        <button onClick={() => setNewTemplateData({ ...newTemplateData, widthCm: 21.0, heightCm: 29.7 })} className="px-3 py-1 bg-gray-100 dark:bg-slate-800 rounded text-xs hover:bg-blue-100 dark:hover:bg-blue-900/30 transition dark:text-gray-300">A4 طولي</button>
                        <button onClick={() => setNewTemplateData({ ...newTemplateData, widthCm: 42.0, heightCm: 29.7 })} className="px-3 py-1 bg-gray-100 dark:bg-slate-800 rounded text-xs hover:bg-blue-100 dark:hover:bg-blue-900/30 transition dark:text-gray-300">A3 عرضي</button>
                        <button onClick={() => setNewTemplateData({ ...newTemplateData, widthCm: 15.0, heightCm: 10.0 })} className="px-3 py-1 bg-gray-100 dark:bg-slate-800 rounded text-xs hover:bg-blue-100 dark:hover:bg-blue-900/30 transition dark:text-gray-300">بطاقة</button>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-6">
                    <button onClick={handleCreateTemplate} className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-600/20">إنشاء</button>
                    <button onClick={() => setModalState({ type: 'none', onConfirm: () => { } })} className="flex-1 py-2 bg-gray-100 dark:bg-slate-800 rounded-lg dark:text-white hover:bg-gray-200 dark:hover:bg-slate-700 transition">إلغاء</button>
                  </div>
                </div>
              ) : (
                <>
                  <h3 className="font-bold text-lg mb-4 dark:text-white">{modalState.title || (modalState.type === 'delete' ? 'تأكيد الحذف' : '')}</h3>
                  {modalState.type !== 'delete' && <input id="modal-inp" defaultValue={modalState.inputValue} className="w-full border rounded-lg p-3 dark:bg-slate-800 dark:text-white dark:border-slate-700 font-bold mb-4 outline-none focus:ring-2 focus:ring-blue-500" autoFocus />}
                  <div className="flex gap-2">
                    <button onClick={() => modalState.onConfirm(modalState.type === 'delete' ? undefined : (document.getElementById('modal-inp') as HTMLInputElement).value)} className={`flex-1 py-2 rounded-lg font-bold text-white ${modalState.type === 'delete' ? 'bg-red-600' : 'bg-blue-600'}`}>نعم</button>
                    <button onClick={() => setModalState({ type: 'none', onConfirm: () => { } })} className="flex-1 py-2 bg-gray-100 dark:bg-slate-800 rounded-lg dark:text-white">إلغاء</button>
                  </div>
                </>
              )}
            </div>
          </div>
        )
      }
    </div >
  );
};

export default AdminCertificateEditor;
