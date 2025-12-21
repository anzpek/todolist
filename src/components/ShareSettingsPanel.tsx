import { useState, useEffect } from 'react'
import { X, Search, Send, Loader2, Clock } from 'lucide-react'
import { firestoreService } from '../services/firestoreService'
import type { SharedUser, SharePermission } from '../types/todo'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'

interface ShareSettingsPanelProps {
    todoId?: string // If present, Live Mode (updates Firestore directly)
    todoTitle?: string
    currentUserId?: string
    initialSharedWith: SharedUser[]
    onUpdate?: (sharedWith: SharedUser[]) => void // For Draft Mode
    isOwner?: boolean
    onClose?: () => void // Optional close handler if needed for specific layouts
}

const ShareSettingsPanel = ({
    todoId,
    todoTitle = 'Task',
    currentUserId,
    initialSharedWith,
    onUpdate,
    isOwner = false,
    onClose
}: ShareSettingsPanelProps) => {
    const { t } = useTranslation()
    const { currentUser } = useAuth()

    const [sharedWith, setSharedWith] = useState<SharedUser[]>(initialSharedWith)
    const [sentInvites, setSentInvites] = useState<any[]>([])
    const [searchEmail, setSearchEmail] = useState('')
    const [searchResult, setSearchResult] = useState<SharedUser | null>(null)
    const [shareName, setShareName] = useState('')
    const [selectedPermission, setSelectedPermission] = useState<SharePermission>('read')

    const [isSearching, setIsSearching] = useState(false)
    const [searchError, setSearchError] = useState('')
    const [isSending, setIsSending] = useState(false)

    // Sync with initial props
    useEffect(() => {
        setSharedWith(initialSharedWith)
        setSearchEmail('')
        setSearchResult(null)
        setSearchError('')
        setShareName(todoTitle)

        if (todoId && currentUser) {
            const unsubscribe = firestoreService.subscribeToSentInvitations(currentUser.uid, (requests) => {
                const related = requests.filter(r => r.todoId === todoId && r.status === 'pending');
                setSentInvites(related);
            });
            return () => unsubscribe();
        }
    }, [initialSharedWith, todoId, currentUser, todoTitle])

    const handleSearchUser = async () => {
        if (!searchEmail.trim()) return

        setIsSearching(true)
        setSearchError('')
        setSearchResult(null)

        try {
            const user = await firestoreService.findUserByEmail(searchEmail)
            if (user) {
                if (user.uid === currentUserId) {
                    setSearchError(t('sharing.cannotShareSelf') || 'Cannot share with yourself')
                } else if (sharedWith.some(u => u.uid === user.uid)) {
                    setSearchError(t('sharing.alreadyAdded') || 'User already has access')
                } else {
                    setSearchResult({
                        uid: user.uid,
                        email: user.email,
                        displayName: user.displayName,
                        photoURL: user.photoURL,
                        permission: 'read'
                    })
                }
            } else {
                setSearchError(t('sharing.userNotFound') || 'User not found')
            }
        } catch (error) {
            console.error('Search error:', error)
            setSearchError(t('common.error') || 'Error occurred')
        } finally {
            setIsSearching(false)
        }
    }

    const handleSendInvite = async () => {
        if (!searchResult || !currentUser) return

        if (todoId) {
            // Live Mode
            setIsSending(true)
            try {
                const currentUserShared: SharedUser = {
                    uid: currentUser.uid,
                    email: currentUser.email!,
                    displayName: currentUser.displayName || undefined,
                    photoURL: currentUser.photoURL,
                    permission: 'admin'
                }

                await firestoreService.sendSharingInvitation(
                    currentUserShared,
                    searchResult.email,
                    todoId,
                    todoTitle,
                    selectedPermission,
                    shareName
                )

                setSearchResult(null)
                setSearchEmail('')
                setShareName(todoTitle)

                await firestoreService.updateTodo(todoId, {
                    visibility: {
                        isPersonal: true,
                        isShared: true
                    }
                }, currentUser.uid)

                alert(t('sharing.inviteSent') || 'Invitation sent!')
            } catch (error: any) {
                console.error('Failed to send invite:', error)
                if (error.message === 'Already invited this user to this task.') {
                    setSearchError(t('sharing.alreadyInvited') || 'Invitation already pending');
                } else {
                    alert('Failed to send invite');
                }
            } finally {
                setIsSending(false)
            }
        } else {
            // Draft Mode
            const newUser = { ...searchResult, permission: selectedPermission }
            const newList = [...sharedWith, newUser]
            setSharedWith(newList)
            onUpdate?.(newList)

            setSearchResult(null)
            setSearchEmail('')
        }
    }

    const handleRemoveSharedUser = async (uid: string) => {
        if (!currentUser) return

        if (todoId) {
            if (confirm(t('sharing.confirmRevoke') || 'Revoke access for this user?')) {
                const newList = sharedWith.filter(u => u.uid !== uid);
                try {
                    await firestoreService.updateTodo(todoId, {
                        sharedWith: newList,
                        visibility: {
                            isPersonal: true,
                            isShared: newList.length > 0 || sentInvites.length > 0
                        }
                    }, currentUser.uid);
                    setSharedWith(newList);
                } catch (e) {
                    console.error("Revoke failed", e);
                    alert("Failed to revoke access");
                }
            }
        } else {
            const newList = sharedWith.filter(user => user.uid !== uid)
            setSharedWith(newList)
            onUpdate?.(newList)
        }
    }

    const handlePermissionChange = async (uid: string, permission: SharePermission) => {
        if (!currentUser) return

        if (todoId) {
            const newList = sharedWith.map(user => user.uid === uid ? { ...user, permission } : user);
            try {
                await firestoreService.updateTodo(todoId, { sharedWith: newList }, currentUser.uid);
                setSharedWith(newList);
            } catch (e) {
                console.error("Update permission failed", e);
            }
        } else {
            const newList = sharedWith.map(user => user.uid === uid ? { ...user, permission } : user)
            setSharedWith(newList)
            onUpdate?.(newList)
        }
    }

    return (
        <div className="space-y-6">
            {/* Invite Section */}
            <div className="space-y-3">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('sharing.inviteUser')}
                </label>

                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="email"
                            value={searchEmail}
                            onChange={(e) => setSearchEmail(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSearchUser()}
                            placeholder="email@example.com"
                            className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-700 border-none rounded-xl focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                        />
                    </div>
                    <button
                        onClick={handleSearchUser}
                        disabled={isSearching || !searchEmail}
                        className="px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl font-medium text-sm hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
                    >
                        {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    </button>
                </div>
                {searchError && <p className="text-xs text-red-500 ml-1">{searchError}</p>}

                {searchResult && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800 space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-200 dark:bg-blue-800 flex items-center justify-center text-sm font-bold text-blue-700 dark:text-blue-300">
                                {searchResult.email[0].toUpperCase()}
                            </div>
                            <div className="text-sm">
                                <p className="font-medium text-gray-900 dark:text-white">{searchResult.displayName || searchResult.email}</p>
                                <p className="text-xs text-gray-500">{searchResult.email}</p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div>
                                <label className="text-xs font-medium text-gray-500 uppercase">{t('sharing.shareName')}</label>
                                <input
                                    type="text"
                                    value={shareName}
                                    onChange={(e) => setShareName(e.target.value)}
                                    className="w-full mt-1 border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800"
                                    placeholder="Task Name for Recipient"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-500 uppercase">{t('modal.addTodo.priority')}</label>
                                <select
                                    value={selectedPermission}
                                    onChange={(e) => setSelectedPermission(e.target.value as SharePermission)}
                                    className="w-full mt-1 border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800"
                                >
                                    <option value="read">Can View</option>
                                    <option value="edit">Can Edit</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                        </div>

                        <button
                            onClick={handleSendInvite}
                            disabled={isSending}
                            className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-70 transition-colors flex items-center justify-center gap-2"
                        >
                            {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            {todoId ? t('sharing.sendInvite') : t('sharing.addToShared')}
                        </button>
                    </div>
                )}
            </div>

            {/* Pending Invites */}
            {todoId && sentInvites.length > 0 && (
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-orange-500" />
                        {t('sharing.pendingInvites')}
                    </label>
                    <div className="space-y-2 max-h-[120px] overflow-y-auto">
                        {sentInvites.map(invite => (
                            <div key={invite.id} className="flex items-center justify-between p-2 bg-orange-50 dark:bg-orange-900/10 rounded-lg border border-orange-100 dark:border-orange-800">
                                <div className="text-sm">
                                    <span className="font-medium">{invite.toEmail}</span>
                                    <span className="text-xs text-gray-500 ml-2">({invite.permission})</span>
                                </div>
                                <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">Waiting</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="h-px bg-gray-100 dark:bg-gray-700" />

            {/* Shared With List */}
            <div className="space-y-3">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('sharing.accessList')} ({sharedWith.length})
                </label>

                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                    {sharedWith.length === 0 ? (
                        <p className="text-center text-gray-400 text-sm py-2">
                            {t('sharing.noUsers')}
                        </p>
                    ) : (
                        sharedWith.map(user => (
                            <div key={user.uid} className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-xl transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-xs font-medium">
                                        {user.displayName?.[0] || user.email[0].toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                {user.displayName || user.email.split('@')[0]}
                                            </p>
                                            {user.uid === currentUserId && (
                                                <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 rounded">You</span>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <select
                                        value={user.permission}
                                        onChange={(e) => handlePermissionChange(user.uid, e.target.value as SharePermission)}
                                        disabled={user.uid === currentUserId}
                                        className="bg-transparent border-none text-xs font-medium text-gray-600 dark:text-gray-300 focus:ring-0 cursor-pointer disabled:cursor-default"
                                    >
                                        <option value="read">Can View</option>
                                        <option value="edit">Can Edit</option>
                                        <option value="admin">Admin</option>
                                    </select>

                                    {user.uid !== currentUserId && (
                                        <button
                                            onClick={() => handleRemoveSharedUser(user.uid)}
                                            className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {onClose && (
                <div className="pt-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg shadow-sm transition-all dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:hover:bg-gray-600"
                    >
                        {todoId ? t('common.close') : t('common.done')}
                    </button>
                </div>
            )}
        </div>
    )
}

export default ShareSettingsPanel
