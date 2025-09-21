import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import { analyzeExamPaper, extractTextFromImage, extractTextFromPDF, analyzeExamText } from "./gemini";
import { insertExamPaperSchema } from "@shared/schema";
// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 30 * 1024 * 1024, // 30MB limit
  },
  fileFilter: (req, file, cb) => {
    // Support various image and PDF MIME types
    const allowedMimeTypes = [
      // Image types
      'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
      // PDF types (various browser implementations)
      'application/pdf', 'application/x-pdf', 'application/acrobat'
    ];
    
    if (allowedMimeTypes.includes(file.mimetype) || file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('只支持图片文件和PDF文件'));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Create uploads directory if it doesn't exist
  if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
  }

  // Serve uploaded images statically
  app.use('/api/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // Upload and analyze exam paper
  app.post('/api/exam-papers/upload', upload.single('examPaper'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: '请上传试卷图片或PDF文件' });
      }

      // Generate accessible image URL
      const imageUrl = `/api/uploads/${path.basename(req.file.path)}`;

      // Create exam paper record
      const examPaper = await storage.createExamPaper({
        filename: req.file.originalname,
        filePath: req.file.path,
        imageUrl: imageUrl,
        mimeType: req.file.mimetype,
        status: 'uploaded',
        originalText: null,
        analysisResult: null,
        score: null,
      });

      res.set('Content-Type', 'application/json; charset=utf-8');
      res.json({ 
        success: true, 
        examPaperId: examPaper.id,
        imageUrl: imageUrl,
        message: '文件上传成功'
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ error: '文件上传失败' });
    }
  });

  // Process exam paper with OCR
  app.post('/api/exam-papers/:id/ocr', async (req, res) => {
    try {
      const { id } = req.params;
      const examPaper = await storage.getExamPaper(id);
      
      if (!examPaper) {
        return res.status(404).json({ error: '试卷不存在' });
      }

      // Update status to processing OCR
      await storage.updateExamPaper(id, { status: 'processing' });

      // Use the correct file path for this exam paper
      if (!examPaper.filePath) {
        return res.status(404).json({ error: '试卷文件路径未找到' });
      }

      if (!fs.existsSync(examPaper.filePath)) {
        return res.status(404).json({ error: '上传的文件未找到' });
      }

      const filePath = examPaper.filePath;
      
      // Extract text based on MIME type
      let extractedText: string;
      const isPdf = examPaper.mimeType && (
        examPaper.mimeType === 'application/pdf' ||
        examPaper.mimeType === 'application/x-pdf' ||
        examPaper.mimeType === 'application/acrobat'
      );
      
      if (isPdf) {
        extractedText = await extractTextFromPDF(filePath);
      } else {
        extractedText = await extractTextFromImage(filePath, examPaper.filename);
      }
      
      // Update exam paper with OCR result
      await storage.updateExamPaper(id, { 
        originalText: extractedText,
        status: 'ocr_completed'
      });

      res.set('Content-Type', 'application/json; charset=utf-8');
      res.json({ 
        success: true, 
        message: 'OCR识别完成',
        extractedText 
      });
    } catch (error) {
      console.error('OCR error:', error);
      await storage.updateExamPaper(req.params.id, { status: 'error' });
      
      // Handle specific API errors
      if (error instanceof Error && error.message.includes('503')) {
        res.status(503).json({ error: '服务暂时过载，请稍后重试' });
      } else if (error instanceof Error && error.message.includes('429')) {
        res.status(429).json({ error: '请求过于频繁，请稍后重试' });
      } else {
        res.status(500).json({ error: 'OCR识别失败' });
      }
    }
  });

  // Analyze exam paper with AI (combined OCR + Analysis)
  app.post('/api/exam-papers/:id/analyze', async (req, res) => {
    try {
      const { id } = req.params;
      const examPaper = await storage.getExamPaper(id);
      
      if (!examPaper) {
        return res.status(404).json({ error: '试卷不存在' });
      }

      // Update status to analyzing (skip separate OCR step)
      await storage.updateExamPaper(id, { status: 'analyzing' });

      // Use the correct file path for this exam paper
      if (!examPaper.filePath) {
        return res.status(404).json({ error: '试卷文件路径未找到' });
      }

      if (!fs.existsSync(examPaper.filePath)) {
        return res.status(404).json({ error: '上传的文件未找到' });
      }

      const filePath = examPaper.filePath;
      
      // Determine file type based on MIME type and use appropriate analysis method
      let analysisResult;
      const isPdf = examPaper.mimeType && (
        examPaper.mimeType === 'application/pdf' ||
        examPaper.mimeType === 'application/x-pdf' ||
        examPaper.mimeType === 'application/acrobat'
      );
      
      if (isPdf) {
        // For PDF files: extract text then analyze
        const extractedText = await extractTextFromPDF(filePath);
        analysisResult = await analyzeExamText(extractedText);
      } else {
        // For image files: use direct image analysis
        analysisResult = await analyzeExamPaper(filePath, examPaper.filename);
      }
      
      // Update exam paper with analysis result and extracted text (implicit in analysis)
      await storage.updateExamPaper(id, { 
        originalText: 'OCR集成在分析中完成',
        analysisResult: JSON.stringify(analysisResult),
        score: analysisResult.overallScore,
        status: 'completed'
      });

      // Keep the uploaded file to support persistent image preview
      // File cleanup can be handled by a separate background job if needed

      res.set('Content-Type', 'application/json; charset=utf-8');
      res.json({ 
        success: true, 
        message: 'AI分析完成',
        result: analysisResult 
      });
    } catch (error) {
      console.error('Analysis error:', error);
      await storage.updateExamPaper(req.params.id, { status: 'error' });
      
      // Handle specific API errors
      if (error instanceof Error && error.message.includes('503')) {
        res.status(503).json({ error: '服务暂时过载，请稍后重试' });
      } else if (error instanceof Error && error.message.includes('429')) {
        res.status(429).json({ error: '请求过于频繁，请稍后重试' });
      } else {
        res.status(500).json({ error: 'AI分析失败' });
      }
    }
  });

  // Get exam paper result
  app.get('/api/exam-papers/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const examPaper = await storage.getExamPaper(id);
      
      if (!examPaper) {
        return res.status(404).json({ error: '试卷不存在' });
      }

      let analysisResult = null;
      if (examPaper.analysisResult) {
        try {
          analysisResult = JSON.parse(examPaper.analysisResult);
        } catch (e) {
          console.error('Failed to parse analysis result:', e);
        }
      }

      res.set('Content-Type', 'application/json; charset=utf-8');
      res.json({
        success: true,
        examPaper: {
          ...examPaper,
          analysisResult
        }
      });
    } catch (error) {
      console.error('Get exam paper error:', error);
      res.status(500).json({ error: '获取试卷失败' });
    }
  });

  // Get wrong questions
  app.get('/api/wrong-questions', async (req, res) => {
    try {
      const wrongQuestions = await storage.getWrongQuestions();
      
      res.set('Content-Type', 'application/json; charset=utf-8');
      res.json(wrongQuestions);
    } catch (error) {
      console.error('Get wrong questions error:', error);
      res.status(500).json({ error: '获取错题失败' });
    }
  });

  return httpServer;
}
