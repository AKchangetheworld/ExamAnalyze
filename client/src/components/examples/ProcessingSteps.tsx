import ProcessingSteps from '../ProcessingSteps'

export default function ProcessingStepsExample() {
  return (
    <div className="p-4 max-w-md mx-auto space-y-8">
      <div>
        <h3 className="text-sm font-medium mb-4">当前步骤: 上传 (75%)</h3>
        <ProcessingSteps currentStep="upload" progress={75} />
      </div>
      
      <div>
        <h3 className="text-sm font-medium mb-4">当前步骤: OCR识别 (45%)</h3>
        <ProcessingSteps currentStep="ocr" progress={45} />
      </div>
      
      <div>
        <h3 className="text-sm font-medium mb-4">当前步骤: AI分析 (90%)</h3>
        <ProcessingSteps currentStep="analysis" progress={90} />
      </div>
    </div>
  );
}