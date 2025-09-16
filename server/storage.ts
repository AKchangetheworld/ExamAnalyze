import { type User, type InsertUser, type ExamPaper, type InsertExamPaper, type WrongQuestion, type AnalysisResult } from "@shared/schema";
import { randomUUID } from "crypto";
import session from "express-session";
// @ts-ignore: memorystore has no types
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  // User management
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Exam paper management
  createExamPaper(examPaper: InsertExamPaper): Promise<ExamPaper>;
  getExamPaper(id: string): Promise<ExamPaper | undefined>;
  updateExamPaper(id: string, updates: Partial<ExamPaper>): Promise<ExamPaper | undefined>;
  
  // Wrong questions - now user-scoped
  getWrongQuestions(userId: string): Promise<WrongQuestion[]>;
  
  // Session store for authentication
  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private examPapers: Map<string, ExamPaper>;
  public sessionStore: session.Store;

  constructor() {
    this.users = new Map();
    this.examPapers = new Map();
    // Initialize session store with in-memory storage
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // Clean up expired sessions every 24 hours
    });
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createExamPaper(insertExamPaper: InsertExamPaper): Promise<ExamPaper> {
    const id = randomUUID();
    const examPaper: ExamPaper = { 
      id,
      userId: insertExamPaper.userId,
      filename: insertExamPaper.filename,
      filePath: insertExamPaper.filePath || null,
      originalText: insertExamPaper.originalText || null,
      analysisResult: insertExamPaper.analysisResult || null,
      score: insertExamPaper.score || null,
      status: insertExamPaper.status || "uploaded",
      uploadedAt: new Date()
    };
    this.examPapers.set(id, examPaper);
    return examPaper;
  }

  async getExamPaper(id: string): Promise<ExamPaper | undefined> {
    return this.examPapers.get(id);
  }

  async updateExamPaper(id: string, updates: Partial<ExamPaper>): Promise<ExamPaper | undefined> {
    const examPaper = this.examPapers.get(id);
    if (!examPaper) {
      return undefined;
    }
    
    const updatedExamPaper = { ...examPaper, ...updates };
    this.examPapers.set(id, updatedExamPaper);
    return updatedExamPaper;
  }

  async getWrongQuestions(userId: string): Promise<WrongQuestion[]> {
    const wrongQuestions: WrongQuestion[] = [];
    
    // Only get exam papers for the specific user
    const examPapers = Array.from(this.examPapers.values())
      .filter(examPaper => examPaper.userId === userId);
    
    for (const examPaper of examPapers) {
      if (examPaper.analysisResult && examPaper.status === 'completed') {
        try {
          const analysisResult: AnalysisResult = JSON.parse(examPaper.analysisResult);
          
          // Extract wrong questions from this exam
          const examWrongQuestions = analysisResult.questionAnalysis
            .filter(q => !q.isCorrect)
            .map(q => ({
              questionNumber: q.questionNumber,
              questionText: q.questionText,
              userAnswer: q.userAnswer,
              correctAnswer: q.correctAnswer,
              explanation: q.explanation,
              feedback: q.feedback,
              examId: examPaper.id,
              examDate: examPaper.uploadedAt?.toLocaleDateString('zh-CN') || '未知日期',
              userId: examPaper.userId
            }));
          
          wrongQuestions.push(...examWrongQuestions);
        } catch (error) {
          console.error(`Failed to parse analysis result for exam ${examPaper.id}:`, error);
        }
      }
    }
    
    // Sort by most recent first
    return wrongQuestions.reverse();
  }
}

export const storage = new MemStorage();
