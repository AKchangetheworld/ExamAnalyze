import OpenAI from "openai";
import { AnalysisResult } from "@shared/schema";

// 检查API密钥是否存在
if (!process.env.DEEPSEEK_API_KEY) {
  console.error("DEEPSEEK_API_KEY 环境变量未设置");
}

// DeepSeek API uses OpenAI-compatible interface
const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com"
});

export class DeepSeekService {
  // OCR功能：识别试卷图片中的文字
  async extractTextFromImage(base64Image: string): Promise<string> {
    try {
      // 验证base64图片格式
      if (!base64Image || !base64Image.trim()) {
        throw new Error("图片数据为空");
      }

      // 移除可能的数据URL前缀
      const cleanBase64 = base64Image.replace(/^data:image\/[a-z]+;base64,/, '');
      
      console.log("开始OCR文字识别...");
      
      try {
        // 首先尝试使用DeepSeek的视觉能力
        const response = await deepseek.chat.completions.create({
          model: "deepseek-chat",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "请仔细识别这张试卷图片中的所有文字内容，包括题目、答案、批注等。请保持原始格式和布局，准确转录所有文字。如果图片中有数学公式、符号或特殊格式，请尽可能准确地描述。"
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:image/jpeg;base64,${cleanBase64}`
                  }
                }
              ],
            },
          ],
          max_tokens: 4000,
          temperature: 0.1, // 降低温度以提高一致性
        });

        const extractedText = response.choices[0].message.content || "";
        console.log("OCR识别完成，提取文字长度:", extractedText.length);
        
        if (!extractedText.trim()) {
          throw new Error("未能从图片中识别出文字内容");
        }

        return extractedText;
      } catch (visionError) {
        console.log("视觉API调用失败，尝试备用方案:", visionError);
        
        // 如果视觉API不可用，直接抛出OCR不可用错误
        throw new Error("OCR服务暂不可用。DeepSeek视觉API需要支持图片处理的模型。请稍后重试或联系管理员配置其他OCR服务（如Google Vision API、AWS Textract等）。");
      }
    } catch (error) {
      console.error("OCR extraction failed:", error);
      
      // 提供更具体的错误信息
      if (error instanceof Error) {
        if (error.message.includes('OCR服务暂不可用')) {
          throw error; // 保持OCR不可用错误不变
        } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
          throw new Error("API密钥无效，请检查DeepSeek API配置");
        } else if (error.message.includes('429') || error.message.includes('rate limit')) {
          throw new Error("API调用频率过高，请稍后重试");
        } else if (error.message.includes('400') || error.message.includes('Bad Request')) {
          throw new Error("图片格式不支持或数据无效。请使用JPEG或PNG格式的图片");
        } else if (error.message.includes('model') || error.message.includes('vision')) {
          throw new Error("DeepSeek视觉模型暂不可用，请稍后重试");
        } else if (error.message.includes('未能从图片中识别')) {
          throw error; // 直接抛出自定义错误
        }
      }
      
      throw new Error("文字识别失败，请检查图片质量或稍后重试");
    }
  }


  // AI分析功能：分析试卷内容并生成详细反馈
  async analyzeExamPaper(extractedText: string): Promise<AnalysisResult> {
    try {
      // 验证输入文本
      if (!extractedText || !extractedText.trim()) {
        throw new Error("试卷文本内容为空，无法进行分析");
      }

      console.log("开始AI分析，文本长度:", extractedText.length);

      const response = await deepseek.chat.completions.create({
        model: "deepseek-reasoner", // 使用推理模型获得更好的分析质量
        messages: [
          {
            role: "system",
            content: `你是一位专业的教师，负责批改学生试卷。请分析以下试卷内容，并提供详细的批改反馈。

要求：
1. 评估整体表现，给出分数（假设满分100分）和等级（A+, A, B+, B, C+, C, D）
2. 列出学生的优点（strengths）
3. 列出需要改进的地方（improvements）
4. 提供详细的点评（detailedFeedback）
5. 逐题分析（questionAnalysis）

请以JSON格式返回结果，结构如下：
{
  "overallScore": 数字,
  "maxScore": 100,
  "grade": "等级",
  "feedback": {
    "strengths": ["优点1", "优点2", "优点3"],
    "improvements": ["改进点1", "改进点2", "改进点3"],
    "detailedFeedback": "详细点评文本"
  },
  "questionAnalysis": [
    {
      "questionNumber": 题号,
      "score": 得分,
      "maxScore": 满分,
      "feedback": "单题反馈"
    }
  ]
}`
          },
          {
            role: "user",
            content: `请分析以下试卷内容：\n\n${extractedText}`
          }
        ],
        response_format: { type: "json_object" },
        max_tokens: 4000,
        temperature: 0.2, // 降低温度以提高一致性
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("AI分析返回空结果");
      }

      let result;
      try {
        result = JSON.parse(content);
      } catch (parseError) {
        console.error("JSON解析失败:", content);
        throw new Error("AI返回的结果格式不正确，无法解析为JSON");
      }
      
      // 验证返回结果的结构
      if (typeof result.overallScore !== 'number' || !result.grade || !result.feedback) {
        console.error("AI分析结果结构验证失败:", result);
        throw new Error("AI分析结果格式不正确，缺少必要字段");
      }

      // 构建并验证最终结果
      const analysisResult: AnalysisResult = {
        overallScore: Math.max(0, Math.min(100, Math.round(result.overallScore))),
        maxScore: 100,
        grade: result.grade,
        feedback: {
          strengths: Array.isArray(result.feedback.strengths) ? result.feedback.strengths : [],
          improvements: Array.isArray(result.feedback.improvements) ? result.feedback.improvements : [],
          detailedFeedback: result.feedback.detailedFeedback || "分析完成，但未生成详细反馈"
        },
        questionAnalysis: Array.isArray(result.questionAnalysis) ? result.questionAnalysis : []
      };

      console.log("AI分析完成，总分:", analysisResult.overallScore);
      return analysisResult;

    } catch (error) {
      console.error("Analysis failed:", error);
      
      // 提供更具体的错误信息
      if (error instanceof Error) {
        if (error.message.includes('401')) {
          throw new Error("API密钥无效，请检查DeepSeek API配置");
        } else if (error.message.includes('429')) {
          throw new Error("API调用频率过高，请稍后重试");
        } else if (error.message.includes('400')) {
          throw new Error("分析请求格式错误");
        }
      }
      
      throw new Error("AI分析失败，请稍后重试");
    }
  }

  // 综合处理：从图片到分析结果的完整流程
  async processExamPaper(base64Image: string): Promise<{
    extractedText: string;
    analysisResult: AnalysisResult;
  }> {
    // 第一步：OCR识别
    const extractedText = await this.extractTextFromImage(base64Image);
    
    if (!extractedText.trim()) {
      throw new Error("未能识别到试卷内容，请确保图片清晰且包含文字");
    }

    // 第二步：AI分析
    const analysisResult = await this.analyzeExamPaper(extractedText);

    return {
      extractedText,
      analysisResult
    };
  }
}

export const deepSeekService = new DeepSeekService();