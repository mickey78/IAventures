
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"; // Import Toaster
import { ThemeProvider } from '@/components/theme-provider'; // Import ThemeProvider
// Removed ThemeSwitcher import

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'IAventures', // Updated title
  description: 'An interactive text adventure game powered by AI.', // Updated description
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning> {/* Add suppressHydrationWarning */}
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased font-sans`}>
        <ThemeProvider
          attribute="data-theme-primary" // Use data-theme-primary for ShadCN theme integration
          defaultTheme="red" // Default primary color theme
          themes={['red', 'blue', 'green', 'purple', 'orange']} // Available primary color themes
        >
           {/* ThemeSwitcher removed from here, managed within GameHeader/settings */}
          {children}
          <Toaster /> {/* Add Toaster here */}
        </ThemeProvider>
      </body>
    </html>
  );
}
