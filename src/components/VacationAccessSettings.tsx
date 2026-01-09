import React, { useState, useEffect } from 'react';
import { firestoreService } from '../services/firestoreService';
import { Plus, Trash2, Shield, AlertCircle, Crown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

const SUPER_ADMIN = 'lkd0115lkd@gmail.com';

export default function VacationAccessSettings() {
    const { currentUser } = useAuth();
    const { isDark } = useTheme();
    const [accessList, setAccessList] = useState<string[]>([]);
    const [newEmail, setNewEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribe = firestoreService.subscribeToVacationAccessList((emails) => {
            setAccessList(emails);
        });
        return () => unsubscribe();
    }, []);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newEmail.trim()) return;

        setLoading(true);
        setError(null);
        try {
            await firestoreService.addVacationAccessEmail(newEmail.trim());
            setNewEmail('');
        } catch (err) {
            console.error(err);
            setError('이메일 추가 실패: 권한이 없거나 네트워크 오류입니다.');
        } finally {
            setLoading(false);
        }
    };

    const handleRemove = async (email: string) => {
        if (!window.confirm(`${email} 계정의 권한을 삭제하시겠습니까?`)) return;

        setLoading(true);
        setError(null);
        try {
            await firestoreService.removeVacationAccessEmail(email);
        } catch (err) {
            console.error(err);
            setError('삭제 실패');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">휴가 관리 접근 권한</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        휴가 관리 메뉴를 볼 수 있는 사용자를 관리합니다.
                    </p>
                </div>
            </div>

            {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg flex items-center gap-2 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                </div>
            )}

            <form onSubmit={handleAdd} className="flex gap-2">
                <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="허용할 구글 이메일 입력"
                    className="flex-1 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                    disabled={loading}
                />
                <button
                    type="submit"
                    disabled={loading || !newEmail.trim()}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    추가
                </button>
            </form>

            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
                <ul className="divide-y divide-gray-200/50 dark:divide-gray-700/50">
                    {/* Super Admin Always Visible */}
                    <li className="flex items-center justify-between p-4 bg-purple-50/50 dark:bg-purple-900/10 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-gradient-to-br from-yellow-300 to-yellow-500 rounded-full text-white shadow-sm ring-2 ring-white dark:ring-gray-800">
                                <Crown className="w-4 h-4 fill-current" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-900 dark:text-white font-bold">{SUPER_ADMIN}</span>
                                    <span className="px-2 py-0.5 text-[10px] bg-purple-100 text-purple-700 rounded-full dark:bg-purple-900 dark:text-purple-300 font-bold border border-purple-200 dark:border-purple-800">
                                        Super Admin
                                    </span>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">최고 관리자 (항상 접근 가능)</p>
                            </div>
                        </div>
                    </li>

                    {/* Regular Users */}
                    {accessList.filter(email => email !== SUPER_ADMIN).map(email => (
                        <li key={email} className="flex items-center justify-between p-4 hover:bg-white dark:hover:bg-gray-800 transition-colors">
                            <div className="flex items-center gap-3 pl-2">
                                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 text-xs font-medium">
                                    {email[0].toUpperCase()}
                                </div>
                                <span className="text-gray-700 dark:text-gray-300 font-medium">{email}</span>
                            </div>
                            <button
                                onClick={() => handleRemove(email)}
                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                title="권한 삭제"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </li>
                    ))}

                    {accessList.filter(email => email !== SUPER_ADMIN).length === 0 && (
                        <li className="p-8 text-center text-gray-400 dark:text-gray-500 text-sm">
                            추가된 관리자가 없습니다.
                        </li>
                    )}
                </ul>
            </div>
        </div>
    );
}
