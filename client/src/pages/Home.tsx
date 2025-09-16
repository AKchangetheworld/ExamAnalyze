import { useState } from "react";
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
  const { toast } = useToast();

  const processWithGemini = async (paperId: string) => {
    try {
      // Step 1: OCR Processing
      setCurrentStep("ocr");
      setProgress({ step: "ocr", progress: 0, message: "正在识别试卷内容..." });
      
      for (let i = 0; i <= 90; i += 10) {
        setProgress(prev => ({ ...prev, progress: i }));
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      const ocrResponse = await fetch(`/api/exam-papers/${paperId}/ocr`, {
        method: 'POST',
      });
      
      if (!ocrResponse.ok) {
        const errorText = await ocrResponse.text().catch(() => 'Unknown error');
        throw new Error(`OCR处理失败: ${ocrResponse.status} - ${errorText}`);
      }

      // OCR response validation - only parse if content type is JSON
      const contentType = ocrResponse.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        try {
          await ocrResponse.json(); // Parse but don't store since not used
        } catch (jsonError) {
          console.error('OCR JSON parse error:', jsonError);
          throw new Error('OCR响应格式错误');
        }
      }

      setProgress({ step: "ocr", progress: 100, message: "OCR识别完成" });
      await new Promise(resolve => setTimeout(resolve, 500));

      // Step 2: AI Analysis
      setCurrentStep("analysis");
      setProgress({ step: "analysis", progress: 0, message: "AI正在分析试卷..." });
      
      for (let i = 0; i <= 90; i += 10) {
        setProgress(prev => ({ ...prev, progress: i }));
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      const analysisResponse = await fetch(`/api/exam-papers/${paperId}/analyze`, {
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

      setProgress({ step: "analysis", progress: 100, message: "AI分析完成" });
      await new Promise(resolve => setTimeout(resolve, 500));

      // Step 3: Results
      setCurrentStep("results");
      setProgress({ step: "results", progress: 100, message: "生成分析报告..." });
      await new Promise(resolve => setTimeout(resolve, 500));

      setResults(analysisData.result);
      setAppState("completed");
      
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
      setAppState("error");
      setProgress({ 
        step: currentStep, 
        progress: 0, 
        message: "处理失败" 
      });
      
      toast({
        title: "处理失败", 
        description: error instanceof Error ? error.message : "试卷处理过程中出现错误",
        variant: "destructive",
      });
    }
  };

  const handleFileSelect = async (file: File) => {
    try {
      console.log('File selected:', file.name);
      setAppState("uploading");
      setCurrentStep("upload");
      setProgress({ step: "upload", progress: 0, message: "正在上传试卷..." });

      // Upload file
      const formData = new FormData();
      formData.append('examPaper', file);

      for (let i = 0; i <= 90; i += 10) {
        setProgress(prev => ({ ...prev, progress: i }));
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const uploadResponse = await fetch('/api/exam-papers/upload', {
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

      setProgress({ step: "upload", progress: 100, message: "上传完成" });
      setExamPaperId(uploadData.examPaperId);
      setAppState("processing");

      // Start processing with Gemini
      await processWithGemini(uploadData.examPaperId);
    } catch (error) {
      console.error('Upload error:', error, {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace'
      });
      
      // Ensure we don't clear the page by maintaining component state
      setAppState("error");
      setProgress({ 
        step: "upload", 
        progress: 0, 
        message: "上传失败" 
      });
      
      toast({
        title: "上传失败",
        description: error instanceof Error ? error.message : "文件上传过程中出现错误",
        variant: "destructive",
      });
    }
  };

  const handleStartOver = () => {
    setAppState("idle");
    setCurrentStep("upload");
    setProgress({ step: "upload", progress: 0, message: "准备上传..." });
    setResults(null);
    setExamPaperId(null);
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