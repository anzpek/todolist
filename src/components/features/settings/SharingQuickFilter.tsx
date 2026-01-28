import { useState, useEffect, useMemo } from 'react'
import { User, Share2, Users, ChevronDown } from 'lucide-react'
import { useAuth } from '../../../contexts/AuthContext'
import { firestoreService } from '../../../services/firestoreService'
import type { SharedUser } from '../../../types/todo'
import { useTranslation } from 'react-i18next'
import { useTodos } from '../../../contexts/TodoContext'

interface SharingGroup {
    id: string
    name: string
    members: SharedUser[]
    isReference?: boolean
    originalGroupId?: string
    originalOwnerId?: string
}

export interface SharingFilterState {
    showPersonal: boolean
    showMyShared: boolean
    showGroupShared: boolean
    selectedGroupId: string | null // null = 전체
}

interface SharingQuickFilterProps {
    filterState: SharingFilterState
    onChange: (newState: SharingFilterState) => void
    className?: string
    isMobile?: boolean
}

const SharingQuickFilter = ({ filterState, onChange, className = '', isMobile = false }: SharingQuickFilterProps) => {
    const { t } = useTranslation()
    const { currentUser } = useAuth()
    const { todos } = useTodos()
    const [sharingGroups, setSharingGroups] = useState<SharingGroup[]>([])
    const [isDropdownOpen, setIsDropdownOpen] = useState(false)

    // 공유 그룹 로드
    useEffect(() => {
        if (!currentUser?.uid) return

        const unsubscribe = firestoreService.subscribeSharingGroups(
            currentUser.uid,
            (groups) => setSharingGroups(groups)
        )

        return () => unsubscribe()
    }, [currentUser?.uid])

    // 각 필터 카테고리별 개수 계산
    const counts = useMemo(() => {
        if (!currentUser) return { personal: 0, myShared: 0, groupShared: 0 }

        let personal = 0
        let myShared = 0
        let groupShared = 0

        todos.forEach(todo => {
            // 그룹 필터 적용
            if (filterState.selectedGroupId) {
                if (todo.sharedGroupId !== filterState.selectedGroupId && todo.sharedGroupOwnerId !== filterState.selectedGroupId) {
                    if (todo.sharedGroupId !== filterState.selectedGroupId) return;
                }
            }

            const isPersonalTodo = todo.visibility?.isPersonal !== false
            const isSharedTodo = todo.visibility?.isShared === true
            const isMyShared = isSharedTodo && todo.ownerId === currentUser.uid
            const isSharedWithMe = isSharedTodo && todo.ownerId !== currentUser.uid

            if (isPersonalTodo && !isSharedTodo) personal++
            if (isMyShared) myShared++
            if (isSharedWithMe) groupShared++
        })

        return { personal, myShared, groupShared }
    }, [todos, currentUser, filterState.selectedGroupId])


    const toggleFilter = (key: keyof Pick<SharingFilterState, 'showPersonal' | 'showMyShared' | 'showGroupShared'>) => {
        onChange({
            ...filterState,
            [key]: !filterState[key]
        })
    }

    const selectGroup = (groupId: string | null) => {
        onChange({
            ...filterState,
            selectedGroupId: groupId
        })
        setIsDropdownOpen(false)
    }

    const getSelectedGroupName = () => {
        if (!filterState.selectedGroupId) return t('sharing.allGroups') || '전체'
        const group = sharingGroups.find(g =>
            g.id === filterState.selectedGroupId ||
            g.originalGroupId === filterState.selectedGroupId
        )
        return group?.name || t('sharing.allGroups') || '전체'
    }

    // 버튼 스타일: 선택됨 vs 해제됨
    const getButtonStyle = (isActive: boolean) => {
        if (isActive) {
            return 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700 ring-1 ring-blue-500/20'
        }
        return 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
    }

    // --- Mobile UI Render ---
    if (isMobile) {
        return (
            <div className={`flex flex-col gap-5 ${className}`}>
                {/* 1. 필터 버튼 섹션 */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2 px-1">
                        <Share2 className="w-3.5 h-3.5 text-blue-500" />
                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            {t('sharing.filter') || '필터'}
                        </span>
                    </div>
                    <div className="grid gap-2">
                        <button
                            onClick={() => toggleFilter('showPersonal')}
                            className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${getButtonStyle(filterState.showPersonal)}`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${filterState.showPersonal ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>
                                    <User className="w-4 h-4" />
                                </div>
                                <span className="font-medium">{t('sharing.personal') || '내 할일'}</span>
                            </div>
                            <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold ${filterState.showPersonal ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>
                                {counts.personal}
                            </span>
                        </button>

                        <button
                            onClick={() => toggleFilter('showMyShared')}
                            className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${getButtonStyle(filterState.showMyShared)}`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${filterState.showMyShared ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>
                                    <Share2 className="w-4 h-4" />
                                </div>
                                <span className="font-medium">{t('sharing.myShared') || '내가 공유'}</span>
                            </div>
                            <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold ${filterState.showMyShared ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>
                                {counts.myShared}
                            </span>
                        </button>

                        <button
                            onClick={() => toggleFilter('showGroupShared')}
                            className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${getButtonStyle(filterState.showGroupShared)}`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${filterState.showGroupShared ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>
                                    <Users className="w-4 h-4" />
                                </div>
                                <span className="font-medium">{t('sharing.groupShared') || '그룹 공유'}</span>
                            </div>
                            <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold ${filterState.showGroupShared ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>
                                {counts.groupShared}
                            </span>
                        </button>
                    </div>
                </div>

                {/* 2. 그룹 선택 섹션 (인라인 리스트) */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2 px-1">
                        <Users className="w-3.5 h-3.5 text-blue-500" />
                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            {t('sharing.group') || '그룹 선택'}
                        </span>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-2 border border-gray-200 dark:border-gray-700 max-h-56 overflow-y-auto">
                        <button
                            onClick={() => selectGroup(null)}
                            className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all mb-1 ${!filterState.selectedGroupId ? 'bg-white dark:bg-gray-700 shadow-sm ring-1 ring-blue-500/20 text-blue-600 dark:text-blue-300 font-medium' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50'}`}
                        >
                            <div className={`w-2.5 h-2.5 rounded-full ${!filterState.selectedGroupId ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                            {t('sharing.allGroups') || '전체'}
                        </button>

                        {sharingGroups.map(group => {
                            const groupId = group.isReference ? group.originalGroupId : group.id
                            const isSelected = filterState.selectedGroupId === groupId
                            return (
                                <button
                                    key={group.id}
                                    onClick={() => selectGroup(groupId || null)}
                                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all mb-1 ${isSelected ? 'bg-white dark:bg-gray-700 shadow-sm ring-1 ring-blue-500/20 text-blue-600 dark:text-blue-300 font-medium' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50'}`}
                                >
                                    <div className={`w-2.5 h-2.5 rounded-full ${isSelected ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                                    <span className="flex-1 text-left truncate">{group.name}</span>
                                    <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-600 rounded-full text-gray-500 dark:text-gray-300">
                                        {group.members?.length || 0}명
                                    </span>
                                </button>
                            )
                        })}
                        {sharingGroups.length === 0 && (
                            <div className="p-4 text-center text-xs text-gray-400 italic">
                                {t('sharing.noGroupsShort') || '그룹 없음'}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )
    }

    // --- Desktop UI Render ---
    return (
        <div className={`flex items-center gap-2 flex-wrap ${className}`}>
            {/* 내 할일 토글 */}
            <button
                type="button"
                onClick={() => toggleFilter('showPersonal')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${getButtonStyle(filterState.showPersonal)}`}
                title={t('sharing.filterPersonal') || '개인 할일'}
            >
                <User className="w-3.5 h-3.5" />
                <span>{t('sharing.personal') || '내 할일'}</span>
                <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] ${filterState.showPersonal ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>
                    {counts.personal}
                </span>
            </button>

            {/* 내가 공유 토글 */}
            <button
                type="button"
                onClick={() => toggleFilter('showMyShared')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${getButtonStyle(filterState.showMyShared)}`}
                title={t('sharing.filterMyShared') || '내가 공유한 할일'}
            >
                <Share2 className="w-3.5 h-3.5" />
                <span>{t('sharing.myShared') || '내가 공유'}</span>
                <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] ${filterState.showMyShared ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>
                    {counts.myShared}
                </span>
            </button>

            {/* 그룹 공유 토글 */}
            <button
                type="button"
                onClick={() => toggleFilter('showGroupShared')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${getButtonStyle(filterState.showGroupShared)}`}
                title={t('sharing.filterGroupShared') || '그룹이 공유한 할일'}
            >
                <Users className="w-3.5 h-3.5" />
                <span>{t('sharing.groupShared') || '그룹 공유'}</span>
                <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] ${filterState.showGroupShared ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>
                    {counts.groupShared}
                </span>
            </button>

            {/* 구분선 */}
            <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-1" />

            {/* 그룹 선택 드롭다운 */}
            <div className="relative">
                <button
                    type="button"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                    <span className="text-gray-500 dark:text-gray-400">
                        {t('sharing.group') || '그룹'}:
                    </span>
                    <span className="text-gray-900 dark:text-white max-w-[100px] truncate">
                        {getSelectedGroupName()}
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* 드롭다운 메뉴 */}
                {isDropdownOpen && (
                    <>
                        {/* Backdrop */}
                        <div
                            className="fixed inset-0 z-40"
                            onClick={() => setIsDropdownOpen(false)}
                        />

                        <div className="absolute top-full right-0 mt-1 min-w-[200px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 py-1 max-h-60 overflow-y-auto">
                            {/* 전체 옵션 */}
                            <button
                                type="button"
                                onClick={() => selectGroup(null)}
                                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${!filterState.selectedGroupId ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'
                                    }`}
                            >
                                {t('sharing.allGroups') || '전체'}
                            </button>

                            {/* 구분선 */}
                            {sharingGroups.length > 0 && (
                                <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />
                            )}

                            {/* 그룹 목록 */}
                            {sharingGroups.map(group => {
                                const groupId = group.isReference ? group.originalGroupId : group.id
                                const isSelected = filterState.selectedGroupId === groupId

                                return (
                                    <button
                                        key={group.id}
                                        type="button"
                                        onClick={() => selectGroup(groupId || null)}
                                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2 ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'
                                            }`}
                                    >
                                        <Users className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
                                        <span className="truncate flex-1">{group.name}</span>
                                        <span className="text-xs text-gray-400">({group.members?.length || 0})</span>
                                    </button>
                                )
                            })}

                            {sharingGroups.length === 0 && (
                                <div className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 text-center">
                                    {t('sharing.noGroupsShort') || '공유 그룹 없음'}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}

export default SharingQuickFilter
