import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"; // Import Toaster
import { ThemeProvider } from '@/components/theme-provider'; // Import ThemeProvider
import { ThemeSwitcher } from '@/components/theme-switcher'; // Import ThemeSwitcher

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'AdventureCraft', // Updated title
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
          attribute="data-theme-primary"
          defaultTheme="red"
          themes={['red', 'blue', 'green', 'purple', 'orange']}
        >
           {/* ThemeSwitcher can be placed anywhere, perhaps top right? */}
           <div className="absolute top-4 right-4 z-50">
              <ThemeSwitcher />
           </div>
          {children}
          <Toaster /> {/* Add Toaster here */}
        </ThemeProvider>
      </body>
    </html>
  );
}
