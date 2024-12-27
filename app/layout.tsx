import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { getServerSession } from "next-auth";
import { NextAuthProvider } from "@/components/NextAuthProvider";
import { Toaster } from "react-hot-toast";
import { authOptions } from "./api/auth/[...nextauth]/route";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Script Generator",
  description: "Generate shell scripts using AI",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  return (
    <html lang="en">
      <body className={inter.className}>
        <NextAuthProvider session={session}>
          {children}
          <Toaster />
        </NextAuthProvider>
      </body>
    </html>
  )
}
