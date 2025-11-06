// Utility functions for date formatting

/**
 * Format a date to show only day, month, and year (DD/MM/YYYY)
 * @param date - Date string, Date object, or Firestore Timestamp
 * @returns Formatted date string (DD/MM/YYYY)
 */
export const formatDate = (date: string | Date | any): string => {
  try {
    let dateObj: Date;
    
    // Handle different date input types
    if (typeof date === 'string') {
      dateObj = new Date(date);
    } else if (date && typeof date === 'object' && date.toDate) {
      // Firestore Timestamp
      dateObj = date.toDate();
    } else if (date instanceof Date) {
      dateObj = date;
    } else {
      return 'Invalid Date';
    }
    
    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
      return 'Invalid Date';
    }
    
    // Format as DD/MM/YYYY
    const day = dateObj.getDate().toString().padStart(2, '0');
    const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    const year = dateObj.getFullYear();
    
    return `${day}/${month}/${year}`;
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid Date';
  }
};

/**
 * Format a date for input fields (YYYY-MM-DD)
 * @param date - Date string, Date object, or Firestore Timestamp
 * @returns Formatted date string for input fields (YYYY-MM-DD)
 */
export const formatDateForInput = (date: string | Date | any): string => {
  try {
    let dateObj: Date;
    
    if (typeof date === 'string') {
      dateObj = new Date(date);
    } else if (date && typeof date === 'object' && date.toDate) {
      dateObj = date.toDate();
    } else if (date instanceof Date) {
      dateObj = date;
    } else {
      return '';
    }
    
    if (isNaN(dateObj.getTime())) {
      return '';
    }
    
    const year = dateObj.getFullYear();
    const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    const day = dateObj.getDate().toString().padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error('Error formatting date for input:', error);
    return '';
  }
};

