import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ברבר בודפשט — מספרה יוקרתית',
  description: 'חווית טיפוח גברית מהשורה הראשונה. קבע תור עכשיו.',
};

export const viewport: Viewport = {
  themeColor: '#FAF8F4',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
