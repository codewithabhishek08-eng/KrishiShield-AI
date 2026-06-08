
import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { KisanAI } from '@/components/kisan-ai';
import { Toaster } from '@/components/ui/toaster';

export const metadata: Metadata = {
  title: 'KrishiShield AI',
  description: 'Intelligence grows here.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;700&family=Anybody:wght@900&family=Source+Code+Pro&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased overflow-x-hidden">
        <ThemeProvider>
          {children}
          <KisanAI />
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
