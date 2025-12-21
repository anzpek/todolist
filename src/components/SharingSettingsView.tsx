import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { firestoreService } from '../services/firestoreService'
import {
    Users, Mail, Trash2, Search, UserPlus, Send, X, Check,
    AlertCircle, Bell, Clock, Plus, Edit2, FolderPlus, Loader2,
    Shield, LogOut, MoreVertical, ChevronDown, UserMinus, Save
} from 'lucide-react'
import type { Todo, SharedUser, SharePermission, SharingGroup } from '../types/todo'

interface SharingRequest {
    id: string
    fromUid: string
    fromEmail: string
    toEmail: string
    groupId: string
    groupName: string
    permission: SharePermission
    status: 'pending' | 'accepted' | 'rejected'
    createdAt: Date
}

/**
 * SharingSettingsView: 완벽한 공유 설정 화면
 * - 공유 그룹 생성/관리
 * - 멤버 초대 (pending 상태로 요청 발송)
 * - 받은 초대 수락/거절
 */
const SharingSettingsView = () => {
    const { t } = useTranslation()
    const { currentUser } = useAuth()

    // 공유 그룹 (Firestore에서 로드)
    const [sharingGroups, setSharingGroups] = useState<SharingGroup[]>([])
    // 받은 초대 요청 (이메일 기반)
    const [incomingRequests, setIncomingRequests] = useState<SharingRequest[]>([])
    // 보낸 초대 요청 (내가 초대한 것들, pending 상태)
    const [sentRequests, setSentRequests] = useState<SharingRequest[]>([])

    // 새 그룹 생성 상태
    const [isCreatingGroup, setIsCreatingGroup] = useState(false)
    const [newGroupName, setNewGroupName] = useState('')
    const [newGroupInvitees, setNewGroupInvitees] = useState<SharedUser[]>([])

    // 멤버 초대 상태 (특정 그룹)
    const [invitingToGroupId, setInvitingToGroupId] = useState<string | null>(null)
    const [invitePermission, setInvitePermission] = useState<SharePermission>('edit')

    // 검색 상태
    const [searchEmail, setSearchEmail] = useState('')
    const [searchResult, setSearchResult] = useState<SharedUser | null>(null)
    const [isSearching, setIsSearching] = useState(false)
    const [searchError, setSearchError] = useState('')

    // 로딩 및 메시지
    const [loading, setLoading] = useState(true)
    const [actionMessage, setActionMessage] = useState('')
    const [isSending, setIsSending] = useState(false)

    // 권한 변경 대기열 (저장 버튼 클릭 전까지 보관)
    const [pendingPermissionChanges, setPendingPermissionChanges] = useState<{
        groupId: string
        memberUid: string
        memberEmail: string
        previousPermission: SharePermission
        newPermission: SharePermission
    }[]>([])

    // 헬퍼: 권한 라벨
    const getPermissionLabel = (p: SharePermission) => {
        switch (p) {
            case 'admin': return t('sharing.roleAdmin')
            case 'edit': return t('sharing.roleEditor')
            case 'view': return t('sharing.roleViewer')
            default: return p
        }
    }

    // ===== Firestore 구독 =====
    useEffect(() => {
        if (!currentUser?.uid) return
        const unsubscribe = firestoreService.subscribeSharingGroups(currentUser.uid, (groups) => {
            setSharingGroups(groups)
            setLoading(false)
        })
        return () => unsubscribe()
    }, [currentUser?.uid])

    useEffect(() => {
        if (!currentUser?.email) return
        const normalizedEmail = currentUser.email.toLowerCase().trim()
        const unsubscribe = firestoreService.subscribeToIncomingInvitations(normalizedEmail, (requests) => {
            setIncomingRequests(requests as SharingRequest[])
        })
        return () => unsubscribe()
    }, [currentUser?.email])

    useEffect(() => {
        if (!currentUser?.uid) return
        const unsubscribe = firestoreService.subscribeToSentInvitations(currentUser.uid, (requests) => {
            setSentRequests(requests.filter(r => r.status === 'pending') as SharingRequest[])
        })
        return () => unsubscribe()
    }, [currentUser?.uid])

    // 권한 변경 알림 구독
    const [permissionNotifications, setPermissionNotifications] = useState<any[]>([])
    useEffect(() => {
        if (!currentUser?.uid) return
        const unsubscribe = firestoreService.subscribeToSharingNotifications(
            currentUser.uid,
            (notifications) => {
                // 읽지 않은 알림만 표시
                const unreadNotifications = notifications.filter(n => !n.read && !n.isRead)
                setPermissionNotifications(unreadNotifications)
            }
        )
        return () => unsubscribe()
    }, [currentUser?.uid])

    // 권한 변경 알림 읽음 처리
    const handleMarkNotificationRead = async (notificationId: string) => {
        try {
            await firestoreService.markNotificationAsRead(notificationId)
        } catch (error) {
            console.error('알림 읽음 처리 실패:', error)
        }
    }

    // ===== 핸들러: 사용자 검색 =====
    const handleSearchUser = async () => {
        if (!searchEmail.trim()) return
        if (searchEmail === currentUser?.email) {
            setSearchError(t('sharing.cannotShareSelf'))
            return
        }
        setIsSearching(true)
        setSearchError('')
        setSearchResult(null)
        try {
            const user = await firestoreService.findUserByEmail(searchEmail)
            if (user) setSearchResult(user)
            else setSearchError(t('sharing.userNotFound'))
        } catch (error) {
            setSearchError('Error searching user')
        } finally {
            setIsSearching(false)
        }
    }

    // ===== 핸들러: 새 그룹 생성 관련 =====
    const addInviteeToNewGroup = () => {
        if (!searchResult) return
        if (newGroupInvitees.some(m => m.uid === searchResult.uid)) {
            setSearchError(t('sharing.alreadyAdded'))
            return
        }
        setNewGroupInvitees(prev => [...prev, { ...searchResult, permission: invitePermission }])
        setSearchResult(null)
        setSearchEmail('')
        setInvitePermission('edit') // Reset to default
    }

    const handleCreateGroup = async () => {
        if (!newGroupName.trim() || newGroupInvitees.length === 0) {
            setSearchError('Group name and at least 1 member required')
            return
        }
        setIsSending(true)
        try {
            // 1. 그룹 생성
            const groupId = await firestoreService.createSharingGroup(currentUser!.uid, {
                name: newGroupName,
                members: [{
                    uid: currentUser!.uid,
                    email: currentUser!.email!.toLowerCase(),
                    displayName: currentUser!.displayName || '',
                    permission: 'admin'
                }]
            })
            // 2. 초대 발송
            for (const invitee of newGroupInvitees) {
                await firestoreService.sendSharingInvitation(
                    { uid: currentUser!.uid, email: currentUser!.email!, displayName: currentUser!.displayName || '', permission: 'admin' },
                    invitee.email.toLowerCase(), groupId, newGroupName, invitee.permission as SharePermission, invitee.displayName
                )
            }
            setActionMessage(`Group '${newGroupName}' created`)
            setIsCreatingGroup(false)
            setNewGroupName('')
            setNewGroupInvitees([])
        } catch (e) {
            setSearchError('Failed to create group')
        } finally {
            setIsSending(false)
        }
    }

    // ===== 핸들러: 기존 그룹 관리 =====
    const handleInviteToGroup = async (group: SharingGroup) => {
        if (!searchResult) return
        setIsSending(true)
        try {
            await firestoreService.sendSharingInvitation(
                { uid: currentUser!.uid, email: currentUser!.email!, displayName: currentUser!.displayName || '', permission: 'admin' },
                searchResult.email, group.id, group.name, invitePermission, searchResult.displayName
            )
            setActionMessage(t('sharing.inviteSent'))
            setSearchResult(null)
            setSearchEmail('')
            setInvitingToGroupId(null)
            setInvitePermission('edit') // Reset
        } catch (e) {
            setSearchError('Failed to invite')
        } finally {
            setIsSending(false)
        }
    }

    // 권한 변경 (바로 저장하지 않고 pending에 추가)
    const handleUpdatePermission = (groupId: string, memberUid: string, newPermission: SharePermission) => {
        const group = sharingGroups.find(g => g.id === groupId)
        if (!group) return

        const member = group.members.find(m => m.uid === memberUid)
        if (!member || member.permission === newPermission) return

        // 기존 pending 변경사항에서 같은 멤버의 변경이 있으면 제거하고 새로 추가
        setPendingPermissionChanges(prev => {
            const filtered = prev.filter(c => !(c.groupId === groupId && c.memberUid === memberUid))
            return [...filtered, {
                groupId,
                memberUid,
                memberEmail: member.email,
                previousPermission: member.permission,
                newPermission
            }]
        })
    }

    // 권한 변경 저장 및 알림 발송
    const handleSavePermissionChanges = async (groupId: string) => {
        if (!currentUser) return

        const changesForGroup = pendingPermissionChanges.filter(c => c.groupId === groupId)
        if (changesForGroup.length === 0) return

        setIsSending(true)
        try {
            const group = sharingGroups.find(g => g.id === groupId)
            if (!group) return

            // 1. 그룹 멤버 권한 업데이트
            const updatedMembers = group.members.map(m => {
                const change = changesForGroup.find(c => c.memberUid === m.uid)
                return change ? { ...m, permission: change.newPermission } : m
            })
            await firestoreService.updateSharingGroup(currentUser.uid, groupId, { members: updatedMembers })

            // 2. 각 변경된 멤버에게 알림 발송
            for (const change of changesForGroup) {
                await firestoreService.sendPermissionChangeNotification(
                    { uid: currentUser.uid, email: currentUser.email! },
                    change.memberUid,
                    groupId,
                    group.name,
                    change.previousPermission,
                    change.newPermission
                )
            }

            // 3. pending 변경사항 제거
            setPendingPermissionChanges(prev => prev.filter(c => c.groupId !== groupId))

            // 4. 성공 메시지
            setActionMessage(`${changesForGroup.length} permission(s) changed.`)
            setTimeout(() => setActionMessage(''), 5000)

        } catch (e) {
            console.error('권한 변경 저장 실패:', e)
            setSearchError('Failed to save permission changes.')
        } finally {
            setIsSending(false)
        }
    }

    // 그룹별 pending 변경사항 확인
    const hasPendingChanges = (groupId: string) => pendingPermissionChanges.some(c => c.groupId === groupId)

    // pending 변경사항에서 해당 멤버의 새 권한 가져오기
    const getPendingPermission = (groupId: string, memberUid: string): SharePermission | undefined => {
        const change = pendingPermissionChanges.find(c => c.groupId === groupId && c.memberUid === memberUid)
        return change?.newPermission
    }

    const handleRemoveMember = async (groupId: string, memberUid: string) => {
        if (!window.confirm(t('sharing.confirmRemoveMember') || 'Remove this member?')) return
        const group = sharingGroups.find(g => g.id === groupId)
        if (!group) return
        const updatedMembers = group.members.filter(m => m.uid !== memberUid)
        await firestoreService.updateSharingGroup(currentUser!.uid, groupId, { members: updatedMembers })
    }

    const handleLeaveGroup = async (groupId: string) => {
        if (!window.confirm(t('sharing.confirmLeaveGroup') || 'Leave this group?')) return
        await firestoreService.leaveSharingGroup(currentUser!.uid, groupId)
    }

    const handleDeleteGroup = async (groupId: string) => {
        if (!window.confirm(t('sharing.confirmDeleteGroup'))) return
        await firestoreService.deleteSharingGroup(currentUser!.uid, groupId)
    }

    const handleRespondToInvite = async (req: SharingRequest, response: 'accepted' | 'rejected') => {
        await firestoreService.respondToInvitation(req.id, response, {
            uid: currentUser!.uid, email: currentUser!.email!, displayName: currentUser!.displayName || '', permission: req.permission
        })
    }

    // ===== UI Helpers =====
    const getPendingInvitesForGroup = (groupId: string) => sentRequests.filter(r => r.groupId === groupId)

    if (loading) return <div className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto" /></div>

    return (
        <div className="max-w-4xl mx-auto space-y-8 p-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Users className="w-6 h-6 text-primary-600" />
                        {t('sharing.settingsTitle')}
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">{t('sharing.subtitle')}</p>
                </div>
                <button
                    onClick={() => setIsCreatingGroup(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition"
                >
                    <FolderPlus className="w-4 h-4" />
                    {t('sharing.createNewGroup')}
                </button>
            </div>

            {/* Messages */}
            {actionMessage && (
                <div className="p-4 bg-green-50 text-green-700 rounded-xl flex items-center gap-2 animate-fade-in">
                    <Check className="w-4 h-4" /> {actionMessage}
                </div>
            )}
            {searchError && (
                <div className="p-4 bg-red-50 text-red-700 rounded-xl flex items-center gap-2 animate-fade-in">
                    <AlertCircle className="w-4 h-4" /> {searchError}
                </div>
            )}

            {/* Incoming Invites */}
            {incomingRequests.length > 0 && (
                <section className="bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800 rounded-2xl p-6">
                    <h3 className="font-bold text-orange-800 dark:text-orange-200 flex items-center gap-2 mb-4">
                        <Bell className="w-5 h-5" /> {t('sharing.incomingInvites')} ({incomingRequests.length})
                    </h3>
                    <div className="space-y-3">
                        {incomingRequests.map(req => (
                            <div key={req.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-orange-100 dark:border-orange-900/50 flex items-center justify-between shadow-sm">
                                <div>
                                    <p className="font-medium text-gray-900 dark:text-white">
                                        {t('sharing.inviteMessage', { email: req.fromEmail, group: req.groupName })}
                                    </p>
                                    <p className="text-sm text-gray-500 mt-1">{t('sharing.columnPermission')}: {getPermissionLabel(req.permission)}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleRespondToInvite(req, 'accepted')} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium">{t('sharing.accept')}</button>
                                    <button onClick={() => handleRespondToInvite(req, 'rejected')} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm font-medium">{t('sharing.reject')}</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Permission Change Notifications */}
            {permissionNotifications.length > 0 && (
                <section className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-2xl p-6">
                    <h3 className="font-bold text-blue-800 dark:text-blue-200 flex items-center gap-2 mb-4">
                        <Shield className="w-5 h-5" /> {t('sharing.permissionChange')} ({permissionNotifications.length})
                    </h3>
                    <div className="space-y-3">
                        {permissionNotifications.map(notification => (
                            <div key={notification.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-blue-100 dark:border-blue-900/50 flex items-center justify-between shadow-sm">
                                <div>
                                    <p className="font-medium text-gray-900 dark:text-white">
                                        {t('sharing.permissionChangeMessage', { email: notification.fromEmail, group: notification.groupName })}
                                    </p>
                                    <p className="text-sm text-gray-500 mt-1">
                                        {getPermissionLabel(notification.previousPermission)}
                                        {' → '}
                                        <span className="font-semibold text-blue-600">
                                            {getPermissionLabel(notification.newPermission)}
                                        </span>
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleMarkNotificationRead(notification.id)}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                                >
                                    {t('sharing.check')}
                                </button>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Create Group Form */}
            {isCreatingGroup && (
                <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-lg">
                    <h3 className="font-bold text-lg mb-4">{t('sharing.createNewGroup')}</h3>
                    <div className="space-y-4">
                        <input
                            type="text"
                            placeholder={t('sharing.groupNamePlaceholder')}
                            value={newGroupName}
                            onChange={e => setNewGroupName(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500"
                        />

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('sharing.inviteMember')}</label>
                            <div className="flex gap-2">
                                <input
                                    type="email"
                                    placeholder={t('sharing.searchEmailPlaceholder')}
                                    value={searchEmail}
                                    onChange={e => setSearchEmail(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleSearchUser()}
                                    className="flex-1 px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg"
                                />
                                <button onClick={handleSearchUser} disabled={isSearching} className="px-4 py-2 bg-gray-600 text-white rounded-lg">{t('sharing.search')}</button>
                            </div>
                            {searchResult && (
                                <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                                    <span className="font-medium">{searchResult.displayName || searchResult.email}</span>
                                    <div className="flex items-center gap-2">
                                        <select
                                            value={invitePermission}
                                            onChange={(e) => setInvitePermission(e.target.value as SharePermission)}
                                            className="px-2 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
                                        >
                                            <option value="view">{t('sharing.roleView')}</option>
                                            <option value="edit">{t('sharing.roleEdit')}</option>
                                            <option value="admin">{t('sharing.roleAdmin')}</option>
                                        </select>
                                        <button onClick={addInviteeToNewGroup} className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg">{t('sharing.add')}</button>
                                    </div>
                                </div>
                            )}
                            {/* Selected Invitees List */}
                            {newGroupInvitees.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {newGroupInvitees.map((m, i) => (
                                        <span key={i} className="flex items-center gap-1 px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-sm">
                                            {m.email} ({getPermissionLabel(m.permission as SharePermission)})
                                            <button onClick={() => setNewGroupInvitees(prev => prev.filter(x => x.uid !== m.uid))}><X className="w-3 h-3" /></button>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button onClick={handleCreateGroup} disabled={isSending} className="flex-1 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 font-medium">{t('sharing.createGroupSendInvite')}</button>
                            <button onClick={() => setIsCreatingGroup(false)} className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200">{t('sharing.cancel')}</button>
                        </div>
                    </div>
                </section>
            )}

            {/* Sharing Groups List */}
            <div className="space-y-6">
                {sharingGroups.map(group => {
                    const pendingInvites = getPendingInvitesForGroup(group.id)

                    return (
                        <div key={group.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm overflow-hidden">
                            {/* Group Header */}
                            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                        {group.name}
                                        {group.isReference && <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">{t('sharing.referenceGroup')}</span>}
                                    </h3>
                                    <p className="text-xs text-gray-500 mt-1">{t('sharing.owner')}: {group.originalOwnerEmail || currentUser?.email}</p>
                                </div>
                                <div className="flex gap-2">
                                    {group.isReference ? (
                                        <button onClick={() => handleLeaveGroup(group.id)} className="flex items-center gap-1 px-3 py-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg text-sm transition">
                                            <LogOut className="w-4 h-4" /> {t('sharing.leave')}
                                        </button>
                                    ) : (
                                        <button onClick={() => handleDeleteGroup(group.id)} className="flex items-center gap-1 px-3 py-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg text-sm transition">
                                            <Trash2 className="w-4 h-4" /> {t('sharing.deleteGroup')}
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Member List (Table Style) */}
                            <div className="p-4">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-left text-gray-500 border-b border-gray-100 dark:border-gray-700">
                                            <th className="pb-3 pl-2 font-medium">{t('sharing.columnMember')}</th>
                                            <th className="pb-3 font-medium">{t('sharing.columnPermission')}</th>
                                            <th className="pb-3 text-right pr-2">{t('sharing.columnManage')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                                        {/* Existing Members */}
                                        {group.members.map(member => (
                                            <tr key={member.uid} className="group hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                                <td className="py-3 pl-2">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-100 to-purple-100 dark:from-primary-900 dark:to-purple-900 flex items-center justify-center text-primary-700 dark:text-primary-300 font-bold">
                                                            {member.email[0].toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <div className="font-medium text-gray-900 dark:text-gray-100">
                                                                {member.displayName || member.email.split('@')[0]}
                                                                {member.uid === currentUser?.uid && <span className="ml-2 text-xs text-primary-600">{t('sharing.me')}</span>}
                                                            </div>
                                                            <div className="text-gray-400 text-xs">{member.email}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-3">
                                                    {/* Permission Dropdown: Only Owner/Admin can change others' permission */}
                                                    {!group.isReference && member.uid !== currentUser?.uid ? (
                                                        <div className="relative inline-block">
                                                            <select
                                                                value={getPendingPermission(group.id, member.uid) || member.permission}
                                                                onChange={(e) => handleUpdatePermission(group.id, member.uid, e.target.value as SharePermission)}
                                                                className={`appearance-none pl-3 pr-8 py-1 border-none rounded-lg text-xs font-medium cursor-pointer focus:ring-2 focus:ring-primary-500 ${getPendingPermission(group.id, member.uid) ? 'bg-yellow-100 dark:bg-yellow-900/50 ring-2 ring-yellow-400' : 'bg-gray-100 dark:bg-gray-700'}`}
                                                            >
                                                                <option value="view">{t('sharing.roleView')}</option>
                                                                <option value="edit">{t('sharing.roleEdit')}</option>
                                                                <option value="admin">{t('sharing.roleAdmin')}</option>
                                                            </select>
                                                            <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                                                        </div>
                                                    ) : (
                                                        <span className={`px-2 py-1 rounded text-xs font-medium ${member.permission === 'admin' ? 'bg-purple-100 text-purple-700' :
                                                            member.permission === 'edit' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                                                            }`}>
                                                            {getPermissionLabel(member.permission)}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-3 text-right pr-2">
                                                    {/* Remove Button */}
                                                    {!group.isReference && member.uid !== currentUser?.uid && (
                                                        <button
                                                            onClick={() => handleRemoveMember(group.id, member.uid)}
                                                            className="text-gray-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-lg transition"
                                                            title={t('sharing.removeMember')}
                                                        >
                                                            <UserMinus className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}

                                        {/* Pending Invites */}
                                        {pendingInvites.map(invite => (
                                            <tr key={invite.id} className="bg-yellow-50/50 dark:bg-yellow-900/10">
                                                <td className="py-3 pl-2">
                                                    <div className="flex items-center gap-3 opacity-70">
                                                        <div className="w-8 h-8 rounded-full bg-yellow-100 dark:bg-yellow-900/50 flex items-center justify-center text-yellow-700">
                                                            <Clock className="w-4 h-4" />
                                                        </div>
                                                        <div>
                                                            <div className="font-medium text-gray-700 dark:text-gray-300">
                                                                {invite.toEmail}
                                                            </div>
                                                            <div className="text-yellow-600 text-xs">{t('sharing.waitingAccept')}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-3">
                                                    <span className="text-xs text-gray-400">{t('sharing.invited')} ({getPermissionLabel(invite.permission)})</span>
                                                </td>
                                                <td className="py-3 text-right pr-2">
                                                    <span className="text-xs text-gray-400">-</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Group Footer: Add Member Action */}
                            {!group.isReference && (
                                <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/30">
                                    {invitingToGroupId === group.id ? (
                                        <div className="flex gap-2 animate-fade-in items-center">
                                            <input
                                                type="email"
                                                placeholder={t('sharing.inviteMemberPlaceholder')}
                                                value={searchEmail}
                                                onChange={e => setSearchEmail(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && handleSearchUser()}
                                                className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg"
                                            />
                                            <button onClick={handleSearchUser} className="px-3 py-2 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700">{t('sharing.search')}</button>

                                            {searchResult && (
                                                <div className="flex items-center gap-2">
                                                    <select
                                                        value={invitePermission}
                                                        onChange={(e) => setInvitePermission(e.target.value as SharePermission)}
                                                        className="px-2 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
                                                    >
                                                        <option value="view">{t('sharing.roleView')}</option>
                                                        <option value="edit">{t('sharing.roleEdit')}</option>
                                                        <option value="admin">{t('sharing.roleAdmin')}</option>
                                                    </select>
                                                    <button onClick={() => handleInviteToGroup(group)} className="px-3 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 animate-pulse">
                                                        {t('sharing.sendInvite')}
                                                    </button>
                                                </div>
                                            )}

                                            <button onClick={() => { setInvitingToGroupId(null); setSearchEmail(''); setSearchResult(null); }} className="p-2 text-gray-500 hover:text-gray-700">
                                                <X className="w-5 h-5" />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between">
                                            <button onClick={() => setInvitingToGroupId(group.id)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-primary-600 font-medium transition px-2 py-1 rounded-lg hover:bg-primary-50">
                                                <UserPlus className="w-4 h-4" /> {t('sharing.inviteMember')}
                                            </button>
                                            {hasPendingChanges(group.id) && (
                                                <button
                                                    onClick={() => handleSavePermissionChanges(group.id)}
                                                    disabled={isSending}
                                                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition font-medium disabled:opacity-50"
                                                >
                                                    {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                                    {t('sharing.savePermissionChanges')}
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )
                })}

                {sharingGroups.length === 0 && !isCreatingGroup && (
                    <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                        <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 font-medium">{t('sharing.noGroups')}</p>
                        <p className="text-gray-400 text-sm mt-1">{t('sharing.noGroupsDesc')}</p>
                    </div>
                )}
            </div>
        </div>
    )
}

export default SharingSettingsView
