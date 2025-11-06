import { CLASS_LEVELS } from '../constants/classes'

// Map of current class to next class in progression
export const CLASS_PROGRESSION: Record<string, string> = {
  'Creche': 'Nursery 1',
  'Nursery 1': 'Nursery 2',
  'Nursery 2': 'Kindergarten 1',
  'Kindergarten 1': 'Kindergarten 2',
  'Kindergarten 2': 'Primary 1',
  'Primary 1': 'Primary 2',
  'Primary 2': 'Primary 3',
  'Primary 3': 'Primary 4',
  'Primary 4': 'Primary 5',
  'Primary 5': 'Primary 6',
  'Primary 6': 'JHS 1',
  'JHS 1': 'JHS 2',
  'JHS 2': 'JHS 3',
  'JHS 3': 'completion' // Special value indicating graduation
}

/**
 * Check if a class is the last class (JHS 3)
 */
export const isLastClass = (className: string): boolean => {
  return className === 'JHS 3'
}

/**
 * Get the promotion target for a given class
 * Returns next class or "completion" for JHS 3
 */
export const getPromotionTarget = (currentClass: string): string | null => {
  return CLASS_PROGRESSION[currentClass] || null
}

/**
 * Get the next class in progression
 * Returns null if current class is JHS 3 (indicates graduation)
 */
export const getNextClass = (currentClass: string): string | null => {
  const next = CLASS_PROGRESSION[currentClass]
  return next === 'completion' ? null : next
}

/**
 * Validate if a promotion from one class to another is valid
 */
export const canPromoteToClass = (fromClass: string, toClass: string): boolean => {
  const expectedNext = CLASS_PROGRESSION[fromClass]
  return expectedNext === toClass || (fromClass === 'JHS 3' && toClass === 'completion')
}

/**
 * Check if promotion leads to completion (graduation)
 */
export const isCompletionPromotion = (fromClass: string, toClass: string): boolean => {
  return fromClass === 'JHS 3' && (toClass === 'completion' || getNextClass(fromClass) === null)
}

/**
 * Get all classes in order
 */
export const getAllClassesInOrder = (): string[] => {
  return CLASS_LEVELS.map(cls => cls.value)
}

/**
 * Get class index in progression (0-based)
 */
export const getClassIndex = (className: string): number => {
  return CLASS_LEVELS.findIndex(cls => cls.value === className)
}

/**
 * Get previous class in progression
 */
export const getPreviousClass = (currentClass: string): string | null => {
  const classIndex = getClassIndex(currentClass)
  if (classIndex <= 0) return null
  return CLASS_LEVELS[classIndex - 1].value
}
