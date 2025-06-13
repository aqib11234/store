import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import { MainNav } from "@/components/main-nav"
import { ThemeProvider } from "@/components/theme-provider"
import { ThemeToggle } from "@/components/theme-toggle"
import { Toaster } from "sonner"

export const metadata: Metadata = {
  title: "Wholesale Store Management",
  description: "Manage your wholesale store inventory and invoices",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={true}
          themes={["light", "dark"]}
          disableTransitionOnChange
        >
          <div className="flex min-h-screen flex-col md:flex-row">
            <div className="border-r bg-muted/40 md:w-64">
              <div className="flex h-14 items-center justify-between border-b px-4">
                <h2 className="text-xl font-semibold">Wholesale Store</h2>
                <ThemeToggle />
              </div>
              <div className="p-4">
                <MainNav />
              </div>
            </div>
            <div className="flex-1">{children}</div>
          </div>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
