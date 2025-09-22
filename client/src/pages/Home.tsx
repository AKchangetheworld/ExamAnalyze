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
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [serverImageUrl, setServerImageUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false); // Guard against concurrent processing
  const { toast } = useToast();

  // SessionStorage key for persistence (v2 to invalidate old buggy cache)
  const STORAGE_KEY = 'exam-analysis-state-v2';

  // Save state to sessionStorage
  const saveStateToStorage = (state: {
    appState: AppState;
    currentStep: ProcessingStep;
    progress: UploadProgress;
    examPaperId: string | null;
    results: AnalysisResult | null;
    imagePreviewUrl: string | null;
    serverImageUrl: string | null;
  }) => {
    try {
      // Exclude imagePreviewUrl from persistence as object URLs don't survive reloads
      // But keep serverImageUrl as it's a persistent server URL
      const { imagePreviewUrl, ...persistableState } = state;
      console.log('💾 Saving state to sessionStorage:', persistableState);
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(persistableState));
    } catch (error) {
      console.warn('Failed to save state to sessionStorage:', error);
    }
  };

  // Load state from sessionStorage
  const loadStateFromStorage = () => {
    try {
      // Clean up old buggy cache first
      const oldKeys = ['exam-analysis-state'];
      oldKeys.forEach(key => {
        if (sessionStorage.getItem(key)) {
          sessionStorage.removeItem(key);
          console.log(`🧹 Cleaned up old cache key: ${key}`);
        }
      });

      const saved = sessionStorage.getItem(STORAGE_KEY);
      console.log('🔍 Loading from sessionStorage, raw data:', saved);
      if (saved) {
        const parsedState = JSON.parse(saved);
        console.log('📂 Parsed state from sessionStorage:', parsedState);
        return parsedState;
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
    imagePreviewUrl: string | null;
    serverImageUrl: string | null;
  }>, forceClear = false) => {
    // Update individual states
    if (newState.appState !== undefined) setAppState(newState.appState);
    if (newState.currentStep !== undefined) setCurrentStep(newState.currentStep);
    if (newState.progress !== undefined) setProgress(newState.progress);
    if (newState.examPaperId !== undefined) setExamPaperId(newState.examPaperId);
    if (newState.results !== undefined) setResults(newState.results);
    if (newState.imagePreviewUrl !== undefined) setImagePreviewUrl(newState.imagePreviewUrl);
    if (newState.serverImageUrl !== undefined) setServerImageUrl(newState.serverImageUrl);

    // Save complete state
    const currentState = {
      appState: newState.appState ?? appState,
      currentStep: newState.currentStep ?? currentStep,
      progress: newState.progress ?? progress,
      examPaperId: newState.examPaperId ?? examPaperId,
      results: newState.results ?? results,
      imagePreviewUrl: newState.imagePreviewUrl ?? imagePreviewUrl,
      serverImageUrl: newState.serverImageUrl ?? serverImageUrl,
    };
    
    // Save state for uploading, processing, completed, and error states
    // Only clear state when explicitly requested (forceClear) or transitioning to idle
    if (currentState.appState === 'uploading' || currentState.appState === 'processing' || currentState.appState === 'completed' || currentState.appState === 'error') {
      saveStateToStorage(currentState);
    } else if (currentState.appState === 'idle' || forceClear) {
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
    if (savedState && (savedState.examPaperId || savedState.appState === 'completed')) {
      console.log('🔄 Restoring saved state:', savedState);
      
      // Restore all state values
      setAppState(savedState.appState);
      setCurrentStep(savedState.currentStep);
      setProgress(savedState.progress);
      setExamPaperId(savedState.examPaperId);
      setResults(savedState.results);
      if (savedState.imagePreviewUrl) {
        setImagePreviewUrl(savedState.imagePreviewUrl);
      }
      if (savedState.serverImageUrl) {
        setServerImageUrl(savedState.serverImageUrl);
        // If we have a server image URL but no preview URL, use the server URL for preview
        if (!savedState.imagePreviewUrl) {
          setImagePreviewUrl(savedState.serverImageUrl);
        }
      }
      
      // Don't automatically resume processing - let user decide
      // This prevents automatic conflicts and unexpected page clearing
      if (savedState.appState === 'processing' && savedState.examPaperId) {
        // Just show that we can resume, but don't do it automatically
        toast({
          title: "任务已恢复",
          description: "检测到未完成的分析任务，您可以点击重试分析按钮继续",
        });
        
        // Set state to error so user can manually retry
        setAppState('error');
      }
    }
  }, []);

  // Cleanup image URLs on unmount to prevent memory leaks (only for object URLs)
  useEffect(() => {
    return () => {
      if (imagePreviewUrl && imagePreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => {
      console.log('Back online');
      // Don't automatically continue processing to prevent conflicts
      if (appState === 'processing' && examPaperId) {
        toast({
          title: "网络已恢复",
          description: "网络连接已恢复，您可以点击重试分析按钮继续",
        });
        // Change to error state so user can manually retry
        updateStateAndSave({ appState: 'error' });
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
          description: "请检查网络连接",
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
    let progressInterval: NodeJS.Timeout | null = null;
    let actualQuestions: number | null = null; // No hardcoded fallback
    let countingMethod: string = "unknown";
    let countConfidence: string = "unknown";
    
    try {
      // Stage 1: Quick question count
      updateStateAndSave({
        appState: "processing",
        currentStep: "analysis",
        progress: { 
          step: "analysis", 
          progress: 5, 
          message: "识别题目数量...",
          currentQuestion: 0,
          totalQuestions: 0,
          questionProgress: "正在识别题目..."
        }
      });

      try {
        const countResponse = await resilientFetch(`/api/exam-papers/${paperId}/count-questions`, {
          method: 'POST',
        });
        
        if (countResponse.ok) {
          const countData = await countResponse.json();
          if (countData.success && typeof countData.questionCount === 'number') {
            actualQuestions = countData.questionCount;
            countingMethod = countData.method || "unknown";
            countConfidence = countData.confidence || "unknown";
            
            console.log(`Stage 1: Detected ${actualQuestions} questions using ${countingMethod} (confidence: ${countConfidence})`);
            
            // Show appropriate message based on confidence and method
            let countMessage = `检测到 ${actualQuestions} 题`;
            if (countConfidence === 'low') {
              countMessage += ' (可信度较低)';
            } else if (countingMethod === 'ocr_regex') {
              countMessage += ' (OCR识别)';
            } else {
              countMessage += ' (AI分析)';
            }
            
            // Show warning if provided
            if (countData.warning) {
              toast({
                title: "题目计数提醒",
                description: countData.warning,
                variant: "default",
              });
            }
            
            updateStateAndSave({
              progress: { 
                step: "analysis", 
                progress: 8, 
                message: countMessage,
                currentQuestion: 0,
                totalQuestions: actualQuestions!,
                questionProgress: `${countMessage}`
              }
            });
          }
        } else if (countResponse.status === 422) {
          // Count failed but request was valid
          const errorData = await countResponse.json();
          console.warn('Question counting failed:', errorData.warning || errorData.message);
          countingMethod = errorData.method || "unknown";
          countConfidence = "low";
          
          toast({
            title: "题目计数失败",
            description: errorData.message || "无法准确统计题目数量，需要手动指定",
            variant: "destructive",
          });
          
          // Set actualQuestions to null to handle uncertain state
          actualQuestions = null;
        } else {
          console.warn('Question counting request failed');
          countingMethod = "unknown";
          countConfidence = "low";
          
          toast({
            title: "题目计数服务异常",
            description: "无法连接计数服务，需要手动指定题目数量",
            variant: "destructive",
          });
          
          // Set actualQuestions to null to handle uncertain state
          actualQuestions = null;
        }
      } catch (countError) {
        console.warn('Question counting error:', countError);
        countingMethod = "unknown";
        countConfidence = "low";
        
        toast({
          title: "题目计数错误",
          description: "计数过程出现错误，需要手动指定题目数量",
          variant: "destructive",
        });
        
        // Set actualQuestions to null to handle uncertain state
        actualQuestions = null;
      }

      // Handle uncertain question count
      if (actualQuestions === null) {
        // Could not determine question count - skip detailed analysis for now
        updateStateAndSave({
          appState: "error",
          progress: { 
            step: "analysis", 
            progress: 0, 
            message: "无法确定题目数量，请重新上传或检查文件质量",
            currentQuestion: 0,
            totalQuestions: 0,
            questionProgress: "题目数量未知"
          }
        });
        setIsProcessing(false);
        return;
      }

      // Stage 2: Detailed analysis with real question count
      // At this point, actualQuestions is guaranteed to be non-null due to the check above
      const questionCount = actualQuestions; // Type-safe assignment
      let currentQuestion = 0;
      
      updateStateAndSave({
        progress: { 
          step: "analysis", 
          progress: 10, 
          message: `开始分析 ${questionCount} 题...`,
          currentQuestion: 0,
          totalQuestions: questionCount,
          questionProgress: `准备分析 ${questionCount} 题`
        }
      });

      // 启动基于真实题目数的进度模拟定时器
      const startTime = Date.now();
      progressInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        // 根据题目数量动态调整每题分析时间（2-4秒/题）
        const timePerQuestion = Math.max(2000, Math.min(4000, 24000 / questionCount));
        const newCurrentQuestion = Math.min(Math.floor(elapsed / timePerQuestion) + 1, questionCount);
        
        if (newCurrentQuestion > currentQuestion) {
          currentQuestion = newCurrentQuestion;
          const baseProgress = 10;
          const analysisProgress = (currentQuestion / questionCount) * 70; // 70% for analysis
          
          updateStateAndSave({
            progress: { 
              step: "analysis", 
              progress: baseProgress + analysisProgress, 
              message: `正在分析第 ${currentQuestion} 题...`,
              currentQuestion,
              totalQuestions: questionCount,
              questionProgress: `${currentQuestion}/${questionCount}`
            }
          });
        }
      }, 1000); // 每秒检查一次

      // 执行实际的AI详细分析
      const analysisResponse = await resilientFetch(`/api/exam-papers/${paperId}/analyze`, {
        method: 'POST',
      });
      
      // 清除进度定时器
      if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
      }
      
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

      // 验证题目数量准确性并纠正进度显示
      const finalQuestions = analysisData.result.questionAnalysis?.length || questionCount;
      if (finalQuestions !== questionCount) {
        console.log(`Question count adjusted: ${questionCount} -> ${finalQuestions}`);
        
        // 重新计算并更新进度显示，纠正之前基于错误计数的进度
        updateStateAndSave({ 
          progress: { 
            step: "analysis", 
            progress: 85, 
            message: `题目数量已纠正：实际 ${finalQuestions} 题`,
            currentQuestion: finalQuestions,
            totalQuestions: finalQuestions,
            questionProgress: `${finalQuestions}/${finalQuestions}`
          } 
        });
        
        // 给用户一个短暂的时间来看到纠正信息
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      updateStateAndSave({ 
        progress: { 
          step: "analysis", 
          progress: 85, 
          message: `分析完成！共 ${finalQuestions} 题`,
          currentQuestion: finalQuestions,
          totalQuestions: finalQuestions,
          questionProgress: `${finalQuestions}/${finalQuestions}`
        } 
      });

      // Step 3: Generate Report
      updateStateAndSave({
        currentStep: "generating",
        progress: { 
          step: "generating", 
          progress: 90, 
          message: "正在生成详细报告...",
          currentQuestion: actualQuestions,
          totalQuestions: actualQuestions,
          questionProgress: `已完成 ${actualQuestions} 题分析`
        }
      });

      // 模拟报告生成进度
      await new Promise(resolve => setTimeout(resolve, 800));
      
      updateStateAndSave({
        currentStep: "generating",
        progress: { 
          step: "generating", 
          progress: 95, 
          message: "整理分析结果...",
          currentQuestion: actualQuestions,
          totalQuestions: actualQuestions,
          questionProgress: `已完成 ${actualQuestions} 题分析`
        }
      });

      await new Promise(resolve => setTimeout(resolve, 500));

      // Step 4: Results
      updateStateAndSave({
        currentStep: "results",
        progress: { 
          step: "results", 
          progress: 100, 
          message: "报告生成完成！",
          currentQuestion: actualQuestions,
          totalQuestions: actualQuestions,
          questionProgress: `已完成 ${actualQuestions} 题分析`
        }
      });

      // Ensure atomic update of results and completed state
      updateStateAndSave({
        appState: "completed",
        currentStep: "results",
        progress: { 
          step: "results", 
          progress: 100, 
          message: "分析完成",
          currentQuestion: actualQuestions,
          totalQuestions: actualQuestions,
          questionProgress: `已完成 ${actualQuestions} 题分析`
        },
        results: analysisData.result
      });
      
      toast({
        title: "分析完成",
        description: `试卷已成功分析，共 ${finalQuestions} 题！`,
      });
    } catch (error) {
      // 清除进度定时器
      if (progressInterval) {
        clearInterval(progressInterval);
      }
      
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
          message: "处理失败",
          currentQuestion: 0,
          totalQuestions: 0,
          questionProgress: "分析中断"
        }
      });
      
      toast({
        title: "处理失败", 
        description: error instanceof Error ? error.message : "试卷处理过程中出现错误",
        variant: "destructive",
      });
    } finally {
      // 清理定时器
      if (progressInterval) {
        clearInterval(progressInterval);
      }
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
        
        // Clean up the temporary object URL after processing
        URL.revokeObjectURL(imageUrl);
        
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
      
      img.onerror = () => {
        // Clean up the temporary object URL on error
        URL.revokeObjectURL(imageUrl);
        resolve(file); // Fallback to original if load fails
      };
      const imageUrl = URL.createObjectURL(file);
      img.src = imageUrl;
    });
  };

  const handleFileSelect = async (file: File, previewUrl: string) => {
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
        progress: { step: "upload", progress: 20, message: "正在优化图片..." },
        imagePreviewUrl: previewUrl
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
        examPaperId: uploadData.examPaperId,
        serverImageUrl: uploadData.imageUrl
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

  const handleRetryAnalysis = async () => {
    // Don't retry if already processing or no exam paper ID
    if (isProcessing || !examPaperId) {
      toast({
        title: "无法重试",
        description: "没有可重试的试卷或正在处理中",
        variant: "destructive",
      });
      return;
    }

    // Reset state to processing and retry analysis
    updateStateAndSave({
      appState: "processing",
      currentStep: "analysis",
      progress: { step: "analysis", progress: 0, message: "重新开始分析..." }
    });

    toast({
      title: "正在重试",
      description: "保持原有试卷，重新进行AI分析",
    });

    // Retry the analysis with the existing exam paper
    await processWithGemini(examPaperId);
  };

  const handleStartOver = () => {
    // Clean up image URL to prevent memory leaks (only for object URLs)
    if (imagePreviewUrl && imagePreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    
    setIsProcessing(false);
    updateStateAndSave({
      appState: "idle",
      currentStep: "upload",
      progress: { step: "upload", progress: 0, message: "准备上传..." },
      results: null,
      examPaperId: null,
      imagePreviewUrl: null,
      serverImageUrl: null
    }, true); // Force clear saved state
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
            
            {imagePreviewUrl && (
              <div className="space-y-4">
                {/* Image Preview */}
                <div className="bg-white dark:bg-gray-900 p-3 rounded-lg border shadow-sm">
                  <img 
                    src={imagePreviewUrl} 
                    alt="试卷预览" 
                    className="w-full h-auto max-h-64 object-contain rounded mx-auto"
                    data-testid="image-preview"
                  />
                  <p className="text-center text-xs text-muted-foreground mt-2">
                    试卷预览
                  </p>
                </div>
              </div>
            )}
            
            {/* Progress Info */}
            <ProgressIndicator progress={progress} />
          </div>
        )}

        {appState === "error" && (
          <div className="space-y-6 py-8">
            <div className="text-center space-y-2">
              <h2 className="text-xl font-semibold text-destructive">处理失败</h2>
              <p className="text-muted-foreground">
                试卷处理过程中遇到问题，您可以重试分析或重新上传
              </p>
            </div>
            
            {/* Show image preview if available */}
            {imagePreviewUrl && (
              <div className="space-y-4">
                <div className="bg-white dark:bg-gray-900 p-3 rounded-lg border shadow-sm">
                  <img 
                    src={imagePreviewUrl} 
                    alt="试卷预览" 
                    className="w-full h-auto max-h-64 object-contain rounded mx-auto"
                    data-testid="image-preview"
                  />
                  <p className="text-center text-xs text-muted-foreground mt-2">
                    试卷预览
                  </p>
                </div>
              </div>
            )}
            
            <div className="space-y-3">
              {/* Retry Analysis Button - Only show if we have an exam paper ID */}
              {examPaperId && (
                <Button
                  variant="default"
                  className="w-full"
                  onClick={handleRetryAnalysis}
                  disabled={isProcessing}
                  data-testid="button-retry-analysis"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  重试分析
                </Button>
              )}
              
              {/* Start Over Button */}
              <Button
                variant="outline"
                className="w-full"
                onClick={handleStartOver}
                disabled={isProcessing}
                data-testid="button-start-over"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                重新上传试卷
              </Button>
            </div>
          </div>
        )}

        {appState === "completed" && (
          <div className="space-y-6">
            {results ? (
              <>
                {/* Image Preview for completed state */}
                {imagePreviewUrl && (
                  <div className="space-y-4">
                    <div className="bg-white dark:bg-gray-900 p-3 rounded-lg border shadow-sm">
                      <img 
                        src={imagePreviewUrl} 
                        alt="试卷预览" 
                        className="w-full h-auto max-h-64 object-contain rounded mx-auto"
                        data-testid="image-preview"
                      />
                      <p className="text-center text-xs text-muted-foreground mt-2">
                        试卷预览
                      </p>
                    </div>
                  </div>
                )}
                
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