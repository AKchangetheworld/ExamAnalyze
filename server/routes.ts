import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import { analyzeExamPaper, extractTextFromImage, extractTextFromPDF, analyzeExamText, countQuestions } from "./gemini";
import { insertExamPaperSchema, WrongQuestion, WrongQuestionClassification, QuestionCountResult } from "@shared/schema";
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
  // Count questions in exam paper
  app.post('/api/exam-papers/:id/count-questions', async (req, res) => {
    try {
      const { id } = req.params;
      const examPaper = await storage.getExamPaper(id);
      
      if (!examPaper) {
        return res.status(404).json({ error: '试卷不存在' });
      }

      if (!examPaper.filePath) {
        return res.status(404).json({ error: '试卷文件路径未找到' });
      }

      if (!fs.existsSync(examPaper.filePath)) {
        return res.status(404).json({ error: '上传的文件未找到' });
      }

      const filePath = examPaper.filePath;
      
      // Count questions using enhanced AI counting with metadata
      const countResult: QuestionCountResult = await countQuestions(filePath, examPaper.filename);
      
      console.log(`Enhanced count result:`, countResult);

      if (countResult.count !== null) {
        // Successful count
        res.json({ 
          success: true, 
          questionCount: countResult.count,
          method: countResult.method,
          confidence: countResult.confidence,
          warning: countResult.warning,
          message: `检测到 ${countResult.count} 题 (${countResult.method === 'llm' ? 'AI分析' : 'OCR识别'}, 可信度: ${countResult.confidence})`
        });
      } else {
        // Count failed but request was valid
        res.status(422).json({ 
          success: false,
          error: '无法准确统计题目数量',
          method: countResult.method,
          confidence: countResult.confidence,
          warning: countResult.warning,
          message: countResult.warning || '题目计数失败，请检查文件质量或手动输入题目数量'
        });
      }
    } catch (error) {
      console.error('Question counting error:', error);
      
      // Handle specific API errors
      if (error instanceof Error && error.message.includes('503')) {
        res.status(503).json({ error: '服务暂时过载，请稍后重试' });
      } else if (error instanceof Error && error.message.includes('429')) {
        res.status(429).json({ error: '请求过于频繁，请稍后重试' });
      } else {
        res.status(500).json({ error: '题目计数失败' });
      }
    }
  });

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

  // Get classified wrong questions
  app.get('/api/wrong-questions/classified', async (req, res) => {
    try {
      const wrongQuestions = await storage.getWrongQuestions();
      const classified = classifyWrongQuestions(wrongQuestions);
      
      res.set('Content-Type', 'application/json; charset=utf-8');
      res.json(classified);
    } catch (error) {
      console.error('Get classified wrong questions error:', error);
      res.status(500).json({ error: '获取错题分类失败' });
    }
  });

  return httpServer;
}

// Classification logic for wrong questions
function classifyWrongQuestions(wrongQuestions: WrongQuestion[]): WrongQuestionClassification {
  const byKnowledgePoint: Record<string, WrongQuestion[]> = {};
  const byErrorType: Record<string, WrongQuestion[]> = {};
  const byDifficulty: Record<string, WrongQuestion[]> = {};

  wrongQuestions.forEach(question => {
    // Classify by knowledge point (基于题目内容识别知识点)
    const knowledgePoint = identifyKnowledgePoint(question.questionText, question.explanation);
    if (!byKnowledgePoint[knowledgePoint]) {
      byKnowledgePoint[knowledgePoint] = [];
    }
    byKnowledgePoint[knowledgePoint].push(question);

    // Classify by error type (基于反馈识别错误类型)
    const errorType = identifyErrorType(question.feedback, question.userAnswer, question.correctAnswer);
    if (!byErrorType[errorType]) {
      byErrorType[errorType] = [];
    }
    byErrorType[errorType].push(question);

    // Classify by difficulty (基于题目复杂度和反馈分析难度)
    const difficulty = identifyDifficulty(question.questionText, question.feedback, question.explanation);
    if (!byDifficulty[difficulty]) {
      byDifficulty[difficulty] = [];
    }
    byDifficulty[difficulty].push(question);
  });

  return {
    byKnowledgePoint,
    byErrorType,
    byDifficulty,
    summary: {
      totalQuestions: wrongQuestions.length,
      knowledgePoints: Object.keys(byKnowledgePoint),
      errorTypes: Object.keys(byErrorType),
      difficultyLevels: Object.keys(byDifficulty)
    }
  };
}

// Helper function to identify knowledge points
function identifyKnowledgePoint(questionText: string, explanation: string): string {
  const text = (questionText + ' ' + explanation).toLowerCase();
  
  // 物理知识点识别
  if (text.includes('热量') || text.includes('温度') || text.includes('比热容') || text.includes('吸热') || text.includes('放热')) {
    return '热学';
  }
  if (text.includes('力') || text.includes('摩擦') || text.includes('重力') || text.includes('压力')) {
    return '力学';
  }
  if (text.includes('电流') || text.includes('电压') || text.includes('电阻') || text.includes('电路')) {
    return '电学';
  }
  if (text.includes('光') || text.includes('折射') || text.includes('反射') || text.includes('透镜')) {
    return '光学';
  }
  
  // 数学知识点识别
  if (text.includes('方程') || text.includes('解方程') || text.includes('一元二次')) {
    return '方程';
  }
  if (text.includes('函数') || text.includes('图像') || text.includes('坐标')) {
    return '函数';
  }
  if (text.includes('几何') || text.includes('三角形') || text.includes('圆') || text.includes('面积')) {
    return '几何';
  }
  
  // 化学知识点识别
  if (text.includes('化学') || text.includes('反应') || text.includes('分子') || text.includes('原子')) {
    return '化学';
  }
  
  // 语文知识点识别
  if (text.includes('词语') || text.includes('修辞') || text.includes('句子') || text.includes('阅读理解')) {
    return '语文';
  }
  
  // 默认分类
  return '基础概念';
}

// Helper function to identify error types
function identifyErrorType(feedback: string, userAnswer: string, correctAnswer: string): string {
  const feedbackLower = feedback.toLowerCase();
  
  // 概念理解错误
  if (feedbackLower.includes('概念') || feedbackLower.includes('理解') || feedbackLower.includes('定义') || 
      feedbackLower.includes('含义') || feedbackLower.includes('意义')) {
    return '概念理解错误';
  }
  
  // 计算错误
  if (feedbackLower.includes('计算') || feedbackLower.includes('数值') || feedbackLower.includes('公式') ||
      feedbackLower.includes('运算') || feedbackLower.includes('答案错误')) {
    return '计算错误';
  }
  
  // 表述不准确
  if (feedbackLower.includes('表述') || feedbackLower.includes('描述') || feedbackLower.includes('不够') ||
      feedbackLower.includes('完整') || feedbackLower.includes('准确') || feedbackLower.includes('严谨')) {
    return '表述不准确';
  }
  
  // 方法错误
  if (feedbackLower.includes('方法') || feedbackLower.includes('步骤') || feedbackLower.includes('过程') ||
      feedbackLower.includes('思路') || feedbackLower.includes('解题')) {
    return '解题方法错误';
  }
  
  // 审题不清
  if (feedbackLower.includes('审题') || feedbackLower.includes('题意') || feedbackLower.includes('理解题目') ||
      feedbackLower.includes('注意') || feedbackLower.includes('仔细')) {
    return '审题不清';
  }
  
  // 知识漏洞
  if (feedbackLower.includes('掌握') || feedbackLower.includes('学习') || feedbackLower.includes('知识') ||
      feedbackLower.includes('基础') || feedbackLower.includes('复习')) {
    return '知识漏洞';
  }
  
  // 默认分类
  return '其他错误';
}

// Helper function to identify difficulty level
function identifyDifficulty(questionText: string, feedback: string, explanation: string): string {
  const combinedText = (questionText + ' ' + feedback + ' ' + explanation).toLowerCase();
  
  // 基础题 - 简单的概念理解或记忆
  if (combinedText.includes('基础') || combinedText.includes('简单') || combinedText.includes('记忆') ||
      combinedText.includes('定义') || questionText.length < 50) {
    return '基础题';
  }
  
  // 综合题 - 多步骤或多知识点结合
  if (combinedText.includes('综合') || combinedText.includes('结合') || combinedText.includes('多个') ||
      combinedText.includes('步骤') || combinedText.includes('复杂') || questionText.length > 200) {
    return '综合题';
  }
  
  // 应用题 - 实际应用或分析
  if (combinedText.includes('应用') || combinedText.includes('分析') || combinedText.includes('解决') ||
      combinedText.includes('实际') || combinedText.includes('生活') || combinedText.includes('实验')) {
    return '应用题';
  }
  
  // 默认为中等题
  return '中等题';
}
