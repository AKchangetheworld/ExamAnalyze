import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import { analyzeExamPaper, extractTextFromImage } from "./gemini";
import { insertExamPaperSchema } from "@shared/schema";

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('只支持图片文件'));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Create uploads directory if it doesn't exist
  if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
  }

  // Upload and analyze exam paper
  app.post('/api/exam-papers/upload', upload.single('examPaper'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: '请上传试卷图片' });
      }

      // Create exam paper record
      const examPaper = await storage.createExamPaper({
        filename: req.file.originalname,
        status: 'uploaded',
        originalText: null,
        analysisResult: null,
        score: null,
      });

      res.json({ 
        success: true, 
        examPaperId: examPaper.id,
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

      // Find the uploaded file
      const uploadedFiles = fs.readdirSync('uploads');
      const uploadedFile = uploadedFiles.find(file => 
        fs.statSync(path.join('uploads', file)).isFile()
      );

      if (!uploadedFile) {
        return res.status(404).json({ error: '上传的文件未找到' });
      }

      const filePath = path.join('uploads', uploadedFile);
      
      // Extract text using Gemini
      const extractedText = await extractTextFromImage(filePath);
      
      // Update exam paper with OCR result
      await storage.updateExamPaper(id, { 
        originalText: extractedText,
        status: 'ocr_completed'
      });

      res.json({ 
        success: true, 
        message: 'OCR识别完成',
        extractedText 
      });
    } catch (error) {
      console.error('OCR error:', error);
      await storage.updateExamPaper(req.params.id, { status: 'error' });
      res.status(500).json({ error: 'OCR识别失败' });
    }
  });

  // Analyze exam paper with AI
  app.post('/api/exam-papers/:id/analyze', async (req, res) => {
    try {
      const { id } = req.params;
      const examPaper = await storage.getExamPaper(id);
      
      if (!examPaper) {
        return res.status(404).json({ error: '试卷不存在' });
      }

      // Update status to analyzing
      await storage.updateExamPaper(id, { status: 'analyzing' });

      // Find the uploaded file
      const uploadedFiles = fs.readdirSync('uploads');
      const uploadedFile = uploadedFiles.find(file => 
        fs.statSync(path.join('uploads', file)).isFile()
      );

      if (!uploadedFile) {
        return res.status(404).json({ error: '上传的文件未找到' });
      }

      const filePath = path.join('uploads', uploadedFile);
      
      // Analyze with Gemini
      const analysisResult = await analyzeExamPaper(filePath);
      
      // Update exam paper with analysis result
      await storage.updateExamPaper(id, { 
        analysisResult: JSON.stringify(analysisResult),
        score: analysisResult.overallScore,
        status: 'completed'
      });

      res.json({ 
        success: true, 
        message: 'AI分析完成',
        result: analysisResult 
      });
    } catch (error) {
      console.error('Analysis error:', error);
      await storage.updateExamPaper(req.params.id, { status: 'error' });
      res.status(500).json({ error: 'AI分析失败' });
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

  const httpServer = createServer(app);

  return httpServer;
}
