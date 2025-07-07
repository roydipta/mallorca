import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mallorca Travel Map - 5-Day Island Paradise",
  description: "Interactive travel map for your 5-day Mallorca adventure. Explore locations, plan routes, and discover the beauty of this Mediterranean island.",
  keywords: "Mallorca, travel, map, Spain, Balearic Islands, vacation, itinerary",
  authors: [{ name: "Travel Map App" }],
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  themeColor: "#0f172a",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Additional mobile optimization meta tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Mallorca Map" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="format-detection" content="telephone=no" />
        
        {/* Prevent zoom on input focus (iOS Safari) */}
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
        
        {/* Preconnect to Google Maps for better performance */}
        <link rel="preconnect" href="https://maps.googleapis.com" />
        <link rel="preconnect" href="https://maps.gstatic.com" />
        
        {/* PWA support */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0f172a" />
        
        {/* Apple touch icon */}
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        
        {/* Splash screen support for iOS */}
        <meta name="apple-mobile-web-app-title" content="Mallorca Map" />
        <link rel="apple-touch-startup-image" href="/splash-screen.png" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{
          // Prevent overscroll bounce on iOS
          overscrollBehavior: 'none',
          // Prevent text selection on mobile
          WebkitUserSelect: 'none',
          userSelect: 'none',
          // Prevent callouts on mobile
          WebkitTouchCallout: 'none',
          // Prevent tap highlight
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        {children}
      </body>
    </html>
  );
}