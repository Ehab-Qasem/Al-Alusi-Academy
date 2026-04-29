import React, { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { useDropzone } from 'react-dropzone'; // You might need to install this or implement simple input
import { Upload, X, FileSpreadsheet, AlertCircle, Check, Info, FileText } from 'lucide-react';
import { SchoolGrade, User, UserRole } from '../types';
import toast from 'react-hot-toast';
import { backend } from '../services/mockBackend';

interface ImportStudentsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    grades: SchoolGrade[];
    existingUsers: User[];
}

interface ParsedStudent {
    fullName: string;
    nationalID: string;
    isValid: boolean;
    error?: string;
}

const ImportStudentsModal: React.FC<ImportStudentsModalProps> = ({ isOpen, onClose, onSuccess, grades, existingUsers }) => {
    const [step, setStep] = useState<'upload' | 'preview'>('upload');
    const [rawFile, setRawFile] = useState<File | null>(null);
    const [parsedData, setParsedData] = useState<ParsedStudent[]>([]);
    const [textInput, setTextInput] = useState('');
    const [selectedGrade, setSelectedGrade] = useState('');
    const [selectedSection, setSelectedSection] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    // --- SMART PARSING LOGIC ---
    const extractStudentFromLine = (line: string): { name: string, id: string } | null => {
        // Normalize: Replace commas, tabs, pipes with spaces
        const cleanLine = line.replace(/[,;|/\\\t]/g, ' ').trim();
        if (!cleanLine) return null;

        // 1. Extract Potential ID (Sequence of 7 to 15 digits)
        // Saudi ID is usually 10, but we allow 7-15 to be safe
        const idMatch = cleanLine.match(/\b\d{7,15}\b/);
        const id = idMatch ? idMatch[0] : '';

        // 2. Extract Potential Name (Arabic letters, allowing spaces between them)
        // Remove the ID from the line to avoid confusion, then look for Arabic text
        const lineWithoutID = id ? cleanLine.replace(id, '') : cleanLine;

        // Match Arabic text segments (at least 2 words preferred)
        // Regex: Arabic chars range [\u0600-\u06FF]
        const nameMatch = lineWithoutID.match(/[\u0600-\u06FF\s]{3,}/);
        let name = nameMatch ? nameMatch[0].trim() : '';

        // Clean up name (remove extra spaces)
        name = name.replace(/\s+/g, ' ');

        if (!id && !name) return null;

        return { name, id };
    };

    const processData = (rawData: any[]) => {
        const students: ParsedStudent[] = [];
        const existingIDs = new Set(existingUsers.map(u => u.nationalID));
        // Track IDs encountered *within* this current import batch to detect duplicates in the file
        const importedIDs = new Set<string>();

        // Flatten data if it comes from Excel (array of arrays)
        // or just treat it as a list of raw objects/strings

        rawData.forEach(row => {
            let name = '';
            let id = '';

            if (Array.isArray(row)) {
                // EXCEL ROW: Try to identify columns via simple heuristics
                // Strategy: Find the cell that looks like an ID, and the one that looks like a Name
                const idCell = row.find(cell => /^\d{7,15}$/.test(String(cell).trim()));
                const nameCell = row.find(cell => /[\u0600-\u06FF]/.test(String(cell)) && String(cell).length > 3);

                if (idCell) id = String(idCell).trim();
                if (nameCell) name = String(nameCell).trim();
            } else if (typeof row === 'string') {
                // TEXT ROW (from raw parse)
                const extracted = extractStudentFromLine(row);
                if (extracted) {
                    name = extracted.name;
                    id = extracted.id;
                }
            } else if (typeof row === 'object') {
                // JSON object (maybe from CSV parser)
                Object.values(row).forEach(val => {
                    const str = String(val).trim();
                    if (/^\d{7,15}$/.test(str)) id = str;
                    else if (/[\u0600-\u06FF]/.test(str)) name = str;
                });
            }

            if (!name && !id) return;

            let isValid = true;
            let error = '';

            // Validation Rules
            if (!id) { isValid = false; error = 'رقم الهوية مفقود'; }
            else if (id.length < 7) { isValid = false; error = 'رقم هوية قصير جداً'; }

            // Check Database Duplicates
            if (isValid && existingIDs.has(id)) { isValid = false; error = 'مسجل مسبقاً في النظام'; }

            // Check File Duplicates
            if (isValid && importedIDs.has(id)) { isValid = false; error = 'مكرر في هذا الملف'; }

            if (isValid && !name) { isValid = false; error = 'الاسم مفقود'; }
            else if (isValid && name.length < 3) { isValid = false; error = 'الاسم قصير جداً'; }

            if (id && isValid) importedIDs.add(id); // Only add if it's currently valid to avoid marking valid IDs as duplicates if an earlier invalid entry had the same ID.

            students.push({
                fullName: name || '---',
                nationalID: id || '---',
                isValid,
                error
            });
        });

        return students;
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setRawFile(file);
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

    const handleTextParse = () => {
        if (!textInput.trim()) return;

        // Split by newlines
        const lines = textInput.split(/\r?\n/);
        const processed = processData(lines);
        setParsedData(processed);
        setStep('preview');
    };

    const handleImport = async () => {
        const studentsToAttemptImport = parsedData.filter(s => s.isValid);
        if (studentsToAttemptImport.length === 0) {
            toast.error("لا توجد بيانات صالحة للاستيراد");
            return;
        }

        setIsProcessing(true);
        let successCount = 0;
        let failCount = 0;
        const failedImportIDs = new Set<string>(); // To track IDs that failed during backend creation

        // Create a mutable copy of parsedData to update statuses
        const updatedParsedData = parsedData.map(s => ({ ...s }));

        try {
            for (const s of studentsToAttemptImport) {
                try {
                    const newUser: User = {
                        id: `u_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                        fullName: s.fullName,
                        nationalID: s.nationalID,
                        role: UserRole.STUDENT,
                        gradeLevel: selectedGrade || undefined,
                        classSection: selectedSection || undefined,
                        password: s.nationalID, // Default password = ID
                        mustChangePassword: true,
                        enrolledCourses: []
                    };
                    backend.createUser(newUser);
                    successCount++;
                } catch (e: any) {
                    failCount++;
                    failedImportIDs.add(s.nationalID);
                    // Find the student in the updatedParsedData and mark as error
                    const studentInList = updatedParsedData.find(item => item.nationalID === s.nationalID);
                    if (studentInList) {
                        studentInList.isValid = false;
                        studentInList.error = 'فشل الاستيراد: قد يكون المستخدم موجوداً بالفعل أو خطأ آخر';
                    }
                }
            }

            // Filter the updatedParsedData to keep only students that were originally invalid
            // or those that failed during the import attempt.
            const remainingStudents = updatedParsedData.filter(s =>
                !s.isValid || failedImportIDs.has(s.nationalID)
            );

            setParsedData(remainingStudents);

            if (successCount > 0) {
                toast.success(`تم إضافة ${successCount} طالب بنجاح`);
                onSuccess(); // Refresh background data
            }

            if (failCount > 0) {
                toast.error(`لم نتمكن من إضافة ${failCount} طالب.`);
            }

            // If all students were processed (either succeeded or failed and are now marked invalid)
            // and there are no remaining valid students to import, close the modal.
            if (remainingStudents.every(s => !s.isValid)) {
                handleClose();
            }

        } catch (e) {
            console.error(e);
            toast.error("حدث خطأ غير متوقع أثناء عملية الاستيراد");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleClose = () => {
        setStep('upload');
        setRawFile(null);
        setParsedData([]);
        setTextInput('');
        setSelectedGrade('');
        setSelectedSection('');
        onClose();
    };

    if (!isOpen) return null;

    const validCount = parsedData.filter(s => s.isValid).length;
    const invalidCount = parsedData.length - validCount;

    return (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center p-4 z-[60] backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in duration-200">
                {/* Header */}
                <div className="p-6 border-b dark:border-slate-700 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold dark:text-white flex items-center gap-2">
                            <FileSpreadsheet className="text-primary-600" />
                            استيراد الطلاب دفعة واحدة
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            تعرف تلقائي على الأسماء وأرقام الهوية من ملفات Excel أو النصوص.
                        </p>
                    </div>
                    <button onClick={handleClose} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition">
                        <X className="dark:text-white" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6">
                    {step === 'upload' ? (
                        <div className="space-y-8">
                            {/* File Upload */}
                            <div className="border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-xl p-10 text-center hover:bg-gray-50 dark:hover:bg-slate-700/50 transition cursor-pointer relative">
                                <input
                                    type="file"
                                    accept=".xlsx,.xls,.csv"
                                    onChange={handleFileUpload}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                />
                                <div className="flex flex-col items-center gap-3 pointer-events-none">
                                    <div className="bg-primary-50 dark:bg-primary-900/30 p-4 rounded-full">
                                        <Upload className="text-primary-600 w-8 h-8" />
                                    </div>
                                    <h3 className="text-lg font-bold dark:text-white">اسحب وأفلت ملف Excel هنا</h3>
                                    <p className="text-sm text-gray-500">أو اضغط للاختيار من جهازك</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 text-gray-400">
                                <div className="h-px bg-gray-200 dark:bg-slate-700 flex-1"></div>
                                <span>أو</span>
                                <div className="h-px bg-gray-200 dark:bg-slate-700 flex-1"></div>
                            </div>

                            {/* Text Input */}
                            <div className="space-y-3">
                                <label className="block text-sm font-bold dark:text-white flex items-center gap-2">
                                    <FileText size={16} />
                                    نسخ ولصق مباشر
                                </label>
                                <textarea
                                    className="w-full border dark:border-slate-600 rounded-xl p-4 h-32 bg-gray-50 dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none font-mono text-sm"
                                    placeholder={`مثال:\n1012345678    أحمد محمد\n1012345679    خالد علي`}
                                    value={textInput}
                                    onChange={e => setTextInput(e.target.value)}
                                ></textarea>
                                <button
                                    onClick={handleTextParse}
                                    disabled={!textInput.trim()}
                                    className="bg-gray-900 dark:bg-slate-700 text-white px-6 py-2 rounded-lg text-sm font-bold disabled:opacity-50 hover:bg-gray-800 transition"
                                >
                                    معالجة النص
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Summary & Config */}
                            <div className="grid md:grid-cols-2 gap-6 bg-gray-50 dark:bg-slate-900 p-4 rounded-xl border border-gray-100 dark:border-slate-700">
                                <div>
                                    <h3 className="font-bold text-sm mb-3 dark:text-white">تعيين الفصل (اختياري)</h3>
                                    <div className="flex gap-2">
                                        <select
                                            className="flex-1 border dark:border-slate-600 rounded-lg p-2 dark:bg-slate-800 dark:text-white text-sm"
                                            value={selectedGrade}
                                            onChange={e => { setSelectedGrade(e.target.value); setSelectedSection(''); }}
                                        >
                                            <option value="">-- غير محدد --</option>
                                            {grades.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}
                                        </select>
                                        <select
                                            className="flex-1 border dark:border-slate-600 rounded-lg p-2 dark:bg-slate-800 dark:text-white text-sm"
                                            value={selectedSection}
                                            onChange={e => setSelectedSection(e.target.value)}
                                            disabled={!selectedGrade}
                                        >
                                            <option value="">-- غير محدد --</option>
                                            {grades.find(g => g.name === selectedGrade)?.sections.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">
                                        * الطلاب الذين لا تحدد لهم فصل سيظهرون في التنبيهات كـ "غير مسكنين".
                                    </p>
                                </div>
                                <div className="flex items-center justify-around text-center">
                                    <div>
                                        <div className="text-2xl font-bold text-green-600">{validCount}</div>
                                        <div className="text-xs text-gray-500 font-bold">صالح للاستيراد</div>
                                    </div>
                                    <div className="w-px h-10 bg-gray-200"></div>
                                    <div>
                                        <div className="text-2xl font-bold text-red-500">{invalidCount}</div>
                                        <div className="text-xs text-gray-500 font-bold">سيتم تجاهله</div>
                                    </div>
                                </div>
                            </div>

                            {/* Preview Table */}
                            <div className="border dark:border-slate-700 rounded-lg overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-100 dark:bg-slate-800 font-bold text-gray-600 dark:text-gray-300">
                                        <tr>
                                            <th className="p-3 text-right">الاسم</th>
                                            <th className="p-3 text-right">رقم الهوية</th>
                                            <th className="p-3 text-center">الحالة</th>
                                            <th className="p-3 text-right">ملاحظات</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                                        {parsedData.slice(0, 50).map((row, idx) => (
                                            <tr key={idx} className={row.isValid ? 'bg-white dark:bg-slate-900' : 'bg-red-50 dark:bg-red-900/10'}>
                                                <td className="p-3 dark:text-white font-medium">{row.fullName}</td>
                                                <td className="p-3 font-mono dark:text-gray-300">{row.nationalID}</td>
                                                <td className="p-3 text-center">
                                                    {row.isValid
                                                        ? <Check size={16} className="mx-auto text-green-500" />
                                                        : <X size={16} className="mx-auto text-red-500" />
                                                    }
                                                </td>
                                                <td className="p-3 text-red-500 text-xs font-bold">{row.error}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {parsedData.length > 50 && (
                                    <div className="p-2 text-center text-xs text-gray-500 bg-gray-50 dark:bg-slate-800 border-t dark:border-slate-700">
                                        و {parsedData.length - 50} صفوف أخرى...
                                    </div>
                                )}
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
                            disabled={validCount === 0 || isProcessing}
                            className="px-8 py-2 bg-primary-600 text-white rounded-lg font-bold hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary-600/20 transition flex items-center gap-2"
                        >
                            {isProcessing ? 'جاري الاستيراد...' : `استيراد (${validCount}) طالب`}
                        </button>
                    ) : (
                        <button onClick={handleClose} className="px-6 py-2 text-gray-500 hover:text-gray-700 font-bold">إلغاء</button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ImportStudentsModal;
