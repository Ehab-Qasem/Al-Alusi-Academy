
import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Module, ContentItem, ContentType } from '../../types';
import { Trash2, ChevronDown, Plus, GripVertical, MoreVertical, Video, FileText, Image as ImageIcon, HelpCircle, Settings, Lock } from 'lucide-react';
import { SortableContentItem } from './SortableContentItem';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

interface SortableModuleProps {
    module: Module;
    moduleIndex: number;
    updateModuleTitle: (id: string, title: string) => void;
    deleteModule: (id: string) => void;
    deleteContent: (moduleId: string, contentId: string) => void;
    onEditContent: (moduleId: string, item: ContentItem) => void;
    openContentModal: (moduleId: string) => void;
    modules: Module[]; // All modules to find prerequisites
    onUpdateModulePrerequisite: (moduleId: string, prereqId?: string) => void;
}

export function SortableModule({ module, moduleIndex, deleteModule, deleteContent, onEditContent, updateModuleTitle, openContentModal, modules, onUpdateModulePrerequisite }: SortableModuleProps) {
    const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
    const previousModule = moduleIndex > 0 ? modules[moduleIndex - 1] : null;

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: module.id, data: { type: 'MODULE', module } });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-md rounded-3xl border border-white/50 dark:border-slate-700/50 overflow-hidden shadow-sm transition hover:shadow-md mb-4 group hover:border-primary-500/30">
            <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm p-4 border-b border-gray-200/50 dark:border-slate-700/50 flex items-center gap-4">
                {/* Drag Handle */}
                <div {...attributes} {...listeners} className="cursor-grab text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                    <GripVertical size={20} />
                </div>

                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-slate-700 flex items-center justify-center font-bold text-gray-500 dark:text-gray-400">
                    {moduleIndex + 1}
                </div>
                <input
                    className="flex-1 bg-transparent font-bold text-gray-800 dark:text-white outline-none placeholder-gray-400 focus:ring-0"
                    value={module.title}
                    onChange={e => updateModuleTitle(module.id, e.target.value)}
                    placeholder="عنوان الوحدة..."
                />
                <div className="flex gap-2">
                    <button
                        onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                        className={`p-2 rounded-lg transition ${isSettingsOpen || module.prerequisiteModuleId ? 'bg-primary-50 text-primary-600' : 'hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-400'}`}
                        title="إعدادات الوحدة"
                    >
                        {module.prerequisiteModuleId ? <Lock size={18} /> : <Settings size={18} />}
                    </button>
                    <button onClick={() => deleteModule(module.id)} className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 rounded-lg">
                        <Trash2 size={18} />
                    </button>
                    <button className="p-2 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg text-gray-400">
                        <ChevronDown size={20} />
                    </button>
                </div>
            </div>

            {/* Settings Panel */}
            {isSettingsOpen && (
                <div className="bg-white/50 dark:bg-slate-800/80 p-4 border-b border-gray-200/50 dark:border-slate-700/50 animate-fade-in text-sm backdrop-blur-sm">
                    <h4 className="font-bold mb-2 dark:text-gray-300 flex items-center gap-2">
                        <Settings size={14} /> إعدادات الوحدة
                    </h4>

                    {previousModule ? (
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id={`prereq-${module.id}`}
                                className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                checked={module.prerequisiteModuleId === previousModule.id}
                                onChange={(e) => {
                                    if (e.target.checked) {
                                        onUpdateModulePrerequisite(module.id, previousModule.id);
                                    } else {
                                        onUpdateModulePrerequisite(module.id, undefined);
                                    }
                                }}
                            />
                            <label htmlFor={`prereq-${module.id}`} className="text-gray-700 dark:text-gray-300 cursor-pointer select-none">
                                قفل هذه الوحدة حتى إكمال الوحدة السابقة: <strong>{previousModule.title}</strong>
                            </label>
                        </div>
                    ) : (
                        <p className="text-gray-400 text-xs">هذه هي الوحدة الأولى، لا يمكن إضافة متطلبات سابقة.</p>
                    )}
                </div>
            )}

            <div className="p-4 space-y-2">
                <SortableContext items={module.content.map(c => c.id)} strategy={verticalListSortingStrategy}>
                    {module.content.map((item) => (
                        <SortableContentItem key={item.id} item={item} moduleId={module.id} deleteContent={deleteContent} onEdit={onEditContent} />
                    ))}
                </SortableContext>

                <button
                    onClick={() => openContentModal(module.id)}
                    className="w-full py-3 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-xl text-gray-400 dark:text-gray-500 hover:border-primary-400 hover:text-primary-500 dark:hover:border-primary-500/50 transition flex items-center justify-center gap-2 font-bold text-sm"
                >
                    <Plus size={18} /> إضافة محتوى
                </button>
            </div>
        </div>
    );
}
