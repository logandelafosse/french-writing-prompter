import type { Metadata } from "next";
import { Bricolage_Grotesque, Newsreader } from "next/font/google";
import { APP_DOCUMENT_TITLE, APP_TAGLINE } from "@/config/app-brand";
import { HeaderShell } from "@/components/shell/header-shell";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin", "latin-ext"],
  axes: ["opsz"],
  variable: "--font-bricolage",
  display: "swap",
});

const newsreader = Newsreader({
  subsets: ["latin", "latin-ext"],
  axes: ["opsz"],
  style: ["normal", "italic"],
  variable: "--font-newsreader",
  display: "swap",
});

export const metadata: Metadata = {
  title: APP_DOCUMENT_TITLE,
  description: APP_TAGLINE,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${bricolage.variable} ${newsreader.variable} h-full antialiased`}
    >
      <body className="bg-desk text-ink flex min-h-full flex-col">
        <HeaderShell>{children}</HeaderShell>
      </body>
    </html>
  );
}
