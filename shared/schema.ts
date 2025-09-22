import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const examPapers = pgTable("exam_papers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  filename: text("filename").notNull(),
  filePath: text("file_path"),
  imageUrl: text("image_url"), // URL for accessing the uploaded image
  mimeType: text("mime_type"), // MIME type from multer upload
  originalText: text("original_text"),
  analysisResult: text("analysis_result"),
  score: integer("score"),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  status: text("status").notNull().default("uploaded"), // uploaded, processing, completed, error
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertExamPaperSchema = createInsertSchema(examPapers).pick({
  filename: true,
  filePath: true,
  imageUrl: true,
  mimeType: true,
  originalText: true,
  analysisResult: true,
  score: true,
  status: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertExamPaper = z.infer<typeof insertExamPaperSchema>;
export type ExamPaper = typeof examPapers.$inferSelect;

// Frontend types for processing states
export type ProcessingStep = "upload" | "ocr" | "analysis" | "generating" | "results";

export interface UploadProgress {
  step: ProcessingStep;
  progress: number;
  message: string;
  currentQuestion?: number;  // 当前正在分析的题目号
  totalQuestions?: number;   // 预估总题目数
  questionProgress?: string; // 如 "3/10" 表示正在分析第3题，共10题
}

// Valid grade enum for strict validation
export const VALID_GRADES = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F'] as const;
export type ValidGrade = typeof VALID_GRADES[number];

// Grade validation schema
export const gradeSchema = z.enum(VALID_GRADES);

export interface AnalysisResult {
  overallScore: number;
  maxScore: number;
  grade: ValidGrade;
  feedback: {
    strengths: string[];
    improvements: string[];
    detailedFeedback: string;
  };
  questionAnalysis: {
    questionNumber: number;
    score: number;
    maxScore: number;
    feedback: string;
    questionText: string;      // 题目内容
    userAnswer: string;        // 用户答案
    correctAnswer: string;     // 正确答案
    explanation: string;       // 详细解析
    isCorrect: boolean;        // 是否答对
  }[];
}

// Interface for wrong questions (错题)
export interface WrongQuestion {
  questionNumber: number;
  questionText: string;
  userAnswer: string;
  correctAnswer: string;
  explanation: string;
  feedback: string;
  examId: string;
  examDate: string;
}

// Classification types for wrong questions
export interface WrongQuestionClassification {
  byKnowledgePoint: Record<string, WrongQuestion[]>;
  byErrorType: Record<string, WrongQuestion[]>;
  byDifficulty: Record<string, WrongQuestion[]>;
  summary: {
    totalQuestions: number;
    knowledgePoints: string[];
    errorTypes: string[];
    difficultyLevels: string[];
  };
}

// Enhanced question counting result with metadata
export interface QuestionCountResult {
    count: number | null;
    method: "llm" | "ocr_regex" | "unknown";
    confidence: "high" | "medium" | "low";
    warning?: string;
}

// Helper function to normalize grade strings (fixes Unicode variant issues)
export function normalizeGrade(grade: string): ValidGrade {
  if (!grade) return 'F';
  
  // Normalize to uppercase and trim whitespace
  let normalized = grade.trim().toUpperCase();
  
  // Replace various Unicode plus sign variants with ASCII +
  normalized = normalized
    .replace(/[\uFF0B\u207A\uFE62\u2795]/g, '+') // Fullwidth, superscript, small, heavy plus
    .replace(/[\u2212\uFF0D\u207B]/g, '-'); // Various minus signs
  
  // Validate against known grades
  if (VALID_GRADES.includes(normalized as ValidGrade)) {
    return normalized as ValidGrade;
  }
  
  // Fallback mapping for common patterns
  if (normalized.includes('A')) return normalized.includes('+') ? 'A+' : normalized.includes('-') ? 'A-' : 'A';
  if (normalized.includes('B')) return normalized.includes('+') ? 'B+' : normalized.includes('-') ? 'B-' : 'B';
  if (normalized.includes('C')) return normalized.includes('+') ? 'C+' : normalized.includes('-') ? 'C-' : 'C';
  if (normalized.includes('D')) return normalized.includes('+') ? 'D+' : normalized.includes('-') ? 'D-' : 'D';
  
  // Default fallback
  return 'F';
}