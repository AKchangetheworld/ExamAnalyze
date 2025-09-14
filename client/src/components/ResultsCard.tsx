import { AnalysisResult } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertCircle, TrendingUp, Download, Share } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";

interface ResultsCardProps {
  result: AnalysisResult;
  onDownload?: () => void;
  onShare?: () => void;
  className?: string;
}

function getGradeColor(grade: string) {
  switch (grade) {
    case 'A': case 'A+': return 'bg-chart-1 text-white';
    case 'B': case 'B+': return 'bg-chart-2 text-white';
    case 'C': case 'C+': return 'bg-chart-3 text-white';
    default: return 'bg-destructive text-destructive-foreground';
  }
}

export default function ResultsCard({ result, onDownload, onShare, className = "" }: ResultsCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const scorePercentage = (result.overallScore / result.maxScore) * 100;

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">批改结果</CardTitle>
          <Badge className={`text-sm font-semibold ${getGradeColor(result.grade)}`}>
            {result.grade}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Overall Score */}
        <div className="text-center space-y-2">
          <div className="relative w-24 h-24 mx-auto">
            <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="40"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-secondary"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 40}`}
                strokeDashoffset={`${2 * Math.PI * 40 * (1 - scorePercentage / 100)}`}
                className="text-chart-1 transition-all duration-700"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold">{result.overallScore}</span>
              <span className="text-xs text-muted-foreground">/{result.maxScore}</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            得分率: {scorePercentage.toFixed(1)}%
          </p>
        </div>

        {/* Quick Feedback */}
        <div className="space-y-3">
          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-chart-1 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium">做得好的地方</p>
              <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                {result.feedback.strengths.map((strength, index) => (
                  <li key={index}>• {strength}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <TrendingUp className="w-4 h-4 text-chart-2 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium">可以改进的地方</p>
              <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                {result.feedback.improvements.map((improvement, index) => (
                  <li key={index}>• {improvement}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Detailed Analysis Toggle */}
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full" data-testid="button-toggle-details">
              {isExpanded ? '收起详细分析' : '展开详细分析'}
            </Button>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="space-y-4 mt-4">
            {/* Detailed Feedback */}
            <div>
              <h4 className="text-sm font-medium mb-2">详细点评</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {result.feedback.detailedFeedback}
              </p>
            </div>

            {/* Question Analysis */}
            <div>
              <h4 className="text-sm font-medium mb-3">题目分析</h4>
              <div className="space-y-3">
                {result.questionAnalysis.map((qa, index) => (
                  <div key={index} className="bg-muted/50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">第 {qa.questionNumber} 题</span>
                      <Badge variant="secondary" className="text-xs">
                        {qa.score}/{qa.maxScore}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{qa.feedback}</p>
                  </div>
                ))}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={onDownload}
            data-testid="button-download"
          >
            <Download className="w-4 h-4 mr-2" />
            下载报告
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={onShare}
            data-testid="button-share"
          >
            <Share className="w-4 h-4 mr-2" />
            分享结果
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}