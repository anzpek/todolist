import React from 'react';
import { useTodos } from '../contexts/TodoContext';
import { useTheme } from '../contexts/ThemeContext';

const FloatingActionButton: React.FC = () => {
  const { setShowAddModal } = useTodos();
  const { theme } = useTheme();

  const openAddModal = () => {
    setShowAddModal(true);
  };

  // Define colors based on the theme
  const bgColor = theme === 'dark' ? 'bg-indigo-500' : 'bg-indigo-600';
  const hoverBgColor = theme === 'dark' ? 'hover:bg-indigo-600' : 'hover:bg-indigo-700';
  const ringColor = theme === 'dark' ? 'focus:ring-indigo-400' : 'focus:ring-indigo-500';

  return (
    <button
      onClick={openAddModal}
      className={`md:hidden fixed bottom-6 right-6 w-16 h-16 rounded-full text-white shadow-lg flex items-center justify-center ${bgColor} ${hoverBgColor} transition-all duration-300 ease-in-out focus:outline-none focus:ring-4 ${ringColor}`}
      aria-label="Add new todo"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-8 w-8"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2.5}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
      </svg>
    </button>
  );
};

export default FloatingActionButton;
