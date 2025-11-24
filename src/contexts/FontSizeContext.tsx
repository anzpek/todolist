import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type FontSizeLevel = 1 | 2 | 3 | 4 | 5;

interface FontSizeContextType {
  fontSizeLevel: FontSizeLevel;
  setFontSizeLevel: (level: FontSizeLevel) => void;
}

const FontSizeContext = createContext<FontSizeContextType | undefined>(undefined);

export const useFontSize = () => {
  const context = useContext(FontSizeContext);
  if (context === undefined) {
    throw new Error('useFontSize must be used within a FontSizeProvider');
  }
  return context;
};

interface FontSizeProviderProps {
  children: ReactNode;
}

export const FontSizeProvider = ({ children }: FontSizeProviderProps) => {
  const [fontSizeLevel, setFontSizeLevel] = useState<FontSizeLevel>(() => {
    const saved = localStorage.getItem('fontSizeLevel');
    return (saved ? parseInt(saved, 10) : 3) as FontSizeLevel;
  });

  useEffect(() => {
    localStorage.setItem('fontSizeLevel', fontSizeLevel.toString());
    
    // Apply class to document element for CSS targeting
    const root = document.documentElement;
    
    // Remove existing font-size classes
    root.classList.remove('font-size-1', 'font-size-2', 'font-size-3', 'font-size-4', 'font-size-5');
    
    // Add new class
    root.classList.add(`font-size-${fontSizeLevel}`);
    
    // Also set a CSS variable for direct usage if needed
    const scaleFactors = {
      1: 0.85,
      2: 0.925,
      3: 1.0,
      4: 1.125,
      5: 1.25
    };
    
    root.style.setProperty('--font-scale', scaleFactors[fontSizeLevel].toString());
    
  }, [fontSizeLevel]);

  return (
    <FontSizeContext.Provider value={{ fontSizeLevel, setFontSizeLevel }}>
      {children}
    </FontSizeContext.Provider>
  );
};
