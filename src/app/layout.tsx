import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./studio.css";

export const metadata: Metadata = {
  title: "Virtual Try On",
  description:
    "Immersive open 3D virtual try-on and digital fashion studio experience.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#f5f0eb",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
