import type { Metadata } from "next";
import { Big_Shoulders_Display, Spline_Sans_Mono } from "next/font/google";
import "./globals.css";

const display = Big_Shoulders_Display({
  subsets: ["latin"],
  weight: ["600", "800"],
  variable: "--font-display",
});

const mono = Spline_Sans_Mono({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Fable Fieldhouse — Basketball Simulator",
  description: "Live NBA-powered basketball simulation",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className={`${display.variable} ${mono.variable} font-mono antialiased`}>
        {children}
      </body>
    </html>
  );
}
