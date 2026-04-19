import type { Metadata } from 'next';
import './global.css'; // Add this if you have a global CSS file, otherwise Next.js will ignore it

export const metadata: Metadata = {
  title: 'VibeTrack Digital Twin',
  description: 'Intelligent crowd management and event experience system',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, width: '100vw', height: '100vh', overflow: 'hidden' }}>
        {children}
      </body>
    </html>
  );
}
