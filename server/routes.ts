import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import sharp from "sharp";
import { storage } from "./storage";
import { deepSeekService } from "./deepseek";
// import { insertExamPaperSchema } from "@shared/schema";

// 配置multer用于文件上传
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('只支持图片文件'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // 文件上传API
  app.post("/api/upload", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "没有上传文件" });
      }

      // 优化图片质量并转换为JPEG
      const optimizedBuffer = await sharp(req.file.buffer)
        .jpeg({ quality: 90 })
        .toBuffer();

      // 转换为base64
      const base64Image = optimizedBuffer.toString('base64');

      // 创建试卷记录
      const examPaper = await storage.createExamPaper({
        filename: req.file.originalname,
        status: "uploaded"
      });

      res.json({
        id: examPaper.id,
        filename: examPaper.filename,
        status: examPaper.status,
        base64Image // 前端需要用于显示预览
      });

    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "上传失败" 
      });
    }
  });

  // 处理试卷API - OCR + AI分析
  app.post("/api/process/:id", async (req, res) => {
    try {
      const { id } = req.params;
      
      // 防护undefined body
      if (!req.body) {
        return res.status(400).json({ error: "请求体为空" });
      }

      const { base64Image } = req.body;

      if (!base64Image || typeof base64Image !== 'string') {
        return res.status(400).json({ error: "缺少有效的图片数据" });
      }

      // 获取试卷记录
      const examPaper = await storage.getExamPaper(id);
      if (!examPaper) {
        return res.status(404).json({ error: "试卷不存在" });
      }

      // 更新状态为处理中
      await storage.updateExamPaper(id, { status: "processing" });

      try {
        // 使用DeepSeek进行OCR和分析
        const result = await deepSeekService.processExamPaper(base64Image);

        // 更新试卷记录
        const updatedExamPaper = await storage.updateExamPaper(id, {
          originalText: result.extractedText,
          analysisResult: JSON.stringify(result.analysisResult),
          score: result.analysisResult.overallScore,
          status: "completed"
        });

        res.json({
          id: updatedExamPaper?.id,
          extractedText: result.extractedText,
          analysisResult: result.analysisResult,
          status: "completed"
        });

      } catch (aiError) {
        // AI处理失败，更新状态
        await storage.updateExamPaper(id, { status: "error" });
        throw aiError;
      }

    } catch (error) {
      console.error("Processing error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "处理失败" 
      });
    }
  });

  // 获取处理进度API
  app.get("/api/status/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const examPaper = await storage.getExamPaper(id);
      
      if (!examPaper) {
        return res.status(404).json({ error: "试卷不存在" });
      }

      res.json({
        id: examPaper.id,
        status: examPaper.status,
        filename: examPaper.filename,
        analysisResult: examPaper.analysisResult ? JSON.parse(examPaper.analysisResult) : null
      });

    } catch (error) {
      console.error("Status check error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "获取状态失败" 
      });
    }
  });

  // 获取所有试卷API
  app.get("/api/exam-papers", async (req, res) => {
    try {
      const examPapers = await storage.getAllExamPapers();
      res.json(examPapers.map(paper => ({
        id: paper.id,
        filename: paper.filename,
        status: paper.status,
        score: paper.score,
        uploadedAt: paper.uploadedAt
      })));
    } catch (error) {
      console.error("List error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "获取列表失败" 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}