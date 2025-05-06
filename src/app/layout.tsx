
import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from '@/components/theme-provider';

const geistSans = GeistSans;
const geistMono = GeistMono;

export const metadata: Metadata = {
  title: 'IAventures',
  description: 'An interactive text adventure game powered by AI.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Ensure no leading space before <html>
    <html lang="en" suppressHydrationWarning>
      {/* Apply font variables directly to the body or html tag */}
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased font-sans`}>
        <ThemeProvider
          attribute="class" // Use class for light/dark mode (managed by next-themes)
          defaultTheme="system" // Default to system preference for light/dark
          enableSystem
          disableTransitionOnChange
          // ThemeSwitcher will manage data-theme-primary attribute on <html>
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}

