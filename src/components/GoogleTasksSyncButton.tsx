import { useGoogleTasksSync } from '../hooks/useGoogleTasksSync';
import { useAuth } from '../contexts/AuthContext';
import { Archive, Loader2, Check } from 'lucide-react';

export default function GoogleTasksSyncButton() {
    const { currentUser, isGoogleTasksConnected, signInWithGoogle } = useAuth();
    const { syncGoogleTasks, loading, message } = useGoogleTasksSync();

    const handleSync = async () => {
        if (!isGoogleTasksConnected) {
            try {
                // Not connected -> Trigger Auth
                await signInWithGoogle();
                // Auth success will update isGoogleTasksConnected via context
                // You might automatically trigger sync here if desired, 
                // but usually user might want to click again or we can auto-sync.
                // Let's auto-sync for convenience.
                syncGoogleTasks();
            } catch (error) {
                console.error("Link failed", error);
            }
        } else {
            // Connected -> Sync
            syncGoogleTasks();
        }
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
                <div className={`p-2 rounded-lg transition-colors ${isGoogleTasksConnected
                        ? 'bg-blue-100/50 dark:bg-blue-900/30'
                        : 'bg-gray-100/50 dark:bg-gray-800/50 group-hover:bg-white dark:group-hover:bg-gray-700'
                    }`}>
                    {loading ? (
                        <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                    ) : message ? (
                        <Check className="w-5 h-5 text-green-500" />
                    ) : isGoogleTasksConnected ? (
                        <Check className="w-5 h-5 text-blue-500" />
                    ) : (
                        <Archive className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-blue-500 transition-colors" />
                    )}
                </div>
                <div className="flex flex-col items-start">
                    <span className="font-medium text-sm flex items-center gap-2">
                        {message || "Google Tasks"}
                        {!message && isGoogleTasksConnected && (
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        )}
                    </span>
                    {!message && (
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                            {isGoogleTasksConnected ? 'Click to sync' : 'Click to connect'}
                        </span>
                    )}
                </div>
            </button>
        </div>
    );
}
