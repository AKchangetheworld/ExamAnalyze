import { useState } from "react";
import { ProcessingStep, UploadProgress, AnalysisResult } from "@shared/schema";
import Header from "@/components/Header";
import FileUpload from "@/components/FileUpload";
import ProcessingSteps from "@/components/ProcessingSteps";
import ProgressIndicator from "@/components/ProgressIndicator";
import ResultsCard from "@/components/ResultsCard";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

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

  // todo: remove mock functionality
  const mockResults: AnalysisResult = {
    overallScore: 85,
    maxScore: 100,
    grade: 'B+',
    feedback: {
      strengths: [
        '数学计算准确，基础知识掌握扎实',
        '解题思路清晰，步骤完整',
        '字迹工整，答题规范'
      ],
      improvements: [
        '应用题理解需要加强',
        '几何证明过程可以更详细',
        '检查习惯需要培养'
      ],
      detailedFeedback: '本次考试整体表现良好，基础知识掌握扎实，计算能力较强。在代数运算方面表现出色，但在几何证明和应用题理解方面还需要进一步加强。建议多做类似的练习题，提高空间想象能力和逻辑推理能力。'
    },
    questionAnalysis: [
      {
        questionNumber: 1,
        score: 8,
        maxScore: 10,
        feedback: '基础计算正确，但过程略显简单，建议写出详细步骤'
      },
      {
        questionNumber: 2,
        score: 9,
        maxScore: 10,
        feedback: '解题思路正确，答案准确，表现优秀'
      },
      {
        questionNumber: 3,
        score: 6,
        maxScore: 10,
        feedback: '几何证明逻辑有误，需要重新理解定理条件'
      }
    ]
  };

  const simulateProcessing = async () => {
    const steps: Array<{step: ProcessingStep, duration: number, message: string}> = [
      { step: "upload", duration: 1000, message: "正在上传试卷..." },
      { step: "ocr", duration: 2000, message: "正在识别试卷内容..." },
      { step: "analysis", duration: 3000, message: "AI正在分析试卷..." },
      { step: "results", duration: 500, message: "生成分析报告..." }
    ];

    for (const { step, duration, message } of steps) {
      setCurrentStep(step);
      setProgress({ step, progress: 0, message });
      
      // Simulate progress for current step
      for (let i = 0; i <= 100; i += 10) {
        setProgress(prev => ({ ...prev, progress: i }));
        await new Promise(resolve => setTimeout(resolve, duration / 10));
      }
    }

    setResults(mockResults);
    setAppState("completed");
  };

  const handleFileSelect = async (file: File) => {
    console.log('File selected:', file.name);
    setAppState("processing");
    await simulateProcessing();
  };

  const handleStartOver = () => {
    setAppState("idle");
    setCurrentStep("upload");
    setProgress({ step: "upload", progress: 0, message: "准备上传..." });
    setResults(null);
  };

  const handleDownload = () => {
    console.log('下载分析报告');
    // todo: remove mock functionality - implement real download
  };

  const handleShare = () => {
    console.log('分享分析结果');
    // todo: remove mock functionality - implement real sharing
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