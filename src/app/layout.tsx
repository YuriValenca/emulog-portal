import type { Metadata } from 'next';
import { Oswald, Inter, IBM_Plex_Mono } from 'next/font/google';
import { Providers } from './providers';
import './globals.css';
import './tokens.scss';

const oswald = Oswald({
  subsets: ['latin'],
  weight: ['500', '600'],
  variable: '--font-display',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-body',
});

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'Emulog Portal',
  description: 'Portal web Emulog',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${oswald.variable} ${inter.variable} ${plexMono.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
