import ThemeToggle from '../ThemeToggle'

export default function ThemeToggleExample() {
  return (
    <div className="p-4 max-w-md mx-auto">
      <div className="flex items-center justify-center gap-4">
        <span className="text-sm">主题切换：</span>
        <ThemeToggle />
      </div>
    </div>
  );
}