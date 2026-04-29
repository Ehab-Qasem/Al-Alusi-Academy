
import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ContentItem, ContentType } from '../../types';
import { Trash2, GripVertical, Video, FileText, Image as ImageIcon, HelpCircle, Pencil } from 'lucide-react';

interface SortableContentItemProps {
    item: ContentItem;
    moduleId: string;
    deleteContent: (moduleId: string, contentId: string) => void;
    onEdit: (moduleId: string, item: ContentItem) => void;
}

export const SortableContentItem = ({ item, moduleId, deleteContent, onEdit }: SortableContentItemProps) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: item.id, data: { type: 'CONTENT', item, moduleId } });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl hover:border-primary-300 dark:hover:border-primary-700 transition group">
            <div {...attributes} {...listeners} className="cursor-grab text-gray-300 hover:text-gray-500 dark:hover:text-gray-200">
                <GripVertical size={16} />
            </div>
            <div className={`p-2 rounded-lg ${item.type === ContentType.VIDEO ? 'bg-red-50 text-red-500' :
                item.type === ContentType.PDF ? 'bg-blue-50 text-blue-500' :
                    item.type === ContentType.QUIZ ? 'bg-green-50 text-green-500' :
                        'bg-purple-50 text-purple-500'
                }`}>
                {item.type === ContentType.VIDEO ? <Video size={18} /> :
                    item.type === ContentType.PDF ? <FileText size={18} /> :
                        item.type === ContentType.QUIZ ? <HelpCircle size={18} /> :
                            <ImageIcon size={18} />}
            </div>
            <div className="flex-1 font-medium dark:text-gray-200">
                {item.title}
                {item.type === ContentType.QUIZ && <span className="text-xs text-gray-400 mr-2">({item.questions?.length || 0} أسئلة)</span>}
            </div>
            <div className="text-xs text-gray-400 dark:text-gray-500 hidden md:block">
                {item.type === ContentType.IMAGE ? 'معرض صور' :
                    item.type === ContentType.VIDEO ? 'فيديو' :
                        item.type === ContentType.QUIZ ? 'اختبار' : 'ملف PDF'}
            </div>
            <div className="flex items-center gap-1">
                <button onClick={() => onEdit(moduleId, item)} className="p-2 text-gray-300 hover:text-primary-500 transition">
                    <Pencil size={16} />
                </button>
                <button onClick={() => deleteContent(moduleId, item.id)} className="p-2 text-gray-300 hover:text-red-500 transition">
                    <Trash2 size={16} />
                </button>
            </div>
        </div>
    );
}
