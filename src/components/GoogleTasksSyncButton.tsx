import { useGoogleTasksSync } from '../hooks/useGoogleTasksSync';
import { useAuth } from '../contexts/AuthContext';
import { Archive, Loader2, Check } from 'lucide-react';

export default function GoogleTasksSyncButton() {
    const { currentUser } = useAuth();
    const { syncGoogleTasks, loading, message } = useGoogleTasksSync();

    const handleSync = () => {
        syncGoogleTasks();
    };

    if (!currentUser) return null;

    return (
        <div className="px-4">
            <button
                onClick={handleSync}
                disabled={loading}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl 
                   text-gray-600 dark:text-gray-400 
                   hover:bg-white/50 dark:hover:bg-gray-800/50 
                   hover:text-gray-900 dark:hover:text-gray-200 
                   transition-all duration-200 group border border-transparent hover:shadow-sm"
            >
                <div className="p-2 rounded-lg bg-gray-100/50 dark:bg-gray-800/50 group-hover:bg-white dark:group-hover:bg-gray-700 transition-colors">
                    {loading ? (
                        <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                    ) : message ? (
                        <Check className="w-5 h-5 text-green-500" />
                    ) : (
                        <Archive className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-blue-500 transition-colors" />
                    )}
                </div>
                <div className="flex flex-col items-start">
                    <span className="font-medium text-sm">
                        {message || "Google Tasks"}
                    </span>
                    {!message && (
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                            Click to import
                        </span>
                    )}
                </div>
            </button>
        </div>
    );
}
