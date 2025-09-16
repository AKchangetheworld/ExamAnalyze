// Auth integration from blueprint:javascript_auth_all_persistance
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, FileText, BarChart3, Target, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { user, loginMutation, registerMutation } = useAuth();
  
  // Redirect if already logged in (after all hook calls to avoid rules of hooks violation)
  useEffect(() => {
    if (user) {
      setLocation("/");
    }
  }, [user, setLocation]);

  // Prevent rendering the form if user is already logged in
  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8 items-center min-h-[calc(100vh-4rem)]">
          {/* Left Column - Forms */}
          <div className="flex items-center justify-center">
            <div className="w-full max-w-md space-y-6">
              <div className="text-center">
                <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
                  <FileText className="h-6 w-6 text-primary" />
                  试卷分析系统
                </h1>
                <p className="text-muted-foreground mt-2">
                  请登录或注册以开始使用
                </p>
              </div>

              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login" data-testid="tab-login">登录</TabsTrigger>
                  <TabsTrigger value="register" data-testid="tab-register">注册</TabsTrigger>
                </TabsList>

                <TabsContent value="login">
                  <Card>
                    <CardHeader>
                      <CardTitle>登录账户</CardTitle>
                      <CardDescription>
                        输入您的用户名和密码来登录
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <LoginForm />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="register">
                  <Card>
                    <CardHeader>
                      <CardTitle>创建账户</CardTitle>
                      <CardDescription>
                        注册一个新账户开始使用试卷分析功能
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <RegisterForm />
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>

          {/* Right Column - Hero Section */}
          <div className="hidden lg:block">
            <div className="text-center space-y-6">
              <div className="space-y-4">
                <h2 className="text-3xl font-bold">智能试卷分析</h2>
                <p className="text-xl text-muted-foreground">
                  使用AI技术为您的学习提供个性化分析和建议
                </p>
              </div>

              <div className="grid gap-4 max-w-sm mx-auto">
                <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                  <FileText className="h-8 w-8 text-primary" />
                  <div className="text-left">
                    <h3 className="font-semibold">上传试卷</h3>
                    <p className="text-sm text-muted-foreground">
                      支持多种图片格式
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                  <BarChart3 className="h-8 w-8 text-primary" />
                  <div className="text-left">
                    <h3 className="font-semibold">AI分析</h3>
                    <p className="text-sm text-muted-foreground">
                      智能评分和详细反馈
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                  <Target className="h-8 w-8 text-primary" />
                  <div className="text-left">
                    <h3 className="font-semibold">错题管理</h3>
                    <p className="text-sm text-muted-foreground">
                      自动收集错题，针对性学习
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoginForm() {
  const { loginMutation } = useAuth();
  
  const form = useForm({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = (data: { username: string; password: string }) => {
    loginMutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>用户名</FormLabel>
              <FormControl>
                <Input 
                  placeholder="请输入用户名" 
                  data-testid="input-login-username"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>密码</FormLabel>
              <FormControl>
                <Input 
                  type="password" 
                  placeholder="请输入密码"
                  data-testid="input-login-password"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button 
          type="submit" 
          className="w-full" 
          disabled={loginMutation.isPending}
          data-testid="button-login-submit"
        >
          {loginMutation.isPending && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          登录
        </Button>
      </form>
    </Form>
  );
}

function RegisterForm() {
  const { registerMutation } = useAuth();
  
  const form = useForm({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = (data: { username: string; password: string }) => {
    registerMutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>用户名</FormLabel>
              <FormControl>
                <Input 
                  placeholder="请输入用户名" 
                  data-testid="input-register-username"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>密码</FormLabel>
              <FormControl>
                <Input 
                  type="password" 
                  placeholder="请输入密码"
                  data-testid="input-register-password"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button 
          type="submit" 
          className="w-full" 
          disabled={registerMutation.isPending}
          data-testid="button-register-submit"
        >
          {registerMutation.isPending && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          注册
        </Button>
      </form>
    </Form>
  );
}