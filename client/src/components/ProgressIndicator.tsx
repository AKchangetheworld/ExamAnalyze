import { UploadProgress } from "@shared/schema";

interface ProgressIndicatorProps {
  progress: UploadProgress;
  className?: string;
}

export default function ProgressIndicator({ progress, className = "" }: ProgressIndicatorProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{progress.message}</span>
        <span className="text-xs text-muted-foreground">{progress.progress}%</span>
      </div>
      
      {/* 题目进度显示 */}
      {progress.questionProgress && (
        <div className="flex items-center justify-center space-x-2 text-xs text-muted-foreground">
          <span>题目进度:</span>
          <span className="font-mono bg-secondary px-2 py-1 rounded">
            {progress.questionProgress}
          </span>
        </div>
      )}
      
      <div className="w-full bg-secondary rounded-full h-2">
        <div
          className="bg-chart-2 h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progress.progress}%` }}
        />
      </div>
      
      {/* 当前题目号显示 */}
      {progress.currentQuestion && progress.currentQuestion > 0 && (
        <div className="text-center">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            正在分析第 {progress.currentQuestion} 题
          </span>
        </div>
      )}
    </div>
  );
}