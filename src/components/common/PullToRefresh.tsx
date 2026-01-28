import React, { useEffect, useState, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { useTodos } from '../../contexts/TodoContext';
import { useVacation } from '../../contexts/VacationContext';

interface PullToRefreshProps {
    children: React.ReactNode;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({ children }) => {
    const [startY, setStartY] = useState(0);
    const [currentY, setCurrentY] = useState(0);
    const [refreshing, setRefreshing] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);
    const { forceRefresh } = useTodos();
    const { loading } = useVacation(); // Can add vacation refresh too if needed

    const THRESHOLD = 80; // Pull down threshold in pixels

    const handleTouchStart = (e: React.TouchEvent) => {
        // Check if the scrollable parent is at the top
        const scroller = (e.target as Element).closest('.overflow-y-auto');
        const isAtTop = scroller ? scroller.scrollTop === 0 : window.scrollY === 0;

        if (isAtTop) {
            setStartY(e.touches[0].clientY);
        } else {
            setStartY(0);
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (startY === 0 || refreshing) return;

        const y = e.touches[0].clientY;
        const diff = y - startY;

        // Only allow pulling down
        if (diff > 0) {
            // Add resistance
            setCurrentY(Math.min(diff * 0.5, THRESHOLD + 20));

            // Prevent native refresh on some browsers if we are handling it
            // Note: This might block scrolling if not careful
            // e.preventDefault(); 
        }
    };

    const handleTouchEnd = async () => {
        if (startY === 0 || refreshing) return;

        if (currentY >= THRESHOLD) {
            setRefreshing(true);
            setCurrentY(THRESHOLD); // Keep spinner visible

            try {
                console.log('🔄 Pull-to-Refresh triggered');
                // Trigger data refresh
                await forceRefresh();

                // Short delay to show the spinner
                await new Promise(resolve => setTimeout(resolve, 500));
            } catch (error) {
                console.error('Refresh failed:', error);
            } finally {
                setRefreshing(false);
                setCurrentY(0);
            }
        } else {
            // Snap back if not pulled enough
            setCurrentY(0);
        }
        setStartY(0);
    };

    return (
        <div
            className="relative min-h-screen"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            ref={contentRef}
        >
            {/* Loading Indicator Overlay */}
            <div
                className="absolute top-0 left-0 w-full flex justify-center pointer-events-none transition-transform duration-200 ease-out z-50"
                style={{
                    transform: `translateY(${currentY > 0 ? currentY - 40 : -40}px)`,
                    opacity: currentY > 0 ? Math.min(currentY / THRESHOLD, 1) : 0
                }}
            >
                <div className="bg-white dark:bg-gray-800 rounded-full p-2 shadow-md border border-gray-200 dark:border-gray-700">
                    <Loader2 className={`w-6 h-6 text-blue-500 ${refreshing ? 'animate-spin' : ''}`} />
                </div>
            </div>

            <div
                style={{
                    transform: `translateY(${currentY}px)`,
                    transition: refreshing ? 'transform 0.2s ease-out' : 'transform 0.2s ease-out'
                }}
            >
                {children}
            </div>
        </div>
    );
};
