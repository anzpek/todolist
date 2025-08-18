import { useState, useEffect } from 'react'
import { Plus, Save, X, Copy, Trash2, Edit2 } from 'lucide-react'
import type { ProjectTemplate, SubTask, Priority } from '../types/todo'
import { generateId } from '../utils/helpers'

interface ProjectTemplateManagerProps {
  isOpen: boolean
  onClose: () => void
  onSelectTemplate?: (template: ProjectTemplate) => void
}

const ProjectTemplateManager = ({ isOpen, onClose, onSelectTemplate }: ProjectTemplateManagerProps) => {
  const [templates, setTemplates] = useState<ProjectTemplate[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<ProjectTemplate | null>(null)
  const [newTemplate, setNewTemplate] = useState<Omit<ProjectTemplate, 'id' | 'createdAt' | 'updatedAt'>>({
    name: '',
    description: '',
    category: 'shortterm',
    subTasks: [],
    defaultPriority: 'medium',
    tags: []
  })

  // 로컬 스토리지에서 템플릿 로드
  useEffect(() => {
    const savedTemplates = localStorage.getItem('projectTemplates')
    if (savedTemplates) {
      try {
        const parsed = JSON.parse(savedTemplates).map((template: any) => ({
          ...template,
          createdAt: new Date(template.createdAt),
          updatedAt: new Date(template.updatedAt)
        }))
        console.log('로드된 템플릿들:', parsed) // 디버깅용
        console.log('editingTemplate 상태:', editingTemplate) // 디버깅용
        setTemplates(parsed)
      } catch (error) {
        console.error('Failed to load templates:', error)
      }
    }
  }, [])

  // 모달이 닫힐 때 편집 상태 초기화
  useEffect(() => {
    if (!isOpen) {
      setEditingTemplate(null)
      setIsCreating(false)
      setNewTemplate({
        name: '',
        description: '',
        category: 'shortterm',
        subTasks: [],
        defaultPriority: 'medium',
        tags: []
      })
    }
  }, [isOpen])

  // 템플릿 저장
  const saveTemplates = (updatedTemplates: ProjectTemplate[]) => {
    setTemplates(updatedTemplates)
    localStorage.setItem('projectTemplates', JSON.stringify(updatedTemplates))
  }

  const handleCreateTemplate = () => {
    if (!newTemplate.name.trim()) return

    const template: ProjectTemplate = {
      ...newTemplate,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    }

    console.log('새 템플릿 저장:', template) // 디버깅용
    saveTemplates([...templates, template])
    setNewTemplate({
      name: '',
      description: '',
      category: 'shortterm',
      subTasks: [],
      defaultPriority: 'medium',
      tags: []
    })
    setIsCreating(false)
  }

  const handleUpdateTemplate = () => {
    if (!editingTemplate) return

    console.log('업데이트할 템플릿:', editingTemplate) // 디버깅용
    const updatedTemplates = templates.map(t => 
      t.id === editingTemplate.id 
        ? { ...editingTemplate, updatedAt: new Date() }
        : t
    )
    console.log('업데이트된 템플릿 목록:', updatedTemplates) // 디버깅용
    saveTemplates(updatedTemplates)
    setEditingTemplate(null)
  }

  const handleDeleteTemplate = (templateId: string) => {
    if (confirm('이 템플릿을 삭제하시겠습니까?')) {
      saveTemplates(templates.filter(t => t.id !== templateId))
    }
  }

  const handleDuplicateTemplate = (template: ProjectTemplate) => {
    const duplicated: ProjectTemplate = {
      ...template,
      id: generateId(),
      name: `${template.name} (복사본)`,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    saveTemplates([...templates, duplicated])
  }

  const addSubTaskToTemplate = (template: Omit<ProjectTemplate, 'id' | 'createdAt' | 'updatedAt'>, setter: (template: any) => void) => {
    const newSubTask: Omit<SubTask, 'id' | 'createdAt' | 'updatedAt'> = {
      title: '',
      completed: false,
      priority: 'medium'
    }
    setter({
      ...template,
      subTasks: [...template.subTasks, newSubTask]
    })
  }

  const updateSubTaskInTemplate = (
    template: any, 
    index: number, 
    updates: Partial<Omit<SubTask, 'id' | 'createdAt' | 'updatedAt'>>,
    setter: (template: any) => void
  ) => {
    const updatedSubTasks = template.subTasks.map((subTask: any, i: number) =>
      i === index ? { ...subTask, ...updates } : subTask
    )
    setter({ ...template, subTasks: updatedSubTasks })
  }

  const removeSubTaskFromTemplate = (template: any, index: number, setter: (template: any) => void) => {
    setter({
      ...template,
      subTasks: template.subTasks.filter((_: any, i: number) => i !== index)
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            프로젝트 템플릿 관리
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="mb-6">
            <button
              onClick={() => setIsCreating(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              새 템플릿 만들기
            </button>
          </div>

          {/* 새 템플릿 생성 폼 */}
          {isCreating && (
            <div className="mb-6 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <h3 className="text-lg font-medium mb-4">새 템플릿</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-2">템플릿 이름</label>
                  <input
                    type="text"
                    value={newTemplate.name}
                    onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="예: 7월 진흥원 교육 프로젝트"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">카테고리</label>
                  <select
                    value={newTemplate.category}
                    onChange={(e) => setNewTemplate({ ...newTemplate, category: e.target.value as 'longterm' | 'shortterm' })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  >
                    <option value="shortterm">숏텀 프로젝트</option>
                    <option value="longterm">롱텀 프로젝트</option>
                  </select>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">설명</label>
                <textarea
                  value={newTemplate.description}
                  onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  rows={3}
                  placeholder="프로젝트 설명"
                />
              </div>

              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium">하위 작업</label>
                  <button
                    onClick={() => addSubTaskToTemplate(newTemplate, setNewTemplate)}
                    className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    작업 추가
                  </button>
                </div>
                
                <div className="space-y-2">
                  {newTemplate.subTasks.map((subTask, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded">
                      <input
                        type="text"
                        value={subTask.title}
                        onChange={(e) => updateSubTaskInTemplate(newTemplate, index, { title: e.target.value }, setNewTemplate)}
                        className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 dark:bg-gray-600 dark:text-white"
                        placeholder="작업명"
                      />
                      <select
                        value={subTask.priority}
                        onChange={(e) => updateSubTaskInTemplate(newTemplate, index, { priority: e.target.value as Priority }, setNewTemplate)}
                        className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-600 dark:text-white"
                      >
                        <option value="low">낮음</option>
                        <option value="medium">보통</option>
                        <option value="high">높음</option>
                        <option value="urgent">긴급</option>
                      </select>
                      <button
                        onClick={() => removeSubTaskFromTemplate(newTemplate, index, setNewTemplate)}
                        className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  취소
                </button>
                <button
                  onClick={handleCreateTemplate}
                  className="btn-primary flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  저장
                </button>
              </div>
            </div>
          )}

          {/* 템플릿 수정 폼 */}
          {editingTemplate && (
            <div className="mb-6 p-4 border border-blue-200 dark:border-blue-700 rounded-lg bg-blue-50 dark:bg-blue-900/20">
              <h3 className="text-lg font-medium mb-4 text-blue-800 dark:text-blue-200">템플릿 수정</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-2">템플릿 이름</label>
                  <input
                    type="text"
                    value={editingTemplate.name}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="예: 7월 진흥원 교육 프로젝트"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">카테고리</label>
                  <select
                    value={editingTemplate.category}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, category: e.target.value as 'longterm' | 'shortterm' })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  >
                    <option value="shortterm">숏텀 프로젝트</option>
                    <option value="longterm">롱텀 프로젝트</option>
                  </select>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">설명</label>
                <textarea
                  value={editingTemplate.description}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  rows={3}
                  placeholder="프로젝트 설명"
                />
              </div>

              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium">하위 작업</label>
                  <button
                    onClick={() => addSubTaskToTemplate(editingTemplate, setEditingTemplate)}
                    className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    작업 추가
                  </button>
                </div>
                
                <div className="space-y-2">
                  {editingTemplate.subTasks.map((subTask, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded">
                      <input
                        type="text"
                        value={subTask.title}
                        onChange={(e) => updateSubTaskInTemplate(editingTemplate, index, { title: e.target.value }, setEditingTemplate)}
                        className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 dark:bg-gray-600 dark:text-white"
                        placeholder="작업명"
                      />
                      <select
                        value={subTask.priority}
                        onChange={(e) => updateSubTaskInTemplate(editingTemplate, index, { priority: e.target.value as Priority }, setEditingTemplate)}
                        className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-600 dark:text-white"
                      >
                        <option value="low">낮음</option>
                        <option value="medium">보통</option>
                        <option value="high">높음</option>
                        <option value="urgent">긴급</option>
                      </select>
                      <button
                        onClick={() => removeSubTaskFromTemplate(editingTemplate, index, setEditingTemplate)}
                        className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setEditingTemplate(null)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  취소
                </button>
                <button
                  onClick={handleUpdateTemplate}
                  className="btn-primary flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  수정 완료
                </button>
              </div>
            </div>
          )}

          {/* 템플릿 목록 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map((template) => (
              <div key={template.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">{template.name}</h3>
                    <span className={`text-xs px-2 py-1 rounded ${
                      template.category === 'longterm' 
                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300'
                        : 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300'
                    }`}>
                      {template.category === 'longterm' ? '롱텀' : '숏텀'}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        console.log('수정할 템플릿:', template) // 디버깅용
                        setEditingTemplate(template)
                      }}
                      className="p-1 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded"
                      title="수정"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleDuplicateTemplate(template)}
                      className="p-1 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/20 rounded"
                      title="복사"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleDeleteTemplate(template.id)}
                      className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded"
                      title="삭제"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                
                {template.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{template.description}</p>
                )}
                
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                  하위 작업: {template.subTasks.length}개
                </div>

                {onSelectTemplate && (
                  <button
                    onClick={() => {
                      onSelectTemplate(template)
                      onClose()
                    }}
                    className="w-full btn-secondary text-sm"
                  >
                    이 템플릿 사용
                  </button>
                )}
              </div>
            ))}
          </div>

          {templates.length === 0 && !isCreating && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <p>저장된 템플릿이 없습니다.</p>
              <p className="text-sm">자주 사용하는 프로젝트를 템플릿으로 저장해보세요.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ProjectTemplateManager