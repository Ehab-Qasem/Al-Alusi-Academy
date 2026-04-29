
import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, FileText, Video, Image as ImageIcon, CheckCircle2, AlertCircle } from 'lucide-react';
import { uploadFile } from '../../services/uploadService';
import { ContentItem, ContentType } from '../../types';

interface Props {
    onUploadComplete: (newItems: ContentItem[]) => void;
}

interface UploadingFile {
    file: File;
    progress: number;
    status: 'pending' | 'uploading' | 'completed' | 'error';
    url?: string;
    error?: string;
}

export function BulkUploadDropzone({ onUploadComplete }: Props) {
    const [uploads, setUploads] = useState<UploadingFile[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        const newUploads = acceptedFiles.map(file => ({
            file,
            progress: 0,
            status: 'pending'
        } as UploadingFile));

        setUploads(prev => [...prev, ...newUploads]);
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

    const processUploads = async () => {
        setIsProcessing(true);
        const completedItems: ContentItem[] = [];

        // Clone current uploads to update state
        let currentUploads = [...uploads];

        for (let i = 0; i < currentUploads.length; i++) {
            const upload = currentUploads[i];
            if (upload.status === 'completed') continue; // Skip already done

            // Mark as uploading
            upload.status = 'uploading';
            setUploads([...currentUploads]);

            try {
                const url = await uploadFile(upload.file);
                upload.status = 'completed';
                upload.url = url;
                upload.progress = 100;

                // Create Content Item
                const type = getContentType(upload.file.type);
                completedItems.push({
                    id: `cnt_${Date.now()}_${i}`,
                    title: upload.file.name.split('.')[0], // Use filename as title
                    type: type,
                    url: url,
                    questions: [],
                    passingScore: 60
                });

            } catch (error) {
                upload.status = 'error';
                upload.error = 'فشل الرفع';
            }
            setUploads([...currentUploads]);
        }

        setIsProcessing(false);
        if (completedItems.length > 0) {
            onUploadComplete(completedItems);
            // Clear completed uploads from list after short delay?
            // Or keep them to show success? Let's keep them and let user clear or close modal.
        }
    };

    const removeUpload = (index: number) => {
        setUploads(prev => prev.filter((_, i) => i !== index));
    };

    const getContentType = (mimeType: string): ContentType => {
        if (mimeType.startsWith('video/')) return ContentType.VIDEO;
        if (mimeType.startsWith('image/')) return ContentType.IMAGE;
        if (mimeType === 'application/pdf') return ContentType.PDF;
        return ContentType.PDF; // Default fallback
    };

    return (
        <div className="space-y-4">
            {/* Dropzone Area */}
            <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${isDragActive ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-300 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800'
                    }`}
            >
                <input {...getInputProps()} />
                <Upload className={`mx-auto mb-3 ${isDragActive ? 'text-primary-500' : 'text-gray-400'}`} size={40} />
                {isDragActive ? (
                    <p className="text-primary-600 font-bold">أفلت الملفات هنا...</p>
                ) : (
                    <div>
                        <p className="text-gray-600 dark:text-gray-300 font-bold text-lg">سحب وإفلات الملفات هنا</p>
                        <p className="text-gray-400 text-sm mt-1">أو اضغط لاختيار ملفات متعددة (فيديو، صور، PDF)</p>
                    </div>
                )}
            </div>

            {/* Upload List */}
            {uploads.length > 0 && (
                <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-4 border dark:border-slate-800 max-h-60 overflow-y-auto custom-scrollbar">
                    <div className="flex justify-between items-center mb-2">
                        <h4 className="font-bold text-sm dark:text-gray-300">الملفات المختارة ({uploads.length})</h4>
                        <button
                            onClick={() => setUploads([])}
                            className="text-xs text-red-500 hover:underline"
                        >
                            حذف الكل
                        </button>
                    </div>

                    <div className="space-y-2">
                        {uploads.map((upload, idx) => (
                            <div key={idx} className="flex items-center gap-3 bg-white dark:bg-slate-800 p-2 rounded-lg border dark:border-slate-700">
                                <div className="p-2 bg-gray-100 dark:bg-slate-700 rounded-lg">
                                    {upload.file.type.startsWith('video/') ? <Video size={16} /> :
                                        upload.file.type.startsWith('image/') ? <ImageIcon size={16} /> :
                                            <FileText size={16} />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate dark:text-white">{upload.file.name}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${upload.status === 'completed' ? 'bg-green-100 text-green-700' :
                                                upload.status === 'error' ? 'bg-red-100 text-red-700' :
                                                    upload.status === 'uploading' ? 'bg-blue-100 text-blue-700' :
                                                        'bg-gray-100 text-gray-500'
                                            }`}>
                                            {upload.status === 'completed' ? 'تم الرفع' :
                                                upload.status === 'error' ? 'فشل' :
                                                    upload.status === 'uploading' ? 'جاري الرفع...' :
                                                        'انتظار'}
                                        </span>
                                        {upload.status === 'error' && <span className="text-xs text-red-500">{upload.error}</span>}
                                    </div>
                                </div>
                                {upload.status === 'pending' && (
                                    <button onClick={() => removeUpload(idx)} className="text-gray-400 hover:text-red-500 p-1">
                                        <X size={16} />
                                    </button>
                                )}
                                {upload.status === 'completed' && <CheckCircle2 className="text-green-500" size={18} />}
                                {upload.status === 'error' && <AlertCircle className="text-red-500" size={18} />}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Action Buttons */}
            {uploads.length > 0 && (
                <button
                    onClick={processUploads}
                    disabled={isProcessing || uploads.every(u => u.status === 'completed')}
                    className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition ${isProcessing || uploads.every(u => u.status === 'completed')
                            ? 'bg-gray-300 dark:bg-slate-700 text-gray-500 cursor-not-allowed'
                            : 'bg-primary-600 text-white hover:bg-primary-700 shadow-md hover:-translate-y-0.5'
                        }`}
                >
                    {isProcessing ? (
                        <>
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            جاري المعالجة...
                        </>
                    ) : (
                        <>
                            <Upload size={20} />
                            رفع وإنشاء الدروس ({uploads.filter(u => u.status === 'pending').length})
                        </>
                    )}
                </button>
            )}
        </div>
    );
}
