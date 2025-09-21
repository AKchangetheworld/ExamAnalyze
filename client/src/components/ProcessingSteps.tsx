import { Check, Upload, Scan, Brain, FileText, Clipboard } from "lucide-react";
import { ProcessingStep } from "@shared/schema";

interface ProcessingStepsProps {
  currentStep: ProcessingStep;
  progress: number;
  className?: string;
}

const steps = [
  { key: "upload" as ProcessingStep, label: "上传", icon: Upload },
  { key: "ocr" as ProcessingStep, label: "识别", icon: Scan },
  { key: "analysis" as ProcessingStep, label: "分析", icon: Brain },
  { key: "generating" as ProcessingStep, label: "生成", icon: Clipboard },
  { key: "results" as ProcessingStep, label: "结果", icon: FileText },
];

export default function ProcessingSteps({ currentStep, progress, className = "" }: ProcessingStepsProps) {
  const currentStepIndex = steps.findIndex(step => step.key === currentStep);

  return (
    <div className={`flex items-center justify-between ${className}`}>
      {steps.map((step, index) => {
        const Icon = step.icon;
        const isCompleted = index < currentStepIndex;
        const isCurrent = index === currentStepIndex;
        const isUpcoming = index > currentStepIndex;

        return (
          <div key={step.key} className="flex flex-col items-center flex-1">
            {/* Step indicator */}
            <div className="relative">
              <div
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all
                  ${isCompleted ? 'bg-chart-1 border-chart-1 text-white' : 
                    isCurrent ? 'border-chart-2 bg-chart-2/10 text-chart-2' : 
                    'border-border bg-background text-muted-foreground'}
                `}
              >
                {isCompleted ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <Icon className="w-5 h-5" />
                )}
              </div>
              
              {/* Progress ring for current step */}
              {isCurrent && (
                <svg className="absolute inset-0 w-10 h-10 -rotate-90">
                  <circle
                    cx="20"
                    cy="20"
                    r="18"
                    stroke="currentColor"
                    strokeWidth="2"
                    fill="none"
                    className="text-border"
                  />
                  <circle
                    cx="20"
                    cy="20"
                    r="18"
                    stroke="currentColor"
                    strokeWidth="2"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 18}`}
                    strokeDashoffset={`${2 * Math.PI * 18 * (1 - progress / 100)}`}
                    className="text-chart-2 transition-all duration-300"
                  />
                </svg>
              )}
            </div>
            
            {/* Step label */}
            <span
              className={`
                text-xs font-medium mt-2 transition-colors
                ${isCompleted || isCurrent ? 'text-foreground' : 'text-muted-foreground'}
              `}
            >
              {step.label}
            </span>
            
            {/* Connection line */}
            {index < steps.length - 1 && (
              <div
                className={`
                  absolute top-5 left-1/2 w-full h-0.5 -z-10 transition-colors
                  ${index < currentStepIndex ? 'bg-chart-1' : 'bg-border'}
                `}
                style={{
                  transform: 'translateX(20px)',
                  width: 'calc(100% - 40px)'
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}