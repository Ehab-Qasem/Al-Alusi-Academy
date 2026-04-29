import React, { useState, useEffect } from 'react';
import { backend } from '../services/mockBackend';
import { Users, Plus, Trash, Copy, RefreshCw, AlertCircle, Search, Eye, EyeOff, Edit, CheckSquare, Square, X, ArrowRightLeft, AlertTriangle, Upload, Award } from 'lucide-react';
import ImportStudentsModal from '../components/ImportStudentsModal';
import { User, UserRole, SchoolGrade, CertificateTemplate } from '../types';
import toast from 'react-hot-toast';
import CustomSelect from '../components/CustomSelect';
import { ConfirmModal } from '../components/ConfirmModal';



const AdminUsersPage = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loadingList, setLoadingList] = useState(true);
    // ...
    const [showImportModal, setShowImportModal] = useState(false); // Add state

    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState<string>('all');
    const [filterGrade, setFilterGrade] = useState<string>('all');
    const [filterSection, setFilterSection] = useState<string>('all');
    const [grades, setGrades] = useState<SchoolGrade[]>([]);

    // Selection State
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
    const [isBulkMoveModalOpen, setIsBulkMoveModalOpen] = useState(false);
    const [bulkMoveTarget, setBulkMoveTarget] = useState<{ grade: string, section: string }>({ grade: '', section: '' });

    // Modal State
    const [showAddModal, setShowAddModal] = useState(false);
    const [newUser, setNewUser] = useState<Partial<User>>({ role: UserRole.STUDENT, nationalID: '', fullName: '' });
    const [customPassword, setCustomPassword] = useState('');
    const [showCustomPassword, setShowCustomPassword] = useState(false);
    const [generatedPass, setGeneratedPass] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Edit Modal State
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);


    // Confirm Modal State
    const [confirmState, setConfirmState] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { }
    });

    // Certificate Issue State
    const [showIssueCertModal, setShowIssueCertModal] = useState(false);
    const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState('');

    const fetchTemplates = () => {
        setTemplates(backend.getCertificateTemplates());
    };

    useEffect(() => {
        if (showIssueCertModal) fetchTemplates();
    }, [showIssueCertModal]);

    const fetchUsers = async () => {
        setLoadingList(true);
        try {
            const data = backend.getUsers();
            setUsers(data);
            setGrades(backend.getGrades());
        } catch (error) {
            console.error("Error fetching users:", error);
        } finally {
            setLoadingList(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    // --- SORTING & FILTERING ---
    const getFilteredUsers = () => {
        let filtered = users.filter(u => {
            const matchesSearch = u.fullName.includes(searchTerm) || u.nationalID.includes(searchTerm);
            const matchesRole = filterRole === 'all' || u.role === filterRole;
            const matchesGrade = filterGrade === 'all' || !u.gradeLevel || u.gradeLevel === filterGrade;
            const matchesSection = filterSection === 'all' || !u.classSection || u.classSection === filterSection;
            return matchesSearch && matchesRole && matchesGrade && matchesSection;
        });

        // Sort: Unassigned Students First
        filtered.sort((a, b) => {
            if (a.role !== UserRole.STUDENT || b.role !== UserRole.STUDENT) return 0;
            const aUnassigned = !a.gradeLevel || !a.classSection;
            const bUnassigned = !b.gradeLevel || !b.classSection;
            if (aUnassigned && !bUnassigned) return -1;
            if (!aUnassigned && bUnassigned) return 1;
            return 0;
        });

        return filtered;
    };

    const filteredUsers = getFilteredUsers();

    // --- SELECTION LOGIC ---
    // Only count students for "Select All" status checks
    const filteredStudents = filteredUsers.filter(u => u.role === UserRole.STUDENT);
    const unassignedStudentsInView = filteredStudents.filter(u => !u.gradeLevel || !u.classSection);

    const toggleSelectAll = () => {
        const allSelected = filteredUsers.length > 0 && filteredUsers.every(u => selectedUserIds.includes(u.id));

        if (allSelected) {
            setSelectedUserIds([]);
        } else {
            setSelectedUserIds(filteredUsers.map(u => u.id));
        }
    };

    const toggleSelectUser = (id: string) => {
        if (selectedUserIds.includes(id)) {
            setSelectedUserIds(selectedUserIds.filter(uid => uid !== id));
        } else {
            setSelectedUserIds([...selectedUserIds, id]);
        }
    };

    const selectUnassignedOnly = () => {
        setSelectedUserIds(unassignedStudentsInView.map(u => u.id));
        toast.success(`تم تحديد ${unassignedStudentsInView.length} طالب غير مسكن`);
    };

    // --- BULK ACTION ---
    const handleBulkMove = () => {
        if (!bulkMoveTarget.grade || !bulkMoveTarget.section) return toast.error('الرجاء اختيار الصف والشعبة');

        const selectedUsers = users.filter(u => selectedUserIds.includes(u.id));
        // Verify only students selected (UI hides checkboxes for non-students, but safe check)

        selectedUsers.forEach(u => {
            if (u.role === UserRole.STUDENT) {
                const updated = { ...u, gradeLevel: bulkMoveTarget.grade, classSection: bulkMoveTarget.section };
                backend.updateUser(updated);
            }
        });

        toast.success(`تم نقل ${selectedUsers.length} طالب بنجاح`);
        setIsBulkMoveModalOpen(false);
        setSelectedUserIds([]);
        setBulkMoveTarget({ grade: '', section: '' });
        fetchUsers();
    };


    // --- CRUD ---
    const handleDelete = async (id: string) => {
        try {
            backend.deleteUser(id);
            fetchUsers();
            toast.success("تم حذف المستخدم");
        } catch (e) {
            toast.error("حدث خطأ أثناء الحذف");
        }
    };

    const handleBulkDelete = () => {
        if (selectedUserIds.length === 0) return;

        // Use confirming modal
        setConfirmState({
            isOpen: true,
            title: `حذف ${selectedUserIds.length} مستخدم`,
            message: 'هل أنت متأكد من حذف جميع المستخدمين المحددين؟ لا يمكن التراجع عن هذا الإجراء.',
            onConfirm: () => {
                selectedUserIds.forEach(id => backend.deleteUser(id));
                toast.success(`تم حذف ${selectedUserIds.length} مستخدم بنجاح`);
                setSelectedUserIds([]);
                fetchUsers();
            }
        });
    };

    const handleIssueCertificate = () => {
        if (!selectedTemplateId) return toast.error('الرجاء اختيار القالب');

        const selectedStudents = users.filter(u => selectedUserIds.includes(u.id) && u.role === UserRole.STUDENT);

        selectedStudents.forEach(student => {
            backend.issueCertificate({
                studentId: student.id,
                templateId: selectedTemplateId,
                metadata: {
                    studentName: student.fullName,
                    date: new Date().toLocaleDateString('ar-SA')
                }
            });
        });

        toast.success(`تم إصدار الشهادات لـ ${selectedStudents.length} طالب بنجاح`);
        setShowIssueCertModal(false);
        setSelectedUserIds([]);
        setSelectedTemplateId('');
    };

    const generateRandomPassword = () => {
        const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
        const lower = "abcdefghijkmnpqrstuvwxyz";
        const nums = "23456789";
        const syms = "!@#$%^&*";
        const all = upper + lower + nums + syms;
        let pass = "";
        for (let i = 0; i < 8; i++) pass += all.charAt(Math.floor(Math.random() * all.length));
        setGeneratedPass(pass);
        setCustomPassword(pass);
    };

    const handleCreate = async () => {
        if (!newUser.nationalID || !newUser.fullName) return toast.error('البيانات ناقصة');
        setIsSubmitting(true);
        try {
            const userToCreate: User = {
                id: `u_${Date.now()}`,
                nationalID: newUser.nationalID,
                fullName: newUser.fullName,
                role: newUser.role || UserRole.STUDENT,
                gradeLevel: newUser.gradeLevel,
                classSection: newUser.classSection,
                enrolledCourses: [],
                mustChangePassword: !customPassword,
                password: customPassword || newUser.nationalID
            };
            backend.createUser(userToCreate);
            setShowAddModal(false);
            fetchUsers();
            setNewUser({ role: UserRole.STUDENT, nationalID: '', fullName: '' });
            setCustomPassword('');
            setGeneratedPass('');
            toast.success("تم إنشاء المستخدم بنجاح");
        } catch (e: any) {
            toast.error(e.message || "فشل إنشاء المستخدم");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdate = async () => {
        if (!editingUser) return;
        setIsSubmitting(true);
        try {
            const updatedUser: User = {
                ...editingUser,
                password: customPassword ? customPassword : editingUser.password,
                mustChangePassword: customPassword ? false : editingUser.mustChangePassword
            };
            backend.updateUser(updatedUser);
            setShowEditModal(false);
            setEditingUser(null);
            setCustomPassword('');
            fetchUsers();
            toast.success("تم تحديث بيانات المستخدم");
        } catch (e: any) {
            toast.error("فشل التحديث");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Helper: Format Class (UniqueCode/Section)
    const formatClass = (gradeName?: string, section?: string) => {
        if (!gradeName || !section) return <span className="text-red-500 font-bold text-xs bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded flex items-center gap-1 w-fit"><AlertTriangle size={12} /> غير محدد</span>;

        const grade = grades.find(g => g.name === gradeName);
        return (
            <div className="flex items-center gap-1 font-mono text-sm">
                <span className="bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 px-1.5 rounded text-xs border border-primary-100 dark:border-primary-800">
                    {grade?.uniqueCode || '?'}
                </span>
                <span className="text-gray-400">/</span>
                <span className="text-gray-900 dark:text-white font-bold">{section}</span>
            </div>
        );
    };

    const roleOptions = [
        { value: UserRole.STUDENT, label: 'طالب' },
        { value: UserRole.EXTERNAL, label: 'مستخدم (خارجي)' },
        { value: UserRole.TEACHER, label: 'معلم' },
        { value: UserRole.ADMIN, label: 'مدير' }
    ];

    return (
        <div className="space-y-6 animate-fade-in pb-12">
            <header>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">إدارة المستخدمين</h1>
                <p className="text-gray-500 dark:text-gray-400">إدارة الطلاب والمعلمين والأدوار.</p>
            </header>

            {/* FILTERS & ACTIONS */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800">
                <div className="flex-1 w-full gap-3 flex items-center">
                    <div className="relative flex-1">
                        <Search className="absolute right-3 top-2.5 text-gray-400" size={18} />
                        <input
                            className="w-full border dark:border-slate-700 bg-gray-50 dark:bg-slate-800 dark:text-white rounded-xl pr-10 pl-4 py-2.5 outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                            placeholder="بحث بالاسم أو الهوية..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    {/* Filters */}
                    <div className="flex gap-2 hidden md:flex">
                        <div className="w-32">
                            <CustomSelect options={[{ value: 'all', label: 'الجميع' }, ...roleOptions]} value={filterRole} onChange={(val) => { setFilterRole(val); setFilterGrade('all'); setFilterSection('all'); }} placeholder="الدور" />
                        </div>

                        {/* Grade Filter - Only if Role is Student */}
                        {filterRole === UserRole.STUDENT && (
                            <div className="w-32 animate-in fade-in slide-in-from-right-2">
                                <select
                                    className="w-full border dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-primary-500/20 text-sm h-[42px]"
                                    value={filterGrade}
                                    onChange={(e) => { setFilterGrade(e.target.value); setFilterSection('all'); }}
                                >
                                    <option value="all">كل الصفوف</option>
                                    {grades.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}
                                </select>
                            </div>
                        )}

                        {/* Section Filter - Only if Grade is selected */}
                        {filterRole === UserRole.STUDENT && filterGrade !== 'all' && (
                            <div className="w-32 animate-in fade-in slide-in-from-right-2">
                                <select
                                    className="w-full border dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-primary-500/20 text-sm h-[42px]"
                                    value={filterSection}
                                    onChange={(e) => setFilterSection(e.target.value)}
                                >
                                    <option value="all">كل الشعب</option>
                                    {grades.find(g => g.name === filterGrade)?.sections.map(s => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setShowImportModal(true)} className="bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-slate-700 px-4 py-2.5 rounded-xl flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-slate-700 transition font-bold">
                        <Upload size={18} /> <span className="hidden md:inline">استيراد</span>
                    </button>
                    <button onClick={() => setShowAddModal(true)} className="bg-primary-600 text-white px-6 py-2.5 rounded-xl flex items-center gap-2 hover:bg-primary-700 shadow-lg shadow-primary-600/20 transition font-bold">
                        <Plus size={18} /> <span className="hidden md:inline">إضافة مستخدم</span>
                    </button>
                </div>
            </div>

            {/* BULK ACTIONS BAR */}
            {selectedUserIds.length > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-6 z-50 animate-in slide-in-from-bottom-4">
                    <span className="font-bold border-l border-gray-700 pl-6 ml-2">{selectedUserIds.length} تم التحديد</span>

                    {/* Issue Certificate Action - Only if ALL selected are students */}
                    {users.filter(u => selectedUserIds.includes(u.id)).every(u => u.role === UserRole.STUDENT) && (
                        <button onClick={() => setShowIssueCertModal(true)} className="flex items-center gap-2 hover:text-yellow-300 transition font-bold text-yellow-400">
                            <Award size={18} /> إصدار شهادة
                        </button>
                    )}

                    {/* Move Action - Only if ALL selected are students */}
                    {users.filter(u => selectedUserIds.includes(u.id)).every(u => u.role === UserRole.STUDENT) && (
                        <button onClick={() => setIsBulkMoveModalOpen(true)} className="flex items-center gap-2 hover:text-blue-300 transition font-bold">
                            <ArrowRightLeft size={18} /> نقل للفصل
                        </button>
                    )}

                    <button onClick={handleBulkDelete} className="flex items-center gap-2 hover:text-red-300 transition font-bold text-red-400">
                        <Trash size={18} /> حذف المحدد
                    </button>

                    <button onClick={() => setSelectedUserIds([])} className="hover:text-gray-300">
                        <X size={18} />
                    </button>
                </div>
            )}

            {/* TABLE */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800">
                            <tr>
                                <th className="p-4 w-10">
                                    <div className="flex items-center gap-2">
                                        <button onClick={toggleSelectAll} className="text-gray-500 hover:text-primary-600">
                                            {selectedUserIds.length > 0 && filteredStudents.length > 0 && filteredStudents.every(u => selectedUserIds.includes(u.id))
                                                ? <CheckSquare size={18} className="text-primary-600" />
                                                : <Square size={18} />}
                                        </button>

                                        {/* Select Unassigned Trigger */}
                                        {unassignedStudentsInView.length > 0 && (
                                            <button
                                                onClick={selectUnassignedOnly}
                                                className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 p-1 rounded hover:bg-yellow-200 transition"
                                                title="تحديد الطلاب غير المسكنين فقط"
                                            >
                                                <AlertTriangle size={14} />
                                            </button>
                                        )}
                                    </div>
                                </th>
                                <th className="text-right p-4 text-xs font-bold text-gray-500 dark:text-gray-400">الاسم</th>
                                <th className="text-right p-4 text-xs font-bold text-gray-500 dark:text-gray-400">الهوية</th>
                                <th className="text-right p-4 text-xs font-bold text-gray-500 dark:text-gray-400">الدور</th>
                                <th className="text-right p-4 text-xs font-bold text-gray-500 dark:text-gray-400">الصف</th>
                                <th className="text-right p-4 text-xs font-bold text-gray-500 dark:text-gray-400">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                            {filteredUsers.map(u => (
                                <tr key={u.id} className={`group transition duration-200 ${selectedUserIds.includes(u.id) ? 'bg-primary-50/50 dark:bg-primary-900/10' : 'hover:bg-gray-50 dark:hover:bg-slate-800/50'}`}>
                                    <td className="p-4">
                                        <button onClick={() => toggleSelectUser(u.id)} className="text-gray-400 hover:text-primary-600">
                                            {selectedUserIds.includes(u.id)
                                                ? <CheckSquare size={18} className="text-primary-600" />
                                                : <Square size={18} />}
                                        </button>
                                    </td>
                                    <td className="p-4 font-bold text-gray-800 dark:text-white">{u.fullName}</td>
                                    <td className="p-4 text-gray-600 dark:text-gray-400 font-mono text-xs">{u.nationalID}</td>
                                    <td className="p-4">
                                        <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${u.role === UserRole.ADMIN ? 'bg-red-100 text-red-700' :
                                            u.role === UserRole.TEACHER ? 'bg-purple-100 text-purple-700' :
                                                u.role === UserRole.EXTERNAL ? 'bg-orange-100 text-orange-700' :
                                                    'bg-blue-100 text-blue-700'
                                            }`}>
                                            {u.role === UserRole.ADMIN ? 'مدير' : u.role === UserRole.TEACHER ? 'معلم' : u.role === UserRole.EXTERNAL ? 'مستخدم' : 'طالب'}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        {u.role === UserRole.STUDENT
                                            ? formatClass(u.gradeLevel, u.classSection)
                                            : <span className="text-gray-300">-</span>
                                        }
                                    </td>
                                    <td className="p-4">
                                        <div className="flex gap-2 justify-end opacity-60 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => { setEditingUser(u); setCustomPassword(''); setShowEditModal(true); }} className="p-1.5 hover:bg-blue-100 text-blue-600 rounded"><Edit size={16} /></button>
                                            <button onClick={() => setConfirmState({
                                                isOpen: true,
                                                title: 'حذف',
                                                message: 'هل أنت متأكد؟',
                                                onConfirm: () => handleDelete(u.id)
                                            })} className="p-1.5 hover:bg-red-100 text-red-600 rounded"><Trash size={16} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* BULK MOVE MODAL */}
            {isBulkMoveModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in">
                        <h3 className="font-bold text-lg mb-4 dark:text-white">نقل الطلاب المحددون ( {selectedUserIds.length} )</h3>
                        <div className="space-y-3 mb-6">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">إلى الصف</label>
                                <select
                                    className="w-full border p-2 rounded bg-white dark:bg-slate-700 dark:text-white"
                                    value={bulkMoveTarget.grade}
                                    onChange={e => setBulkMoveTarget({ ...bulkMoveTarget, grade: e.target.value, section: '' })}
                                >
                                    <option value="">اختر...</option>
                                    {grades.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">إلى الشعبة</label>
                                <select
                                    className="w-full border p-2 rounded bg-white dark:bg-slate-700 dark:text-white"
                                    value={bulkMoveTarget.section}
                                    onChange={e => setBulkMoveTarget({ ...bulkMoveTarget, section: e.target.value })}
                                    disabled={!bulkMoveTarget.grade}
                                >
                                    <option value="">اختر...</option>
                                    {grades.find(g => g.name === bulkMoveTarget.grade)?.sections.map(s => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={handleBulkMove} className="flex-1 bg-primary-600 text-white py-2 rounded-lg font-bold">نقل</button>
                            <button onClick={() => setIsBulkMoveModalOpen(false)} className="flex-1 bg-gray-100 text-gray-600 py-2 rounded-lg font-bold">إلغاء</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ISSUE CERTIFICATE MODAL */}
            {showIssueCertModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in">
                        <div className="flex items-center gap-2 mb-4 text-yellow-500">
                            <Award size={24} />
                            <h3 className="font-bold text-lg dark:text-white">إصدار شهادات</h3>
                        </div>
                        <p className="text-sm text-gray-500 mb-4">سيتم إصدار شهادة لكل من الطلاب المحددين ({selectedUserIds.length}).</p>

                        <div className="space-y-3 mb-6">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">اختر القالب</label>
                                <select
                                    className="w-full border p-2 rounded bg-white dark:bg-slate-700 dark:text-white"
                                    value={selectedTemplateId}
                                    onChange={e => setSelectedTemplateId(e.target.value)}
                                >
                                    <option value="">اختر قالب الشهادة...</option>
                                    {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={handleIssueCertificate} className="flex-1 bg-yellow-500 text-white py-2 rounded-lg font-bold hover:bg-yellow-600 transition">إصدار</button>
                            <button onClick={() => setShowIssueCertModal(false)} className="flex-1 bg-gray-100 text-gray-600 py-2 rounded-lg font-bold">إلغاء</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ADD MODAL */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl animate-in fade-in zoom-in duration-200 overflow-y-auto max-h-[90vh]">
                        <h3 className="text-xl font-bold mb-4 dark:text-white">إضافة مستخدم جديد</h3>
                        <div className="space-y-4">
                            <CustomSelect label="الدور" options={roleOptions} value={newUser.role as string} onChange={v => setNewUser({ ...newUser, role: v as UserRole })} />
                            <input className="w-full border p-2 rounded dark:bg-slate-700 dark:text-white" placeholder="الاسم الكامل" value={newUser.fullName} onChange={e => setNewUser({ ...newUser, fullName: e.target.value })} />
                            <input className="w-full border p-2 rounded dark:bg-slate-700 dark:text-white" placeholder="رقم الهوية" value={newUser.nationalID} onChange={e => setNewUser({ ...newUser, nationalID: e.target.value })} />

                            {newUser.role === UserRole.STUDENT && (
                                <div className="grid grid-cols-2 gap-4">
                                    <select className="border p-2 rounded dark:bg-slate-700 dark:text-white" value={newUser.gradeLevel || ''} onChange={e => setNewUser({ ...newUser, gradeLevel: e.target.value, classSection: '' })}>
                                        <option value="">الصف...</option>
                                        {grades.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}
                                    </select>
                                    <select className="border p-2 rounded dark:bg-slate-700 dark:text-white" value={newUser.classSection || ''} onChange={e => setNewUser({ ...newUser, classSection: e.target.value })}>
                                        <option value="">الشعبة...</option>
                                        {grades.find(g => g.name === newUser.gradeLevel)?.sections.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            )}

                            <div className="bg-gray-50 dark:bg-slate-900 p-3 rounded-lg">
                                <label className="text-xs font-bold block mb-1">كلمة المرور</label>
                                <div className="flex gap-2">
                                    <input type={showCustomPassword ? 'text' : 'password'} className="flex-1 border p-2 rounded dark:bg-slate-800 dark:text-white" value={customPassword} onChange={e => setCustomPassword(e.target.value)} placeholder="اتركه فارغاً للافتراضي" />
                                    <button onClick={() => setShowCustomPassword(!showCustomPassword)} className="p-2"><Eye size={16} /></button>
                                    <button onClick={generateRandomPassword} className="p-2 text-primary-600"><RefreshCw size={16} /></button>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={handleCreate} className="flex-1 bg-primary-600 text-white py-2 rounded-lg font-bold">إضافة</button>
                            <button onClick={() => setShowAddModal(false)} className="flex-1 border text-gray-500 py-2 rounded-lg">إلغاء</button>
                        </div>
                    </div>
                </div>
            )}

            {/* EDIT MODAL - Now Restored! */}
            {showEditModal && editingUser && (
                <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg p-6 border border-gray-100 dark:border-slate-700 shadow-2xl animate-in fade-in zoom-in duration-200">
                        <h3 className="text-xl font-bold mb-6 dark:text-white">تعديل بيانات المستخدم</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold mb-1 dark:text-gray-300">الدور</label>
                                <div className="p-3 bg-gray-50 dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-500 dark:text-gray-400 cursor-not-allowed text-sm">
                                    {editingUser.role === UserRole.ADMIN ? 'مدير' : editingUser.role === UserRole.TEACHER ? 'معلم' : editingUser.role === UserRole.EXTERNAL ? 'مستخدم' : 'طالب'} (لا يمكن تعديله)
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1 dark:text-gray-300">الاسم الثلاثي</label>
                                <input className="w-full border dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-white p-2.5 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" value={editingUser.fullName} onChange={e => setEditingUser({ ...editingUser, fullName: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1 dark:text-gray-300">رقم الهوية (اسم المستخدم)</label>
                                <input className="w-full border dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-white p-2.5 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" value={editingUser.nationalID} onChange={e => setEditingUser({ ...editingUser, nationalID: e.target.value })} />
                            </div>

                            {editingUser.role === UserRole.STUDENT && (
                                <div className="grid grid-cols-2 gap-4">
                                    <select
                                        className="border dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-white p-2.5 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                        value={editingUser.gradeLevel || ''}
                                        onChange={e => setEditingUser({ ...editingUser, gradeLevel: e.target.value, classSection: '' })}
                                    >
                                        <option value="">اختر الصف...</option>
                                        {grades.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}
                                    </select>

                                    <select
                                        className="border dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-white p-2.5 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                        value={editingUser.classSection || ''}
                                        onChange={e => setEditingUser({ ...editingUser, classSection: e.target.value })}
                                        disabled={!editingUser.gradeLevel}
                                    >
                                        <option value="">اختر الشعبة...</option>
                                        {editingUser.gradeLevel && grades.find(g => g.name === editingUser.gradeLevel)?.sections.map(s => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="bg-gray-50 dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-700 mt-2">
                                <div className="flex justify-between items-end mb-2">
                                    <label className="block text-sm font-bold dark:text-gray-300">تعيين كلمة مرور جديدة (اختياري)</label>
                                    <button onClick={generateRandomPassword} className="text-xs text-primary-600 dark:text-primary-400 flex items-center gap-1 hover:underline font-bold">
                                        <RefreshCw size={12} /> توليد عشوائي
                                    </button>
                                </div>
                                <div className="flex gap-2">
                                    <div className="flex-1 relative">
                                        <input
                                            type={showCustomPassword ? "text" : "password"}
                                            className="w-full border dark:border-slate-600 p-2.5 pl-9 rounded-lg bg-white dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none text-left font-mono"
                                            value={customPassword}
                                            placeholder="اتركه فارغاً للاحتفاظ بكلمة المرور الحالية"
                                            onChange={e => setCustomPassword(e.target.value)}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowCustomPassword(!showCustomPassword)}
                                            className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors focus:outline-none"
                                        >
                                            {showCustomPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                    {generatedPass && (
                                        <button onClick={() => { navigator.clipboard.writeText(generatedPass); toast.success('تم النسخ'); }} className="p-2.5 border dark:border-slate-600 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 dark:text-white transition" title="نسخ">
                                            <Copy size={18} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-8">
                            <button
                                onClick={handleUpdate}
                                disabled={isSubmitting}
                                className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 transition shadow-lg shadow-blue-500/20"
                            >
                                {isSubmitting ? 'جاري التحديث...' : 'حفظ التغييرات'}
                            </button>
                            <button onClick={() => setShowEditModal(false)} className="flex-1 border dark:border-slate-600 text-gray-500 dark:text-gray-300 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 transition font-bold">إلغاء</button>
                        </div>
                    </div>
                </div>
            )}



            {/* IMPORT MODAL */}
            <ImportStudentsModal
                isOpen={showImportModal}
                onClose={() => setShowImportModal(false)}
                onSuccess={fetchUsers}
                grades={grades}
                existingUsers={users}
            />
            <ConfirmModal isOpen={confirmState.isOpen} title={confirmState.title} message={confirmState.message} onConfirm={() => { confirmState.onConfirm(); setConfirmState({ ...confirmState, isOpen: false }) }} onClose={() => setConfirmState({ ...confirmState, isOpen: false })} />
        </div>
    );
};

export default AdminUsersPage;
