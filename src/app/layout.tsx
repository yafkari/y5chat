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
    "Y5 Chat. A blazing fast multi LLM (Large-Language-Model) AI Chat Application that connects users to the latest language models from multiple providers through a single, clean interface.",
  metadataBase:
    process.env.NODE_ENV === "development"
      ? new URL("http://localhost:3000")
      : new URL("https://www.y5.chat"),
  openGraph: {
    title:
      "Y5 Chat - Access your favorite LLMs through one blazing-fast AI Chat",
    description:
      "Y5 Chat. A blazing fast multi LLM (Large-Language-Model) AI Chat Application that connects users to the latest language models from multiple providers through a single, clean interface.",
    images: ["/opengraph.png"],
    type: "website",
    url: "https://www.y5.chat",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "dark",
};
