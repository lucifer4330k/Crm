import type { Metadata } from 'next';
import { ThemeProvider } from '@/components/ThemeProvider';
import { ThemeToggle } from '@/components/ThemeToggle';
import './globals.css';

export const metadata: Metadata = {
  title: 'Devil CRM Uploader — AI-Powered CSV Converter',
  description:
    'Upload any CSV file and let AI intelligently extract and map your leads into the Devil CRM schema.',
  keywords: ['CRM', 'CSV upload', 'lead management', 'AI'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <div className="app-wrapper">
            <header className="header">
              <div className="header-inner">
                <a href="/" className="logo">
                  <div className="logo-icon">🔥</div>
                  <span className="logo-text">Devil CRM</span>
                </a>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <span className="header-badge">CRM Uploader</span>
                  <ThemeToggle />
                </div>
              </div>
            </header>
          <main style={{ flex: 1 }}>{children}</main>
            <footer className="footer" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
              made with love by devil ❤️
            </footer>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
