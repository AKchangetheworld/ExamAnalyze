import { Scan } from "lucide-react";
import ThemeToggle from "./ThemeToggle";

interface HeaderProps {
  className?: string;
}

export default function Header({ className = "" }: HeaderProps) {
  return (
    <header className={`flex items-center justify-between p-4 border-b ${className}`}>
      <div className="flex items-center gap-2">
        <Scan className="w-6 h-6 text-chart-1" />
        <h1 className="text-lg font-semibold">试卷智能分析</h1>
      </div>
      <ThemeToggle />
    </header>
  );
}