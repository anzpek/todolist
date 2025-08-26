import type { Todo } from '../types/todo'
import type { RecurringInstance, RecurringTemplate } from '../types/recurring'

/**
 * 반복 인스턴스를 일반 할일로 변환
 */
export function convertRecurringInstanceToTodo(
  instance: RecurringInstance, 
  template: RecurringTemplate
): Todo {
  return {
    id: `recurring_${instance.id}`, // 반복 인스턴스임을 구분하기 위한 prefix
    title: instance.overrides?.title || template.title,
    description: instance.overrides?.description || template.description,
    completed: instance.completed,
    priority: instance.overrides?.priority || template.priority,
    type: template.type,
    dueDate: new Date(instance.instanceDate),
    dueTime: instance.overrides?.dueTime || template.dueTime,
    recurrence: template.recurrence,
    recurrenceDay: template.recurrenceDay,
    recurrenceDate: template.recurrenceDate,
    holidayHandling: template.holidayHandling,
    subTasks: template.subTasks?.map((subTask, index) => ({
      id: `${instance.id}_subtask_${index}`,
      title: subTask.title,
      description: subTask.description,
      completed: false,
      priority: subTask.priority,
      dueDate: subTask.dueDate,
      dueTime: subTask.dueTime,
      createdAt: instance.createdAt,
      updatedAt: instance.updatedAt,
    })) || [],
    project: template.project,
    templateId: template.id,
    parentId: undefined,
    tags: instance.overrides?.tags || template.tags || [],
    estimatedDuration: template.estimatedDuration,
    actualDuration: undefined,
    startDate: template.startDate,
    completedAt: instance.completedAt,
    notification: template.notification,
    createdAt: instance.createdAt,
    updatedAt: instance.updatedAt,
    
    // 반복 인스턴스 특별 정보
    _isRecurringInstance: true,
    _instanceId: instance.id,
    _templateId: template.id,
    _skipped: instance.skipped,
    _skippedReason: instance.skippedReason,
  } as Todo & {
    _isRecurringInstance: boolean
    _instanceId: string
    _templateId: string
    _skipped: boolean
    _skippedReason?: string
  }
}

/**
 * 반복 인스턴스들을 일반 할일 목록으로 변환
 */
export function convertRecurringInstancesToTodos(
  instances: RecurringInstance[],
  templates: RecurringTemplate[]
): Todo[] {
  return instances
    .map(instance => {
      const template = templates.find(t => t.id === instance.templateId)
      if (!template) return null
      return convertRecurringInstanceToTodo(instance, template)
    })
    .filter((todo): todo is Todo => todo !== null)
}

/**
 * 특정 날짜의 반복 인스턴스들을 할일로 변환
 */
export function getRecurringTodosForDate(
  date: Date,
  instances: RecurringInstance[],
  templates: RecurringTemplate[]
): Todo[] {
  const targetDate = new Date(date)
  targetDate.setHours(0, 0, 0, 0)
  
  const dayInstances = instances.filter(instance => {
    const instanceDate = new Date(instance.instanceDate)
    instanceDate.setHours(0, 0, 0, 0)
    return instanceDate.getTime() === targetDate.getTime()
  })
  
  return convertRecurringInstancesToTodos(dayInstances, templates)
}

/**
 * 할일이 반복 인스턴스인지 확인
 */
export function isRecurringInstanceTodo(todo: Todo): boolean {
  return (todo as any)._isRecurringInstance === true
}

/**
 * 반복 인스턴스 할일에서 원본 인스턴스 ID 추출
 */
export function getInstanceIdFromRecurringTodo(todo: Todo): string | null {
  if (!isRecurringInstanceTodo(todo)) return null
  return (todo as any)._instanceId || null
}

/**
 * 반복 인스턴스 할일에서 템플릿 ID 추출
 */
export function getTemplateIdFromRecurringTodo(todo: Todo): string | null {
  if (!isRecurringInstanceTodo(todo)) return null
  return (todo as any)._templateId || null
}