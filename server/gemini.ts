import * as fs from "fs";
import { GoogleGenAI } from "@google/genai";
import { AnalysisResult, normalizeGrade } from "@shared/schema";

// Dynamic import for pdf-parse to avoid startup issues

// DON'T DELETE THIS COMMENT
// Follow these instructions when using this blueprint:
// - Note that the newest Gemini model series is "gemini-2.5-flash" or gemini-2.5-pro"
//   - do not change this unless explicitly requested by the user

// This API key is from Gemini Developer API Key, not vertex AI API Key
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

// Helper function to detect image MIME type from filename
function getImageMimeType(filename: string): string {
    const ext = filename.toLowerCase().split(".").pop();
    switch (ext) {
        case "jpg":
        case "jpeg":
            return "image/jpeg";
        case "png":
            return "image/png";
        case "webp":
            return "image/webp";
        case "gif":
            return "image/gif";
        case "heic":
            return "image/heic";
        case "heif":
            return "image/heif";
        default:
            return "image/jpeg"; // fallback
    }
}

export async function countQuestions(
    imagePath: string,
    filename?: string,
): Promise<number> {
    try {
        const imageBytes = await fs.promises.readFile(imagePath);
        const mimeType = filename ? getImageMimeType(filename) : "image/jpeg";

        const systemPrompt = `你是一个专业的试卷题目计数助手。请快速扫描这份试卷，仅识别并计算主要题目（大题）的总数。

请只返回一个数字，表示试卷中主要题目的总数。不需要分析题目内容或提供其他信息。

【重要规则】：
1. 只计算顶级主要题目编号（如：1、2、3 或 一、二、三 或 第一题、第二题）
2. 包括选择题、填空题、解答题等所有主要题型
3. 完全忽略任何子题、小题、分项编号

【不要计算的内容】：
- 子题编号：(1), (2), (3), ①, ②, ③
- 分项编号：a), b), c), A), B), C)
- 连续编号：1-1, 1-2, 2-1, 2-2
- 学生答题中的任何编号
- 答题卡上的选项编号
- 说明文字中的编号

【正确示例】：
试卷显示："1. 选择题..." "2. 填空题..." "3. 解答题..." → 计算结果：3
试卷显示："一、基础题..." "二、应用题..." → 计算结果：2

【错误示例】：
不要把"2.(1)某物质..." "2.(2)计算..." 算作2道独立题目，这些都属于第2题的子题

只返回数字，不要包含其他文字。`;

        const contents = [
            {
                inlineData: {
                    data: imageBytes.toString("base64"),
                    mimeType: mimeType,
                },
            },
            systemPrompt,
        ];

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: contents,
        });

        const responseText = (response.text || "").trim();
        const questionCount = parseInt(responseText);
        
        // Validation: ensure we got a reasonable number
        if (isNaN(questionCount) || questionCount < 1 || questionCount > 100) {
            console.warn(`Invalid question count response: "${responseText}". Using default count of 8.`);
            return 8; // fallback to original default
        }
        
        console.log(`Counted ${questionCount} questions in the exam paper`);
        return questionCount;
    } catch (error) {
        console.error("Failed to count questions:", error);
        // Return fallback count on error
        return 8;
    }
}

export async function analyzeExamPaper(
    imagePath: string,
    filename?: string,
    progressCallback?: (progress: { currentQuestion: number; totalQuestions: number; message: string }) => void,
): Promise<AnalysisResult> {
    try {
        const imageBytes = await fs.promises.readFile(imagePath);
        const mimeType = filename ? getImageMimeType(filename) : "image/jpeg";

        const systemPrompt = `你是一个专业的试卷批改老师。请仔细分析这份试卷图片，提供详细的评分和反馈。

请按照以下JSON格式返回分析结果：
{
  "overallScore": 数字 (0-100),
  "maxScore": 100,
  "grade": "字母等级 (A+, A, B+, B, C+, C, D, F)",
  "feedback": {
    "strengths": ["优点1", "优点2", "优点3"],
    "improvements": ["改进建议1", "改进建议2", "改进建议3"],
    "detailedFeedback": "详细的总体评价，包括学习建议"
  },
  "questionAnalysis": [
    {
      "questionNumber": 题号,
      "score": 得分,
      "maxScore": 满分,
      "feedback": "具体题目的反馈",
      "questionText": "题目的完整内容",
      "userAnswer": "学生写的答案",
      "correctAnswer": "标准答案",
      "explanation": "详细的解题思路和知识点解析",
      "isCorrect": true/false (是否答对)
    }
  ]
}

分析要求：
1. 仔细识别试卷上的所有题目和答案
2. 对每道题提供完整的题目文本、学生答案、标准答案和详细解析
3. 根据答案的正确性、完整性、规范性进行评分
4. 提供具体、有建设性的反馈
5. 评分要公正合理
6. 反馈要鼓励学习进步
7. 解析要包含知识点说明和解题方法`;

        const contents = [
            {
                inlineData: {
                    data: imageBytes.toString("base64"),
                    mimeType: mimeType,
                },
            },
            systemPrompt,
        ];

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: "object",
                    properties: {
                        overallScore: { type: "number" },
                        maxScore: { type: "number" },
                        grade: { type: "string" },
                        feedback: {
                            type: "object",
                            properties: {
                                strengths: {
                                    type: "array",
                                    items: { type: "string" },
                                },
                                improvements: {
                                    type: "array",
                                    items: { type: "string" },
                                },
                                detailedFeedback: { type: "string" },
                            },
                            required: [
                                "strengths",
                                "improvements",
                                "detailedFeedback",
                            ],
                        },
                        questionAnalysis: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    questionNumber: { type: "number" },
                                    score: { type: "number" },
                                    maxScore: { type: "number" },
                                    feedback: { type: "string" },
                                    questionText: { type: "string" },
                                    userAnswer: { type: "string" },
                                    correctAnswer: { type: "string" },
                                    explanation: { type: "string" },
                                    isCorrect: { type: "boolean" },
                                },
                                required: [
                                    "questionNumber",
                                    "score",
                                    "maxScore",
                                    "feedback",
                                    "questionText",
                                    "userAnswer",
                                    "correctAnswer",
                                    "explanation",
                                    "isCorrect",
                                ],
                            },
                        },
                    },
                    required: [
                        "overallScore",
                        "maxScore",
                        "grade",
                        "feedback",
                        "questionAnalysis",
                    ],
                },
            },
            contents: contents,
        });

        const rawJson = response.text;
        console.log(`Gemini analysis result: ${rawJson}`);

        if (rawJson) {
            const result: AnalysisResult = JSON.parse(rawJson);

            // Normalize grade to ensure ASCII characters only (fixes mobile display issues)
            result.grade = normalizeGrade(result.grade);

            return result;
        } else {
            throw new Error("Empty response from Gemini");
        }
    } catch (error) {
        console.error("Failed to analyze exam paper:", error);
        throw new Error(`试卷分析失败: ${error}`);
    }
}

export async function extractTextFromPDF(pdfPath: string): Promise<string> {
    try {
        const pdfBytes = await fs.promises.readFile(pdfPath);
        console.log(`PDF file size: ${pdfBytes.length} bytes`);

        // For now, use fallback to image OCR for scanned PDFs
        // since createRequire has TypeScript issues in this environment
        console.log("PDF detected - falling back to OCR analysis");
        return await extractTextFromPDFAsImage(pdfPath);
    } catch (error) {
        console.error("Failed to extract text from PDF:", error);
        throw new Error(`PDF文本提取失败: ${error}`);
    }
}

async function extractTextFromPDFAsImage(pdfPath: string): Promise<string> {
    try {
        // Read PDF as binary and send to Gemini for OCR
        const pdfBytes = await fs.promises.readFile(pdfPath);

        const contents = [
            {
                inlineData: {
                    data: pdfBytes.toString("base64"),
                    mimeType: "application/pdf",
                },
            },
            "请准确识别并提取这份PDF试卷中的所有文字内容，包括题目、答案、说明等。保持原有的格式和结构。",
        ];

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: contents,
        });

        const extractedText = response.text || "";
        console.log(
            `PDF OCR extracted text length: ${extractedText.length} characters`,
        );
        console.log(`PDF OCR text preview: ${extractedText.substring(0, 100)}`);

        return extractedText;
    } catch (error) {
        console.error("Failed to extract text from PDF using OCR:", error);
        throw new Error(`PDF OCR识别失败: ${error}`);
    }
}

export async function extractTextFromImage(
    imagePath: string,
    filename?: string,
): Promise<string> {
    try {
        const imageBytes = await fs.promises.readFile(imagePath);
        const mimeType = filename ? getImageMimeType(filename) : "image/jpeg";

        const contents = [
            {
                inlineData: {
                    data: imageBytes.toString("base64"),
                    mimeType: mimeType,
                },
            },
            "请准确识别并提取这份试卷图片中的所有文字内容，包括题目、答案、说明等。保持原有的格式和结构。",
        ];

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: contents,
        });

        return response.text || "";
    } catch (error) {
        console.error("Failed to extract text from image:", error);
        throw new Error(`OCR识别失败: ${error}`);
    }
}

export async function analyzeExamText(
    textContent: string,
): Promise<AnalysisResult> {
    try {
        const systemPrompt = `你是一个专业的试卷批改老师。请仔细分析这份试卷内容，提供详细的评分和反馈。

请按照以下JSON格式返回分析结果：
{
  "overallScore": 数字 (0-100),
  "maxScore": 100,
  "grade": "字母等级 (A+, A, B+, B, C+, C, D, F)",
  "feedback": {
    "strengths": ["优点1", "优点2", "优点3"],
    "improvements": ["改进建议1", "改进建议2", "改进建议3"],
    "detailedFeedback": "详细的总体评价，包括学习建议"
  },
  "questionAnalysis": [
    {
      "questionNumber": 题号,
      "score": 得分,
      "maxScore": 满分,
      "feedback": "具体题目的反馈",
      "questionText": "题目的完整内容",
      "userAnswer": "学生写的答案",
      "correctAnswer": "标准答案",
      "explanation": "详细的解题思路和知识点解析",
      "isCorrect": true/false (是否答对)
    }
  ]
}

分析要求：
1. 仔细识别试卷中的所有题目和答案
2. 对每道题提供完整的题目文本、学生答案、标准答案和详细解析
3. 根据答案的正确性、完整性、规范性进行评分
4. 提供具体、有建设性的反馈
5. 评分要公正合理
6. 反馈要鼓励学习进步
7. 解析要包含知识点说明和解题方法

试卷内容：
${textContent}`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: "object",
                    properties: {
                        overallScore: { type: "number" },
                        maxScore: { type: "number" },
                        grade: { type: "string" },
                        feedback: {
                            type: "object",
                            properties: {
                                strengths: {
                                    type: "array",
                                    items: { type: "string" },
                                },
                                improvements: {
                                    type: "array",
                                    items: { type: "string" },
                                },
                                detailedFeedback: { type: "string" },
                            },
                            required: [
                                "strengths",
                                "improvements",
                                "detailedFeedback",
                            ],
                        },
                        questionAnalysis: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    questionNumber: { type: "number" },
                                    score: { type: "number" },
                                    maxScore: { type: "number" },
                                    feedback: { type: "string" },
                                    questionText: { type: "string" },
                                    userAnswer: { type: "string" },
                                    correctAnswer: { type: "string" },
                                    explanation: { type: "string" },
                                    isCorrect: { type: "boolean" },
                                },
                                required: [
                                    "questionNumber",
                                    "score",
                                    "maxScore",
                                    "feedback",
                                    "questionText",
                                    "userAnswer",
                                    "correctAnswer",
                                    "explanation",
                                    "isCorrect",
                                ],
                            },
                        },
                    },
                    required: [
                        "overallScore",
                        "maxScore",
                        "grade",
                        "feedback",
                        "questionAnalysis",
                    ],
                },
            },
            contents: [systemPrompt],
        });

        const rawJson = response.text;
        console.log(`Gemini analysis result: ${rawJson}`);

        if (rawJson) {
            const result: AnalysisResult = JSON.parse(rawJson);

            // Normalize grade to ensure ASCII characters only (fixes mobile display issues)
            result.grade = normalizeGrade(result.grade);

            return result;
        } else {
            throw new Error("Empty response from Gemini");
        }
    } catch (error) {
        console.error("Failed to analyze exam text:", error);
        throw new Error(`试卷分析失败: ${error}`);
    }
}
