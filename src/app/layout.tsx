import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Meatspace",
  description: "Decentralized marketplace: AI agents hire verified humans",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1"
        />
      </head>
      <body className="bg-gray-950 text-white min-h-screen">{children}</body>
    </html>
  );
}
