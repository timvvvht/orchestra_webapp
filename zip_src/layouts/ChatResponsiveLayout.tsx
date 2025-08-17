import { useBreakpoint } from '@/hooks/useBreakpoint';
import ChatLayout from '@/components/chat-interface/ChatLayout';
import { SidebarDrawer } from '@/components/chat-interface/SidebarDrawer';

interface ChatResponsiveLayoutProps {
  children: React.ReactNode;
}

/**
 * Responsive layout wrapper that conditionally renders desktop vs mobile chat layouts
 * Desktop (>=768px): Uses existing ChatLayout with sidebar
 * Mobile (<768px): Uses drawer-based sidebar with full-width chat
 */
export const ChatResponsiveLayout: React.FC<ChatResponsiveLayoutProps> = ({ children }) => {
  const isDesktop = useBreakpoint(); // ≥ 768px
  
  return isDesktop ? (
    <ChatLayout />
  ) : (
    <>
      <SidebarDrawer />
      {children}
    </>
  );
};