import { Providers } from "./providers";
import { Navbar } from "@/components/Navbar";
import "./globals.css";
import { SignedIn, SignedOut } from "@clerk/nextjs";

export const metadata = {
  title: "Mini-InstaPay",
  description: "A simple payment system",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Providers>
      <html lang="en">
        <body className="h-screen flex flex-col">
          <Navbar />
          <SignedIn>
            <main>{children}</main>
          </SignedIn>
          <SignedOut>
            <div className="flex flex-col justify-center items-center h-full">
              <h1 className="text-2xl font-bold">
                Please sign in to use Mini-InstaPay
              </h1>
            </div>
          </SignedOut>
        </body>
      </html>
    </Providers>
  );
}
