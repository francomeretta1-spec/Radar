import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Radar — Consulta de situación fiscal y crediticia",
  description: "Consultá la situación de un CUIT en BCRA y ARCA en un solo lugar.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
