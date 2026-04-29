
import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Upload, X, FileSpreadsheet, FileText, Check, AlertCircle, HelpCircle, Edit2, AlertTriangle } from 'lucide-react';
import { Question, Subject } from '../types';
import toast from 'react-hot-toast';
import { backend } from '../services/mockBackend';
import { SUBJECT_TRANSLATIONS } from '../constants';

interface ImportQuestionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    existingQuestions: Question[];
}

interface ParsedQuestion {
    id: string;
    text: string;
    options: string[];
    correctOption: number;
    subject: string;
    difficulty: 'easy' | 'medium' | 'hard';
    isValid: boolean;
    isDuplicate: boolean;
    isSelected: boolean;
    error?: string;
}

const ImportQuestionsModal: React.FC<ImportQuestionsModalProps> = ({ isOpen, onClose, onSuccess, existingQuestions }) => {
    const [step, setStep] = useState<'upload' | 'preview'>('upload');
    const [parsedData, setParsedData] = useState<ParsedQuestion[]>([]);
    const [textInput, setTextInput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    // Default values for missing data
    const [defaultSubject, setDefaultSubject] = useState<string>(Subject.MATH);
    const [defaultDifficulty, setDefaultDifficulty] = useState<string>('medium');

    const cleanText = (txt: any) => String(txt || '').trim();

    const detectSubject = (txt: string): string => {
        if (/فيزياء|نيوتن|سرعة|قوة/.test(txt)) return Subject.PHYSICS;
        if (/كيمياء|ذرة|تفاعل|عنصر/.test(txt)) return Subject.CHEMISTRY;
        if (/أحياء|خلية|جين|وراثة/.test(txt)) return Subject.BIOLOGY;
        if (/رياضيات|معادلة|جذر|دالة/.test(txt)) return Subject.MATH;
        if (/كمي|حساب|مثلث/.test(txt)) return Subject.QUANT;
        if (/لفظي|تناظر|مفردة/.test(txt)) return Subject.VERBAL;
        return defaultSubject;
    };

    const validateQuestion = (q: ParsedQuestion, existingTexts: Set<string>): ParsedQuestion => {
        let isValid = true;
        let error = '';

        if (q.text.length < 5) { isValid = false; error = 'نص السؤال قصير جداً'; }
        if (q.options.filter(o => o.trim()).length < 2) { isValid = false; error = 'يجب توفر خيارين على الأقل'; }

        // Strict Validation: Correct Option must be valid
        if (q.correctOption < 0 || q.correctOption >= q.options.length) {
            isValid = false;
            error = 'لم يتم تحديد الإجابة الصحيحة';
        }

        const isDuplicate = existingTexts.has(q.text.toLowerCase().trim());

        return { ...q, isValid, isDuplicate, error };
    };

    const processData = (rawData: any[]) => {
        const questions: ParsedQuestion[] = [];
        const existingTexts = new Set(existingQuestions.map(q => q.text.toLowerCase().trim()));

        rawData.forEach((row, idx) => {
            let qText = '';
            let options: string[] = ['', '', '', ''];
            let correct = -1; // Default to invalid
            let subject = defaultSubject;
            let difficulty: any = defaultDifficulty;

            // EXCEL Logic
            if (Array.isArray(row)) {
                if (row.length >= 2) {
                    qText = cleanText(row[0]);
                    const potentialOptions = row.slice(1, 5).map(cleanText).filter(t => t);
                    if (potentialOptions.length >= 2) {
                        for (let i = 0; i < 4; i++) options[i] = potentialOptions[i] || '';
                    } else if (potentialOptions.length > 0) {
                        // Fallback if options are fewer but present
                        for (let i = 0; i < potentialOptions.length; i++) options[i] = potentialOptions[i];
                    }

                    const corVal = row[5];
                    if (typeof corVal === 'number') correct = Math.max(0, Math.min(3, corVal - 1));
                    else if (typeof corVal === 'string') {
                        const matchIdx = options.findIndex(o => o === corVal);
                        if (matchIdx !== -1) correct = matchIdx;
                        else if (/^[aAأ]/.test(corVal)) correct = 0;
                        else if (/^[bBب]/.test(corVal)) correct = 1;
                        else if (/^[cCج]/.test(corVal)) correct = 2;
                        else if (/^[dDد]/.test(corVal)) correct = 3;
                    }

                    if (row[6]) subject = detectSubject(row[6]) || row[6];
                    if (row[7] && ['easy', 'medium', 'hard'].includes(row[7])) difficulty = row[7];
                }
            }

            if (!qText) return;
            if (subject === defaultSubject) subject = detectSubject(qText);

            let q: ParsedQuestion = {
                id: `tmp_${idx}`,
                text: qText,
                options,
                correctOption: correct,
                subject,
                difficulty,
                isValid: true,
                isDuplicate: false,
                isSelected: false
            };

            q = validateQuestion(q, existingTexts);
            q.isSelected = q.isValid && !q.isDuplicate;

            questions.push(q);
        });

        return questions;
    };

    const handleTextParse = () => {
        if (!textInput.trim()) return;

        const lines = textInput.split(/\r?\n/).map(l => l.trim()).filter(l => l);
        const structuredData: any[] = [];

        let currentQ: any = null;

        lines.forEach(line => {
            // Detect Question Start (Broadened: First line is Q, or starts with Q/Number)
            // If we are not in a Q, this is a Q. 
            // If we are in a Q, check if this line looks like a new Q (Numbered or Q:)
            // Or if we already have 4 options, force new Q?

            const isExplicitQ = /^(Q|س|السؤال)\s*[:\.]?\s*\d*\s*/i.test(line);
            const isExplicitOpt = /^[\-\*\u2022]|^(\d+|[a-zأ-ي])[\)\.]/i.test(line);
            const isAnswerKey = /^(Correct|Answer|الجواب|الصحيح)\s*[:\.]/i.test(line);

            if (isExplicitQ || (!currentQ && !isExplicitOpt && !isAnswerKey)) {
                if (currentQ) structuredData.push(currentQ);
                currentQ = [line.replace(/^(Q|س|السؤال)\s*[:\.]?\s*\d*\s*/i, '').trim()];
            }
            else if (isAnswerKey && currentQ) {
                // Extract answer value
                const val = line.split(/[:\.]/)[1]?.trim();
                currentQ[5] = val; // Store in index 5 (Answer slot in our generic array)
            }
            else if (currentQ) {
                // It's an option?
                // If we don't have explicit option markers, but we are inside a Q context
                // we treat lines 2,3,4,5 as options
                if (!isExplicitOpt && currentQ.length >= 1 && currentQ.length < 5) {
                    // Implicit option
                    currentQ.push(line);
                } else if (isExplicitOpt) {
                    // Explicit option
                    const optText = line.replace(/^[\-\*\u2022]|^(\d+|[a-zأ-ي])[\)\.]\s*/i, '').trim();
                    currentQ.push(optText);
                } else {
                    // Continuation of previous text?
                    const lastIdx = currentQ.length - 1;
                    if (lastIdx >= 0) currentQ[lastIdx] += ' ' + line;
                }
            }
        });
        if (currentQ) structuredData.push(currentQ);

        const processed = processData(structuredData);
        setParsedData(processed);
        setStep('preview');
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsProcessing(true);

        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target?.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

            const processed = processData(data);
            setParsedData(processed);
            setStep('preview');
            setIsProcessing(false);
        };
        reader.readAsBinaryString(file);
    };

    const handleImport = () => {
        const toImport = parsedData.filter(q => q.isSelected);

        // Final Safety Check
        const invalidSelected = toImport.filter(q => !q.isValid);
        if (invalidSelected.length > 0) {
            return toast.error('توجد أسئلة محددة غير صالحة (قد لا يوجد إجابة صحيحة)، يرجى تصحيحها أو إلغاء تحديدها.');
        }

        if (toImport.length === 0) return toast.error('لم يتم تحديد أي أسئلة صالحة');

        toImport.forEach(q => {
            backend.createQuestion({
                id: '',
                text: q.text,
                options: q.options,
                correctOption: q.correctOption,
                subject: q.subject,
                difficulty: q.difficulty
            } as Question);
        });

        toast.success(`تم استيراد ${toImport.length} سؤال بنجاح`);
        onSuccess();
        onClose();
        setStep('upload');
        setParsedData([]);
        setTextInput('');
    };

    // --- Editing Functions ---

    const updateQuestion = (idx: number, field: keyof ParsedQuestion, value: any) => {
        const newData = [...parsedData];
        newData[idx] = { ...newData[idx], [field]: value };

        // Re-validate
        const existingTexts = new Set(existingQuestions.map(q => q.text.toLowerCase().trim()));
        newData[idx] = validateQuestion(newData[idx], existingTexts);

        // Auto-select if valid and was invalid, or vice versa? 
        // Keep user selection unless it becomes invalid, then force unselect maybe?
        if (!newData[idx].isValid) newData[idx].isSelected = false;

        setParsedData(newData);
    };

    const updateOption = (qIdx: number, optIdx: number, val: string) => {
        const newData = [...parsedData];
        const newOpts = [...newData[qIdx].options];
        newOpts[optIdx] = val;
        newData[qIdx].options = newOpts;

        const existingTexts = new Set(existingQuestions.map(q => q.text.toLowerCase().trim()));
        newData[qIdx] = validateQuestion(newData[qIdx], existingTexts);
        if (!newData[qIdx].isValid) newData[qIdx].isSelected = false;

        setParsedData(newData);
    };

    const applyBulkSubject = () => {
        const newData = parsedData.map(q => ({ ...q, subject: defaultSubject }));
        setParsedData(newData);
        toast.success('تم تعميم المادة المختارة على جميع الأسئلة');
    };

    const toggleSelect = (idx: number) => {
        const newData = [...parsedData];
        // Only allow selecting if valid
        if (!newData[idx].isValid && !newData[idx].isSelected) {
            return toast.error('لا يمكن تحديد سؤال غير صالح (راجع الأخطاء)');
        }
        newData[idx].isSelected = !newData[idx].isSelected;
        setParsedData(newData);
    };

    const toggleSelectAll = () => {
        const allSelected = parsedData.every(q => q.isValid ? q.isSelected : true);
        const newData = parsedData.map(q => ({
            ...q,
            isSelected: q.isValid ? !allSelected : false
        }));
        setParsedData(newData);
    };

    if (!isOpen) return null;

    const validCount = parsedData.filter(q => q.isValid).length;
    const selectedCount = parsedData.filter(q => q.isSelected).length;

    return (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center p-4 z-[60] backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-6xl max-h-[95vh] flex flex-col shadow-2xl animate-in zoom-in duration-200">
                {/* Header */}
                <div className="p-6 border-b dark:border-slate-700 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold dark:text-white flex items-center gap-2">
                            <FileSpreadsheet className="text-green-600" />
                            استيراد أسئلة ذكي
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition">
                        <X className="dark:text-white" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6">
                    {step === 'upload' ? (
                        <div className="space-y-6">
                            {/* CONFIG */}
                            <div className="flex gap-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                                <AlertCircle className="text-blue-600 shrink-0" />
                                <div className="text-sm text-blue-800 dark:text-blue-200">
                                    <p className="font-bold mb-1">تعليمات التنسيق الذكي:</p>
                                    <p>• النظام مرن: يمكنك لصق الأسئلة والخيارات حتى بدون ترقيم (أ، ب...) وسيتعرف عليها إذا كانت في أسطر متتالية.</p>
                                    <p>• إذا لم يتم اكتشاف الإجابة الصحيحة، يمكنك تحديدها يدوياً في الخطوة القادمة.</p>
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-8">
                                <div className="border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-xl p-8 text-center hover:bg-gray-50 dark:hover:bg-slate-700/50 transition cursor-pointer relative flex flex-col items-center justify-center">
                                    <input
                                        type="file"
                                        accept=".xlsx,.xls,.csv"
                                        onChange={handleFileUpload}
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                    />
                                    <Upload className="text-green-600 w-12 h-12 mb-4" />
                                    <h3 className="text-lg font-bold dark:text-white">ملف Excel / CSV</h3>
                                </div>

                                <div className="space-y-3">
                                    <textarea
                                        className="w-full border dark:border-slate-600 rounded-xl p-4 h-48 bg-gray-50 dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none font-mono text-sm leading-relaxed"
                                        placeholder={`مثال مرن:\nسؤال جديد هنا؟\nخيار اول\nخيار ثاني\nخيار ثالث\nالجواب: خيار ثاني`}
                                        value={textInput}
                                        onChange={e => setTextInput(e.target.value)}
                                    ></textarea>
                                    <button
                                        onClick={handleTextParse}
                                        disabled={!textInput.trim()}
                                        className="w-full bg-gray-900 dark:bg-slate-700 text-white px-6 py-3 rounded-lg text-sm font-bold disabled:opacity-50 hover:bg-gray-800 transition"
                                    >
                                        تحليل النص
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Toolbar */}
                            <div className="flex flex-col md:flex-row flex-wrap items-start md:items-center justify-between bg-gray-50 dark:bg-slate-900 p-4 rounded-xl border border-gray-100 dark:border-slate-700 gap-4">
                                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center w-full md:w-auto">
                                    <div className="flex flex-wrap items-center gap-2 px-3 py-1 bg-white dark:bg-slate-800 rounded border dark:border-slate-600 w-full md:w-auto">
                                        <span className="text-sm font-bold dark:text-white whitespace-nowrap">تعيين الكل إلى:</span>
                                        <select
                                            className="bg-transparent text-sm dark:text-white outline-none flex-1 min-w-[100px] dark:bg-slate-800"
                                            value={defaultSubject}
                                            onChange={e => setDefaultSubject(e.target.value)}
                                        >
                                            {Object.values(Subject).map(s => <option key={s} value={s} className="dark:bg-slate-800">{SUBJECT_TRANSLATIONS[s] || s}</option>)}
                                        </select>
                                        <button onClick={applyBulkSubject} className="text-xs bg-gray-200 dark:bg-slate-700 px-2 py-1 rounded hover:bg-gray-300 dark:text-white whitespace-nowrap">تطبيق</button>
                                    </div>
                                    <div className="text-sm flex gap-3">
                                        <span className="font-bold text-green-600 whitespace-nowrap">{validCount} صالح</span>
                                        <span className="text-gray-300">|</span>
                                        <span className="font-bold text-red-600 whitespace-nowrap">{parsedData.length - validCount} خطأ</span>
                                    </div>
                                </div>
                                <div className="text-lg font-bold text-primary-600 w-full md:w-auto text-left md:text-right">
                                    تم تحديد {selectedCount}
                                </div>
                            </div>

                            {/* Table */}
                            <div className="border dark:border-slate-700 rounded-lg overflow-x-auto">
                                <table className="w-full text-sm min-w-[800px]">
                                    <thead className="bg-gray-100 dark:bg-slate-800 font-bold text-gray-600 dark:text-gray-300">
                                        <tr>
                                            <th className="p-3 w-10">
                                                <input type="checkbox" onChange={toggleSelectAll} className="rounded" />
                                            </th>
                                            <th className="p-3 text-right w-1/3">السؤال</th>
                                            <th className="p-3 text-right w-1/3">الخيارات والإجابة</th>
                                            <th className="p-3 text-center w-40">التصنيف</th>
                                            <th className="p-3 text-center w-20">الحالة</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                                        {parsedData.map((row, idx) => (
                                            <tr key={idx} className={`
                                                ${!row.isValid ? 'bg-red-50 dark:bg-red-900/10' : ''} 
                                                ${row.isDuplicate ? 'bg-yellow-50 dark:bg-yellow-900/10' : ''}
                                                ${row.isSelected ? 'bg-primary-50 dark:bg-primary-900/10' : 'bg-white dark:bg-slate-900'}
                                            `}>
                                                <td className="p-3 text-center align-top pt-4">
                                                    <input
                                                        type="checkbox"
                                                        checked={row.isSelected}
                                                        onChange={() => toggleSelect(idx)}
                                                        disabled={!row.isValid}
                                                        className="rounded"
                                                    />
                                                </td>
                                                <td className="p-3 align-top">
                                                    <textarea
                                                        className="w-full bg-transparent border-none focus:ring-0 p-0 text-sm font-bold dark:text-white resize-none"
                                                        rows={2}
                                                        value={row.text}
                                                        onChange={(e) => updateQuestion(idx, 'text', e.target.value)}
                                                    />
                                                    {row.isDuplicate && <div className="text-xs text-yellow-600 font-bold mt-1 flex items-center gap-1"><AlertTriangle size={12} /> مكرر</div>}
                                                    {row.error && <div className="text-xs text-red-600 font-bold mt-1 flex items-center gap-1"><AlertCircle size={12} /> {row.error}</div>}
                                                </td>
                                                <td className="p-3">
                                                    <div className="space-y-1">
                                                        {row.options.map((o, optIdx) => (
                                                            <div key={optIdx} className="flex items-center gap-2">
                                                                <input
                                                                    type="radio"
                                                                    name={`correct-${idx}`}
                                                                    checked={row.correctOption === optIdx}
                                                                    onChange={() => updateQuestion(idx, 'correctOption', optIdx)}
                                                                />
                                                                <input
                                                                    className={`w-full px-2 py-1 rounded text-xs border ${row.correctOption === optIdx ? 'border-green-300 bg-green-50' : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800'} dark:text-white`}
                                                                    value={o}
                                                                    onChange={(e) => updateOption(idx, optIdx, e.target.value)}
                                                                />
                                                            </div>
                                                        ))}
                                                        {row.correctOption === -1 && (
                                                            <div className="text-xs text-red-500 font-bold px-1">لم يتم تحديد إجابة!</div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-3 text-center align-top space-y-2">
                                                    <select
                                                        className="w-full text-xs p-1 border rounded dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                                                        value={row.subject}
                                                        onChange={(e) => updateQuestion(idx, 'subject', e.target.value)}
                                                    >
                                                        {Object.values(Subject).map(s => <option key={s} value={s}>{SUBJECT_TRANSLATIONS[s] || s}</option>)}
                                                    </select>
                                                    <select
                                                        className="w-full text-xs p-1 border rounded dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                                                        value={row.difficulty}
                                                        onChange={(e) => updateQuestion(idx, 'difficulty', e.target.value)}
                                                    >
                                                        <option value="easy">سهل</option>
                                                        <option value="medium">متوسط</option>
                                                        <option value="hard">صعب</option>
                                                    </select>
                                                </td>
                                                <td className="p-3 text-center align-top pt-4">
                                                    {row.isValid
                                                        ? <Check size={18} className="text-green-500 mx-auto" />
                                                        : <X size={18} className="text-red-500 mx-auto" />
                                                    }
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t dark:border-slate-700 flex justify-end gap-3 bg-gray-50 dark:bg-slate-900/50 rounded-b-2xl">
                    {step === 'preview' && (
                        <button
                            onClick={() => setStep('upload')}
                            className="px-6 py-2 border dark:border-slate-600 text-gray-600 dark:text-gray-300 rounded-lg font-bold hover:bg-gray-100 dark:hover:bg-slate-700 transition"
                        >
                            رجوع
                        </button>
                    )}
                    {step === 'preview' ? (
                        <button
                            onClick={handleImport}
                            className="px-8 py-2 bg-primary-600 text-white rounded-lg font-bold hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary-600/20 transition flex items-center gap-2"
                        >
                            <FileSpreadsheet size={18} />
                            {`إضافة (${selectedCount}) سؤال`}
                        </button>
                    ) : (
                        <button onClick={onClose} className="px-6 py-2 text-gray-500 hover:text-gray-700 font-bold">إلغاء</button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ImportQuestionsModal;
