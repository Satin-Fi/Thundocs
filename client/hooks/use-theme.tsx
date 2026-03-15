import { useState, useEffect } from 'react';

type Theme = 'day' | 'night';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    // Try to get from local storage, default to 'night'
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('thundocs-theme');
      return (saved as Theme) || 'night';
    }
    return 'night';
  });

  useEffect(() => {
    localStorage.setItem('thundocs-theme', theme);
  }, [theme]);

  const isNight = theme === 'night';

  const themeStyles = {
    // Base layout
    bg: isNight ? 'bg-[#09090b]' : 'bg-gray-100',
    text: isNight ? 'text-zinc-50' : 'text-zinc-950',
    subtext: isNight ? 'text-zinc-400' : 'text-zinc-500',
    secondaryText: isNight ? 'text-zinc-500' : 'text-zinc-500',
    
    // Headers
    headerBg: isNight ? 'bg-[#09090b]/80' : 'bg-white/80',
    headerBorder: isNight ? 'border-zinc-800' : 'border-gray-300',
    
    // Cards
    cardBg: isNight ? 'bg-[#09090b]' : 'bg-white',
    cardBorder: isNight ? 'border-zinc-800' : 'border-gray-300',
    cardHeaderBg: isNight ? 'bg-[#09090b]' : 'bg-zinc-50',
    
    // Inputs
    inputBg: isNight ? 'bg-[#18181b]' : 'bg-white',
    inputBorder: isNight ? 'border-zinc-800' : 'border-gray-300',
    inputPlaceholder: isNight ? 'placeholder:text-gray-500' : 'placeholder:text-gray-400',
    
    // Buttons & Interactive
    buttonGhost: isNight ? 'hover:bg-white/10 text-gray-300 hover:text-white' : 'hover:bg-gray-100 text-gray-700 hover:text-gray-900',
    activeButtonBg: isNight ? 'bg-blue-500/10' : 'bg-cyan-500/10',
    activeButtonBorder: isNight ? 'border-blue-500/20' : 'border-cyan-500/30',
    activeButtonText: isNight ? 'text-blue-400' : 'text-cyan-600',
    
    // Accents
    accentColor: isNight ? 'text-blue-400' : 'text-cyan-600',
    accentBg: isNight ? 'bg-blue-600' : 'bg-cyan-600',
    accentBgHover: isNight ? 'hover:bg-blue-500' : 'hover:bg-cyan-500',
    accentBorder: isNight ? 'border-blue-600' : 'border-cyan-600',
    
    // Specific elements
    selectItemHover: isNight ? 'focus:bg-blue-600 focus:text-white' : 'focus:bg-cyan-100 focus:text-cyan-900',
    uploadHoverBg: isNight ? 'hover:bg-[#252525]' : 'hover:bg-gray-50',
    uploadHoverBorder: isNight ? 'hover:border-blue-500/50' : 'hover:border-cyan-500/50',
    innerInputHoverBg: isNight ? 'group-hover:bg-[#333]' : 'group-hover:bg-gray-50',

    // Background Gradients
    backgroundGradientMain: isNight ? 'from-gray-900 via-black to-gray-800' : 'from-gray-100 via-white to-gray-200',
    backgroundGradientOverlay: isNight ? 'from-blue-900/20 via-purple-900/20 to-cyan-900/20' : 'from-blue-100/40 via-purple-100/40 to-cyan-100/40',
  };

  return { theme, setTheme, themeStyles, isNight };
}
