import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'YAIR ZIV — מספרה יוקרתית ברחובות',
  description: 'חווית טיפוח גברית מהשורה הראשונה. קבע תור עכשיו.',
  openGraph: {
    title: 'YAIR ZIV — מספרה יוקרתית ברחובות',
    description: 'חווית טיפוח גברית מהשורה הראשונה. קבע תור עכשיו.',
    locale: 'he_IL',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'YAIR ZIV — מספרה יוקרתית ברחובות',
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
