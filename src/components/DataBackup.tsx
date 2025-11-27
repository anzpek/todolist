import { useState } from 'react'
import { Download, Upload, AlertCircle, CheckCircle, Cloud, CloudOff, RefreshCw } from 'lucide-react'
import { useTodos } from '../contexts/TodoContext'
import { useAuth } from '../contexts/AuthContext'

const DataBackup = () => {
  const { todos, addTodo, syncWithFirestore, syncing, loading, forceRefresh } = useTodos()
  const { currentUser } = useAuth()
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const handleSync = async () => {
    try {
      await syncWithFirestore()
      setMessage({ type: 'success', text: 'Firebase와 동기화가 완료되었습니다!' })
      setTimeout(() => setMessage(null), 3000)
    } catch (error) {
      setMessage({ type: 'error', text: '동기화 중 오류가 발생했습니다.' })
      setTimeout(() => setMessage(null), 3000)
    }
  }

  const handleForceRefresh = async () => {
    setRefreshing(true)
    try {
      await forceRefresh()
      setMessage({ type: 'success', text: 'Firestore에서 데이터를 새로고침했습니다!' })
      setTimeout(() => setMessage(null), 3000)
    } catch (error) {
      setMessage({ type: 'error', text: '데이터 새로고침 중 오류가 발생했습니다.' })
      setTimeout(() => setMessage(null), 3000)
    } finally {
      setRefreshing(false)
    }
  }


  const exportData = () => {
    try {
      const dataToExport = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        todos: todos
      }

      const dataStr = JSON.stringify(dataToExport, null, 2)
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr)

      const exportFileDefaultName = `todos-backup-${new Date().toISOString().split('T')[0]}.json`

      const linkElement = document.createElement('a')
      linkElement.setAttribute('href', dataUri)
      linkElement.setAttribute('download', exportFileDefaultName)
      linkElement.click()

      setMessage({ type: 'success', text: '데이터가 성공적으로 내보내기 되었습니다!' })
      setTimeout(() => setMessage(null), 3000)
    } catch (error) {
      setMessage({ type: 'error', text: '데이터 내보내기 중 오류가 발생했습니다.' })
      setTimeout(() => setMessage(null), 3000)
    }
  }

  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        const importedData = JSON.parse(content)

        if (!importedData.todos || !Array.isArray(importedData.todos)) {
          throw new Error('잘못된 백업 파일 형식입니다.')
        }

        // 기존 데이터와 병합 확인
        const confirmImport = window.confirm(
          `${importedData.todos.length}개의 할일을 가져오시겠습니까?\n기존 데이터와 병합됩니다.`
        )

        if (confirmImport) {
          importedData.todos.forEach((todo: any) => {
            // ID 충돌 방지를 위해 새 ID 생성
            const { id, ...todoData } = todo
            addTodo({
              ...todoData,
              createdAt: new Date(todo.createdAt),
              updatedAt: new Date(todo.updatedAt),
              dueDate: todo.dueDate ? new Date(todo.dueDate) : undefined,
              subTasks: todo.subTasks?.map((subTask: any) => ({
                ...subTask,
                createdAt: new Date(subTask.createdAt)
              }))
            })
          })

          setMessage({ type: 'success', text: `${importedData.todos.length}개의 할일을 성공적으로 가져왔습니다!` })
        }
      } catch (error) {
        setMessage({ type: 'error', text: '파일을 읽는 중 오류가 발생했습니다. 올바른 백업 파일인지 확인해주세요.' })
      }

      // 파일 입력 초기화
      event.target.value = ''
      setTimeout(() => setMessage(null), 3000)
    }

    reader.readAsText(file)
  }

  return (
    <div className="space-y-4">
      {/* 상태 표시와 버튼들을 2열 그리드로 배치 */}
      <div className="grid grid-cols-2 gap-3">
        {/* 연결 상태 표시 - 1열 전체 차지 */}
        <div className={`col-span-2 flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-sm ${currentUser
            ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
            : 'text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
          }`}>
          {currentUser ? (
            <>
              <Cloud className="w-4 h-4" />
              <span>온라인</span>
            </>
          ) : (
            <>
              <CloudOff className="w-4 h-4" />
              <span>오프라인</span>
            </>
          )}
        </div>

        {/* 내보내기 버튼 - 1열 */}
        <button
          onClick={exportData}
          className="flex items-center justify-center gap-2 px-3 py-2 text-sm bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800"
          title="데이터 내보내기"
        >
          <Download className="w-4 h-4" />
          내보내기
        </button>

        {/* 가져오기 버튼 - 1열 */}
        <label className="flex items-center justify-center gap-2 px-3 py-2 text-sm bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-800 cursor-pointer">
          <Upload className="w-4 h-4" />
          가져오기
          <input
            type="file"
            accept=".json"
            onChange={importData}
            className="hidden"
          />
        </label>
      </div>

      {/* 메시지 표시 */}
      {message && (
        <div className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg ${message.type === 'success'
            ? 'bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800'
            : 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
          }`}>
          {message.type === 'success' ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          {message.text}
        </div>
      )}
    </div>
  )
}

export default DataBackup