import { useQuery } from "@tanstack/react-query";
import { WrongQuestion } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, BookOpen, Target, Lightbulb, Calendar } from "lucide-react";
import { Link } from "wouter";

export default function WrongQuestions() {
  const { data: wrongQuestions, isLoading } = useQuery<WrongQuestion[]>({
    queryKey: ['/api/wrong-questions'],
  });

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">加载错题数据中...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!wrongQuestions || wrongQuestions.length === 0) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center py-16">
          <BookOpen className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-semibold mb-2">暂无错题</h2>
          <p className="text-muted-foreground mb-4">
            当你完成试卷分析后，答错的题目会自动添加到错题本中
          </p>
          <Link href="/">
            <Button data-testid="button-go-home">
              去做题
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2 mb-2">
          <AlertCircle className="h-8 w-8 text-destructive" />
          错题本
        </h1>
        <p className="text-muted-foreground">
          总共 {wrongQuestions.length} 道错题，温故而知新
        </p>
      </div>

      <div className="space-y-6">
        {wrongQuestions.map((question, index) => (
          <Card key={`${question.examId}-${question.questionNumber}`} className="w-full">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="h-5 w-5 text-destructive" />
                  第 {question.questionNumber} 题
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="destructive" className="text-sm">
                    答错
                  </Badge>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground" data-testid={`text-exam-date-${index}`}>
                    <Calendar className="h-4 w-4" />
                    {question.examDate}
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* 题目内容 */}
              <div className="space-y-2">
                <h3 className="font-semibold text-base flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  题目
                </h3>
                <div className="bg-muted/50 p-4 rounded-lg" data-testid={`text-question-${index}`}>
                  <p className="whitespace-pre-wrap">{question.questionText}</p>
                </div>
              </div>

              <Separator />

              {/* 答案对比 */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h3 className="font-semibold text-base text-destructive">
                    你的答案
                  </h3>
                  <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-lg" data-testid={`text-user-answer-${index}`}>
                    <p className="whitespace-pre-wrap">{question.userAnswer}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold text-base text-green-600">
                    正确答案
                  </h3>
                  <div className="bg-green-50 border border-green-200 p-4 rounded-lg dark:bg-green-950 dark:border-green-800" data-testid={`text-correct-answer-${index}`}>
                    <p className="whitespace-pre-wrap">{question.correctAnswer}</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* 详细解析 */}
              <div className="space-y-2">
                <h3 className="font-semibold text-base flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-amber-500" />
                  详细解析
                </h3>
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg dark:bg-blue-950 dark:border-blue-800" data-testid={`text-explanation-${index}`}>
                  <p className="whitespace-pre-wrap">{question.explanation}</p>
                </div>
              </div>

              {/* 反馈建议 */}
              {question.feedback && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-base">
                    学习建议
                  </h3>
                  <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg dark:bg-amber-950 dark:border-amber-800" data-testid={`text-feedback-${index}`}>
                    <p className="whitespace-pre-wrap">{question.feedback}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}