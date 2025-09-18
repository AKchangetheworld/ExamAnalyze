import { type User, type InsertUser, type ExamPaper, type InsertExamPaper, type WrongQuestion, type AnalysisResult } from "@shared/schema";
import { randomUUID } from "crypto";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  createExamPaper(examPaper: InsertExamPaper): Promise<ExamPaper>;
  getExamPaper(id: string): Promise<ExamPaper | undefined>;
  updateExamPaper(id: string, updates: Partial<ExamPaper>): Promise<ExamPaper | undefined>;
  
  getWrongQuestions(): Promise<WrongQuestion[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private examPapers: Map<string, ExamPaper>;

  constructor() {
    this.users = new Map();
    this.examPapers = new Map();
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
      filename: insertExamPaper.filename,
      filePath: insertExamPaper.filePath || null,
      imageUrl: insertExamPaper.imageUrl || null,
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

  async getWrongQuestions(): Promise<WrongQuestion[]> {
    const wrongQuestions: WrongQuestion[] = [];
    
    const examPapers = Array.from(this.examPapers.values());
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
              examDate: examPaper.uploadedAt?.toLocaleDateString('zh-CN') || '未知日期'
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
