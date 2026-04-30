import React from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void | Promise<void>;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'info';
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen, onClose, onConfirm, title, message,
    confirmText = 'نعم، متأكد', cancelText = 'إلغاء', type = 'danger'
}) => {
    if (!isOpen || !document.body) return null;

    return createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/70 backdrop-blur-xl animate-fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 dark:border-slate-800 transform transition-all animate-in zoom-in-95 duration-200">
                <div className="p-6 text-center">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${type === 'danger' ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' : 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'}`}>
                        <AlertTriangle size={32} strokeWidth={1.5} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed text-sm">{message}</p>

                    <div className="flex gap-3 justify-center">
                        <button
                            onClick={onClose}
                            className="flex-1 px-5 py-3 rounded-xl font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 transition"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={async () => { await onConfirm(); onClose(); }}
                            className={`flex-1 px-5 py-3 rounded-xl font-bold text-white shadow-lg transition transform hover:-translate-y-0.5 ${type === 'danger' ? 'bg-red-600 hover:bg-red-700 shadow-red-500/30' : 'bg-primary-600 hover:bg-primary-700 shadow-primary-500/30'}`}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};
