import {
  User, Course, Exam, Question, StudentProgress, ExamResult,
  UserRole, CourseCategory, Subject, ContentType, CertificateTemplate, SchoolGrade, StudentCertificate
} from '../types';


// API Configuration
const API_BASE = '/api';

// --- INITIAL MOCK DATA (Seeds) ---
const SEED_QUESTIONS: Question[] = [
  {
    id: 'q1',
    text: 'ما ناتج 1/2 + 1/4؟',
    options: ['3/4', '1/2', '1/8', '1'],
    correctOption: 0,
    subject: Subject.MATH,
    difficulty: 'easy',
    explanation: 'نوحد المقامات: 2/4 + 1/4 = 3/4'
  },
  {
    id: 'q2',
    text: 'عاصمة المملكة العربية السعودية هي:',
    options: ['جدة', 'الرياض', 'الدمام', 'مكة'],
    correctOption: 1,
    subject: Subject.VERBAL,
    difficulty: 'easy'
  },
  {
    id: 'q3',
    text: 'إذا كان س + 5 = 10، فما قيمة س؟',
    options: ['2', '15', '5', '50'],
    correctOption: 2,
    subject: Subject.MATH,
    difficulty: 'medium',
    explanation: 'ننقل 5 للطرف الآخر بإشارة مخالفة: س = 10 - 5 = 5'
  }
];

const SEED_COURSES: Course[] = [
  {
    id: 'c_quant_1',
    title: 'تأسيس القدرات (الكمي)',
    category: CourseCategory.QUDURAT_QUANT,
    subject: Subject.QUANT,
    description: 'دورة شاملة لتأسيس مهارات الرياضيات الأساسية المطلوبة في اختبار القدرات.',
    thumbnail: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800&auto=format&fit=crop',
    isPublished: true,
    isPublic: true,
    modules: [
      {
        id: 'm1',
        title: 'العمليات الحسابية',
        content: [
          { id: 'cnt1', title: 'الجمع والطرح الذهني', type: ContentType.VIDEO, duration: 15, url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
          { id: 'cnt2', title: 'ملزمة التأسيس', type: ContentType.PDF, url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' }
        ]
      }
    ]
  },
  {
    id: 'c_verbal_1',
    title: 'استراتيجيات اللفظي',
    category: CourseCategory.QUDURAT_VERBAL,
    subject: Subject.VERBAL,
    description: 'تعلم كيف تحل التناظر اللفظي واستيعاب المقروء بذكاء وسرعة.',
    thumbnail: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800&auto=format&fit=crop',
    isPublished: true,
    isPublic: false,
    modules: []
  },
  {
    id: 'c_tahsili_bio',
    title: 'التحصيلي - أحياء',
    category: CourseCategory.TAHSILI_BIOLOGY,
    subject: Subject.BIOLOGY,
    description: 'مراجعة شاملة لمنهج الأحياء للمرحلة الثانوية.',
    thumbnail: 'https://images.unsplash.com/photo-1530026405186-ed1f139313f8?w=800&auto=format&fit=crop',
    isPublished: true,
    isPublic: true,
    modules: []
  },
  {
    id: 'c_tahsili_general',
    title: 'تجميعات التحصيلي الشاملة 2025',
    category: CourseCategory.TAHSILI_GENERAL,
    subject: Subject.MATH,
    description: 'تجميعات ومراجعات عامة لجميع مواد التحصيلي.',
    thumbnail: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&auto=format&fit=crop',
    isPublished: true,
    isPublic: true,
    modules: []
  }
];

const SEED_EXAMS: Exam[] = [
  {
    id: 'ex1',
    title: 'اختبار قدرات تجريبي (1)',
    duration: 60,
    passingScore: 60,
    isPublic: true,
    type: 'simulation',
    category: CourseCategory.QUDURAT_QUANT,
    sections: [
      { id: 's1', title: 'القسم الكمي', duration: 25, questionIds: ['q1', 'q3'] },
      { id: 's2', title: 'القسم اللفظي', duration: 25, questionIds: ['q2'] }
    ]
  },
  {
    id: 'ex2',
    title: 'اختبار تحديد مستوى (قصير)',
    duration: 15,
    passingScore: 50,
    isPublic: true,
    type: 'practice',
    category: CourseCategory.QUDURAT_QUANT,
    sections: [
      { id: 's1', title: 'عام', duration: 15, questionIds: ['q1', 'q2', 'q3'] }
    ]
  }
];

const SEED_USERS: User[] = [
  {
    id: 'admin_1',
    nationalID: '1',
    fullName: 'المدير العام',
    role: UserRole.ADMIN,
    password: '1', // Stored for local auth
    enrolledCourses: []
  }
];

const SEED_TEMPLATES: CertificateTemplate[] = [
  {
    id: 'tpl_default',
    name: 'الافتراضي (الذهبي)',
    category: 'exam',
    isDefault: true,
    backgroundImage: '',
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
];

const SEED_GRADES: SchoolGrade[] = [
  { id: 'g1', name: 'أول ثانوي', uniqueCode: '1', sections: ['شعبة 1', 'شعبة 2'] },
  { id: 'g2', name: 'ثاني ثانوي', uniqueCode: '2', sections: ['شعبة 1', 'شعبة 2'] },
  { id: 'g3', name: 'ثالث ثانوي', uniqueCode: '3', sections: ['شعبة 1', 'شعبة 2', 'شعبة 3'] },
];

// --- HYBRID STORE SERVICE ---

class MockBackendService {
  private users: User[] = [];
  private courses: Course[] = [];
  private exams: Exam[] = [];
  private questions: Question[] = [];
  private results: ExamResult[] = [];
  private progress: Record<string, StudentProgress> = {};
  private certTemplates: CertificateTemplate[] = [];
  private schoolGrades: SchoolGrade[] = [];
  private studentCertificates: StudentCertificate[] = [];

  constructor() {
    // We defer loading to init()
  }

  private OFFLINE_MODE = false; // Set to false to use real backend (Prisma/Supabase)

  // --- API HELPERS (Modified for Offline Support) ---
  private async fetchAPI<T>(endpoint: string): Promise<T | null> {
    if (this.OFFLINE_MODE) return null; // Skip fetch in offline mode
    try {
      const res = await fetch(`${API_BASE}${endpoint}`);
      if (!res.ok) throw new Error(res.statusText);
      return await res.json();
    } catch (e) {
      console.warn(`API Fetch Failed for ${endpoint}, falling back to empty.`, e);
      return null;
    }
  }

  private async postAPI<T = any>(endpoint: string, data: any): Promise<T | null> {
    if (this.OFFLINE_MODE) return null;
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(errBody.message || errBody.error || `Server error ${res.status}`);
    }
    return await res.json();
  }

  private async putAPI<T = any>(endpoint: string, data: any): Promise<T | null> {
    if (this.OFFLINE_MODE) return null;
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(errBody.message || errBody.error || `Server error ${res.status}`);
    }
    return await res.json();
  }

  private async deleteAPI(endpoint: string) {
    if (this.OFFLINE_MODE) return;
    const res = await fetch(`${API_BASE}${endpoint}`, { method: 'DELETE' });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(errBody.message || errBody.error || `Server error ${res.status}`);
    }
  }

  // --- LOCAL STORAGE HELPERS ---
  private loadFromLS<T>(key: string): T | null {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  }

  private saveToLS(key: string, data: any) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  private persistAll() {
    // Always persist to LS as backup/cache
    this.saveToLS('almanara_users', this.users);
    this.saveToLS('almanara_courses', this.courses);
    this.saveToLS('almanara_exams', this.exams);
    this.saveToLS('almanara_questions', this.questions);
    this.saveToLS('almanara_progress', this.progress);
    this.saveToLS('almanara_results', this.results);
    this.saveToLS('almanara_templates', this.certTemplates);
    this.saveToLS('almanara_grades', this.schoolGrades);
    this.saveToLS('almanara_student_certs', this.studentCertificates);
  }

  // --- INITIALIZATION ---

  async init() {
    // 1. Always load from LS first to ensure we have data if backend is empty/down
    this.users = this.loadFromLS<User[]>('almanara_users') || [];
    this.courses = this.loadFromLS<Course[]>('almanara_courses') || [];
    this.exams = this.loadFromLS<Exam[]>('almanara_exams') || [];
    this.questions = this.loadFromLS<Question[]>('almanara_questions') || [];
    this.progress = this.loadFromLS<Record<string, StudentProgress>>('almanara_progress') || {};
    this.results = this.loadFromLS<ExamResult[]>('almanara_results') || [];
    this.certTemplates = this.loadFromLS<CertificateTemplate[]>('almanara_templates') || [];
    this.schoolGrades = this.loadFromLS<SchoolGrade[]>('almanara_grades') || [];
    this.studentCertificates = this.loadFromLS<StudentCertificate[]>('almanara_student_certs') || [];

    if (this.OFFLINE_MODE) {
      console.log("🔸 Running in OFFLINE MODE (LocalStorage)");
      return true;
    }

    try {
      console.log("🌐 Connecting to Backend (Prisma)...");
      // Parallel Fetch
      const [users, courses, exams, questions, grades, templates, studentCerts, results] = await Promise.all([
        this.fetchAPI<User[]>('/users'),
        this.fetchAPI<Course[]>('/courses'),
        this.fetchAPI<Exam[]>('/exams'),
        this.fetchAPI<Question[]>('/questions'),
        this.fetchAPI<SchoolGrade[]>('/grades'),
        this.fetchAPI<CertificateTemplate[]>('/certificate-templates'),
        this.fetchAPI<StudentCertificate[]>('/student-certificates'),
        this.fetchAPI<ExamResult[]>('/results'),
      ]);

      // Only overwrite local data if backend returns valid data
      if (users && users.length > 0) this.users = users;
      if (courses && courses.length > 0) {
        this.courses = courses.map(c => {
          if (c.thumbnail?.startsWith('META:')) {
            try {
              const meta = JSON.parse(c.thumbnail.substring(5));
              c.thumbnail = meta.thumbnail || '';
              c.isPublic = meta.isPublic !== undefined ? meta.isPublic : true;
              c.landingPageConfig = meta.landingPageConfig || undefined;
            } catch (e) {
              console.error("Failed to parse META thumbnail", e);
            }
          }
          return c;
        });
      }
      if (exams && exams.length > 0) this.exams = exams;
      if (questions && questions.length > 0) this.questions = questions;
      if (grades && grades.length > 0) this.schoolGrades = grades;
      if (templates && templates.length > 0) this.certTemplates = templates;
      if (studentCerts && studentCerts.length > 0) this.studentCertificates = studentCerts;
      if (results && results.length > 0) this.results = results;

      // We no longer fallback to seed data to prevent masking real database errors!

      return true;
    } catch (e) {
      console.error("Backend Init Failed", e);
      return false;
    }
  }

  // Removed seedAll() function to prevent dummy data generation

  // --- USER MANAGEMENT ---
  // ... (unchanged methods, relying on persistAll update below) ... 

  // We need to inject persistAll calls into modification methods. 
  // Since I cannot match all methods easily in one block, I will replace the class methods one by one or valid chunks.
  // Actually, replacing proper chunks is better.

  async syncUserData(userId: string) { return true; }
  async syncAllUsers() { return true; }

  getUsers(role?: UserRole) {
    if (role) return this.users.filter(u => u.role === role);
    return this.users;
  }

  createGuestUser(name: string) {
    const id = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const user: User = {
       id,
       nationalID: id, // Dummy fallback
       fullName: name,
       role: UserRole.GUEST,
       enrolledCourses: []
    };
    this.users.push(user);
    this.persistAll();
    return user;
  }

  async createUser(user: User) {
    if (this.users.find(u => u.nationalID === user.nationalID)) {
      throw new Error('User already exists');
    }
    await this.postAPI('/users', user);
    this.users.push(user);
    this.persistAll();
    return user;
  }

  async updateUser(user: User) {
    const idx = this.users.findIndex(u => u.id === user.id);
    if (idx >= 0) {
      this.users[idx] = { ...this.users[idx], ...user };
      await this.postAPI(`/users/${user.id}`, user);
      this.persistAll();
    }
    return user;
  }

  async deleteUser(userId: string) {
    await this.deleteAPI(`/users/${userId}`);
    this.users = this.users.filter(u => u.id !== userId);
    this.persistAll();
  }

  async enrollUser(userId: string, courseId: string) {
    const user = this.users.find(u => u.id === userId);
    if (user && !user.enrolledCourses.includes(courseId)) {
      user.enrolledCourses.push(courseId);
      await this.putAPI(`/users/${userId}/enroll`, { courseId });
      this.persistAll();
    }
  }

  // --- COURSE MANAGEMENT ---

  getCourses(category?: CourseCategory, publishedOnly = false) {
    let res = this.courses;
    if (category) res = res.filter(c => c.category === category);
    if (publishedOnly) res = res.filter(c => c.isPublished);
    return res;
  }

  getCourse(id: string) {
    return this.courses.find(c => c.id === id);
  }

  async saveCourse(course: Course) {
    const idx = this.courses.findIndex(c => c.id === course.id);
    if (idx >= 0) {
      this.courses[idx] = course;
    } else {
      this.courses.push(course);
    }
    
    // Serialize meta into thumbnail to bypass Prisma Schema limits on old db
    const payload = JSON.parse(JSON.stringify(course));
    payload.thumbnail = "META:" + JSON.stringify({
      thumbnail: course.thumbnail,
      isPublic: course.isPublic ?? true,
      landingPageConfig: course.landingPageConfig
    });
    // Remove injected fields so Prisma doesn't crash
    delete payload.isPublic;
    delete payload.landingPageConfig;

    if (!this.OFFLINE_MODE) {
      try {
        const res = await fetch(`${API_BASE}/courses`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({ message: res.statusText }));
          console.error('Course Save API Error:', errBody);
          this.persistAll(); // Still persist locally as fallback
          throw new Error(errBody.message || errBody.error || `Server error ${res.status}`);
        }
      } catch (e) {
        this.persistAll(); // Persist locally even on network error
        throw e;
      }
    }

    this.persistAll();
    return course;
  }

  async deleteCourse(id: string) {
    await this.deleteAPI(`/courses/${id}`);
    this.courses = this.courses.filter(c => c.id !== id);
    this.persistAll();
  }

  // --- QUESTION BANK ---

  getQuestions() { return this.questions; }

  getQuestionsForExam(examId: string) {
    const exam = this.getExam(examId);
    if (!exam) return [];
    const allQIds: string[] = [];
    exam.sections.forEach(sec => allQIds.push(...sec.questionIds));
    return this.questions.filter(q => allQIds.includes(q.id));
  }

  async createQuestion(q: Question) {
    const newQ = { ...q, id: q.id || `q_${Date.now()}_${Math.random().toString(36).substr(2, 5)}` };
    await this.postAPI('/questions', newQ);
    this.questions.push(newQ);
    this.persistAll();
    return newQ;
  }

  async updateQuestion(id: string, updates: Partial<Question>) {
    const idx = this.questions.findIndex(q => q.id === id);
    if (idx === -1) return null;
    this.questions[idx] = { ...this.questions[idx], ...updates, id };
    await this.postAPI(`/questions/${id}`, this.questions[idx]);
    this.persistAll();
    return this.questions[idx];
  }

  async deleteQuestion(id: string) {
    await this.deleteAPI(`/questions/${id}`);
    this.questions = this.questions.filter(q => q.id !== id);
    this.persistAll();
  }

  // --- EXAM MANAGEMENT ---

  getExams(publicOnly = false) {
    if (publicOnly) return this.exams.filter(e => e.isPublic);
    return this.exams;
  }

  getExam(id: string) {
    return this.exams.find(e => e.id === id);
  }

  async createExam(exam: Partial<Exam>) {
    const newExam = { ...exam, id: `ex_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, sections: exam.sections || [] } as Exam;
    await this.postAPI('/exams', newExam);
    this.exams.push(newExam);
    this.persistAll();
    return newExam;
  }

  async saveExam(exam: Partial<Exam>) {
    if (exam.id) {
      const idx = this.exams.findIndex(e => e.id === exam.id);
      if (idx >= 0) {
        this.exams[idx] = { ...this.exams[idx], ...exam } as Exam;
        await this.postAPI('/exams', this.exams[idx]);
        this.persistAll();
        return this.exams[idx];
      }
    }
    return await this.createExam(exam);
  }

  async deleteExam(id: string) {
    await this.deleteAPI(`/exams/${id}`);
    this.exams = this.exams.filter(e => e.id !== id);
    this.persistAll();
  }

  async duplicateExam(id: string) {
    const original = this.getExam(id);
    if (!original) return null;

    const copy: Exam = {
      ...original,
      id: `ex_${Date.now()}_copy_${Math.random().toString(36).substr(2, 5)}`,
      title: `${original.title} (نسخة)`,
      isPublic: false,
    };

    await this.postAPI('/exams', copy);
    this.exams.push(copy);
    this.persistAll();
    return copy;
  }

  async submitExam(result: ExamResult): Promise<ExamResult> {
    const exam = this.getExam(result.examId);
    if (!exam) throw new Error('Exam not found');

    await this.postAPI(`/results`, result);
    this.results.push(result);
    this.saveToLS('almanara_results', this.results);
    return result;
  }

  // --- PROGRESS TRACKING ---

  getProgress(userId: string, courseId: string): StudentProgress {
    const key = `${userId}_${courseId}`;
    if (!this.progress[key]) {
      this.progress[key] = { userId, courseId, completedItems: [], videoProgress: {}, lastAccessed: new Date().toISOString() };
      if (!this.OFFLINE_MODE) {
        this.fetchAPI<StudentProgress>(`/progress/${userId}/${courseId}`).then(p => {
          if (p) this.progress[key] = p;
        });
      }
    }
    return this.progress[key];
  }

  async markContentComplete(userId: string, courseId: string, contentId: string) {
    const key = `${userId}_${courseId}`;
    if (!this.progress[key]) this.getProgress(userId, courseId);
    if (!this.progress[key].completedItems.includes(contentId)) {
      this.progress[key].completedItems.push(contentId);
      this.progress[key].lastAccessed = new Date().toISOString();
      await this.postAPI('/progress', this.progress[key]);
      this.persistAll();
    }
  }

  async toggleContentCompletion(userId: string, courseId: string, contentId: string): Promise<boolean> {
    const key = `${userId}_${courseId}`;
    if (!this.progress[key]) this.getProgress(userId, courseId);
    const index = this.progress[key].completedItems.indexOf(contentId);
    let isComplete = false;
    if (index > -1) {
      this.progress[key].completedItems.splice(index, 1);
      isComplete = false;
    } else {
      this.progress[key].completedItems.push(contentId);
      isComplete = true;
    }
    this.progress[key].lastAccessed = new Date().toISOString();
    await this.postAPI('/progress', this.progress[key]);
    this.persistAll();
    return isComplete;
  }

  async updateVideoProgress(userId: string, courseId: string, contentId: string, seconds: number) {
    const key = `${userId}_${courseId}`;
    if (!this.progress[key]) this.getProgress(userId, courseId);
    if (!this.progress[key].videoProgress) {
      this.progress[key].videoProgress = {};
    }
    this.progress[key].videoProgress![contentId] = seconds;
    this.progress[key].lastAccessed = new Date().toISOString();
    await this.postAPI('/progress', this.progress[key]);
    this.persistAll();
  }

  async saveQuizScore(userId: string, courseId: string, contentId: string, score: number) {
    const key = `${userId}_${courseId}`;
    if (!this.progress[key]) this.getProgress(userId, courseId);
    if (!this.progress[key].quizScores) {
      this.progress[key].quizScores = {};
    }
    this.progress[key].quizScores![contentId] = score;
    this.progress[key].lastAccessed = new Date().toISOString();
    await this.postAPI('/progress', this.progress[key]);
    this.persistAll();
  }

  async resetCourseProgress(userId: string, courseId: string) {
    const key = `${userId}_${courseId}`;
    if (this.progress[key]) {
      this.progress[key].completedItems = [];
      this.progress[key].videoProgress = {};
      this.progress[key].quizScores = {};
      this.progress[key].lastAccessed = new Date().toISOString();
      await this.postAPI('/progress', this.progress[key]);
      this.persistAll();
    }
  }

  // --- RESULTS ---



  getResults(userId?: string | null): ExamResult[] {
    if (userId) return this.results.filter(r => r.userId === userId);
    return this.results;
  }

  // --- CERTIFICATES ---

  getCertificateTemplates() {
    return this.certTemplates;
  }

  async saveCertificateTemplate(tpl: CertificateTemplate) {
    const idx = this.certTemplates.findIndex(t => t.id === tpl.id);
    if (idx >= 0) {
      this.certTemplates[idx] = tpl;
    } else {
      this.certTemplates.push(tpl);
    }
    await this.postAPI('/certificate-templates', tpl);
    this.persistAll();
  }

  async deleteCertificateTemplate(id: string) {
    await this.deleteAPI(`/certificate-templates/${id}`);
    this.certTemplates = this.certTemplates.filter(t => t.id !== id);
    this.persistAll();
  }

  // --- STUDENT CERTIFICATES ---

  getStudentCertificates(studentId: string) {
    return this.studentCertificates.filter(c => c.studentId === studentId);
  }

  async issueCertificate(cert: Partial<StudentCertificate>) {
    const newCert = {
      ...cert,
      id: `sc_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      issueDate: new Date().toISOString()
    } as StudentCertificate;

    this.studentCertificates.push(newCert);
    await this.postAPI('/student-certificates', newCert);
    this.persistAll();
    return newCert;
  }

  // Legacy save method, kept for compatibility if needed or removed if cleaner
  private save(key: string, data: any) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  // --- GRADES STRUCTURE ---

  getGrades() {
    return this.schoolGrades;
  }

  async saveGrade(grade: SchoolGrade) {
    const idx = this.schoolGrades.findIndex(g => g.id === grade.id);
    if (idx >= 0) {
      this.schoolGrades[idx] = grade;
    } else {
      this.schoolGrades.push({ ...grade, id: grade.id || `g_${Date.now()}` });
    }
    await this.postAPI('/grades', grade);
    this.persistAll();
  }

  async deleteGrade(id: string) {
    const grade = this.schoolGrades.find(g => g.id === id);
    await this.deleteAPI(`/grades/${id}`);
    this.schoolGrades = this.schoolGrades.filter(g => g.id !== id);

    if (grade) {
      for (const u of this.users) {
        if (u.gradeLevel === grade.name) {
          u.gradeLevel = undefined;
          u.classSection = undefined;
          await this.postAPI(`/users/${u.id}`, u);
        }
      }
      this.saveToLS('almanara_users', this.users);
    }
  }

  // --- NOTIFICATIONS ---
  async fetchUserNotifications(userId: string, targetRole: string) {
    if (this.OFFLINE_MODE) return [];
    try {
      const res = await fetch(`${API_BASE}/notifications?userId=${userId}&targetRole=${targetRole}`);
      if (!res.ok) throw new Error();
      return await res.json();
    } catch {
      return [];
    }
  }

  async markNotificationRead(id: string) {
    if (this.OFFLINE_MODE) return;
    await this.putAPI(`/notifications/${id}/read`, {});
  }

  async requestPasswordReset(userId: string, targetAdminRole = 'admin') {
    const user = this.users.find(u => u.id === userId);
    if (!user) return;
    
    await this.postAPI('/notifications', {
      senderId: userId,
      targetRole: targetAdminRole,
      title: 'طلب إعادة تعيين كلمة المرور',
      message: `طلب الطالب ${user.fullName} الموافقة على إعادة تعيين كلمة المرور.`,
      type: 'password_reset',
      actionData: { requesterId: userId, status: 'pending' }
    });
  }

  async approvePasswordReset(notificationId: string, requesterId: string) {
    await this.postAPI(`/notifications/${notificationId}/approve-reset`, { requesterId });
    const user = this.users.find(u => u.id === requesterId);
    if (user) {
      user.mustChangePassword = true;
      this.persistAll();
    }
  }

  async rejectPasswordReset(notificationId: string, requesterId: string) {
    await this.postAPI(`/notifications/${notificationId}/reject-reset`, { requesterId });
  }

}

export const backend = new MockBackendService();
