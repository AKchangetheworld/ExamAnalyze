import { useState, useEffect } from "react";
import { ProcessingStep, UploadProgress, AnalysisResult } from "@shared/schema";
import Header from "@/components/Header";
import FileUpload from "@/components/FileUpload";
import ProcessingSteps from "@/components/ProcessingSteps";
import ProgressIndicator from "@/components/ProgressIndicator";
import ResultsCard from "@/components/ResultsCard";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type AppState = "idle" | "uploading" | "processing" | "completed" | "error";

export default function Home() {
  const [appState, setAppState] = useState<AppState>("idle");
  const [currentStep, setCurrentStep] = useState<ProcessingStep>("upload");
  const [progress, setProgress] = useState<UploadProgress>({
    step: "upload",
    progress: 0,
    message: "准备上传..."
  });
  const [results, setResults] = useState<AnalysisResult | null>(null);
  const [examPaperId, setExamPaperId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false); // Guard against concurrent processing
  const { toast } = useToast();

  // SessionStorage key for persistence
  const STORAGE_KEY = 'exam-analysis-state';

  // Save state to sessionStorage
  const saveStateToStorage = (state: {
    appState: AppState;
    currentStep: ProcessingStep;
    progress: UploadProgress;
    examPaperId: string | null;
    results: AnalysisResult | null;
  }) => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn('Failed to save state to sessionStorage:', error);
    }
  };

  // Load state from sessionStorage
  const loadStateFromStorage = () => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.warn('Failed to load state from sessionStorage:', error);
    }
    return null;
  };

  // Clear saved state
  const clearSavedState = () => {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear saved state:', error);
    }
  };

  // Auto-save state changes
  const updateStateAndSave = (newState: Partial<{
    appState: AppState;
    currentStep: ProcessingStep;
    progress: UploadProgress;
    examPaperId: string | null;
    results: AnalysisResult | null;
  }>) => {
    // Update individual states
    if (newState.appState !== undefined) setAppState(newState.appState);
    if (newState.currentStep !== undefined) setCurrentStep(newState.currentStep);
    if (newState.progress !== undefined) setProgress(newState.progress);
    if (newState.examPaperId !== undefined) setExamPaperId(newState.examPaperId);
    if (newState.results !== undefined) setResults(newState.results);

    // Save complete state
    const currentState = {
      appState: newState.appState ?? appState,
      currentStep: newState.currentStep ?? currentStep,
      progress: newState.progress ?? progress,
      examPaperId: newState.examPaperId ?? examPaperId,
      results: newState.results ?? results,
    };
    
    // Only save if we're in a processing state
    if (currentState.appState === 'uploading' || currentState.appState === 'processing') {
      saveStateToStorage(currentState);
    } else if (currentState.appState === 'completed' || currentState.appState === 'error' || currentState.appState === 'idle') {
      clearSavedState();
    }
  };

  // Resilient fetch with exponential backoff for network errors
  const resilientFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
    const maxRetries = 4;
    const baseDelay = 500; // Start with 500ms
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, options);
        
        // If it's a server error (5xx), retry
        if (response.status >= 500 && attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt);
          console.log(`Server error ${response.status}, retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries + 1})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        return response;
      } catch (error) {
        // If it's a network error and we have retries left
        if (error instanceof TypeError && error.message.includes('fetch') && attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt);
          console.log(`Network error, retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries + 1}):`, error.message);
          updateStateAndSave({ progress: { step: currentStep, progress: progress.progress, message: `网络连接中断，正在重连... (${attempt + 1}/${maxRetries + 1})` } });
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        // If we're out of retries or it's a different error, throw
        throw error;
      }
    }
    
    throw new Error('Max retries exceeded');
  };

  // Restore state from sessionStorage on mount
  useEffect(() => {
    const savedState = loadStateFromStorage();
    if (savedState && savedState.examPaperId) {
      console.log('Restoring saved state:', savedState);
      
      // Restore all state values
      setAppState(savedState.appState);
      setCurrentStep(savedState.currentStep);
      setProgress(savedState.progress);
      setExamPaperId(savedState.examPaperId);
      setResults(savedState.results);
      
      // If we were in the middle of processing, resume
      if (savedState.appState === 'processing' && savedState.examPaperId && !isProcessing) {
        toast({
          title: "恢复处理",
          description: "检测到中断的任务，正在继续分析...",
        });
        
        // Resume processing from where we left off
        setTimeout(() => {
          processWithGemini(savedState.examPaperId);
        }, 1000);
      }
    }
  }, []);

  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => {
      console.log('Back online');
      if (appState === 'processing' && examPaperId && !isProcessing) {
        toast({
          title: "网络已恢复",
          description: "正在继续处理任务...",
        });
        // Continue processing if we were in progress
        setTimeout(() => {
          processWithGemini(examPaperId);
        }, 1000);
      }
    };

    const handleOffline = () => {
      console.log('Gone offline');
      if (appState === 'processing') {
        updateStateAndSave({
          progress: { 
            step: currentStep, 
            progress: progress.progress, 
            message: "网络连接中断，等待网络恢复..." 
          }
        });
        toast({
          title: "网络连接中断",
          description: "请检查网络连接，我们会在网络恢复时自动继续",
          variant: "destructive",
        });
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [appState, currentStep, progress, examPaperId]);

  const processWithGemini = async (paperId: string) => {
    // Prevent concurrent processing
    if (isProcessing) {
      console.log('Processing already in progress, skipping...');
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // Step 1: Direct AI Analysis (includes OCR)
      updateStateAndSave({
        currentStep: "analysis",
        progress: { step: "analysis", progress: 50, message: "正在分析试卷（包含文字识别）..." }
      });

      const analysisResponse = await resilientFetch(`/api/exam-papers/${paperId}/analyze`, {
        method: 'POST',
      });
      
      if (!analysisResponse.ok) {
        const errorText = await analysisResponse.text().catch(() => 'Unknown error');
        throw new Error(`AI分析失败: ${analysisResponse.status} - ${errorText}`);
      }

      let analysisData;
      try {
        analysisData = await analysisResponse.json();
      } catch (jsonError) {
        console.error('Analysis JSON parse error:', jsonError);
        throw new Error('分析响应格式错误');
      }

      if (!analysisData || !analysisData.result) {
        throw new Error('分析结果为空或格式错误');
      }

      updateStateAndSave({ progress: { step: "analysis", progress: 100, message: "AI分析完成" } });

      // Step 3: Results
      updateStateAndSave({
        currentStep: "results",
        progress: { step: "results", progress: 100, message: "生成分析报告..." }
      });

      // Ensure atomic update of results and completed state
      setResults(analysisData.result);
      setAppState("completed");
      
      // Clear saved state since we're completed
      clearSavedState();
      
      toast({
        title: "分析完成",
        description: "试卷已成功分析，查看详细结果吧！",
      });
    } catch (error) {
      console.error('Processing error:', error, {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace'
      });
      
      // Ensure we don't clear the page by maintaining component state
      updateStateAndSave({
        appState: "error",
        progress: { 
          step: currentStep, 
          progress: 0, 
          message: "处理失败" 
        }
      });
      
      toast({
        title: "处理失败", 
        description: error instanceof Error ? error.message : "试卷处理过程中出现错误",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Compress image on client side to reduce upload time and API processing time
  const compressImage = (file: File, maxWidth = 1600, quality = 0.8): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions while maintaining aspect ratio
        let { width, height } = img;
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          } else {
            resolve(file); // Fallback to original if compression fails
          }
        }, 'image/jpeg', quality);
      };
      
      img.onerror = () => resolve(file); // Fallback to original if load fails
      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileSelect = async (file: File) => {
    // Prevent concurrent uploads/processing
    if (isProcessing) {
      toast({
        title: "正在处理中",
        description: "请等待当前任务完成",
        variant: "default",
      });
      return;
    }
    
    try {
      console.log('File selected:', file.name);
      updateStateAndSave({
        appState: "uploading",
        currentStep: "upload",
        progress: { step: "upload", progress: 20, message: "正在优化图片..." }
      });

      // Compress image for faster upload and processing
      const compressedFile = await compressImage(file);
      console.log(`图片压缩: ${(file.size / 1024 / 1024).toFixed(2)}MB -> ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`);

      // Upload file
      const formData = new FormData();
      formData.append('examPaper', compressedFile);

      updateStateAndSave({ progress: { step: "upload", progress: 50, message: "正在上传试卷..." } });

      const uploadResponse = await resilientFetch('/api/exam-papers/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text().catch(() => 'Unknown error');
        throw new Error(`文件上传失败: ${uploadResponse.status} - ${errorText}`);
      }

      let uploadData;
      try {
        uploadData = await uploadResponse.json();
      } catch (jsonError) {
        console.error('Upload JSON parse error:', jsonError);
        throw new Error('上传响应格式错误');
      }

      if (!uploadData || !uploadData.examPaperId) {
        throw new Error('上传响应缺少试卷ID');
      }

      updateStateAndSave({
        appState: "processing",
        progress: { step: "upload", progress: 100, message: "上传完成" },
        examPaperId: uploadData.examPaperId
      });

      // Start processing with Gemini
      await processWithGemini(uploadData.examPaperId);
    } catch (error) {
      console.error('Upload error:', error, {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace'
      });
      
      // Ensure we don't clear the page by maintaining component state
      updateStateAndSave({
        appState: "error",
        progress: { 
          step: "upload", 
          progress: 0, 
          message: "上传失败" 
        }
      });
      
      toast({
        title: "上传失败",
        description: error instanceof Error ? error.message : "文件上传过程中出现错误",
        variant: "destructive",
      });
    }
  };

  const handleStartOver = () => {
    clearSavedState();
    setIsProcessing(false);
    updateStateAndSave({
      appState: "idle",
      currentStep: "upload",
      progress: { step: "upload", progress: 0, message: "准备上传..." },
      results: null,
      examPaperId: null
    });
  };

  const handleDownload = () => {
    if (results) {
      const dataStr = JSON.stringify(results, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `试卷分析报告_${new Date().toLocaleDateString()}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      
      toast({
        title: "下载成功",
        description: "分析报告已保存到您的设备",
      });
    }
  };

  const handleShare = () => {
    if (results && navigator.share) {
      navigator.share({
        title: '试卷分析报告',
        text: `试卷得分：${results.overallScore}/${results.maxScore} (${results.grade})`,
        url: window.location.href,
      }).then(() => {
        toast({
          title: "分享成功",
          description: "分析结果已分享",
        });
      }).catch(() => {
        // Fallback to copying to clipboard
        copyToClipboard();
      });
    } else {
      copyToClipboard();
    }
  };

  const copyToClipboard = () => {
    if (results) {
      const shareText = `试卷智能分析结果：
得分：${results.overallScore}/${results.maxScore} (${results.grade})
总体评价：${results.feedback.detailedFeedback}`;
      
      navigator.clipboard.writeText(shareText).then(() => {
        toast({
          title: "已复制到剪贴板",
          description: "分析结果已复制，可以粘贴分享给其他人",
        });
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container max-w-md mx-auto p-4 space-y-6">
        {/* Processing Steps - Always visible when processing or completed */}
        {(appState === "processing" || appState === "completed") && (
          <ProcessingSteps 
            currentStep={currentStep} 
            progress={progress.progress}
            className="mt-6"
          />
        )}

        {/* Main Content based on state */}
        {appState === "idle" && (
          <div className="space-y-4">
            <div className="text-center space-y-2 py-8">
              <h2 className="text-xl font-semibold">开始分析试卷</h2>
              <p className="text-muted-foreground">
                上传试卷图片，获得详细的AI分析报告
              </p>
            </div>
            <FileUpload onFileSelect={handleFileSelect} />
          </div>
        )}

        {(appState === "uploading" || appState === "processing") && (
          <div className="space-y-6 py-8">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2">
                {appState === "uploading" ? "正在上传试卷" : "正在处理试卷"}
              </h2>
              <p className="text-muted-foreground">
                {appState === "uploading" ? "文件正在上传中..." : "请稍候，AI正在分析您的试卷"}
              </p>
            </div>
            <ProgressIndicator progress={progress} />
          </div>
        )}

        {appState === "error" && (
          <div className="space-y-6 py-8 text-center">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-destructive">处理失败</h2>
              <p className="text-muted-foreground">
                试卷处理过程中遇到问题，请重试
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleStartOver}
              data-testid="button-retry"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              重新开始
            </Button>
          </div>
        )}

        {appState === "completed" && (
          <div className="space-y-6">
            {results ? (
              <>
                <ResultsCard 
                  result={results} 
                  onDownload={handleDownload}
                  onShare={handleShare}
                />
                
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleStartOver}
                  data-testid="button-start-over"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  分析新试卷
                </Button>
              </>
            ) : (
              <div className="space-y-6 py-8 text-center">
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold">生成报告中...</h2>
                  <p className="text-muted-foreground">
                    正在整理分析结果，请稍候
                  </p>
                </div>
                <div className="animate-spin mx-auto h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}