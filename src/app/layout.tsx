import type { Metadata, Viewport } from "next";
import { Noto_Sans } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "next-themes";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html suppressHydrationWarning className="scroll-smooth" lang="en">
      <body className={`${notoSans.className} antialiased`}>
        {/* <ReactScan /> */}
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}

const notoSans = Noto_Sans({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Y5 Chat",
  description:
    "Y5 Chat. Starting as a T3 Chat clone to a first class AI chat app (Leaving T3 chat the second place <3).",
};

export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "dark",
};