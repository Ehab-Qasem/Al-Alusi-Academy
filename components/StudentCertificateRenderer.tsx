import React from 'react';
import { CertificateTemplate, CertificateElement } from '../types';

interface StudentCertificateRendererProps {
    template: CertificateTemplate;
    data: {
        studentName: string;
        date: string;
        score: string;
        examTitle?: string;
        courseTitle?: string;
        grade?: string;
        qrCodeUrl?: string;
    };
    scale?: number;
    id?: string;
}

const MM_TO_PX = 3.7795275591;

export const StudentCertificateRenderer: React.FC<StudentCertificateRendererProps> = ({
    template,
    data,
    scale = 1,
    id = 'certificate-print-node'
}) => {

    const widthPx = template.widthMm * MM_TO_PX * scale;
    const heightPx = template.heightMm * MM_TO_PX * scale;

    const resolveText = (el: CertificateElement) => {
        let text = el.text || el.htmlContent || '';

        // Simple replacements
        text = text.replace('{الطالب}', data.studentName)
            .replace('{التاريخ}', data.date)
            .replace('{الدرجة}', data.score)
            .replace('{الاختبار}', data.examTitle || '')
            .replace('{الدورة}', data.courseTitle || '')
            .replace('{التقدير}', data.grade || '');

        // Specific placeholders based on element type
        if (el.type === 'studentName') return data.studentName;
        if (el.type === 'examTitle') return data.examTitle || '';
        if (el.type === 'courseTitle') return data.courseTitle || '';
        if (el.type === 'score') return data.score;
        if (el.type === 'date') return data.date;
        if (el.type === 'qrCode') return ''; // Handled by image src usually, or special render

        return text;
    };

    return (
        <div
            id={id}
            style={{
                position: 'relative',
                width: widthPx,
                height: heightPx,
                backgroundColor: 'white',
                backgroundImage: template.backgroundImage ? `url(${template.backgroundImage})` : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                filter: template.bgFilters ? `brightness(${template.bgFilters.brightness}%) contrast(${template.bgFilters.contrast}%) opacity(${template.bgFilters.opacity}%)` : 'none',
                overflow: 'hidden',
                direction: 'rtl' // Default to RTL for Arabic
            }}
        >
            {/* Font Loader - In real app, ensure fonts are loaded globally or here */}
            <style>
                {`@import url('https://fonts.googleapis.com/css2?family=Almarai:wght@300;400;700&family=Amiri:ital,wght@0,400;0,700;1,400&family=Cairo:wght@300;400;700&family=Changa:wght@300;400;700&family=El+Messiri:wght@400;700&family=IBM+Plex+Sans+Arabic:wght@300;400;700&family=Lateef&family=Reem+Kufi:wght@400;700&family=Scheherazade+New:wght@400;700&family=Tajawal:wght@300;400;700&display=swap');`}
            </style>

            {template.elements.map(el => {
                if (el.isHidden) return null;

                const isImage = el.type === 'image';
                const isQR = el.type === 'qrCode';
                const content = resolveText(el);

                return (
                    <div
                        key={el.id}
                        style={{
                            position: 'absolute',
                            left: `${el.x}%`,
                            top: `${el.y}%`,
                            transform: `translate(-50%, -50%) rotate(${el.rotation || 0}deg) scale(${scale})`, // Scale content as well? No, outer div is scaled. Wait.
                            // If we scale the outer div dimensions, % positions stay relative correctly. 
                            // But font sizes need to be scaled if we use PX.
                            // Better approach: Keep width/height constant, and use CSS transform scale on a wrapper for valid PDF resolution
                            // OR: Multiply all pixel values by scale.

                            width: el.width ? `${el.width * scale}px` : 'auto',
                            minWidth: 'max-content',
                            textAlign: el.align,
                            fontFamily: el.fontFamily,
                            fontSize: `${el.fontSize * scale}px`,
                            color: el.color,
                            fontWeight: el.fontWeight,
                            opacity: el.opacity,
                            whiteSpace: 'pre-wrap',
                            zIndex: 10
                        }}
                    >
                        {isImage ? (
                            <img src={el.src} alt="img" style={{ width: '100%', height: 'auto', display: 'block' }} />
                        ) : isQR ? (
                            // Use API or lib for QR. For now, placeholder image if no real QR gen
                            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(data.qrCodeUrl || 'https://almanara.com')}`} alt="QR" style={{ width: '100%', height: 'auto' }} />
                        ) : (
                            <div dangerouslySetInnerHTML={{ __html: content }} />
                        )}
                    </div>
                );
            })}
        </div>
    );
};
