import ResultsCard from '../ResultsCard'

export default function ResultsCardExample() {
  // todo: remove mock functionality
  const mockResult = {
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

  const handleDownload = () => {
    console.log('下载报告');
  };

  const handleShare = () => {
    console.log('分享结果');
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <ResultsCard 
        result={mockResult} 
        onDownload={handleDownload}
        onShare={handleShare}
      />
    </div>
  );
}