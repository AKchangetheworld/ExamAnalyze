import { Scan, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import ThemeToggle from "./ThemeToggle";

interface HeaderProps {
  className?: string;
}

export default function Header({ className = "" }: HeaderProps) {
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
        <ThemeToggle />
      </div>
    </header>
  );
}