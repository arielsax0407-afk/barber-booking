'use client';

import Link from 'next/link';
import { Scissors } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: 'var(--dark)' }}>
      {/* Hero */}
      <div className="text-center max-w-md w-full">
        {/* Logo placeholder */}
        <div
          className="mx-auto mb-8 rounded-full flex items-center justify-center"
          style={{
            width: 120,
            height: 120,
            background: 'linear-gradient(135deg, #1a1a1a, #2a2a2a)',
            border: '2px solid var(--gold)',
          }}
        >
          <Scissors size={48} color="var(--gold)" />
        </div>

        <h1 className="text-4xl font-black tracking-wide mb-1" style={{ color: 'var(--gold)' }}>
          ברבר בודפשט
        </h1>
        <p className="text-gray-400 mb-2 text-lg">הספר שלך. הסגנון שלך.</p>

        {/* Photo placeholder */}
        <div
          className="w-full rounded-xl mb-8 flex items-center justify-center text-gray-600"
          style={{
            height: 200,
            background: '#111',
            border: '1px dashed var(--dark-border)',
          }}
        >
          <span className="text-sm">תמונת המספרה</span>
        </div>

        {/* Info strip */}
        <div className="flex justify-center gap-6 mb-8 text-sm text-gray-400">
          <span>📍 תל אביב</span>
          <span>⏰ א׳–ו׳ | 9:00–19:00</span>
        </div>

        <Link href="/book" className="btn-gold block text-center text-lg py-4 rounded-xl w-full">
          קבע תור עכשיו
        </Link>

        <p className="mt-4 text-gray-600 text-sm">ללא כרטיס אשראי · אישור מיידי</p>
      </div>
    </main>
  );
}
