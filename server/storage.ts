import { type User, type InsertUser, type ExamPaper, type InsertExamPaper } from "@shared/schema";
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
}

export const storage = new MemStorage();
