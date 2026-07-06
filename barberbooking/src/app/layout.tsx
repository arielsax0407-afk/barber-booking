import type { Metadata, Viewport } from 'next';
import { SHOP_NAME } from '@/lib/siteConfig';
import './globals.css';

export const metadata: Metadata = {
  title: `${SHOP_NAME} — מספרה יוקרתית`,
  description: 'חווית טיפוח גברית מהשורה הראשונה. קבע תור עכשיו.',
  openGraph: {
    title: `${SHOP_NAME} — מספרה יוקרתית`,
    description: 'חווית טיפוח גברית מהשורה הראשונה. קבע תור עכשיו.',
    locale: 'he_IL',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: `${SHOP_NAME} — מספרה יוקרתית`,
    description: 'חווית טיפוח גברית מהשורה הראשונה. קבע תור עכשיו.',
  },
};

export const viewport: Viewport = {
  themeColor: '#FAF8F4',
  // Without this, mobile browsers (mainly iOS Safari) overlay the keyboard on top
  // of the page instead of shrinking it — fixed-position elements like the chat
  // widget then get covered by the keyboard instead of resizing above it.
  interactiveWidget: 'resizes-content',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
