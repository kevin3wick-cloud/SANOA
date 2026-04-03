import "./globals.css";
import { Inter } from "next/font/google";
import Script from "next/script";
import { ReactNode } from "react";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap"
});

export const metadata = {
  title: "Sanoa Vermieter MVP",
  description: "Einfaches Ticket-System für Vermieter"
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html
      lang="de"
      className={inter.variable}
      data-theme="dark"
      suppressHydrationWarning
    >
      <body className={inter.className}>
        <Script id="theme-init" strategy="beforeInteractive">
          {`(function(){try{var t=localStorage.getItem('sanoa-theme');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t);else document.documentElement.setAttribute('data-theme','dark');}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`}
        </Script>
        {children}
      </body>
    </html>
  );
}
