import { Scan, BookOpen, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import ThemeToggle from "./ThemeToggle";

interface HeaderProps {
  className?: string;
}

export default function Header({ className = "" }: HeaderProps) {
  const { user, logoutMutation } = useAuth();

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <header className={`flex items-center justify-between p-4 border-b ${className}`}>
      <div className="flex items-center gap-2">
        <Scan className="w-6 h-6 text-chart-1" />
        <Link href="/">
          <h1 className="text-lg font-semibold cursor-pointer hover:text-chart-1 transition-colors">试卷智能分析</h1>
        </Link>
      </div>
      <div className="flex items-center gap-2">
        <Link href="/wrong-questions">
          <Button variant="ghost" size="sm" className="gap-2" data-testid="button-wrong-questions">
            <BookOpen className="h-4 w-4" />
            错题本
          </Button>
        </Link>
        
        {user && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 px-2 py-1 text-sm text-muted-foreground" data-testid="text-username">
              <User className="h-4 w-4" />
              {user.username}
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="gap-2" 
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4" />
              退出
            </Button>
          </div>
        )}
        
        <ThemeToggle />
      </div>
    </header>
  );
}