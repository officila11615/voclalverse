import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { Sidebar, SidebarProvider, SidebarTrigger, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarInset } from '@/components/ui/sidebar';
import Link from 'next/link';
import { Languages, MessageSquare, Mic, Home } from 'lucide-react';

export const metadata: Metadata = {
  title: 'VocalVerse',
  description: 'A virtual assistant that understands and responds to spoken commands',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&family=PT+Sans:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <SidebarProvider>
          <Sidebar
            variant="floating"
            collapsible="icon"
            className="border-white/10 bg-black/50 backdrop-blur-lg"
          >
            <SidebarMenu className="flex-1">
              <SidebarMenuItem>
                <Link href="/" passHref>
                  <SidebarMenuButton tooltip="Dashboard">
                    <Home />
                    <span>Dashboard</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <Link href="/text-to-text" passHref>
                  <SidebarMenuButton tooltip="Text to Text">
                    <MessageSquare />
                    <span>Text to Text</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <Link href="/voice-to-voice" passHref>
                  <SidebarMenuButton tooltip="Voice to Voice">
                    <Mic />
                    <span>Voice to Voice</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <Link href="/voice-translator" passHref>
                  <SidebarMenuButton tooltip="Voice Translator">
                    <Languages />
                    <span>Voice Translator</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            </SidebarMenu>
          </Sidebar>
          <SidebarInset>
            <div className="md:hidden p-2 absolute top-0 left-0">
               <SidebarTrigger />
            </div>
            {children}
            <Toaster />
          </SidebarInset>
        </SidebarProvider>
      </body>
    </html>
  );
}
