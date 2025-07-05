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
  keywords: "AI chat,ChatGPT alternative,AI assistant,GPT-5 access,free AI chat,Claude AI,artificial intelligence,AI chatbot,smart assistant,AI conversation,premium AI models,multi LLM chat,language models,deepseek,gemini,openai,anthropic",
  robots: "index, follow",
  category: "technology",
  metadataBase:
    process.env.NODE_ENV === "development"
      ? new URL("http://localhost:3000")
      : new URL("https://www.y5.chat"),
  alternates: {
    canonical: "https://www.y5.chat",
  },
  openGraph: {
    title: "Y5 Chat - Access your favorite LLMs through one blazing-fast AI Chat",
    description:
      "Y5 Chat. A blazing fast multi LLM (Large-Language-Model) AI Chat Application that connects users to the latest language models from multiple providers through a single, clean interface.",
    siteName: "Y5 Chat",
    locale: "en_US",
    images: [
      {
        url: "/opengraph.png",
        width: 1200,
        height: 630,
        alt: "Y5 Chat - Multi LLM AI Chat",
      },
    ],
    type: "website",
    url: "https://www.y5.chat",
  },
  twitter: {
    card: "summary_large_image",
    title: "Y5 Chat - Access your favorite LLMs through one blazing-fast AI Chat",
    description:
      "Y5 Chat. A blazing fast multi LLM (Large-Language-Model) AI Chat Application that connects users to the latest language models from multiple providers through a single, clean interface.",
    images: [
      {
        url: "/opengraph.png",
        width: 1200,
        height: 630,
        alt: "Y5 Chat - Multi LLM AI Assistant",
      },
    ],
  },
  appleWebApp: {
    capable: true,
    title: "Y5 Chat",
    statusBarStyle: "black-translucent",
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
  colorScheme: "light dark",
};
