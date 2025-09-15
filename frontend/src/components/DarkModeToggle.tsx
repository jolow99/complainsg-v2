import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DarkModeToggleProps {
  className?: string;
  fixed?: boolean;
}

export function DarkModeToggle({ className, fixed = false }: DarkModeToggleProps) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Check if user has a saved preference
    const saved = localStorage.getItem('darkMode');
    const isDarkMode = saved === 'true' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);

    setIsDark(isDarkMode);
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, []);

  const toggleDarkMode = () => {
    const newDarkMode = !isDark;
    setIsDark(newDarkMode);
    localStorage.setItem('darkMode', newDarkMode.toString());
    document.documentElement.classList.toggle('dark', newDarkMode);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleDarkMode}
      className={cn(
        fixed ? "fixed top-4 right-4" : "",
        className
      )}
    >
      {isDark ? '☀️' : '🌙'}
    </Button>
  );
}