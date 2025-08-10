import React, { createContext, useContext, useRef } from 'react';

interface ScrollContextType {
  addScrollListener: (listener: (scrollY: number) => void) => void;
  removeScrollListener: (listener: (scrollY: number) => void) => void;
  notifyScroll: (scrollY: number) => void;
}

const ScrollContext = createContext<ScrollContextType | undefined>(undefined);

export const useScroll = () => {
  const context = useContext(ScrollContext);
  if (!context) {
    throw new Error('useScroll must be used within a ScrollProvider');
  }
  return context;
};

export const ScrollProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const scrollListeners = useRef<Set<(scrollY: number) => void>>(new Set());

  const addScrollListener = (listener: (scrollY: number) => void) => {
    scrollListeners.current.add(listener);
  };

  const removeScrollListener = (listener: (scrollY: number) => void) => {
    scrollListeners.current.delete(listener);
  };

  const notifyScroll = (scrollY: number) => {
    scrollListeners.current.forEach(listener => listener(scrollY));
  };

  return (
    <ScrollContext.Provider value={{ addScrollListener, removeScrollListener, notifyScroll }}>
      {children}
    </ScrollContext.Provider>
  );
}; 