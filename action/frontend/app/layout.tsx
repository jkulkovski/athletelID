import "./globals.css";
import { ReactNode } from "react";
import { NavBar } from "@/components/NavBar";
import { WalletProvider } from "@/providers/WalletProvider";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <WalletProvider>
          <div className="min-h-screen flex flex-col">
            <NavBar />
            
            <main className="flex-1 mx-auto max-w-7xl w-full px-6 py-8">
              {children}
            </main>
            
            <footer className="border-t border-white/10 bg-gradient-to-r from-gray-900/50 to-gray-800/50 backdrop-blur-lg">
              <div className="mx-auto max-w-7xl px-6 py-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-white/60">
                  <div className="flex items-center gap-2">
                    <span>🔐</span>
                    <span>基于 ZAMA FHE 的隐私保护认证系统</span>
                  </div>
                  <div>© {new Date().getFullYear()} AthleteID. All rights reserved.</div>
                </div>
              </div>
            </footer>
          </div>
        </WalletProvider>
      </body>
    </html>
  );
}


