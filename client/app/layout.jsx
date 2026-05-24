import "./globals.css";
import { StoreProvider } from "@/lib/store";

export const metadata = {
  title: "Live Ops Helpdesk",
  description:
    "Real-time collaborative support ticket system for incident response. Prevent agent collisions with live ticket locking powered by WebSockets.",
  keywords: "helpdesk, support tickets, real-time, operations",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
