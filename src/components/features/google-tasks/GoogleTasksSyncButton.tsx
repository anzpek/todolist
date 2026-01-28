import { useGoogleTasksSync } from '../../../hooks/useGoogleTasksSync';
import { useAuth } from '../../../contexts/AuthContext';
import { Archive, Loader2, Check } from 'lucide-react';

export default function GoogleTasksSyncButton() {
    const { currentUser, isGoogleTasksConnected, signInWithGoogle, tokenExpiration } = useAuth();
    const { syncGoogleTasks, loading, message } = useGoogleTasksSync();

    // 토큰 만료 여부 확인 (현재 시간 > 만료 시간)
    // 여유 있게 1분 정도 미리 만료로 간주
    const isTokenExpired = isGoogleTasksConnected && tokenExpiration && Date.now() > (tokenExpiration - 60000);

    const handleSync = async () => {
        if (!isGoogleTasksConnected || isTokenExpired) {
            try {
                // Not connected or Expired -> Trigger Auth
                // 만료된 경우에도 signInWithGoogle()을 통해 새 토큰을 받아와야 함
                await signInWithGoogle();
                // Auth success will update isGoogleTasksConnected via context
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
                        ? (isTokenExpired ? 'bg-orange-100/50 dark:bg-orange-900/30' : 'bg-green-100/50 dark:bg-green-900/30')
                        : 'bg-gray-100/50 dark:bg-gray-800/50 group-hover:bg-white dark:group-hover:bg-gray-700'
                    }`}>
                    {loading ? (
                        <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                    ) : message ? (
                        <Check className="w-5 h-5 text-blue-500" />
                    ) : isGoogleTasksConnected ? (
                        // 만료되었으면 빨간/주황색, 아니면 초록색
                        isTokenExpired ? (
                            <div className="relative">
                                <Archive className="w-5 h-5 text-orange-500" />
                                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500"></span>
                                </span>
                            </div>
                        ) : (
                            <Check className="w-5 h-5 text-green-500" />
                        )
                    ) : (
                        <Archive className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-blue-500 transition-colors" />
                    )}
                </div>
                <div className="flex flex-col items-start">
                    <span className="font-medium text-sm flex items-center gap-2">
                        {message || "Google Tasks"}
                        {!message && isGoogleTasksConnected && !isTokenExpired && (
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        )}
                        {!message && isTokenExpired && (
                            <span className="text-xs text-orange-500 font-bold">(Expired)</span>
                        )}
                    </span>
                    {!message && (
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                            {isGoogleTasksConnected
                                ? (isTokenExpired ? 'Tap to renew session' : 'Sync active')
                                : 'Click to connect'}
                        </span>
                    )}
                </div>
            </button>
        </div>
    );
}
