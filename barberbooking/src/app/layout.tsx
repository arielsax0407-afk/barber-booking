import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ברבר בודפשט - קביעת תורים',
  description: 'קבע תור לספר בקלות ובמהירות',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
