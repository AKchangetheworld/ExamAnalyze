import { useQuery } from "@tanstack/react-query";
import { WrongQuestionClassification } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AlertCircle, BookOpen, Target, Lightbulb, ChevronDown, ChevronRight, Home, BarChart3 } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";

export default function WrongQuestionsClassified() {
  const { data: classification, isLoading } = useQuery<WrongQuestionClassification>({
    queryKey: ['/api/wrong-questions/classified'],
  });

  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  const toggleCategory = (categoryKey: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryKey]: !prev[categoryKey]
    }));
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">分析错题分类中...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!classification || classification.summary.totalQuestions === 0) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center py-16">
          <BarChart3 className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-semibold mb-2">暂无错题分类</h2>
          <p className="text-muted-foreground mb-4">
            当你有错题时，系统会自动进行分类分析
          </p>
          <Link href="/wrong-questions">
            <Button data-testid="button-go-wrong-questions">
              查看错题本
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const renderCategorySection = (
    title: string,
    icon: React.ReactNode,
    data: Record<string, any[]>,
    description: string
  ) => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <h3 className="text-xl font-semibold">{title}</h3>
        <Badge variant="secondary">{Object.keys(data).length} 类</Badge>
      </div>
      <p className="text-sm text-muted-foreground mb-4">{description}</p>
      
      <div className="space-y-3">
        {Object.entries(data).map(([category, questions]) => (
          <Card key={category} className="border-l-4 border-l-primary">
            <Collapsible 
              open={expandedCategories[category]} 
              onOpenChange={() => toggleCategory(category)}
            >
              <CollapsibleTrigger asChild>
                <CardHeader className="hover:bg-muted/50 cursor-pointer transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        {expandedCategories[category] ? 
                          <ChevronDown className="h-4 w-4" /> : 
                          <ChevronRight className="h-4 w-4" />
                        }
                        <CardTitle className="text-lg">{category}</CardTitle>
                      </div>
                      <Badge variant="outline" data-testid={`badge-${category}-count`}>
                        {questions.length} 题
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <div className="space-y-4">
                    {questions.map((question, index) => (
                      <div key={`${question.examId}-${question.questionNumber}`} className="border rounded-lg p-4 bg-background">
                        <div className="flex items-start justify-between mb-2">
                          <Badge variant="secondary" className="mb-2">
                            第 {question.questionNumber} 题
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {question.examDate}
                          </Badge>
                        </div>
                        
                        <div className="space-y-3">
                          <div>
                            <h4 className="font-medium text-sm mb-1">题目内容</h4>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                              {question.questionText}
                            </p>
                          </div>
                          
                          <div className="grid md:grid-cols-2 gap-3">
                            <div>
                              <h4 className="font-medium text-sm mb-1 text-destructive">你的答案</h4>
                              <p className="text-sm bg-destructive/10 p-2 rounded">
                                {question.userAnswer}
                              </p>
                            </div>
                            
                            <div>
                              <h4 className="font-medium text-sm mb-1 text-green-600">正确答案</h4>
                              <p className="text-sm bg-green-50 dark:bg-green-950 p-2 rounded">
                                {question.correctAnswer}
                              </p>
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="font-medium text-sm mb-1">反馈建议</h4>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                              {question.feedback}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        ))}
      </div>
    </div>
  );

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="h-8 w-8 text-primary" />
            错题归类分析
          </h1>
          <div className="flex gap-2">
            <Link href="/wrong-questions">
              <Button variant="outline" className="gap-2" data-testid="button-view-all-wrong">
                <AlertCircle className="h-4 w-4" />
                查看全部错题
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline" className="gap-2" data-testid="button-back-home">
                <Home className="h-4 w-4" />
                返回主页
              </Button>
            </Link>
          </div>
        </div>
        <p className="text-muted-foreground">
          共分析 {classification.summary.totalQuestions} 道错题，按知识点、错误类型和难度进行分类
        </p>
      </div>

      <Tabs defaultValue="knowledge" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="knowledge" className="gap-2" data-testid="tab-knowledge">
            <BookOpen className="h-4 w-4" />
            知识点分类
          </TabsTrigger>
          <TabsTrigger value="error" className="gap-2" data-testid="tab-error">
            <Target className="h-4 w-4" />
            错误类型
          </TabsTrigger>
          <TabsTrigger value="difficulty" className="gap-2" data-testid="tab-difficulty">
            <Lightbulb className="h-4 w-4" />
            难度分级
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="knowledge" className="space-y-6">
          {renderCategorySection(
            "按知识点分类",
            <BookOpen className="h-5 w-5 text-blue-600" />,
            classification.byKnowledgePoint,
            "根据题目内容和解析识别的主要知识点，帮助你针对性复习薄弱环节"
          )}
        </TabsContent>
        
        <TabsContent value="error" className="space-y-6">
          {renderCategorySection(
            "按错误类型分类",
            <Target className="h-5 w-5 text-red-600" />,
            classification.byErrorType,
            "根据错误反馈分析的错误原因，帮助你改进学习方法和答题技巧"
          )}
        </TabsContent>
        
        <TabsContent value="difficulty" className="space-y-6">
          {renderCategorySection(
            "按难度分级",
            <Lightbulb className="h-5 w-5 text-yellow-600" />,
            classification.byDifficulty,
            "根据题目复杂度和反馈分析的难度等级，帮助你循序渐进地提升能力"
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}