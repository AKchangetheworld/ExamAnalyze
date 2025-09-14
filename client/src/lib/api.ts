import { AnalysisResult } from "@shared/schema";

export interface UploadResponse {
  id: string;
  filename: string;
  status: string;
  base64Image: string;
}

export interface ProcessResponse {
  id: string;
  extractedText: string;
  analysisResult: AnalysisResult;
  status: string;
}

export interface StatusResponse {
  id: string;
  status: string;
  filename: string;
  analysisResult: AnalysisResult | null;
}

export class ApiService {
  private baseUrl = '';

  // 上传文件
  async uploadFile(file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '上传失败');
    }

    return response.json();
  }

  // 处理试卷（OCR + AI分析）
  async processExamPaper(id: string, base64Image: string): Promise<ProcessResponse> {
    const response = await fetch(`/api/process/${id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ base64Image }),
    });

    if (!response.ok) {
      let errorMessage = '处理失败';
      try {
        const error = await response.json();
        errorMessage = error.error || error.message || errorMessage;
      } catch {
        // 如果无法解析JSON，尝试获取文本响应
        try {
          const errorText = await response.text();
          if (errorText) {
            errorMessage = errorText;
          }
        } catch {
          // 使用默认错误消息
        }
      }
      
      // 针对特定状态码提供更好的错误信息
      if (response.status === 413) {
        errorMessage = '图片文件过大，请选择较小的图片';
      } else if (response.status === 401) {
        errorMessage = 'API密钥无效，请检查配置';
      } else if (response.status === 429) {
        errorMessage = 'API调用频率过高，请稍后重试';
      }
      
      throw new Error(errorMessage);
    }

    return response.json();
  }

  // 获取处理状态
  async getStatus(id: string): Promise<StatusResponse> {
    const response = await fetch(`/api/status/${id}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '获取状态失败');
    }

    return response.json();
  }

  // 获取所有试卷
  async getAllExamPapers() {
    const response = await fetch('/api/exam-papers');

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '获取列表失败');
    }

    return response.json();
  }
}

export const apiService = new ApiService();