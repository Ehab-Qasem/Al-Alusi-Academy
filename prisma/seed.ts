
import { PrismaClient, UserRole, CourseCategory, Subject, ContentType } from '@prisma/client';

import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting Seeding...');
    console.log('DEBUG: SEED URL:', process.env.DATABASE_URL ? 'Loaded (len=' + process.env.DATABASE_URL.length + ')' : 'MISSING');


    // --- 1. Seed Users ---
    const adminPassword = await bcrypt.hash('1', 10);
    const adminUser = await prisma.user.upsert({
        where: { nationalID: '1' },
        update: {},
        create: {
            nationalID: '1',
            fullName: 'المدير العام',
            role: UserRole.admin,
            password: adminPassword,
            mustChangePassword: false,
        },
    });
    console.log('👤 Admin user created/verified');

    // --- 2. Seed Questions ---
    const q1 = await prisma.question.create({
        data: {
            text: 'ما ناتج 1/2 + 1/4؟',
            options: ['3/4', '1/2', '1/8', '1'],
            correctOption: 0,
            subject: 'Math', // Using string for now as per schema or enum? Schema uses String, let's check
            difficulty: 'easy',
            explanation: 'نوحد المقامات: 2/4 + 1/4 = 3/4',
        }
    });

    const q2 = await prisma.question.create({
        data: {
            text: 'عاصمة المملكة العربية السعودية هي:',
            options: ['جدة', 'الرياض', 'الدمام', 'مكة'],
            correctOption: 1,
            subject: 'Verbal',
            difficulty: 'easy'
        }
    });

    const q3 = await prisma.question.create({
        data: {
            text: 'إذا كان س + 5 = 10، فما قيمة س؟',
            options: ['2', '15', '5', '50'],
            correctOption: 2,
            subject: 'Math',
            difficulty: 'medium',
            explanation: 'ننقل 5 للطرف الآخر بإشارة مخالفة: س = 10 - 5 = 5'
        }
    });
    console.log('❓ Questions seeded');

    // --- 3. Seed Courses ---
    const course1 = await prisma.course.create({
        data: {
            title: 'تأسيس القدرات (الكمي)',
            category: CourseCategory.qudurat_quant,
            subject: Subject.Quant,
            description: 'دورة شاملة لتأسيس مهارات الرياضيات.',
            thumbnail: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb',
            isPublished: true,
            modules: {
                create: [
                    {
                        title: 'العمليات الحسابية',
                        content: {
                            create: [
                                { title: 'الجمع والطرح الذهني', type: ContentType.video, url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', duration: 15 },
                                { title: 'ملزمة التأسيس', type: ContentType.pdf, url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' }
                            ]
                        }
                    }
                ]
            }
        }
    });
    console.log('📚 Courses seeded');

    // --- 4. Seed Exams ---
    const exam1 = await prisma.exam.create({
        data: {
            title: 'اختبار قدرات تجريبي (1)',
            duration: 60,
            passingScore: 60,
            isPublic: true,
            type: 'simulation',
            category: CourseCategory.qudurat_quant,
            sections: {
                create: [
                    { title: 'القسم الكمي', duration: 25, questionIds: [q1.id, q3.id] },
                    { title: 'القسم اللفظي', duration: 25, questionIds: [q2.id] }
                ]
            }
        }
    });
    console.log('📝 Exams seeded');

    // --- 5. Certificate Templates ---
    await prisma.certificateTemplate.create({
        data: {
            name: 'الافتراضي (الذهبي)',
            category: 'exam',
            isDefault: true,
            backgroundImage: '', // Use a placeholder or real link
            elements: [
                { id: 'e1', type: 'staticText', label: 'عنوان', text: 'شهادة إتمام', x: 50, y: 15, fontSize: 40, color: '#d97706', fontWeight: 'bold', align: 'center', fontFamily: 'Tajawal' },
                { id: 'e2', type: 'studentName', label: 'اسم الطالب', x: 50, y: 40, fontSize: 30, color: '#000000', fontWeight: 'bold', align: 'center', fontFamily: 'Tajawal' },
                { id: 'e3', type: 'staticText', label: 'نص', text: 'لقد اجتاز بنجاح اختبار:', x: 50, y: 50, fontSize: 18, color: '#4b5563', fontWeight: 'normal', align: 'center', fontFamily: 'Tajawal' },
                { id: 'e4', type: 'examTitle', label: 'اسم الاختبار', x: 50, y: 58, fontSize: 24, color: '#0ea5e9', fontWeight: 'bold', align: 'center', fontFamily: 'Tajawal' },
                { id: 'e5', type: 'staticText', label: 'نص', text: 'بدرجة:', x: 45, y: 70, fontSize: 18, color: '#4b5563', fontWeight: 'normal', align: 'center', fontFamily: 'Tajawal' },
                { id: 'e6', type: 'score', label: 'الدرجة', x: 55, y: 70, fontSize: 24, color: '#16a34a', fontWeight: 'bold', align: 'center', fontFamily: 'Tajawal' },
                { id: 'e7', type: 'date', label: 'التاريخ', x: 85, y: 85, fontSize: 14, color: '#9ca3af', fontWeight: 'normal', align: 'center', fontFamily: 'Tajawal' },
            ]
        }
    });
    console.log('🏆 Certificates seeded');

    console.log('✅ Seeding completed!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
