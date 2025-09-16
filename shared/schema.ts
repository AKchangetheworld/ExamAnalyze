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
export type ProcessingStep = "upload" | "ocr" | "analysis" | "results";

export interface UploadProgress {
  step: ProcessingStep;
  progress: number;
  message: string;
}

export interface AnalysisResult {
  overallScore: number;
  maxScore: number;
  grade: string;
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
  }[];
}