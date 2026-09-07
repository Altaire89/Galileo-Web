import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { AuthProvider } from "@/lib/auth"
import "./globals.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })

export const metadata: Metadata = {
  title: "Nexo Soporte — Consultora Tecnológica",
  description:
    "Plataforma de soporte multi-cliente para consultoras tecnológicas: gestiona solicitudes, incidencias y consultas.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className={`${inter.variable} bg-background`}>
      <body className="font-sans antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
