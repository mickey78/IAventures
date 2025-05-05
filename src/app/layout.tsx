
import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans'; // Import GeistSans
import { GeistMono } from 'geist/font/mono'; // Import GeistMono
import './globals.css';
import { Toaster } from "@/components/ui/toaster"; // Import Toaster
import { ThemeProvider } from '@/components/theme-provider'; // Import ThemeProvider
// Removed ThemeSwitcher import

const geistSans = GeistSans; // Use imported GeistSans directly
const geistMono = GeistMono; // Use imported GeistMono directly

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
    // Ensure no leading space before <html>
    <html lang="en" className="dark" suppressHydrationWarning>
      {/* Apply font variables directly to the body or html tag */}
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased font-sans`}>
        <ThemeProvider
          attribute="data-theme-primary" // Use data-theme-primary for ShadCN theme integration
          defaultTheme="red" // Default primary color theme
          themes={['red', 'blue', 'green', 'purple', 'orange', 'pink', 'cyan', 'yellow']} // Available primary color themes + new ones
        >
           {/* ThemeSwitcher removed from here, managed within GameHeader/settings */}
          {children}
          <Toaster /> {/* Add Toaster here */}
        </ThemeProvider>
      </body>
    </html>
  );
}
