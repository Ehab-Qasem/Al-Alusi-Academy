
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'almanara-secret-key-2026';

const prisma = new PrismaClient();
const app = express();
const PORT = 5000;

// --- MIDDLEWARE ---
app.use(cors()); // Allow all origins for development and network testing
app.use(express.json());

// --- STATIC FILE SERVING (VPS MODE) ---
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}
// Serve files from /uploads url
app.use('/uploads', express.static(uploadsDir));

// --- FILE UPLOAD CONFIG (Multer) ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const forbiddenExts = ['.exe', '.sh', '.php', '.js', '.bat', '.cmd'];
  if (forbiddenExts.includes(ext)) {
    return cb(new Error('هذا النوع من الملفات غير مسموح به لدواعي أمنية'), false);
  }
  cb(null, true);
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 100 * 1024 * 1024 }
});

console.log('🔌 Connecting to Supabase (PostgreSQL)...');
// Prisma connects lazily, but let's check connection
prisma.$connect()
  .then(() => console.log('✅ PostgreSQL Connected Successfully'))
  .catch(err => console.error('❌ Database Connection Error:', err));

// --- HELPER ---
const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// --- ROUTES ---

app.get('/', (req, res) => {
  res.send('Al-Manara LMS Server is Running... 🚀');
});

// --- AUTH MIDDLEWARE ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Unauthorized' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Forbidden' });
    req.user = user;
    next();
  });
};

// Auth Routes
app.post('/api/login', asyncHandler(async (req, res) => {
  const { nationalID, password } = req.body;
  const user = await prisma.user.findUnique({ where: { nationalID }, include: { enrolledCourses: true } });
  
  if (!user) return res.status(401).json({ message: 'بيانات الدخول غير صحيحة' });

  let isMatch = false;
  // If the password starts with $2a$, it's a bcrypt hash
  if (user.password && user.password.startsWith('$2a$')) {
    isMatch = await bcrypt.compare(password, user.password);
  } else {
    // Legacy plain text match
    isMatch = (user.password === password || password === nationalID || password === '123456');
    // We should ideally hash it here and save, but we'll leave it for change-password
  }

  if (!isMatch) return res.status(401).json({ message: 'كلمة المرور غير صحيحة' });

  const token = jwt.sign({ id: user.id, role: user.role, nationalID: user.nationalID }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token, user });
}));

app.post('/api/users/:id/change-password', authenticateToken, asyncHandler(async (req, res) => {
  const { newPassword } = req.body;
  // Make sure the user is changing their own password or is admin
  if (req.user.id !== req.params.id && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { password: hashedPassword, mustChangePassword: false }
  });
  res.json({ message: 'Password updated successfully' });
}));

// User Routes
app.get('/api/users', asyncHandler(async (req, res) => {
  const users = await prisma.user.findMany({
    include: {
      enrolledCourses: true
    }
  });
  res.json(users);
}));

app.post('/api/users', asyncHandler(async (req, res) => {
  const { nationalID } = req.body;

  // Check if exists
  const existing = await prisma.user.findUnique({ where: { nationalID } });
  if (existing) return res.status(400).json({ message: 'User already exists' });

  let hashedPassword = req.body.password;
  if (req.body.password) {
    hashedPassword = await bcrypt.hash(req.body.password, 10);
  } else {
    hashedPassword = await bcrypt.hash(req.body.nationalID, 10);
  }

  const user = await prisma.user.create({
    data: {
      id: req.body.id,
      nationalID: req.body.nationalID,
      fullName: req.body.fullName,
      role: req.body.role || 'student',
      password: hashedPassword,
      gradeLevel: req.body.gradeLevel,
      classSection: req.body.classSection,
      mustChangePassword: !req.body.password, // Force change if using nationalID default
    }
  });
  res.json(user);
}));

app.put('/api/users/:id/enroll', asyncHandler(async (req, res) => {
  const { courseId } = req.body;
  // Update relation
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: {
      enrolledCourses: {
        connect: { id: courseId }
      }
    },
    include: { enrolledCourses: true }
  });
  res.json(user);
}));

app.delete('/api/users/:id', asyncHandler(async (req, res) => {
  await prisma.user.delete({ where: { id: req.params.id } });
  res.json({ message: 'Deleted' });
}));

// Course Routes
app.get('/api/courses', asyncHandler(async (req, res) => {
  const { category, publishedOnly } = req.query;
  const where = {};
  if (category) where.category = category;
  if (publishedOnly === 'true') where.isPublished = true;

  const courses = await prisma.course.findMany({
    where,
    include: { modules: { include: { content: true } } }
  });
  res.json(courses);
}));

app.get('/api/courses/:id', asyncHandler(async (req, res) => {
  const course = await prisma.course.findUnique({
    where: { id: req.params.id },
    include: { modules: { include: { content: true } } }
  });
  if (!course) return res.status(404).json({ message: 'Course not found' });
  res.json(course);
}));

app.post('/api/courses', asyncHandler(async (req, res) => {
  const data = req.body;

  if (data.id && await prisma.course.findUnique({ where: { id: data.id } })) {
    // Update Logic: Transactional Replace
    const { modules, ...courseFields } = data;

      // 1. Update Course Details
      const updated = await prisma.course.update({
        where: { id: data.id },
        data: {
          title: courseFields.title,
          category: courseFields.category,
          subject: courseFields.subject || null,
          description: courseFields.description,
          thumbnail: courseFields.thumbnail,
          isPublished: courseFields.isPublished,
          creatorId: courseFields.creatorId || null,
          certificateTemplateId: courseFields.certificateTemplateId || null,
          congratulationsText: courseFields.congratulationsText || null
        }
      });

      // 2. If modules provided, replace them entirely inside a transaction
      if (modules) {
        await prisma.$transaction(async (tx) => {
          // Delete existing modules (cascades to content)
          await tx.module.deleteMany({ where: { courseId: data.id } });

          // Re-create modules and content with preserved IDs
          for (const m of modules) {
            await tx.module.create({
              data: {
                id: m.id || undefined, // Preserve ID if exists
                title: m.title,
                courseId: data.id,
                content: {
                  create: (m.content || []).map(c => ({
                    id: c.id || undefined, // Preserve ID if exists
                    title: c.title || 'Untitled',
                    type: c.type || 'video',
                    url: c.url || null,
                    duration: parseInt(c.duration) || 0,
                    quizId: c.quizId || null,
                    questions: Array.isArray(c.questions) ? c.questions : [],
                    passingScore: parseInt(c.passingScore) || null,
                    content: c.content || null
                  }))
                }
              }
            });
          }
        }, {
          maxWait: 5000, // default is 2000
          timeout: 20000, // increase timeout to 20 seconds
        });
      }

    // Return full tree
    const fullCourse = await prisma.course.findUnique({
      where: { id: data.id },
      include: { modules: { include: { content: true } } }
    });
    res.json(fullCourse);

  } else {
    // Create Logic
    const { modules, ...courseFields } = data;
    const course = await prisma.course.create({
      data: {
        id: data.id,
        title: courseFields.title,
        category: courseFields.category,
        subject: courseFields.subject || null,
        description: courseFields.description,
        thumbnail: courseFields.thumbnail,
        isPublished: courseFields.isPublished,
        creatorId: courseFields.creatorId || null,
        certificateTemplateId: courseFields.certificateTemplateId || null,
        congratulationsText: courseFields.congratulationsText || null,
        modules: modules ? {
          create: modules.map(m => ({
            id: m.id || undefined,
            title: m.title,
            content: {
              create: (m.content || []).map(c => ({
                id: c.id || undefined,
                title: c.title || 'Untitled',
                type: c.type || 'video',
                url: c.url || null,
                duration: parseInt(c.duration) || 0,
                quizId: c.quizId || null,
                questions: Array.isArray(c.questions) ? c.questions : [],
                passingScore: parseInt(c.passingScore) || null,
                content: c.content || null
              }))
            }
          }))
        } : undefined
      },
      include: { modules: { include: { content: true } } }
    });
    res.json(course);
  }
}));

app.delete('/api/courses/:id', asyncHandler(async (req, res) => {
  await prisma.course.delete({ where: { id: req.params.id } });
  res.json({ message: 'Deleted' });
}));

// Question Routes
app.get('/api/questions', asyncHandler(async (req, res) => {
  const questions = await prisma.question.findMany();
  res.json(questions);
}));

app.post('/api/questions/:id', asyncHandler(async (req, res) => {
  const data = req.body;
  const q = await prisma.question.update({
    where: { id: req.params.id },
    data: { ...data, id: undefined }
  });
  res.json(q);
}));

app.post('/api/questions', asyncHandler(async (req, res) => {
  const data = req.body;
  if (data.id && await prisma.question.findUnique({ where: { id: data.id } })) {
    const q = await prisma.question.update({
      where: { id: data.id },
      data: { ...data, id: undefined }
    });
    res.json(q);
  } else {
    const q = await prisma.question.create({ data });
    res.json(q);
  }
}));

app.delete('/api/questions/:id', asyncHandler(async (req, res) => {
  await prisma.question.delete({ where: { id: req.params.id } });
  res.json({ message: 'Deleted' });
}));

// Exam Routes
app.get('/api/exams', asyncHandler(async (req, res) => {
  const exams = await prisma.exam.findMany({
    include: { sections: true }
  });
  res.json(exams);
}));

app.get('/api/exams/:id', asyncHandler(async (req, res) => {
  const exam = await prisma.exam.findUnique({
    where: { id: req.params.id },
    include: { sections: true }
  });
  res.json(exam);
}));

app.post('/api/exams', asyncHandler(async (req, res) => {
  const data = req.body;

  if (data.id && await prisma.exam.findUnique({ where: { id: data.id } })) {
    const { id: _, createdAt: __, updatedAt: ___, sections, ...fields } = data;
    await prisma.examSection.deleteMany({ where: { examId: data.id } });

    const sectionsToCreate = sections ? sections.map(s => {
      const { id, examId, ...rest } = s;
      return rest;
    }) : [];

    const exam = await prisma.exam.update({
      where: { id: data.id },
      data: {
        ...fields,
        sections: {
          create: sectionsToCreate
        }
      },
      include: { sections: true }
    });
    res.json(exam);
  } else {
    const { id: _, createdAt: __, updatedAt: ___, sections, ...fields } = data;
    
    const sectionsToCreate = sections ? sections.map(s => {
      const { id, examId, ...rest } = s;
      return rest;
    }) : [];

    const exam = await prisma.exam.create({
      data: {
        ...fields,
        sections: {
          create: sectionsToCreate
        }
      },
      include: { sections: true }
    });
    res.json(exam);
  }
}));

app.delete('/api/exams/:id', asyncHandler(async (req, res) => {
  await prisma.exam.delete({ where: { id: req.params.id } });
  res.json({ message: 'Deleted' });
}));

// Progress Routes
app.get('/api/progress/:userId/:courseId', asyncHandler(async (req, res) => {
  const { userId, courseId } = req.params;
  const progress = await prisma.studentProgress.findUnique({
    where: {
      userId_courseId: {
        userId,
        courseId
      }
    }
  });
  res.json(progress || { userId, courseId, completedItems: [] });
}));

app.post('/api/progress', asyncHandler(async (req, res) => {
  const { userId, courseId, completedItems, videoProgress, quizScores } = req.body;
  const progress = await prisma.studentProgress.upsert({
    where: {
      userId_courseId: { userId, courseId }
    },
    update: {
      completedItems,
      videoProgress,
      quizScores,
      lastAccessed: new Date()
    },
    create: {
      userId,
      courseId,
      completedItems,
      videoProgress,
      quizScores
    }
  });
  res.json(progress);
}));


// Result Routes
app.get('/api/results', asyncHandler(async (req, res) => {
  const results = await prisma.examResult.findMany();
  res.json(results);
}));

app.get('/api/results/:userId', asyncHandler(async (req, res) => {
  const results = await prisma.examResult.findMany({
    where: { userId: req.params.userId }
  });
  res.json(results);
}));

app.post('/api/results', asyncHandler(async (req, res) => {
  // Ensure we connect using real relations if possible, or just raw IDs
  // Prisma schema expects userId as foreign key to User
  // If user is "Guest" (no userId), handle nullable
  const result = await prisma.examResult.create({
    data: req.body
  });
  res.json(result);
}));

// --- SCHOOL STRUCTURE (GRADES) ROUTES ---

app.get('/api/grades', asyncHandler(async (req, res) => {
  const grades = await prisma.schoolGrade.findMany();
  res.json(grades);
}));

app.post('/api/grades', asyncHandler(async (req, res) => {
  const data = req.body;
  // Upsert logic
  if (data.id && await prisma.schoolGrade.findUnique({ where: { id: data.id } })) {
    const grade = await prisma.schoolGrade.update({
      where: { id: data.id },
      data: {
        name: data.name,
        uniqueCode: data.uniqueCode,
        sections: data.sections
      }
    });
    res.json(grade);
  } else {
    const grade = await prisma.schoolGrade.create({
      data: {
        id: data.id, // Optional, let Prisma generate if missing, but we often pass IDs from frontend
        name: data.name,
        uniqueCode: data.uniqueCode,
        sections: data.sections
      }
    });
    res.json(grade);
  }
}));

app.delete('/api/grades/:id', asyncHandler(async (req, res) => {
  await prisma.schoolGrade.delete({ where: { id: req.params.id } });
  res.json({ message: 'Deleted' });
}));

// --- CERTIFICATE TEMPLATE ROUTES ---

app.get('/api/certificate-templates', asyncHandler(async (req, res) => {
  const templates = await prisma.certificateTemplate.findMany();
  res.json(templates);
}));

app.post('/api/certificate-templates', asyncHandler(async (req, res) => {
  const data = req.body;

  // Upsert
  if (data.id && await prisma.certificateTemplate.findUnique({ where: { id: data.id } })) {
    const tpl = await prisma.certificateTemplate.update({
      where: { id: data.id },
      data: {
        name: data.name,
        category: data.category,
        backgroundImage: data.backgroundImage,
        elements: data.elements,
        isDefault: data.isDefault,
        widthMm: data.widthMm,
        heightMm: data.heightMm,
        bgFilters: data.bgFilters
      }
    });
    res.json(tpl);
  } else {
    const tpl = await prisma.certificateTemplate.create({
      data: {
        id: data.id,
        name: data.name,
        category: data.category,
        backgroundImage: data.backgroundImage || '',
        elements: data.elements || [],
        isDefault: data.isDefault,
        widthMm: data.widthMm,
        heightMm: data.heightMm,
        bgFilters: data.bgFilters
      }
    });
    res.json(tpl);
  }
}));

app.delete('/api/certificate-templates/:id', asyncHandler(async (req, res) => {
  await prisma.certificateTemplate.delete({ where: { id: req.params.id } });
  res.json({ message: 'Deleted' });
}));

// --- STUDENT CERTIFICATES ---

app.post('/api/student-certificates', asyncHandler(async (req, res) => {
  const data = req.body;
  const cert = await prisma.studentCertificate.create({
    data: {
      userId: data.userId,
      templateId: data.templateId,
      issueDate: new Date(),
      metadata: data.metadata || {}
    }
  });
  res.json(cert);
}));

app.get('/api/student-certificates/:userId', asyncHandler(async (req, res) => {
  const certs = await prisma.studentCertificate.findMany({
    where: { userId: req.params.userId }
  });
  res.json(certs);
}));

app.post('/api/student-certificates', asyncHandler(async (req, res) => {
  const data = req.body;
  // Upsert
  if (data.id && await prisma.studentCertificate.findUnique({ where: { id: data.id } })) {
    const cert = await prisma.studentCertificate.update({
      where: { id: data.id },
      data: {
        studentId: data.studentId,
        templateId: data.templateId,
        issueDate: data.issueDate,
        metadata: data.metadata
      }
    });
    res.json(cert);
  } else {
    const cert = await prisma.studentCertificate.create({
      data: {
        id: data.id,
        studentId: data.studentId,
        templateId: data.templateId, // Ensure relation exists or handle string ID if not strict relation
        issueDate: data.issueDate,
        metadata: data.metadata
      }
    });
    res.json(cert);
  }
}));

// --- NOTIFICATION ROUTES ---

app.get('/api/notifications', asyncHandler(async (req, res) => {
  const { userId, targetRole } = req.query;
  const whereClaus = {
    OR: [
      { receiverId: userId },
      { targetRole: targetRole }
    ]
  };
  const notifications = await prisma.notification.findMany({
    where: whereClaus,
    orderBy: { createdAt: 'desc' }
  });
  res.json(notifications);
}));

app.post('/api/notifications', asyncHandler(async (req, res) => {
  const data = req.body;
  const notification = await prisma.notification.create({
    data
  });
  res.json(notification);
}));

app.put('/api/notifications/:id/read', asyncHandler(async (req, res) => {
  const notification = await prisma.notification.update({
    where: { id: req.params.id },
    data: { isRead: true }
  });
  res.json(notification);
}));

app.post('/api/notifications/:id/approve-reset', asyncHandler(async (req, res) => {
  const { requesterId } = req.body;
  
  // 1. Force student to change password
  await prisma.user.update({
    where: { id: requesterId },
    data: { mustChangePassword: true }
  });

  // 2. Mark this notification as approved
  const notification = await prisma.notification.update({
    where: { id: req.params.id },
    data: { 
      actionData: { status: 'approved' },
      isRead: true
    }
  });

  // 3. Optional: Create notification for student
  await prisma.notification.create({
    data: {
      receiverId: requesterId,
      title: 'تمت الموافقة',
      message: 'المدير وافق على طلب إعادة تعيين كلمة المرور. يرجى تسجيل الدخول مرة أخرى لتغييرها.',
      type: 'general'
    }
  });

  res.json(notification);
}));

app.post('/api/notifications/:id/reject-reset', asyncHandler(async (req, res) => {
  const { requesterId } = req.body;
  
  // 1. Mark this notification as rejected
  const notification = await prisma.notification.update({
    where: { id: req.params.id },
    data: { 
      actionData: { status: 'rejected' },
      isRead: true
    }
  });

  // 2. Optional: Create notification for student
  await prisma.notification.create({
    data: {
      receiverId: requesterId,
      title: 'طلب مرفوض',
      message: 'المدير لم يوافق على طلب إعادة تعيين كلمة المرور.',
      type: 'general'
    }
  });

  res.json(notification);
}));

// --- EXTENDED USER ROUTES (UPDATE) ---

app.post('/api/users/:id', asyncHandler(async (req, res) => {
  // Using POST for update to match mockBackend's `postAPI('/users/${user.id}', user)`
  // Express treats this as a distinct route.
  const { id } = req.params;
  const data = req.body;

  const user = await prisma.user.update({
    where: { id },
    data: {
      fullName: data.fullName,
      nationalID: data.nationalID,
      password: data.password,
      role: data.role,
      gradeLevel: data.gradeLevel,
      classSection: data.classSection,
      mustChangePassword: data.mustChangePassword
    }
  });
  res.json(user);
}));

// File Upload Endpoint
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({ url: fileUrl, type: req.file.mimetype });
});

app.use((err, req, res, next) => {
  console.error('SERVER ERROR:', err);
  res.status(500).json({ message: 'Internal Server Error', error: err.message });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
