import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * Keyboard navigation hook for the Admin Dashboard.
 * 
 * Shortcuts:
 *   ↑ / ↓   — Navigate sidebar items (when sidebar focused) OR scroll main content sections
 *   ← / →   — Scroll main content left/right (cards) or collapse/expand sidebar focus
 *   Enter    — Activate highlighted sidebar item
 *   Escape   — Clear focus / close dropdowns
 *   1-9      — Quick-jump to sidebar item by position
 *   Home     — Scroll main content to top
 *   End      — Scroll main content to bottom
 *   S        — Focus the search bar
 *   /        — Focus the search bar (vim-style)
 */
const useKeyboardNavigation = (sidebarItems = []) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [focusedSidebarIndex, setFocusedSidebarIndex] = useState(-1);
  const [isKeyboardMode, setIsKeyboardMode] = useState(false);
  const mainContentRef = useRef(null);

  // Get current sidebar index from path
  const currentSidebarIndex = sidebarItems.findIndex(
    item => item.path === location.pathname
  );

  // Navigate to a sidebar item
  const navigateToItem = useCallback((index) => {
    if (index >= 0 && index < sidebarItems.length) {
      const item = sidebarItems[index];
      if (item?.path) {
        navigate(item.path);
        setFocusedSidebarIndex(index);
      }
    }
  }, [sidebarItems, navigate]);

  // Scroll main content
  const scrollMainContent = useCallback((direction) => {
    const main = mainContentRef.current || document.querySelector('main');
    if (!main) return;

    const scrollAmount = direction === 'down' ? window.innerHeight * 0.6 
                       : direction === 'up' ? -window.innerHeight * 0.6
                       : direction === 'right' ? 400
                       : -400;

    if (direction === 'up' || direction === 'down') {
      main.scrollBy({ top: scrollAmount, behavior: 'smooth' });
    } else {
      main.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Skip if user is typing in an input/textarea/select/contenteditable
      const tag = e.target.tagName;
      const isEditable = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable;

      // Allow Escape everywhere
      if (e.key === 'Escape') {
        // Blur any focused element
        if (document.activeElement && document.activeElement !== document.body) {
          document.activeElement.blur();
        }
        setFocusedSidebarIndex(-1);
        setIsKeyboardMode(false);
        return;
      }

      // Don't handle shortcuts when typing in form fields
      if (isEditable) return;

      // Activate keyboard mode on first arrow press
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        setIsKeyboardMode(true);
      }

      // Arrow Up — Navigate to previous sidebar item (go to previous page)
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        const current = focusedSidebarIndex >= 0 ? focusedSidebarIndex : currentSidebarIndex;
        const nextIndex = Math.max(0, current - 1);
        navigateToItem(nextIndex);
        return;
      }

      // Arrow Down — Navigate to next sidebar item (go to next page)
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const current = focusedSidebarIndex >= 0 ? focusedSidebarIndex : currentSidebarIndex;
        const nextIndex = Math.min(sidebarItems.length - 1, current + 1);
        navigateToItem(nextIndex);
        return;
      }

      // Arrow Right — Scroll main content down (into content)
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        scrollMainContent('down');
        return;
      }

      // Arrow Left — Scroll main content up (back to top)
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        scrollMainContent('up');
        return;
      }

      // Enter — Navigate to focused sidebar item
      if (e.key === 'Enter' && focusedSidebarIndex >= 0) {
        e.preventDefault();
        navigateToItem(focusedSidebarIndex);
        return;
      }

      // Number keys 1-9 — Quick jump to sidebar item
      const num = parseInt(e.key);
      if (num >= 1 && num <= 9 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const index = num - 1;
        if (index < sidebarItems.length) {
          e.preventDefault();
          navigateToItem(index);
          return;
        }
      }

      // Home — Scroll main content to top
      if (e.key === 'Home') {
        e.preventDefault();
        const main = mainContentRef.current || document.querySelector('main');
        if (main) main.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      // End — Scroll main content to bottom
      if (e.key === 'End') {
        e.preventDefault();
        const main = mainContentRef.current || document.querySelector('main');
        if (main) main.scrollTo({ top: main.scrollHeight, behavior: 'smooth' });
        return;
      }

      // S or / — Focus search bar
      const key = e.key.toLowerCase();
      if ((key === 's' || key === '/') && !e.ctrlKey && !e.metaKey) {
        const searchInput = document.querySelector('input[type="text"][placeholder*="Search"], input[type="search"]');
        if (searchInput) {
          e.preventDefault();
          searchInput.focus();
          return;
        }
      }
    };

    // Disable keyboard mode on mouse move
    const handleMouseMove = () => {
      if (isKeyboardMode) {
        setIsKeyboardMode(false);
        setFocusedSidebarIndex(-1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousemove', handleMouseMove, { once: true });

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [focusedSidebarIndex, currentSidebarIndex, sidebarItems, navigateToItem, scrollMainContent, isKeyboardMode]);

  return {
    focusedSidebarIndex,
    isKeyboardMode,
    currentSidebarIndex,
    mainContentRef,
  };
};

export default useKeyboardNavigation;
