import { type User, type InsertUser, type ExamPaper, type InsertExamPaper } from "@shared/schema";
import { randomUUID } from "crypto";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // ExamPaper methods
  createExamPaper(examPaper: InsertExamPaper): Promise<ExamPaper>;
  getExamPaper(id: string): Promise<ExamPaper | undefined>;
  updateExamPaper(id: string, updates: Partial<InsertExamPaper>): Promise<ExamPaper | undefined>;
  getAllExamPapers(): Promise<ExamPaper[]>;
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

  // ExamPaper methods
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

  async updateExamPaper(id: string, updates: Partial<InsertExamPaper>): Promise<ExamPaper | undefined> {
    const existing = this.examPapers.get(id);
    if (!existing) return undefined;

    const updated: ExamPaper = { ...existing, ...updates };
    this.examPapers.set(id, updated);
    return updated;
  }

  async getAllExamPapers(): Promise<ExamPaper[]> {
    return Array.from(this.examPapers.values()).sort(
      (a, b) => new Date(b.uploadedAt!).getTime() - new Date(a.uploadedAt!).getTime()
    );
  }
}

export const storage = new MemStorage();
