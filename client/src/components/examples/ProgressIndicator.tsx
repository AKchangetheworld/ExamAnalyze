import ProgressIndicator from '../ProgressIndicator'

export default function ProgressIndicatorExample() {
  const mockProgress = {
    step: "ocr" as const,
    progress: 65,
    message: "正在识别试卷内容..."
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <ProgressIndicator progress={mockProgress} />
    </div>
  );
}