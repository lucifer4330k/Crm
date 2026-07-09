'use client';

import * as React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

export function ThemeToggle() {
  const { setTheme, theme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="theme-toggle-placeholder" />;
  }

  return (
    <button
      onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
      className="theme-toggle"
      aria-label="Toggle theme"
    >
      <Sun className="h-5 w-5 sun-icon" />
      <Moon className="h-5 w-5 moon-icon" />
    </button>
  );
}
