
import toast from 'react-hot-toast';

export const uploadFile = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) throw new Error('Upload failed');

        const data = await response.json();
        return data.url;
    } catch (error) {
        console.error('Upload Failed:', error);
        toast.error(`فشل رفع الملف ${file.name}. تحقق من الاتصال وحاول مرة أخرى.`, { icon: '❌' });
        throw error;
    }
};
