export enum UserRole {
  ADMIN = 'admin',
  TEACHER = 'teacher',
  STUDENT = 'student',
  EXTERNAL = 'user', // External user (no grade/section)
  GUEST = 'guest'
}

export enum CourseCategory {
  // Qudurat
  QUDURAT_GENERAL = 'qudurat_general',
  QUDURAT_QUANT = 'qudurat_quant',
  QUDURAT_VERBAL = 'qudurat_verbal',

  // Tahsili
  TAHSILI_GENERAL = 'tahsili_general',
  TAHSILI_MATH = 'tahsili_math',
  TAHSILI_PHYSICS = 'tahsili_physics',
  TAHSILI_BIOLOGY = 'tahsili_biology',
  TAHSILI_CHEMISTRY = 'tahsili_chemistry'
}

export enum Subject {
  MATH = 'Math',
  PHYSICS = 'Physics',
  CHEMISTRY = 'Chemistry',
  BIOLOGY = 'Biology',
  QUANT = 'Quant',
  VERBAL = 'Verbal'
}

export enum ContentType {
  VIDEO = 'video',
  PDF = 'pdf',
  QUIZ = 'quiz',
  IMAGE = 'image',
  ARTICLE = 'article'
}

export interface User {
  id: string;
  nationalID: string;
  fullName: string;
  role: UserRole;
  password?: string;
  gradeLevel?: string; // e.g., "ثالث ثانوي"
  classSection?: string; // e.g., "شعبة 5"
  enrolledCourses: string[];
  mustChangePassword?: boolean;
}

export interface ContentItem {
  id: string;
  title: string;
  type: ContentType;
  url?: string;
  duration?: number;
  quizId?: string;
  // New: For embedded quizzes directly in modules
  questions?: string[]; // Array of Question IDs
  passingScore?: number;
  content?: string; // HTML content for Articles
}

export interface Module {
  id: string;
  title: string;
  content: ContentItem[];
  prerequisiteModuleId?: string; // ID of the module that must be completed to unlock this one
}

export interface CourseLandingConfig {
  useMainThumbnail?: boolean;
  headerImage?: string;
  promoVideoType?: 'youtube' | 'upload';
  promoVideoUrl?: string;
  welcomeTitle?: string;
  descriptionText?: string;
  showLessonCount?: boolean;
  showCategory?: boolean;
  showDuration?: boolean;
  customStats?: { id: string; label: string; iconName: string; value: string }[];
  themeColor?: string;
  registrationButtonText?: string;
}

export interface Course {
  id: string;
  title: string;
  category: CourseCategory;
  subject?: Subject;
  description: string;
  thumbnail: string;
  image?: string;
  modules: Module[];
  isPublished: boolean; // For Draft/Live status
  isPublic: boolean; // Public (anyon) vs Private (login required)
  creatorId?: string;
  certificateTemplateId?: string;
  congratulationsText?: string;
  landingPageConfig?: CourseLandingConfig;
}

export interface Question {
  id: string;
  text: string;
  image?: string;
  options: string[];
  correctOption: number;
  explanation?: string;
  subject: Subject | string;
  difficulty: 'easy' | 'medium' | 'hard';
  tags?: string[];
  creatorId?: string;
  isPrivate?: boolean; // If true, hidden from global bank
  examId?: string; // If private, belongs to this exam
}

export interface ExamSection {
  id: string;
  title: string;
  duration: number; // Minutes
  questionIds: string[];
}

export interface Exam {
  id: string;
  title: string;
  duration: number; // Overall duration in minutes
  passingScore: number;
  isPublic: boolean;
  type: 'simulation' | 'practice';
  category: CourseCategory;
  sections: ExamSection[];
  certificateTemplateId?: string;
  randomizeQuestions?: boolean;
  startTime?: string; // ISO Date
  endTime?: string; // ISO Date

  // Assignment Logic
  assignedTo?: {
    gradeLevels?: string[]; // e.g. ["Third Secondary"]
    classSections?: string[]; // e.g. ["Section 1", "Section 2"]
    studentIds?: string[]; // Specific students
  };
}

// Certificate Designer Types
export interface CertificateElement {
  id: string;
  type: 'studentName' | 'examTitle' | 'courseTitle' | 'score' | 'date' | 'qrCode' | 'staticText' | 'image';
  label: string; // Internal label
  text?: string; // For simple text
  htmlContent?: string; // For rich text
  src?: string; // For images
  // Image Specific
  objectFit?: 'cover' | 'contain' | 'fill';


  // Position & Dimensions
  x: number; // Percentage 0-100 (Center X)
  y: number; // Percentage 0-100 (Center Y)
  width?: number; // Pixels (or percentage? let's stick to px for wrapper, or auto)
  height?: number;
  rotation?: number; // Degrees
  opacity?: number; // 0-1
  isLocked?: boolean;
  isHidden?: boolean;

  // Typography
  fontSize: number;
  color: string;
  fontWeight: 'normal' | 'bold';
  align: 'left' | 'center' | 'right' | 'justify';
  fontFamily: string;
  letterSpacing?: number; // px
  lineHeight?: number; // unitless multiplier
  wordSpacing?: number; // px
  direction?: 'ltr' | 'rtl';
  link?: string; // Optional Hyperlink
}

export interface CertificateTemplate {
  id: string;
  name: string;
  category: 'course' | 'exam';
  backgroundImage: string; // DataURL or URL
  elements: CertificateElement[];
  isDefault: boolean;

  // Page Dimensions (Default A4 Landscape: 297x210)
  widthMm?: number;
  heightMm?: number;

  // Background Customization
  bgFilters?: {
    brightness: number; // 100% default
    contrast: number; // 100% default
    grayscale: number; // 0% default
    opacity: number; // 100% default
    blur: number; // 0px default
  };
}

// Tracking
export interface SchoolGrade {
  id: string;
  name: string; // e.g. "ثالث ثانوي"
  uniqueCode: string; // e.g. "1"
  sections: string[]; // e.g. ["شعبة 1", "شعبة 2"]
}

export interface StudentProgress {
  userId: string;
  courseId: string;
  completedItems: string[];
  videoProgress?: Record<string, number>; // Map contentId -> seconds watched
  quizScores?: Record<string, number>; // Map contentId -> score
  lastAccessed: string;
}

export interface ExamResult {
  id: string;
  userId: string | null;
  guestName?: string;
  examId: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  isPassed: boolean;
  answers: Record<string, number>;
  completedAt: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export interface StudentCertificate {
  id: string;
  studentId: string;
  templateId: string;
  issueDate: string;
  metadata?: {
    studentName?: string;
    courseName?: string;
    examTitle?: string;
    score?: string;
    date?: string;
    [key: string]: any;
  };
}

export interface Notification {
  id: string;
  senderId?: string;
  receiverId?: string;
  targetRole?: string;
  title: string;
  message: string;
  type: 'password_reset' | 'announcement' | 'alert' | 'general';
  actionData?: any;
  isRead: boolean;
  createdAt: string;
}

