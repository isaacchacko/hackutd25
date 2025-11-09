// src/app/layout.tsx
import type { Metadata } from 'next';
import { Instrument_Serif } from 'next/font/google';
import { Inter } from 'next/font/google';
import './globals.css';

// Load Instrument Serif font for logo and subtitle
const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-instrument-serif',
  display: 'swap',
});

// Load Inter as fallback for Stack Sans Text (or use a similar sans-serif)
// If Stack Sans Text is available, replace this
const stackSans = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-stack-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'FoldPilot AI - Protein Analysis Platform',
  description: 'AI-powered protein structure analysis and drug discovery platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${instrumentSerif.variable} ${stackSans.variable} bg-white text-black`} style={{ fontFamily: 'var(--font-stack-sans)' }}>
        {children}
      </body>
    </html>
  );
}