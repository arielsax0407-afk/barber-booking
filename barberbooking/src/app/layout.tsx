import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ברבר פרמיום — מספרה יוקרתית',
  description: 'חווית טיפוח גברית מהשורה הראשונה. קבע תור עכשיו.',
  openGraph: {
    title: 'ברבר פרמיום — מספרה יוקרתית',
    description: 'חווית טיפוח גברית מהשורה הראשונה. קבע תור עכשיו.',
    locale: 'he_IL',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'ברבר פרמיום — מספרה יוקרתית',
    description: 'חווית טיפוח גברית מהשורה הראשונה. קבע תור עכשיו.',
  },
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
