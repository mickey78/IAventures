import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"; // Import Toaster

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
    <html lang="en" className="dark"> {/* Add dark class here */}
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased font-sans`}>
        {children}
        <Toaster /> {/* Add Toaster here */}
      </body>
    </html>
  );
}
