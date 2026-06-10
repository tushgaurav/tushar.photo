import { Analytics } from '@vercel/analytics/next'
import type { Metadata } from 'next'
import { Inter, Geist_Mono } from 'next/font/google'
import './globals.css'

const inter = Inter({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  weight: ['400', '500', '700', '800', '900'],
})
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Tushar Gaurav — Photography',
  description:
    'The photography journal of Tushar Gaurav. Streets, wildlife, landscapes, and portraits — documented in black and white.',
  generator: 'v0.app',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistMono.variable} bg-black`}
    >
      <body className="p-1.5 font-sans antialiased md:p-2.5">
        <div className="min-h-svh bg-background text-foreground">
          {children}
        </div>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
