import { useState } from "react";
import { ProcessingStep, UploadProgress, AnalysisResult } from "@shared/schema";
import Header from "@/components/Header";
import FileUpload from "@/components/FileUpload";
import ProcessingSteps from "@/components/ProcessingSteps";
import ProgressIndicator from "@/components/ProgressIndicator";
import ResultsCard from "@/components/ResultsCard";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { apiService } from "@/lib/api";
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
  const [uploadedData, setUploadedData] = useState<{id: string, base64Image: string} | null>(null);
  const { toast } = useToast();

  // 真实的AI处理流程
  const processExamPaper = async (id: string, base64Image: string) => {
    try {
      // 步骤1：上传完成，开始OCR
      setCurrentStep("ocr");
      setProgress({ step: "ocr", progress: 0, message: "正在识别试卷内容..." });
      
      for (let i = 0; i <= 100; i += 20) {
        setProgress(prev => ({ ...prev, progress: i }));
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // 步骤2：开始AI分析
      setCurrentStep("analysis");
      setProgress({ step: "analysis", progress: 0, message: "AI正在分析试卷..." });
      
      for (let i = 0; i <= 80; i += 20) {
        setProgress(prev => ({ ...prev, progress: i }));
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // 调用真实API进行处理
      const result = await apiService.processExamPaper(id, base64Image);
      
      setProgress({ step: "analysis", progress: 100, message: "分析完成" });
      
      // 步骤3：生成结果
      setCurrentStep("results");
      setProgress({ step: "results", progress: 100, message: "生成分析报告..." });
      
      setResults(result.analysisResult);
      setAppState("completed");

    } catch (error) {
      console.error('Processing failed:', error);
      toast({
        title: "处理失败",
        description: error instanceof Error ? error.message : "未知错误，请重试",
        variant: "destructive",
      });
      setAppState("idle");
    }
  };

  const handleFileSelect = async (file: File) => {
    console.log('File selected:', file.name);
    setAppState("processing");
    setCurrentStep("upload");
    setProgress({ step: "upload", progress: 0, message: "正在上传试卷..." });

    try {
      // 真实文件上传
      for (let i = 0; i <= 100; i += 25) {
        setProgress(prev => ({ ...prev, progress: i }));
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const uploadResult = await apiService.uploadFile(file);
      setUploadedData({ id: uploadResult.id, base64Image: uploadResult.base64Image });
      
      // 开始处理
      await processExamPaper(uploadResult.id, uploadResult.base64Image);

    } catch (error) {
      console.error('Upload failed:', error);
      toast({
        title: "上传失败", 
        description: error instanceof Error ? error.message : "未知错误，请重试",
        variant: "destructive",
      });
      setAppState("idle");
    }
  };


  const handleStartOver = () => {
    setAppState("idle");
    setCurrentStep("upload");
    setProgress({ step: "upload", progress: 0, message: "准备上传..." });
    setResults(null);
    setUploadedData(null);
  };

  const handleDownload = () => {
    if (!results) return;
    
    const reportContent = `试卷分析报告
===============

总分：${results.overallScore}/${results.maxScore} (${results.grade})

优点：
${results.feedback.strengths.map(s => `• ${s}`).join('\n')}

改进建议：
${results.feedback.improvements.map(i => `• ${i}`).join('\n')}

详细点评：
${results.feedback.detailedFeedback}

题目分析：
${results.questionAnalysis.map(qa => `第${qa.questionNumber}题: ${qa.score}/${qa.maxScore}分 - ${qa.feedback}`).join('\n')}
`;

    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '试卷分析报告.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "下载成功",
      description: "分析报告已保存到下载文件夹",
    });
  };

  const handleShare = async () => {
    if (!results) return;
    
    const shareText = `我的试卷分析结果：${results.overallScore}/${results.maxScore}分 (${results.grade})`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: '试卷分析结果',
          text: shareText,
        });
      } catch (error) {
        console.log('分享取消或失败');
      }
    } else {
      // 备选方案：复制到剪贴板
      try {
        await navigator.clipboard.writeText(shareText);
        toast({
          title: "已复制到剪贴板",
          description: "可以粘贴到其他应用分享结果",
        });
      } catch (error) {
        console.log('复制失败');
      }
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

        {appState === "processing" && (
          <div className="space-y-6 py-8">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2">正在处理试卷</h2>
              <p className="text-muted-foreground">
                请稍候，AI正在分析您的试卷
              </p>
            </div>
            <ProgressIndicator progress={progress} />
          </div>
        )}

        {appState === "completed" && results && (
          <div className="space-y-6">
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
          </div>
        )}
      </main>
    </div>
  );
}