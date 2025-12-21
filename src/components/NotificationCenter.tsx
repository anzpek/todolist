import { useState, useEffect, useRef } from 'react'
import { Bell, UserPlus, Check, X, Loader2, AlertCircle, Shield } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { firestoreService } from '../services/firestoreService'
import type { SharingRequest, SharedUser, SharingNotification } from '../types/todo'
import { useTranslation } from 'react-i18next'
import { createPortal } from 'react-dom'

const NotificationCenter = () => {
    const { t } = useTranslation()
    const { currentUser } = useAuth()
    const [invitations, setInvitations] = useState<SharingRequest[]>([])
    const [sharingNotifications, setSharingNotifications] = useState<SharingNotification[]>([])
    const [isOpen, setIsOpen] = useState(false)
    const [hasUnread, setHasUnread] = useState(false)
    const [processingId, setProcessingId] = useState<string | null>(null)
    const modalRef = useRef<HTMLDivElement>(null)

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Subscribe to invitations
    useEffect(() => {
        if (!currentUser?.email) return

        const unsubscribe = firestoreService.subscribeToIncomingInvitations(currentUser.email, (requests) => {
            setInvitations(requests)
        })

        return () => unsubscribe()
    }, [currentUser?.email])

    // Subscribe to sharing notifications (permission changes)
    useEffect(() => {
        if (!currentUser?.uid) return

        const unsubscribe = firestoreService.subscribeToSharingNotifications(currentUser.uid, (notifications) => {
            setSharingNotifications(notifications)
        })

        return () => unsubscribe()
    }, [currentUser?.uid])

    // Update unread status
    useEffect(() => {
        const unreadInvitations = invitations.length > 0
        const unreadNotifications = sharingNotifications.some(n => !n.read)
        setHasUnread(unreadInvitations || unreadNotifications)
    }, [invitations, sharingNotifications])

    const handleRespond = async (request: SharingRequest, response: 'accepted' | 'rejected') => {
        if (!currentUser) return
        setProcessingId(request.id)

        try {
            const userAsSharedUser: SharedUser = {
                uid: currentUser.uid,
                email: currentUser.email!,
                displayName: currentUser.displayName || undefined,
                photoURL: currentUser.photoURL,
                permission: request.permission || 'read' // Default to read if missing
            }

            await firestoreService.respondToInvitation(request.id, response, userAsSharedUser)
            // Local update (optional since subscription will update)
            setInvitations(prev => prev.filter(r => r.id !== request.id))
        } catch (error) {
            console.error('Action failed:', error)
            alert(t('common.error') || 'Action failed')
        } finally {
            setProcessingId(null)
        }
    }

    return (
        <div className="relative z-50">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title={t('nav.notifications') || 'Notifications'}
            >
                <Bell className={`w-6 h-6 ${hasUnread ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300'}`} />
                {hasUnread && (
                    <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-gray-900" />
                )}
            </button>

            {/* Dropdown / Modal */}
            {isOpen && (
                <div
                    ref={modalRef}
                    className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                >
                    <div className="p-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50">
                        <h3 className="font-semibold text-sm text-gray-900 dark:text-white">
                            {t('nav.notifications') || 'Notifications'}
                        </h3>
                        {invitations.length > 0 && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full dark:bg-blue-900/30 dark:text-blue-300">
                                {invitations.length}
                            </span>
                        )}
                    </div>

                    <div className="max-h-[400px] overflow-y-auto">
                        {invitations.length === 0 && sharingNotifications.length === 0 ? (
                            <div className="p-8 text-center text-gray-400 text-sm">
                                <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                <p>{t('notifications.empty') || 'No new notifications'}</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                {/* Permission Change Notifications */}
                                {sharingNotifications.map(notification => (
                                    <div
                                        key={notification.id}
                                        className={`p-4 transition-colors cursor-pointer ${notification.read ? 'bg-white dark:bg-gray-800 opacity-70' : 'bg-orange-50 dark:bg-orange-900/20'}`}
                                        onClick={async () => {
                                            if (!notification.read) {
                                                await firestoreService.markNotificationAsRead(notification.id)
                                            }
                                        }}
                                    >
                                        <div className="flex gap-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${notification.read ? 'bg-gray-100 dark:bg-gray-700 text-gray-500' : 'bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-300'}`}>
                                                <Shield className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                        권한 변경
                                                    </p>
                                                    {!notification.read && (
                                                        <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-bold">!</span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">
                                                    <span className="font-medium text-primary-600">'{notification.groupName}'</span> 그룹에서
                                                </p>
                                                <p className="text-xs text-gray-700 dark:text-gray-200 mt-1 font-medium">
                                                    {notification.previousPermission === 'admin' ? '관리자' : notification.previousPermission === 'edit' ? '편집자' : '뷰어'}
                                                    <span className="mx-1.5">→</span>
                                                    <span className={`${notification.newPermission === 'admin' ? 'text-purple-600' : notification.newPermission === 'edit' ? 'text-blue-600' : 'text-gray-600'}`}>
                                                        {notification.newPermission === 'admin' ? '관리자' : notification.newPermission === 'edit' ? '편집자' : '뷰어'}
                                                    </span>
                                                    <span className="text-gray-400 ml-1">로 변경됨</span>
                                                </p>
                                                <p className="text-xs text-gray-400 mt-1">
                                                    {notification.fromEmail}님이 변경 • {notification.createdAt instanceof Date ? notification.createdAt.toLocaleString('ko-KR') : '방금'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {/* Invitation Notifications */}
                                {invitations.map(request => (
                                    <div key={request.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                        <div className="flex gap-3">
                                            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-300 shrink-0">
                                                <UserPlus className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                    {t('notifications.inviteTitle') || 'Invitation to share'}
                                                </p>
                                                <p className="text-xs text-gray-500 mt-0.5 break-all">
                                                    <span className="font-medium text-gray-700 dark:text-gray-300">{request.fromEmail}</span> invited you to <span className="font-medium text-gray-700 dark:text-gray-300">"{request.shareName || request.todoTitle}"</span>
                                                </p>

                                                <p className="text-xs text-gray-400 mt-1">
                                                    {request.createdAt instanceof Date ? request.createdAt.toLocaleDateString() : 'Just now'}
                                                </p>

                                                <div className="flex gap-2 mt-3">
                                                    <button
                                                        onClick={() => handleRespond(request, 'accepted')}
                                                        disabled={!!processingId}
                                                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                                    >
                                                        {processingId === request.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                                        {t('common.accept') || 'Accept'}
                                                    </button>
                                                    <button
                                                        onClick={() => handleRespond(request, 'rejected')}
                                                        disabled={!!processingId}
                                                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
                                                    >
                                                        <X className="w-3.5 h-3.5" />
                                                        {t('common.decline') || 'Decline'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

export default NotificationCenter
