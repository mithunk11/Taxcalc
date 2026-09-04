import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://taxcalc-mjapps.jomol-indium.chatgpt.site'),
  title: {
    default: 'TaxCalc — Know what lands in your bank',
    template: '%s · TaxCalc',
  },
  description: 'Understand what you actually take home. Calculate gross-to-net or net-to-gross salary for Ireland, the UK and India — privately in your browser.',
  icons: { icon: '/brand/taxcalc-logo.png', apple: '/brand/taxcalc-logo.png' },
  openGraph: {
    title: 'TaxCalc — Know what lands in your bank',
    description: 'Private gross-to-net and net-to-gross salary calculations for Ireland, the UK and India.',
    type: 'website',
    images: [{ url: '/og.png', width: 1731, height: 909, alt: 'TaxCalc — Know what actually lands in your bank.' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TaxCalc — Know what lands in your bank',
    description: 'Private, transparent salary and take-home pay calculations.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
