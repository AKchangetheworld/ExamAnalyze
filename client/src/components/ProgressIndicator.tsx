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
      
      <div className="w-full bg-secondary rounded-full h-2">
        <div
          className="bg-chart-2 h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progress.progress}%` }}
        />
      </div>
    </div>
  );
}