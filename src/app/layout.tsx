import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { clsx } from "clsx";
import { StoreProvider } from "@/context/StoreContext";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "TusFrasesKids | Cuentos Personalizados",
  description: "Cuentos bíblicos personalizados para niños, diseñados con amor.",
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={clsx(outfit.variable, "antialiased min-h-screen selection:bg-primary-200 selection:text-primary-900")}
        suppressHydrationWarning
      >
        <StoreProvider>
          {children}
        </StoreProvider>
      </body>
    </html>
  );
}
