import React from 'react';
import { createPortal } from 'react-dom';
import { X, ExternalLink, AlertTriangle, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface GoogleTasksGuideModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const GoogleTasksGuideModal: React.FC<GoogleTasksGuideModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col animate-scale-in"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="shrink-0 flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-t-2xl">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <span className="text-xl">📚</span> Google Tasks 연동 가이드
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-8 overflow-y-auto">

                    {/* Step 1: Basic Connection */}
                    <section className="space-y-3">
                        <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary-100 text-primary-600 text-sm font-bold">1</span>
                            연동 시작하기
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 pl-8">
                            사이드바 하단의 <span className="font-semibold text-primary-600 dark:text-primary-400">Google Tasks</span> 버튼을 클릭하여 로그인을 진행해주세요.
                        </p>
                    </section>

                    {/* Step 2: Unverified App Warning */}
                    <section className="space-y-3">
                        <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-orange-100 text-orange-600 text-sm font-bold">2</span>
                            '확인되지 않은 앱' 경고 해결
                        </h3>
                        <div className="pl-8 space-y-3">
                            <div className="p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-900/30 rounded-xl text-sm text-orange-800 dark:text-orange-200">
                                <div className="flex gap-2">
                                    <ShieldAlert className="w-5 h-5 flex-shrink-0" />
                                    <p>
                                        앱이 Google의 정식 승인을 받기 전까지는 보안 경고 화면이 나타날 수 있습니다. 이는 정상적인 과정입니다.
                                    </p>
                                </div>
                            </div>
                            <ol className="list-decimal pl-4 space-y-2 text-sm text-gray-600 dark:text-gray-400 marker:text-gray-400">
                                <li>경고 화면 좌측 하단의 <span className="font-bold text-gray-800 dark:text-gray-200">고급(Advanced)</span> 글자를 클릭합니다.</li>
                                <li>
                                    펼쳐진 내용 하단의
                                    <span className="block mt-1 p-2 bg-gray-100 dark:bg-gray-700/50 rounded text-xs break-all font-mono">
                                        todolist-116f3.firebaseapp.com(으)로 이동(안전하지 않음)
                                    </span>
                                    링크를 클릭하여 진행합니다.
                                </li>
                                <li>권한 요청 화면에서 <span className="font-bold text-blue-600">계속/허용</span>을 선택합니다.</li>
                            </ol>
                        </div>
                    </section>

                    {/* Step 3: API Activation (For Developers) */}
                    <section className="space-y-3">
                        <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-sm font-bold">3</span>
                            (개발자용) API 활성화 필요 시
                        </h3>
                        <div className="pl-8 space-y-3">
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                만약 <b>"API has not been used in project"</b> 또는 <b>403 Forbidden</b> 오류가 발생한다면, Google Cloud Console에서 API를 활성화해야 합니다.
                            </p>

                            <a
                                href="https://console.developers.google.com/apis/api/tasks.googleapis.com/overview?project=470825187407"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 p-3 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-xl transition-colors text-sm font-medium group"
                            >
                                <ExternalLink className="w-4 h-4" />
                                Google Tasks API 활성화 페이지 바로가기
                            </a>

                            <div className="flex gap-2 items-start text-xs text-gray-500 dark:text-gray-400">
                                <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                                <span>위 링크 접속 후 상단의 <b>사용(ENABLE)</b> 버튼을 클릭하면 해결됩니다.</span>
                            </div>
                        </div>
                    </section>

                    {/* Footer Note */}
                    <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl text-xs text-gray-500 dark:text-gray-400 text-center leading-relaxed">
                        모든 설정이 완료되면, <b>설정 &gt; Google Tasks Auto-Sync</b> 토글을 켜서 앱 실행 시 자동으로 할 일을 동기화할 수 있습니다.
                    </div>

                </div>

                {/* Footer Actions */}
                <div className="shrink-0 p-4 border-t border-gray-100 dark:border-gray-700 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium rounded-xl hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
                    >
                        확인
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default GoogleTasksGuideModal;
