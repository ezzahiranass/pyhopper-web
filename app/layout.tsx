import type { Metadata } from "next";
import "@xyflow/react/dist/style.css";
import "react-resizable/css/styles.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pyhopper Web",
  description: "Browser-based Pyhopper viewport and canvas.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
