import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type FontSizeLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7;

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
    // Default to 4 (Average) if not saved, or convert old saved value if needed
    // If old value was 1-5, we might want to map it, but for now let's just use the saved value if valid
    // or default to 4 which is the new "Average" (equivalent to old Smallest)
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (parsed >= 1 && parsed <= 7) return parsed as FontSizeLevel;
    }
    return 4;
  });

  useEffect(() => {
    localStorage.setItem('fontSizeLevel', fontSizeLevel.toString());

    // Apply class to document element for CSS targeting
    const root = document.documentElement;

    // Remove existing font-size classes
    root.classList.remove(
      'font-size-1', 'font-size-2', 'font-size-3', 'font-size-4',
      'font-size-5', 'font-size-6', 'font-size-7'
    );

    // Add new class
    root.classList.add(`font-size-${fontSizeLevel}`);

    // Set CSS variable for font scaling
    // Level 4 is the new "Average", which corresponds to the old Level 1 (0.85)
    // We create a scale around that.
    const scaleFactors = {
      1: 0.55,
      2: 0.65,
      3: 0.75,
      4: 0.85, // Old Level 1 (Smallest) is now Average
      5: 0.95,
      6: 1.05,
      7: 1.15
    };

    root.style.setProperty('--font-scale', scaleFactors[fontSizeLevel].toString());

  }, [fontSizeLevel]);

  return (
    <FontSizeContext.Provider value={{ fontSizeLevel, setFontSizeLevel }}>
      {children}
    </FontSizeContext.Provider>
  );
};
