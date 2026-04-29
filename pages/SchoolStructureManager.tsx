import React, { useState } from 'react';
import { backend } from '../services/mockBackend';
import { SchoolGrade } from '../types';
import { Plus, Trash, Edit, Save, X, Layers, LayoutGrid, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { ConfirmModal } from '../components/ConfirmModal';

const SchoolStructureManager = () => {
    const [grades, setGrades] = useState<SchoolGrade[]>(backend.getGrades());
    const [isEditing, setIsEditing] = useState<string | null>(null); // Grade ID
    const [editForm, setEditForm] = useState<Partial<SchoolGrade>>({});

    const [showAddModal, setShowAddModal] = useState(false);
    const [newGradeName, setNewGradeName] = useState('');
    const [newGradeCode, setNewGradeCode] = useState(''); // New unique code
    const [newSectionName, setNewSectionName] = useState(''); // Temp for adding sections in modal
    const [newGradeSections, setNewGradeSections] = useState<string[]>([]);

    // Confirm Modal
    const [confirmState, setConfirmState] = useState({ isOpen: false, title: '', message: '', onConfirm: () => { } });

    const refresh = () => setGrades([...backend.getGrades()]);

    const handleSaveAdd = () => {
        if (!newGradeName) return toast.error('اسم الصف مطلوب');
        if (!newGradeCode) return toast.error('رمز الصف مطلوب');

        // Unique Code Check
        if (grades.some(g => g.uniqueCode === newGradeCode)) {
            return toast.error('رمز الصف موجود مسبقاً! يرجى استخدام رمز فريد.');
        }

        const newGrade: SchoolGrade = {
            id: `g_${Date.now()}`,
            name: newGradeName,
            uniqueCode: newGradeCode,
            sections: newGradeSections
        };

        backend.saveGrade(newGrade);
        refresh();
        setShowAddModal(false);
        setNewGradeName('');
        setNewGradeCode('');
        setNewGradeSections([]);
        toast.success('تم إضافة الصف بنجاح');
    };

    const handleDelete = (id: string, gradeName: string) => {
        // Count affected students
        const affectedStudents = backend.getUsers().filter(u => u.gradeLevel === gradeName).length;

        setConfirmState({
            isOpen: true,
            title: 'حذف الصف - تحذير هام!',
            message: affectedStudents > 0
                ? `سيؤدي حذف "${gradeName}" إلى إلغاء تحديد الصف لـ (${affectedStudents}) طالب! هل أنت متأكد تماماً؟`
                : `هل أنت متأكد من حذف "${gradeName}"؟`,
            onConfirm: () => {
                backend.deleteGrade(id);
                refresh();
                toast.success('تم حذف الصف وتحديث بيانات الطلاب');
                setConfirmState(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const handleUpdate = (id: string) => {
        if (!editForm.name || !editForm.uniqueCode) return toast.error('الاسم والرمز مطلوبان');

        // Unique Code Check (exclude current grade)
        if (grades.some(g => g.uniqueCode === editForm.uniqueCode && g.id !== id)) {
            return toast.error('رمز الصف موجود مسبقاً! يرجى استخدام رمز فريد.');
        }

        if (grades.find(g => g.id === id)) {
            backend.saveGrade({ ...grades.find(g => g.id === id)!, ...editForm } as SchoolGrade);
            refresh();
            setIsEditing(null);
            toast.success('تم حفظ التغييرات');
        }
    };

    const addSectionToEdit = (val: string) => {
        if (!val || !editForm.sections) return;
        if (editForm.sections.includes(val)) return toast.error('الشعبة موجودة مسبقاً');
        setEditForm({ ...editForm, sections: [...editForm.sections, val] });
        setNewSectionName(''); // Clear input
    };

    const removeSectionFromEdit = (val: string) => {
        if (!editForm.sections) return;
        setEditForm({ ...editForm, sections: editForm.sections.filter(s => s !== val) });
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <header className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold dark:text-white flex items-center gap-2">
                        <Layers className="text-primary-500" />
                        هيكلة الصفوف والشعب
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">أضف الصفوف الدراسية وعرف رموزها الفريدة.</p>
                </div>
                <button onClick={() => setShowAddModal(true)} className="bg-primary-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary-700 shadow-sm transition">
                    <Plus size={18} /> إضافة صف جديد
                </button>
            </header>

            <div className="grid gap-4">
                {grades.map(grade => (
                    <div key={grade.id} className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
                        {isEditing === grade.id ? (
                            // EDIT MODE
                            <div className="space-y-4">
                                <div className="flex gap-4 items-start">
                                    <div className="flex-1 space-y-2">
                                        <div className="flex gap-2">
                                            <div className="flex-1">
                                                <label className="text-xs font-bold text-gray-500">اسم الصف</label>
                                                <input
                                                    className="w-full border dark:border-slate-600 p-2 rounded bg-white dark:bg-slate-800 dark:text-white"
                                                    value={editForm.name}
                                                    onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                                                />
                                            </div>
                                            <div className="w-24">
                                                <label className="text-xs font-bold text-gray-500">الرمز</label>
                                                <input
                                                    className="w-full border dark:border-slate-600 p-2 rounded bg-white dark:bg-slate-800 dark:text-white text-center font-mono"
                                                    value={editForm.uniqueCode}
                                                    onChange={e => setEditForm(prev => ({ ...prev, uniqueCode: e.target.value }))}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 mt-6">
                                        <button onClick={() => handleUpdate(grade.id)} className="p-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded hover:bg-green-200 transition"><Save size={18} /></button>
                                        <button onClick={() => setIsEditing(null)} className="p-2 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 rounded hover:bg-gray-200 transition"><X size={18} /></button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500">الشعب الدراسية</label>
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        {editForm.sections?.map(sec => (
                                            <span key={sec} className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full text-sm flex items-center gap-2 border border-blue-100 dark:border-blue-800">
                                                {sec}
                                                <button onClick={() => removeSectionFromEdit(sec)} className="hover:text-red-500"><X size={14} /></button>
                                            </span>
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        <input
                                            placeholder="أضف شعبة جديدة..."
                                            className="flex-1 border dark:border-slate-600 p-2 rounded text-sm bg-white dark:bg-slate-800 dark:text-white"
                                            value={newSectionName}
                                            onChange={e => setNewSectionName(e.target.value)}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter') {
                                                    addSectionToEdit(newSectionName);
                                                }
                                            }}
                                        />
                                        <button onClick={() => addSectionToEdit(newSectionName)} className="border dark:border-slate-600 px-4 py-2 rounded hover:bg-gray-50 dark:hover:bg-slate-700 transition"><Plus size={18} /></button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            // VIEW MODE
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-primary-50 dark:bg-primary-900/10 flex items-center justify-center text-primary-600 dark:text-primary-400 font-black text-xl font-mono border-2 border-primary-100 dark:border-primary-900">
                                        {grade.uniqueCode}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg dark:text-white">{grade.name}</h3>
                                        <div className="flex flex-wrap gap-2 mt-1">
                                            {grade.sections.length > 0 ? grade.sections.map(s => (
                                                <span key={s} className="text-xs bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded border border-gray-200 dark:border-slate-700">{s}</span>
                                            )) : <span className="text-xs text-gray-400 italic">لا يوجد شعب</span>}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-2 self-end md:self-center">
                                    <button onClick={() => { setIsEditing(grade.id); setEditForm({ ...grade }); setNewSectionName(''); }} className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded transition">
                                        <Edit size={18} />
                                    </button>
                                    <button onClick={() => handleDelete(grade.id, grade.name)} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 rounded transition">
                                        <Trash size={18} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}

                {grades.length === 0 && (
                    <div className="text-center p-12 bg-gray-50 dark:bg-slate-900 border border-dashed border-gray-300 dark:border-slate-700 rounded-xl text-gray-400">
                        <Layers size={48} className="mx-auto mb-4 opacity-50" />
                        <p>لم يتم إضافة أي صفوف بعد.</p>
                    </div>
                )}
            </div>

            {/* ADD MODAL */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg p-6 border border-gray-100 dark:border-slate-700 shadow-2xl animate-in fade-in zoom-in duration-200">
                        <h3 className="text-xl font-bold mb-4 dark:text-white">إضافة صف جديد</h3>

                        <div className="space-y-4">
                            <div className="grid grid-cols-4 gap-4">
                                <div className="col-span-3">
                                    <label className="block text-sm font-bold mb-1 dark:text-gray-300">اسم الصف (مثال: أول ثانوي)</label>
                                    <input
                                        className="w-full border dark:border-slate-600 p-2 rounded bg-white dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                                        value={newGradeName}
                                        onChange={e => setNewGradeName(e.target.value)}
                                    />
                                </div>
                                <div className="col-span-1">
                                    <label className="block text-sm font-bold mb-1 dark:text-gray-300">الرمز</label>
                                    <input
                                        placeholder="1"
                                        className="w-full border dark:border-slate-600 p-2 rounded bg-white dark:bg-slate-700 dark:text-white text-center font-mono focus:ring-2 focus:ring-primary-500 outline-none"
                                        value={newGradeCode}
                                        onChange={e => setNewGradeCode(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold mb-1 dark:text-gray-300">الشعب (أضف شعبة واضغط Enter)</label>
                                <div className="flex gap-2">
                                    <input
                                        placeholder="مثال: شعبة 1"
                                        className="flex-1 border dark:border-slate-600 p-2 rounded bg-white dark:bg-slate-700 dark:text-white outline-none focus:border-primary-500"
                                        value={newSectionName}
                                        onChange={e => setNewSectionName(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') {
                                                if (newSectionName && !newGradeSections.includes(newSectionName)) {
                                                    setNewGradeSections([...newGradeSections, newSectionName]);
                                                    setNewSectionName('');
                                                }
                                            }
                                        }}
                                    />
                                    <button onClick={() => {
                                        if (newSectionName && !newGradeSections.includes(newSectionName)) {
                                            setNewGradeSections([...newGradeSections, newSectionName]);
                                            setNewSectionName('');
                                        }
                                    }} className="bg-gray-100 dark:bg-slate-700 px-4 rounded hover:bg-gray-200 dark:hover:bg-slate-600 transition"><Plus /></button>
                                </div>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {newGradeSections.map(s => (
                                        <span key={s} className="bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                                            {s}
                                            <button onClick={() => setNewGradeSections(newGradeSections.filter(x => x !== s))} className="hover:text-red-500"><X size={14} /></button>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button onClick={handleSaveAdd} className="flex-1 bg-primary-600 text-white py-2 rounded-lg font-bold hover:bg-primary-700 transition">حفظ</button>
                            <button onClick={() => setShowAddModal(false)} className="flex-1 border dark:border-slate-600 text-gray-500 dark:text-gray-300 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition">إلغاء</button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={confirmState.isOpen}
                title={confirmState.title}
                message={confirmState.message}
                onConfirm={confirmState.onConfirm}
                onClose={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
            />
        </div>
    );
};

export default SchoolStructureManager;
