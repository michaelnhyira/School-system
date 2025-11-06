import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  getDoc,
  query,
  where,
  Timestamp,
  setDoc
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import { db, storage } from '../config/firebase';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Firestore operations
export const firestoreUtils = {
  // Add document to collection
  async addDocument(collectionName: string, data: any) {
    try {
      const docRef = await addDoc(collection(db, collectionName), {
        ...data,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error adding document:', error);
      throw error;
    }
  },

  // Update document
  async updateDocument(collectionName: string, docId: string, data: any) {
    try {
      const docRef = doc(db, collectionName, docId);
      await updateDoc(docRef, {
        ...data,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error updating document:', error);
      throw error;
    }
  },

  // Delete document
  async deleteDocument(collectionName: string, docId: string) {
    try {
      const docRef = doc(db, collectionName, docId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting document:', error);
      throw error;
    }
  },

  // Get all documents from collection
  async getDocuments(collectionName: string) {
    try {
      const querySnapshot = await getDocs(collection(db, collectionName));
      const documents = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      return documents;
    } catch (error) {
      console.error('Error getting documents:', error);
      throw error;
    }
  },

  // Get single document
  async getDocument(collectionName: string, docId: string) {
    try {
      const docRef = doc(db, collectionName, docId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      } else {
        throw new Error('Document not found');
      }
    } catch (error) {
      console.error('Error getting document:', error);
      throw error;
    }
  },

  // Query documents with filters
  async queryDocuments(collectionName: string, field: string, operator: any, value: any) {
    try {
      const q = query(collection(db, collectionName), where(field, operator, value));
      const querySnapshot = await getDocs(q);
      const documents = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      return documents;
    } catch (error) {
      console.error('Error querying documents:', error);
      throw error;
    }
  }
};

// Storage operations
export const storageUtils = {
  // Upload file with size validation (1MB limit)
  async uploadFile(file: File, path: string): Promise<string> {
    try {
      // Check file size (1MB = 1024 * 1024 bytes)
      const maxSize = 1024 * 1024; // 1MB
      if (file.size > maxSize) {
        throw new Error('File size exceeds 1MB limit');
      }

      // Check file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Invalid file type. Only JPEG, PNG, and GIF files are allowed');
      }

      const storageRef = ref(storage, path);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      return downloadURL;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  },

  // Delete file
  async deleteFile(path: string) {
    try {
      const storageRef = ref(storage, path);
      await deleteObject(storageRef);
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  },

  // Generate unique file path for profile photos
  generateFilePath(userType: 'students' | 'teachers', userId: string, fileName: string): string {
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    return `profile-photos/${userType}/${userId}/${timestamp}_${sanitizedFileName}`;
  },

  // Delete old image when replacing with new one
  async deleteOldImage(imageUrl: string) {
    try {
      if (imageUrl && imageUrl.includes('firebasestorage.googleapis.com')) {
        // Extract the file path from the URL
        const url = new URL(imageUrl);
        const pathMatch = url.pathname.match(/\/o\/(.+)\?/);
        if (pathMatch) {
          const filePath = decodeURIComponent(pathMatch[1]);
          await this.deleteFile(filePath);
        }
      }
    } catch (error) {
      console.error('Error deleting old image:', error);
      // Don't throw error as this is not critical
    }
  }
};

// Student operations
export const studentUtils = {
  async createStudent(studentData: any) {
    return await firestoreUtils.addDocument('students', studentData);
  },

  async updateStudent(studentId: string, studentData: any) {
    return await firestoreUtils.updateDocument('students', studentId, studentData);
  },

  async deleteStudent(studentId: string) {
    return await firestoreUtils.deleteDocument('students', studentId);
  },

  async getStudents() {
    // Get all students from the main collection
    // Graduated students are in completedBatches/{year}/students and should not appear here
    const students = await firestoreUtils.getDocuments('students');
    // Filter out any that might have status 'graduated' (shouldn't exist, but safety check)
    return students.filter((student: any) => student.status !== 'graduated');
  },

  async getStudent(studentId: string) {
    return await firestoreUtils.getDocument('students', studentId);
  },

  async uploadStudentPhoto(studentId: string, file: File) {
    const filePath = storageUtils.generateFilePath('students', studentId, file.name);
    return await storageUtils.uploadFile(file, filePath);
  },

  // Add multiple students at once
  async addMultipleStudents(students: Array<{
    name: string;
    grade: string;
    class: string;
    parentName: string;
    phone: string;
    photoUrl?: string;
  }>) {
    try {
      const addPromises = students.map(student => 
        this.createStudent(student)
      );
      await Promise.all(addPromises);
    } catch (error) {
      console.error('Error adding multiple students:', error);
      throw error;
    }
  },

  // Delete all students
  async deleteAllStudents() {
    try {
      const students = await this.getStudents();
      const deletePromises = students.map((student: any) => 
        this.deleteStudent(student.id)
      );
      await Promise.all(deletePromises);
    } catch (error) {
      console.error('Error deleting all students:', error);
      throw error;
    }
  },

  // Promotion utilities
  async getStudentsByClass(className: string) {
    try {
      const allStudents = await this.getStudents();
      return allStudents.filter((student: any) => 
        student.assignedClass === className || 
        student.class === className
      );
    } catch (error) {
      console.error('Error getting students by class:', error);
      throw error;
    }
  },

  async getStudentsByPromotionStatus(className: string, status: 'pending' | 'confirmed' | 'reversed' | null) {
    try {
      const classStudents = await this.getStudentsByClass(className);
      if (status === null) {
        return classStudents.filter((student: any) => 
          !student.promotionStatus || student.promotionStatus === null
        );
      }
      return classStudents.filter((student: any) => 
        student.promotionStatus === status
      );
    } catch (error) {
      console.error('Error getting students by promotion status:', error);
      throw error;
    }
  },

  async promoteStudents(studentIds: string[], targetClass: string, promotedBy: string, fromClass: string) {
    try {
      const promotionPromises = studentIds.map(async (studentId) => {
        const studentRef = doc(db, 'students', studentId);
        const studentDoc = await getDoc(studentRef);
        
        if (!studentDoc.exists()) {
          throw new Error(`Student ${studentId} not found`);
        }
        
        const currentData = studentDoc.data();
        const previousClass = currentData.assignedClass || currentData.class || fromClass;
        
        await updateDoc(studentRef, {
          assignedClass: targetClass,
          class: targetClass,
          previousClass: previousClass,
          promotedFromClass: fromClass,
          promotedAt: new Date().toISOString(),
          promotedBy: promotedBy,
          promotionStatus: 'pending',
          isRepeating: false,
          updatedAt: new Date().toISOString()
        });
      });
      
      await Promise.all(promotionPromises);
      console.log(`Promoted ${studentIds.length} students from ${fromClass} to ${targetClass}`);
    } catch (error) {
      console.error('Error promoting students:', error);
      throw error;
    }
  },

  async markStudentsAsRepeating(studentIds: string[]) {
    try {
      const repeatPromises = studentIds.map(async (studentId) => {
        const studentRef = doc(db, 'students', studentId);
        await updateDoc(studentRef, {
          isRepeating: true,
          promotionStatus: null,
          updatedAt: new Date().toISOString()
        });
      });
      
      await Promise.all(repeatPromises);
      console.log(`Marked ${studentIds.length} students as repeating`);
    } catch (error) {
      console.error('Error marking students as repeating:', error);
      throw error;
    }
  },

  async confirmPromotions(studentIds: string[]) {
    try {
      const confirmPromises = studentIds.map(async (studentId) => {
        const studentRef = doc(db, 'students', studentId);
        await updateDoc(studentRef, {
          promotionStatus: 'confirmed',
          updatedAt: new Date().toISOString()
        });
      });
      
      await Promise.all(confirmPromises);
      console.log(`Confirmed promotions for ${studentIds.length} students`);
    } catch (error) {
      console.error('Error confirming promotions:', error);
      throw error;
    }
  },

  async reversePromotions(studentIds: string[]) {
    try {
      const reversePromises = studentIds.map(async (studentId) => {
        const studentRef = doc(db, 'students', studentId);
        const studentDoc = await getDoc(studentRef);
        
        if (!studentDoc.exists()) {
          throw new Error(`Student ${studentId} not found`);
        }
        
        const currentData = studentDoc.data();
        const previousClass = currentData.previousClass;
        
        if (!previousClass) {
          throw new Error(`Student ${studentId} has no previous class to revert to`);
        }
        
        await updateDoc(studentRef, {
          assignedClass: previousClass,
          class: previousClass,
          promotionStatus: null,
          previousClass: null,
          promotedFromClass: null,
          promotedAt: null,
          promotedBy: null,
          updatedAt: new Date().toISOString()
        });
      });
      
      await Promise.all(reversePromises);
      console.log(`Reversed promotions for ${studentIds.length} students`);
    } catch (error) {
      console.error('Error reversing promotions:', error);
      throw error;
    }
  },

  async completeJHS3Batch(year: string, studentIds: string[]) {
    try {
      const batchId = `${year}_batch`;
      
      // Get all student data before moving
      const studentDataPromises = studentIds.map(async (studentId) => {
        const studentRef = doc(db, 'students', studentId);
        const studentDoc = await getDoc(studentRef);
        if (!studentDoc.exists()) {
          throw new Error(`Student ${studentId} not found`);
        }
        return {
          id: studentId,
          ...studentDoc.data()
        };
      });
      
      const allStudentData = await Promise.all(studentDataPromises);
      
      // Move students to completedBatches collection in subcollection by year
      // Structure: completedBatches/{year}/students/{studentId}
      const movePromises = allStudentData.map(async (studentData: any) => {
        const studentRef = doc(db, 'completedBatches', year, 'students', studentData.id);
        await setDoc(studentRef, {
          ...studentData,
          completedBatch: year,
          completedAt: new Date().toISOString(),
          originalStudentId: studentData.id, // Keep reference to original ID
          status: 'graduated'
        });
        
        // Delete from main students collection
        const originalStudentRef = doc(db, 'students', studentData.id);
        await deleteDoc(originalStudentRef);
      });
      
      await Promise.all(movePromises);
      
      // Create batch summary document (at root level for easy querying)
      // Note: This is separate from the subcollection for querying purposes
      const batchSummaryRef = doc(db, 'completedBatches', year);
      await setDoc(batchSummaryRef, {
        batchYear: year,
        studentIds: studentIds,
        completedAt: new Date().toISOString(),
        studentCount: studentIds.length,
        status: 'completed'
      }, { merge: true });
      
      console.log(`Completed JHS 3 batch ${year} with ${studentIds.length} students - moved to completedBatches/${year}/students`);
    } catch (error) {
      console.error('Error completing JHS 3 batch:', error);
      throw error;
    }
  },

  async getNextClass(currentClass: string) {
    const { getNextClass: getNext } = await import('./promotionUtils');
    return getNext(currentClass);
  },

  // Get all completed batches
  async getCompletedBatches() {
    try {
      // Get batch summary documents (one per year)
      const batchesRef = collection(db, 'completedBatches');
      const batchesSnapshot = await getDocs(batchesRef);
      
      const batches: any[] = [];
      batchesSnapshot.forEach((doc) => {
        const data = doc.data();
        // Only include if it's a batch summary (has batchYear and is not a student subcollection)
        if (data.batchYear && data.status === 'completed') {
          batches.push({
            id: doc.id,
            ...data
          });
        }
      });
      
      return batches.sort((a: any, b: any) => {
        // Sort by batch year descending
        return parseInt(b.batchYear || '0') - parseInt(a.batchYear || '0');
      });
    } catch (error) {
      console.error('Error getting completed batches:', error);
      throw error;
    }
  },

  // Get students by batch year from the completedBatches subcollection
  async getBatchStudents(batchYear: string) {
    try {
      const studentsRef = collection(db, 'completedBatches', batchYear, 'students');
      const studentsSnapshot = await getDocs(studentsRef);
      
      const students: any[] = [];
      studentsSnapshot.forEach((doc) => {
        students.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return students;
    } catch (error) {
      console.error('Error getting batch students:', error);
      throw error;
    }
  }
};

// Teacher operations
export const teacherUtils = {
  async createTeacher(teacherData: any) {
    return await firestoreUtils.addDocument('teachers', teacherData);
  },

  async updateTeacher(teacherId: string, teacherData: any) {
    return await firestoreUtils.updateDocument('teachers', teacherId, teacherData);
  },

  async deleteTeacher(teacherId: string) {
    return await firestoreUtils.deleteDocument('teachers', teacherId);
  },

  async getTeachers() {
    return await firestoreUtils.getDocuments('teachers');
  },

  async getTeacher(teacherId: string) {
    return await firestoreUtils.getDocument('teachers', teacherId);
  },

  async uploadTeacherPhoto(teacherId: string, file: File) {
    const filePath = storageUtils.generateFilePath('teachers', teacherId, file.name);
    return await storageUtils.uploadFile(file, filePath);
  }
};

// Class operations
export const classUtils = {
  async createClass(classData: any) {
    return await firestoreUtils.addDocument('classes', classData);
  },

  async updateClass(classId: string, classData: any) {
    return await firestoreUtils.updateDocument('classes', classId, classData);
  },

  async deleteClass(classId: string) {
    return await firestoreUtils.deleteDocument('classes', classId);
  },

  async getClasses() {
    return await firestoreUtils.getDocuments('classes');
  },

  async getClass(classId: string) {
    return await firestoreUtils.getDocument('classes', classId);
  },

  // Get class by name
  async getClassByName(className: string) {
    try {
      const classes = await this.getClasses();
      return classes.find((cls: any) => cls.name === className);
    } catch (error) {
      console.error('Error getting class by name:', error);
      return null;
    }
  },


  // Get default capacity based on education level
  getDefaultCapacity(level: string): number {
    switch (level) {
      case 'Early Childhood':
        return 15; // Smaller classes for early childhood
      case 'Primary':
        return 25; // Standard primary class size
      case 'Junior High':
        return 30; // Larger classes for JHS
      default:
        return 25;
    }
  },

  // Delete all classes
  async deleteAllClasses() {
    try {
      const classes = await this.getClasses();
      const deletePromises = classes.map((cls: any) => 
        this.deleteClass(cls.id)
      );
      await Promise.all(deletePromises);
    } catch (error) {
      console.error('Error deleting all classes:', error);
      throw error;
    }
  },

  // Create or update subcollection for subdivision
  async createSubdivisionSubcollection(classId: string, subdivision: string) {
    try {
      // First, check if a subdivision document already exists
      const existingSubdivisions = await this.getClassSubdivisions(classId);
      
      if (existingSubdivisions.length > 0) {
        // Update the existing subdivision document
        const existingSubdivision = existingSubdivisions[0];
        const subcollectionData = {
          subdivision: subdivision,
          updatedAt: Timestamp.now()
        };
        return await firestoreUtils.updateDocument(`classes/${classId}/subdivisions`, existingSubdivision.id, subcollectionData);
      } else {
        // Create new subdivision document
        const subcollectionData = {
          subdivision: subdivision,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        };
        return await firestoreUtils.addDocument(`classes/${classId}/subdivisions`, subcollectionData);
      }
    } catch (error) {
      console.error('Error creating/updating subdivision subcollection:', error);
      throw error;
    }
  },

  // Get subdivisions for a class
  async getClassSubdivisions(classId: string) {
    try {
      return await firestoreUtils.getDocuments(`classes/${classId}/subdivisions`);
    } catch (error) {
      console.error('Error getting class subdivisions:', error);
      return [];
    }
  },

  // Check if subdivision exists for a grade
  async checkSubdivisionExists(grade: string, subdivision: string, excludeClassId?: string) {
    try {
      const classes = await this.getClasses();
      return classes.find((cls: any) => 
        cls.grade === grade && 
        cls.subdivision === subdivision && 
        cls.id !== excludeClassId
      );
    } catch (error) {
      console.error('Error checking subdivision existence:', error);
      return null;
    }
  }
};

// Subject operations
export const subjectUtils = {
  async createSubject(subjectData: any) {
    return await firestoreUtils.addDocument('subjects', subjectData);
  },

  async updateSubject(subjectId: string, subjectData: any) {
    return await firestoreUtils.updateDocument('subjects', subjectId, subjectData);
  },

  async deleteSubject(subjectId: string) {
    return await firestoreUtils.deleteDocument('subjects', subjectId);
  },

  async getSubjects() {
    return await firestoreUtils.getDocuments('subjects');
  },

  async getSubject(subjectId: string) {
    return await firestoreUtils.getDocument('subjects', subjectId);
  },

  // Delete all subjects
  async deleteAllSubjects() {
    try {
      const subjects = await this.getSubjects();
      const deletePromises = subjects.map((subject: any) => 
        this.deleteSubject(subject.id)
      );
      await Promise.all(deletePromises);
    } catch (error) {
      console.error('Error deleting all subjects:', error);
      throw error;
    }
  },

  // Get credits based on education level
  getCreditsForSubject(level: string): number {
    switch (level) {
      case 'Early Childhood':
        return 2; // Lower credits for early childhood
      case 'Primary':
        return 3; // Standard credits for primary
      case 'Junior High':
        return 4; // Higher credits for JHS
      default:
        return 3;
    }
  },

  // Get duration based on education level
  getDurationForSubject(level: string): string {
    switch (level) {
      case 'Early Childhood':
        return 'Semester'; // Shorter duration for early childhood
      case 'Primary':
        return 'Full Year'; // Standard duration for primary
      case 'Junior High':
        return 'Full Year'; // Standard duration for JHS
      default:
        return 'Full Year';
    }
  }
};

// Fees operations
export const feesUtils = {
  async createFee(feeData: any) {
    return await firestoreUtils.addDocument('fees', feeData);
  },

  async updateFee(feeId: string, feeData: any) {
    return await firestoreUtils.updateDocument('fees', feeId, feeData);
  },

  async deleteFee(feeId: string) {
    return await firestoreUtils.deleteDocument('fees', feeId);
  },

  async getFees() {
    return await firestoreUtils.getDocuments('fees');
  },

  async getFee(feeId: string) {
    return await firestoreUtils.getDocument('fees', feeId);
  },

  // Get fees for a specific class
  async getClassFees(classId: string) {
    return await firestoreUtils.queryDocuments('fees', 'classId', '==', classId);
  },

  // Academic Year and Term Fees Management
  // Create or update fees for a specific academic year and term
  async setFeesForYearTerm(academicYear: string, term: string, classFees: Array<{classId: string, className: string, feeAmount: number}>) {
    try {
      const docId = `${academicYear}_${term}`;
      const feeData = {
        academicYear,
        term,
        classFees,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Ensure academic period exists before creating/updating fees
      await this.ensureAcademicPeriodExists(academicYear, term);
      console.log(`Academic period ${academicYear}_${term} ensured to exist`);

      // Check if document already exists
      try {
        const existingDoc = await this.getFeeByYearTerm(academicYear, term);
        if (existingDoc) {
          // Update existing document
          const result = await firestoreUtils.updateDocument('fees', docId, feeData);
          console.log(`Fees updated for ${academicYear}_${term} and corresponding academic period ensured`);
          return result;
        }
      } catch (error) {
        // Document doesn't exist, create new one
      }

      // Create new document with custom ID
      const docRef = doc(db, 'fees', docId);
      await setDoc(docRef, {
        ...feeData,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
      
      console.log(`Fees created for ${academicYear}_${term} and corresponding academic period created`);
      return docId;
    } catch (error) {
      console.error('Error setting fees for year and term:', error);
      throw error;
    }
  },

  // Create fees for a specific academic year and term (new collection structure)
  async createFeesForYearTerm(academicYear: string, term: string, classFees: Array<{classId: string, className: string, feeAmount: number}>) {
    try {
      const docId = `${academicYear}_${term}`;
      const feeData = {
        academicYear,
        term,
        classFees,
        isActive: false, // Will be set to true when this period is selected
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Ensure academic period exists before creating fees
      await this.ensureAcademicPeriodExists(academicYear, term);
      console.log(`Academic period ${academicYear}_${term} ensured to exist`);

      // Create new document with custom ID
      const docRef = doc(db, 'fees', docId);
      await setDoc(docRef, {
        ...feeData,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
      
      console.log(`Fees created for ${academicYear}_${term} and corresponding academic period created`);
      return docId;
    } catch (error) {
      console.error('Error creating fees for year and term:', error);
      throw error;
    }
  },

  // Get fees for a specific academic year and term
  async getFeeByYearTerm(academicYear: string, term: string) {
    try {
      const docId = `${academicYear}_${term}`;
      return await firestoreUtils.getDocument('fees', docId);
    } catch (error) {
      console.error('Error getting fees by year and term:', error);
      throw error;
    }
  },

  // Get all academic years and terms
  async getAllAcademicPeriods() {
    try {
      // Fetch directly from academicPeriods collection instead of fees collection
      // to avoid duplicates (multiple fee documents can exist for the same period)
      const allPeriods = await firestoreUtils.getDocuments('academicPeriods');
      
      // Deduplicate by academicYear and term, then sort
      const uniquePeriodsMap = new Map<string, any>();
      allPeriods.forEach((period: any) => {
        const key = `${period.academicYear}_${period.term}`;
        // Only keep the first occurrence or the one with the latest updatedAt
        if (!uniquePeriodsMap.has(key) || 
            (period.updatedAt && uniquePeriodsMap.get(key).updatedAt && 
             new Date(period.updatedAt) > new Date(uniquePeriodsMap.get(key).updatedAt))) {
          uniquePeriodsMap.set(key, {
            academicYear: period.academicYear,
            term: period.term,
            isActive: period.isActive,
            updatedAt: period.updatedAt
          });
        }
      });
      
      const uniquePeriods = Array.from(uniquePeriodsMap.values());
      return uniquePeriods.sort((a, b) => {
        // Sort by academic year descending, then by term
        if (a.academicYear !== b.academicYear) {
          return parseInt(b.academicYear) - parseInt(a.academicYear);
        }
        const termOrder = { '1st Term': 1, '2nd Term': 2, '3rd Term': 3 };
        return (termOrder[a.term as keyof typeof termOrder] || 0) - (termOrder[b.term as keyof typeof termOrder] || 0);
      });
    } catch (error) {
      console.error('Error getting all academic periods:', error);
      return [];
    }
  },

  // Update academic period
  async updateAcademicPeriod(academicYear: string, term: string, updateData: any) {
    try {
      const periodId = `${academicYear}_${term}`;
      const periodRef = doc(db, 'academicPeriods', periodId);
      
      // Update the academic period document
      await updateDoc(periodRef, {
        ...updateData,
        updatedAt: new Date().toISOString()
      });

      // If setting as active, deactivate all other periods
      if (updateData.isActive) {
        const allPeriods = await this.getAllAcademicPeriods();
        const deactivatePromises = allPeriods
          .filter(period => !(period.academicYear === academicYear && period.term === term))
          .map(period => {
            const otherPeriodId = `${period.academicYear}_${period.term}`;
            const otherPeriodRef = doc(db, 'academicPeriods', otherPeriodId);
            return updateDoc(otherPeriodRef, {
              isActive: false,
              updatedAt: new Date().toISOString()
            });
          });
        
        await Promise.all(deactivatePromises);
      }

      console.log(`Updated academic period: ${periodId}`);
    } catch (error) {
      console.error('Error updating academic period:', error);
      throw error;
    }
  },

  // Get current active academic period
  async getCurrentAcademicPeriod() {
    try {
      const periods = await this.getAllAcademicPeriods();
      const activePeriod = periods.find(p => p.isActive);
      return activePeriod || null;
    } catch (error) {
      console.error('Error getting current academic period:', error);
      return null;
    }
  },

  // Set active academic period
  async setActiveAcademicPeriod(academicYear: string, term: string) {
    try {
      // First, deactivate all periods
      const allPeriods = await this.getAllAcademicPeriods();
      const deactivatePromises = allPeriods.map(period => {
        const docId = `${period.academicYear}_${period.term}`;
        return firestoreUtils.updateDocument('fees', docId, { isActive: false });
      });

      await Promise.all(deactivatePromises);

      // Then activate the selected period
      const docId = `${academicYear}_${term}`;
      await firestoreUtils.updateDocument('fees', docId, { isActive: true });
      
      // Also store the active period in a dedicated document
      await this.setSystemActivePeriod(academicYear, term);
      
      return docId;
    } catch (error) {
      console.error('Error setting active academic period:', error);
      throw error;
    }
  },

  // Set system-wide active academic period
  async setSystemActivePeriod(academicYear: string, term: string) {
    try {
      const systemConfigRef = doc(db, 'system', 'activePeriod');
      await setDoc(systemConfigRef, {
        academicYear,
        term,
        periodId: `${academicYear}_${term}`,
        isActive: true,
        updatedAt: Timestamp.now(),
        updatedBy: 'system' // You can add user ID here later
      });
    } catch (error) {
      console.error('Error setting system active period:', error);
      throw error;
    }
  },

  // Get system-wide active academic period
  async getSystemActivePeriod() {
    try {
      const systemConfigRef = doc(db, 'system', 'activePeriod');
      const systemConfigSnap = await getDoc(systemConfigRef);
      
      if (systemConfigSnap.exists()) {
        return systemConfigSnap.data();
      } else {
        // If no system config exists, try to get from fees collection
        const currentPeriod = await this.getCurrentAcademicPeriod();
        if (currentPeriod) {
          // Set system config based on fees collection
          await this.setSystemActivePeriod(currentPeriod.academicYear, currentPeriod.term);
          return {
            academicYear: currentPeriod.academicYear,
            term: currentPeriod.term,
            periodId: `${currentPeriod.academicYear}_${currentPeriod.term}`,
            isActive: true
          };
        }
        return null;
      }
    } catch (error) {
      console.error('Error getting system active period:', error);
      return null;
    }
  },

  // Get class fees for current active period
  async getCurrentClassFees() {
    try {
      const currentPeriod = await this.getCurrentAcademicPeriod();
      if (!currentPeriod) {
        return [];
      }
      
      const periodFees = await this.getFeeByYearTerm(currentPeriod.academicYear, currentPeriod.term);
      return (periodFees as any)?.classFees || [];
    } catch (error) {
      console.error('Error getting current class fees:', error);
      return [];
    }
  },

  // Get fees for a specific academic year and term with class details
  async getFeesForPeriod(academicYear: string, term: string) {
    try {
      const periodFees = await this.getFeeByYearTerm(academicYear, term);
      return periodFees || null;
    } catch (error) {
      console.error('Error getting fees for period:', error);
      return null;
    }
  },







  // Fee Payment Collection Functions (New Subcollection Structure)
  // Create a new fee payment record in subcollection
  async createFeePayment(paymentData: any, academicYear: string, term: string) {
    try {
      const periodId = `${academicYear}_${term}`;
      const paymentRef = collection(db, 'academicPeriods', periodId, 'payments');
      return await addDoc(paymentRef, {
        ...paymentData,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error creating fee payment:', error);
      throw error;
    }
  },

  // Update a fee payment record in subcollection
  async updateFeePayment(paymentId: string, paymentData: any, academicYear: string, term: string) {
    try {
      const periodId = `${academicYear}_${term}`;
      const paymentRef = doc(db, 'academicPeriods', periodId, 'payments', paymentId);
      await updateDoc(paymentRef, {
        ...paymentData,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error updating fee payment:', error);
      throw error;
    }
  },

  // Delete a fee payment record from subcollection
  async deleteFeePayment(paymentId: string, academicYear: string, term: string) {
    try {
      const periodId = `${academicYear}_${term}`;
      const paymentRef = doc(db, 'academicPeriods', periodId, 'payments', paymentId);
      await deleteDoc(paymentRef);
    } catch (error) {
      console.error('Error deleting fee payment:', error);
      throw error;
    }
  },

  // Get all fee payments for a specific period
  async getFeePaymentsForPeriod(academicYear: string, term: string) {
    try {
      const periodId = `${academicYear}_${term}`;
      const studentPaymentsRef = collection(db, 'academicPeriods', periodId, 'student_payments');
      const studentPaymentsSnapshot = await getDocs(studentPaymentsRef);
      
      const allPayments: any[] = [];
      
      studentPaymentsSnapshot.docs.forEach(studentDoc => {
        const studentData = studentDoc.data();
        const payments = studentData.payments || [];
        
        // Convert each payment to include student info
        payments.forEach((payment: any, index: number) => {
          allPayments.push({
            id: `${studentDoc.id}_${index}`,
            ...payment,
            studentId: studentData.studentId,
            studentName: studentData.studentName,
            className: studentData.className,
            academicYear: studentData.academicYear,
            term: studentData.term
          });
        });
      });
      
      return allPayments;
    } catch (error) {
      console.error('Error getting fee payments for period:', error);
      return [];
    }
  },

  // Get a single fee payment from subcollection
  async getFeePayment(paymentId: string, academicYear: string, term: string) {
    try {
      const periodId = `${academicYear}_${term}`;
      const paymentRef = doc(db, 'academicPeriods', periodId, 'payments', paymentId);
      const paymentSnap = await getDoc(paymentRef);
      if (paymentSnap.exists()) {
        return { id: paymentSnap.id, ...paymentSnap.data() };
      } else {
        throw new Error('Payment not found');
      }
    } catch (error) {
      console.error('Error getting fee payment:', error);
      throw error;
    }
  },

  // Get payments for a specific student across all periods
  async getStudentPayments(studentId: string) {
    try {
      // Get all academic periods
      const periods = await this.getAllAcademicPeriods();
      const allPayments = [];
      
      for (const period of periods) {
        const payments = await this.getFeePaymentsForPeriod(period.academicYear, period.term);
        const studentPayments = payments.filter((payment: any) => payment.studentId === studentId);
        allPayments.push(...studentPayments);
      }
      
      return allPayments;
    } catch (error) {
      console.error('Error getting student payments:', error);
      return [];
    }
  },

  // Get payments for a specific student in a specific period
  async getStudentPaymentsForPeriod(studentId: string, academicYear: string, term: string) {
    try {
      const periodId = `${academicYear}_${term}`;
      const studentPaymentRef = doc(db, 'academicPeriods', periodId, 'student_payments', studentId);
      const studentPaymentDoc = await getDoc(studentPaymentRef);
      
      if (studentPaymentDoc.exists()) {
        const data = studentPaymentDoc.data();
        // Return individual payments from the payments array
        return (data.payments || []).map((payment: any, index: number) => ({
          id: `${studentId}_${index}`, // Generate unique ID for each payment
          ...payment,
          studentId: studentId,
          studentName: data.studentName,
          className: data.className,
          academicYear: data.academicYear,
          term: data.term
        }));
      }
      
      return [];
    } catch (error) {
      console.error('Error getting student payments for period:', error);
      return [];
    }
  },

  // Record a new payment for a student (One document per student per period)
  async recordPayment(studentId: string, studentName: string, amount: number, paymentMethod: string, className?: string, academicYear?: string, term?: string) {
    try {
      if (!academicYear || !term) {
        throw new Error('Academic year and term are required for payment recording');
      }

      // Ensure academic period document exists
      const periodId = await this.ensureAcademicPeriodExists(academicYear, term);

      const paymentData = {
        amount: amount,
        paymentMethod: paymentMethod,
        timestamp: Timestamp.now(),
        createdAt: new Date().toISOString()
      };

      // Check if student already has a payment document in this period
      const studentPaymentRef = doc(db, 'academicPeriods', periodId, 'student_payments', studentId);
      const studentPaymentDoc = await getDoc(studentPaymentRef);

      if (studentPaymentDoc.exists()) {
        // Update existing document - add new payment to payments array
        const existingData = studentPaymentDoc.data();
        const payments = existingData.payments || [];
        
        const updatedData = {
          studentId: studentId,
          studentName: studentName,
          className: className || '',
          academicYear: academicYear,
          term: term,
          periodId: periodId,
          payments: [...payments, paymentData],
          totalPaid: (existingData.totalPaid || 0) + amount,
          paymentCount: (existingData.paymentCount || 0) + 1,
          lastPaymentDate: new Date().toISOString(),
          lastPaymentMethod: paymentMethod,
          updatedAt: Timestamp.now()
        };

        await updateDoc(studentPaymentRef, updatedData);
        console.log(`Updated payment document for student ${studentId} in period ${periodId}`);
      } else {
        // Create new document for this student in this period
        const newStudentPaymentData = {
          studentId: studentId,
          studentName: studentName,
          className: className || '',
          academicYear: academicYear,
          term: term,
          periodId: periodId,
          payments: [paymentData],
          totalPaid: amount,
          paymentCount: 1,
          lastPaymentDate: new Date().toISOString(),
          lastPaymentMethod: paymentMethod,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        };

        await setDoc(studentPaymentRef, newStudentPaymentData);
        console.log(`Created new payment document for student ${studentId} in period ${periodId}`);
      }
      
      // Update period payment statistics
      await this.updatePeriodPaymentStats(periodId, amount);
      
      return studentId; // Return studentId since we're using it as document ID
    } catch (error) {
      console.error('Error recording payment:', error);
      throw error;
    }
  },

  // Ensure academic period document exists
  async ensureAcademicPeriodExists(academicYear: string, term: string) {
    try {
      const periodId = `${academicYear}_${term}`;
      const periodRef = doc(db, 'academicPeriods', periodId);
      const periodDoc = await getDoc(periodRef);

      if (!periodDoc.exists()) {
        // Create new academic period document
        const periodData = {
          academicYear: academicYear,
          term: term,
          isActive: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          totalPayments: 0,
          totalAmount: 0,
          paymentCount: 0
        };

        await setDoc(periodRef, periodData);
        console.log(`Created academic period document: ${periodId}`);
        
        // Also ensure grades period exists to keep both collections in sync
        try {
          await gradesUtils.ensureGradesAcademicPeriodExists(academicYear, term);
        } catch (gradesError) {
          console.error('Error ensuring grades academic period exists:', gradesError);
          // Don't throw - we don't want to fail fees period creation if grades period creation fails
        }
      }

      return periodId;
    } catch (error) {
      console.error('Error ensuring academic period exists:', error);
      throw error;
    }
  },

  // Update academic period payment statistics
  async updatePeriodPaymentStats(periodId: string, amount: number) {
    try {
      const periodRef = doc(db, 'academicPeriods', periodId);
      const periodDoc = await getDoc(periodRef);

      if (periodDoc.exists()) {
        const currentData = periodDoc.data();
        const newStats = {
          totalPayments: (currentData?.totalPayments || 0) + 1,
          totalAmount: (currentData?.totalAmount || 0) + amount,
          paymentCount: (currentData?.paymentCount || 0) + 1,
          updatedAt: new Date().toISOString()
        };

        await updateDoc(periodRef, newStats);
        console.log(`Updated period ${periodId} stats: +₵${amount}`);
      }
    } catch (error) {
      console.error('Error updating period payment stats:', error);
      throw error;
    }
  },

  // Check if fees already exist for a period
  async checkFeesExistForPeriod(academicYear: string, term: string) {
    try {
      const periodId = `${academicYear}_${term}`;
      const feesDoc = await getDoc(doc(db, 'fees', periodId));
      return feesDoc.exists();
    } catch (error) {
      console.error('Error checking if fees exist for period:', error);
      return false;
    }
  },

  // Get payment statistics for a specific period
  async getPeriodPaymentStats(academicYear: string, term: string) {
    try {
      const payments = await this.getFeePaymentsForPeriod(academicYear, term);
      const totalAmount = payments.reduce((sum, payment: any) => sum + (payment.amount || 0), 0);
      const paymentCount = payments.length;
      
      return {
        totalAmount,
        paymentCount,
        payments
      };
    } catch (error) {
      console.error('Error getting period payment stats:', error);
      return {
        totalAmount: 0,
        paymentCount: 0,
        payments: []
      };
    }
  },

  // Get all payments across all periods (for reporting)
  async getAllPayments() {
    try {
      const periods = await this.getAllAcademicPeriods();
      const allPayments = [];
      
      for (const period of periods) {
        const payments = await this.getFeePaymentsForPeriod(period.academicYear, period.term);
        allPayments.push(...payments);
      }
      
      return allPayments;
    } catch (error) {
      console.error('Error getting all payments:', error);
      return [];
    }
  },

  // Get student payment summary (total paid, balance, status)
  async getStudentPaymentSummary(studentId: string, className: string, academicYear?: string, term?: string) {
    try {
      if (!academicYear || !term) {
        const currentPeriod = await this.getCurrentAcademicPeriod();
        if (!currentPeriod) {
          return { totalPaid: 0, balance: 0, status: 'No Payment', classFee: 0, paymentCount: 0 };
        }
        academicYear = currentPeriod.academicYear;
        term = currentPeriod.term;
      }

      const periodId = `${academicYear}_${term}`;
      const studentPaymentRef = doc(db, 'academicPeriods', periodId, 'student_payments', studentId);
      const studentPaymentDoc = await getDoc(studentPaymentRef);
      
      let totalPaid = 0;
      let paymentCount = 0;
      
      if (studentPaymentDoc.exists()) {
        const data = studentPaymentDoc.data();
        totalPaid = data.totalPaid || 0;
        paymentCount = data.paymentCount || 0;
      }
      
          // Get class fee from fees collection
      let classFee = 0;
      try {
        if (academicYear && term) {
          const periodFees = await this.getFeeByYearTerm(academicYear, term);
          const classFeeData = (periodFees as any)?.classFees?.find((cf: any) => cf.className === className);
          classFee = classFeeData?.feeAmount || 0;
        }
      } catch (error) {
        console.log('No fees found for current period');
      }
      const balance = classFee - totalPaid;
      
      let status: 'No Payment' | 'Partial Payment' | 'Full Payment';
      if (totalPaid === 0) {
        status = 'No Payment';
      } else if (balance <= 0) {
        status = 'Full Payment';
      } else {
        status = 'Partial Payment';
      }
      
      return {
        totalPaid,
        balance,
        status,
        classFee,
        paymentCount
      };
    } catch (error) {
      console.error('Error getting student payment summary:', error);
      return {
        totalPaid: 0,
        balance: 0,
        status: 'No Payment' as const,
        classFee: 0,
        paymentCount: 0
      };
    }
  },

  // Delete all fees
  async deleteAllFees() {
    try {
      const fees = await this.getFees();
      const deletePromises = fees.map((fee: any) => 
        this.deleteFee(fee.id)
      );
      await Promise.all(deletePromises);
    } catch (error) {
      console.error('Error deleting all fees:', error);
      throw error;
    }
  },

  // Migration function to move existing payments to new subcollection structure
  async migratePaymentsToSubcollections() {
    try {
      console.log('Starting payment migration to subcollection structure...');
      
      // Get all existing payments from the old feePayments collection
      const oldPayments = await firestoreUtils.getDocuments('feePayments');
      
      // Group payments by academic period
      const paymentsByPeriod: { [key: string]: any[] } = {};
      
      for (const payment of oldPayments) {
        if ((payment as any).academicYear && (payment as any).term) {
          const periodKey = `${(payment as any).academicYear}_${(payment as any).term}`;
          if (!paymentsByPeriod[periodKey]) {
            paymentsByPeriod[periodKey] = [];
          }
          paymentsByPeriod[periodKey].push(payment);
        }
      }
      
      // Migrate payments to subcollections
      for (const [periodKey, payments] of Object.entries(paymentsByPeriod)) {
        const [academicYear, term] = periodKey.split('_');
        
        // Ensure academic period exists
        await this.ensureAcademicPeriodExists(academicYear, term);
        
        // Migrate each payment
        for (const payment of payments) {
          try {
            const paymentData = {
              studentId: payment.studentId,
              studentName: payment.studentName,
              amount: payment.amount,
              paymentMethod: payment.paymentMethod,
              className: payment.className,
              academicYear: payment.academicYear,
              term: payment.term,
              periodId: periodKey,
              migratedAt: new Date().toISOString()
            };
            
            await this.createFeePayment(paymentData, academicYear, term);
            console.log(`Migrated payment for ${payment.studentName} to ${periodKey}`);
          } catch (error) {
            console.error(`Error migrating payment ${payment.id}:`, error);
          }
        }
      }
      
      console.log('Payment migration completed successfully!');
      return { migrated: Object.keys(paymentsByPeriod).length, periods: Object.keys(paymentsByPeriod) };
    } catch (error) {
      console.error('Error migrating payments:', error);
      throw error;
    }
  },

  // Delete all fee payments (updated for subcollection structure)
  async deleteAllFeePayments() {
    try {
      const periods = await this.getAllAcademicPeriods();
      
      for (const period of periods) {
        const payments = await this.getFeePaymentsForPeriod(period.academicYear, period.term);
        const deletePromises = payments.map((payment: any) => 
          this.deleteFeePayment(payment.id, period.academicYear, period.term)
        );
        await Promise.all(deletePromises);
      }
    } catch (error) {
      console.error('Error deleting all fee payments:', error);
      throw error;
    }
  }
};

// Grades operations for gradesAcademicPeriod collection with subcollections
export const gradesUtils = {
  // Create a grade entry in subcollection
  async createGrade(gradeData: any) {
    try {
      const { academicYear, term, studentId, ...gradeInfo } = gradeData;
      const periodId = `${academicYear}_${term}`;

      await this.ensureGradesAcademicPeriodExists(academicYear, term);

      // Create or update a single document for the student
      const studentGradeId = `student_${studentId}`;
      const studentGradeRef = doc(db, `gradesAcademicPeriod/${periodId}/grades`, studentGradeId);
      
      // Check if document exists
      const studentGradeDoc = await getDoc(studentGradeRef);
      
      if (studentGradeDoc.exists()) {
        // Update existing document
        const existingData = studentGradeDoc.data();
        const updatedGrades = {
          ...existingData.grades,
          [gradeInfo.subject]: {
            assignment: gradeInfo.assignment || '',
            classScore: gradeInfo.classScore || 0,
            sbaScore: gradeInfo.sbaScore || 0,
            examScore: gradeInfo.examScore || 0,
            totalScore: gradeInfo.totalScore || 0,
            score: gradeInfo.score,
            maxScore: gradeInfo.maxScore,
            grade: gradeInfo.grade,
            comments: gradeInfo.comments || '',
            date: gradeInfo.date,
            teacherId: gradeInfo.teacherId,
            teacherName: gradeInfo.teacherName,
            classMaxScore: gradeInfo.classMaxScore || 30,
            examMaxScore: gradeInfo.examMaxScore || 70,
            updatedAt: gradeInfo.updatedAt
          }
        };
        
        await updateDoc(studentGradeRef, {
          grades: updatedGrades,
          updatedAt: new Date().toISOString()
        });
      } else {
        // Create new document
        const newGradeData = {
          studentId: studentId,
          studentName: gradeInfo.studentName,
          grades: {
            [gradeInfo.subject]: {
              assignment: gradeInfo.assignment || '',
              classScore: gradeInfo.classScore || 0,
              sbaScore: gradeInfo.sbaScore || 0,
              examScore: gradeInfo.examScore || 0,
              totalScore: gradeInfo.totalScore || 0,
              score: gradeInfo.score,
              maxScore: gradeInfo.maxScore,
              grade: gradeInfo.grade,
              comments: gradeInfo.comments || '',
              date: gradeInfo.date,
              teacherId: gradeInfo.teacherId,
              teacherName: gradeInfo.teacherName,
              classMaxScore: gradeInfo.classMaxScore || 30,
              examMaxScore: gradeInfo.examMaxScore || 70,
              updatedAt: gradeInfo.updatedAt
            }
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        await setDoc(studentGradeRef, newGradeData);
      }

      await this.updatePeriodGradeStats(periodId, gradeInfo.score);

      return studentGradeId;
    } catch (error) {
      console.error('Error creating grade:', error);
      throw error;
    }
  },

  // Get all grades from all periods
  async getAllGrades() {
    try {
      const allPeriods = await this.getAllGradesAcademicPeriods();
      let allGrades: any[] = [];

      for (const period of allPeriods) {
        const periodId = `${(period as any).academicYear}_${(period as any).term}`;
        const periodGrades = await firestoreUtils.getDocuments(`gradesAcademicPeriod/${periodId}/grades`);
        allGrades = [...allGrades, ...periodGrades];
      }

      return allGrades;
    } catch (error) {
      console.error('Error getting all grades:', error);
      return [];
    }
  },

  // Get student grades for a specific period
  async getStudentGrades(academicYear: string, term: string, studentId: string) {
    try {
      const periodId = `${academicYear}_${term}`;
      const studentGradeId = `student_${studentId}`;
      const studentGradeRef = doc(db, `gradesAcademicPeriod/${periodId}/grades`, studentGradeId);
      
      const studentGradeDoc = await getDoc(studentGradeRef);
      
      if (studentGradeDoc.exists()) {
        return studentGradeDoc.data();
      }
      
      return null;
    } catch (error) {
      console.error('Error getting student grades:', error);
      return null;
    }
  },

  // Get grades for a specific student
  async getGradesForStudent(studentId: string) {
    try {
      const allGrades = await this.getAllGrades();
      return allGrades.filter((grade: any) => grade.studentId === studentId);
    } catch (error) {
      console.error('Error getting grades for student:', error);
      return [];
    }
  },

  // Get grades for a specific academic period
  async getGradesForPeriod(academicYear: string, term: string) {
    try {
      const periodId = `${academicYear}_${term}`;
      return await firestoreUtils.getDocuments(`gradesAcademicPeriod/${periodId}/grades`);
    } catch (error) {
      console.error('Error getting grades for period:', error);
      return [];
    }
  },

  // Get grades for a specific student in a specific period
  async getStudentGradesForPeriod(studentId: string, academicYear: string, term: string) {
    try {
      const periodGrades = await this.getGradesForPeriod(academicYear, term);
      return periodGrades.filter((grade: any) => grade.studentId === studentId);
    } catch (error) {
      console.error('Error getting student grades for period:', error);
      return [];
    }
  },

  // Update a grade
  async updateGrade(gradeId: string, gradeData: any, academicYear: string, term: string) {
    try {
      const periodId = `${academicYear}_${term}`;
      await firestoreUtils.updateDocument(`gradesAcademicPeriod/${periodId}/grades`, gradeId, gradeData);
    } catch (error) {
      console.error('Error updating grade:', error);
      throw error;
    }
  },

  // Delete a grade
  async deleteGrade(gradeId: string, academicYear: string, term: string) {
    try {
      const periodId = `${academicYear}_${term}`;
      await firestoreUtils.deleteDocument(`gradesAcademicPeriod/${periodId}/grades`, gradeId);
    } catch (error) {
      console.error('Error deleting grade:', error);
      throw error;
    }
  },

  // Get grades grouped by assignment for a student
  async getStudentGradesGroupedByAssignment(studentId: string, academicYear?: string, term?: string) {
    try {
      let grades = await this.getGradesForStudent(studentId);
      
      if (academicYear && term) {
        grades = grades.filter((grade: any) => 
          grade.academicYear === academicYear && grade.term === term
        );
      }

      // Group by assignment
      const grouped = grades.reduce((acc: any, grade: any) => {
        const assignment = grade.assignment;
        if (!acc[assignment]) {
          acc[assignment] = [];
        }
        acc[assignment].push(grade);
        return acc;
      }, {});

      return grouped;
    } catch (error) {
      console.error('Error getting student grades grouped by assignment:', error);
      return {};
    }
  },

  // Get grades statistics for a student
  async getStudentGradeStats(studentId: string, academicYear?: string, term?: string) {
    try {
      let grades = await this.getGradesForStudent(studentId);
      
      if (academicYear && term) {
        grades = grades.filter((grade: any) => 
          grade.academicYear === academicYear && grade.term === term
        );
      }

      if (grades.length === 0) {
        return {
          totalGrades: 0,
          averageScore: 0,
          averagePercentage: 0,
          gradeDistribution: {},
          subjects: []
        };
      }

      const totalGrades = grades.length;
      const totalScore = grades.reduce((sum: number, grade: any) => sum + grade.score, 0);
      const totalMaxScore = grades.reduce((sum: number, grade: any) => sum + grade.maxScore, 0);
      const averageScore = totalScore / totalGrades;
      const averagePercentage = totalMaxScore > 0 ? (totalScore / totalMaxScore) * 100 : 0;

      // Grade distribution
      const gradeDistribution = grades.reduce((acc: any, grade: any) => {
        acc[grade.grade] = (acc[grade.grade] || 0) + 1;
        return acc;
      }, {});

      // Unique subjects
      const subjects = [...new Set(grades.map((grade: any) => grade.subject))];

      return {
        totalGrades,
        averageScore: Math.round(averageScore * 100) / 100,
        averagePercentage: Math.round(averagePercentage * 100) / 100,
        gradeDistribution,
        subjects
      };
    } catch (error) {
      console.error('Error getting student grade stats:', error);
      return {
        totalGrades: 0,
        averageScore: 0,
        averagePercentage: 0,
        gradeDistribution: {},
        subjects: []
      };
    }
  },

  // Ensure academic period exists for grades (similar to fees)
  async ensureGradesAcademicPeriodExists(academicYear: string, term: string) {
    try {
      const periodId = `${academicYear}_${term}`;
      const periodRef = doc(db, 'gradesAcademicPeriod', periodId);
      const periodDoc = await getDoc(periodRef);

      if (!periodDoc.exists()) {
        // Create new academic period document for grades
        const periodData = {
          academicYear: academicYear,
          term: term,
          isActive: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          totalGrades: 0,
          totalStudents: 0,
          averageScore: 0
        };

        await setDoc(periodRef, periodData);
        console.log(`Created grades academic period document: ${periodId}`);
        
        // Also ensure fees period exists to keep both collections in sync
        try {
          await feesUtils.ensureAcademicPeriodExists(academicYear, term);
        } catch (feesError) {
          console.error('Error ensuring fees academic period exists:', feesError);
          // Don't throw - we don't want to fail grades period creation if fees period creation fails
        }
      }

      return periodId;
    } catch (error) {
      console.error('Error ensuring grades academic period exists:', error);
      throw error;
    }
  },

  // Update academic period grade statistics
  async updatePeriodGradeStats(periodId: string, score: number) {
    try {
      const periodRef = doc(db, 'gradesAcademicPeriod', periodId);
      const periodDoc = await getDoc(periodRef);

      if (periodDoc.exists()) {
        const currentData = periodDoc.data();
        const newTotalGrades = (currentData?.totalGrades || 0) + 1;
        const currentTotalScore = (currentData?.averageScore || 0) * (currentData?.totalGrades || 0);
        const newAverageScore = (currentTotalScore + score) / newTotalGrades;

        await updateDoc(periodRef, {
          totalGrades: newTotalGrades,
          averageScore: Math.round(newAverageScore * 100) / 100,
          updatedAt: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error updating period grade stats:', error);
      throw error;
    }
  },

  // Get all academic periods for grades
  async getAllGradesAcademicPeriods() {
    try {
      console.log('getAllGradesAcademicPeriods - starting fetch...');
      // Get all academic period documents directly
      const allPeriods = await firestoreUtils.getDocuments('gradesAcademicPeriod');
      console.log('getAllGradesAcademicPeriods - raw periods from Firebase:', allPeriods);
      
      // Deduplicate by academicYear and term (in case of duplicates)
      const uniquePeriodsMap = new Map<string, any>();
      allPeriods.forEach((period: any) => {
        const key = `${period.academicYear}_${period.term}`;
        // Only keep the first occurrence or the one with the latest updatedAt
        if (!uniquePeriodsMap.has(key) || 
            (period.updatedAt && uniquePeriodsMap.get(key).updatedAt && 
             new Date(period.updatedAt) > new Date(uniquePeriodsMap.get(key).updatedAt))) {
          uniquePeriodsMap.set(key, period);
        }
      });
      
      const uniquePeriods = Array.from(uniquePeriodsMap.values());
      const sortedPeriods = uniquePeriods.sort((a: any, b: any) => {
        // Sort by academic year descending, then by term
        if (a.academicYear !== b.academicYear) {
          return parseInt(b.academicYear) - parseInt(a.academicYear);
        }
        const termOrder = { '1st Term': 1, '2nd Term': 2, '3rd Term': 3 };
        return (termOrder[a.term as keyof typeof termOrder] || 0) - (termOrder[b.term as keyof typeof termOrder] || 0);
      });
      
      console.log('getAllGradesAcademicPeriods - deduplicated and sorted periods:', sortedPeriods);
      return sortedPeriods;
    } catch (error) {
      console.error('Error getting all grades academic periods:', error);
      return [];
    }
  },

  // Update academic period for grades
  async updateAcademicPeriod(academicYear: string, term: string, updateData: any) {
    try {
      const periodId = `${academicYear}_${term}`;
      const periodRef = doc(db, 'gradesAcademicPeriod', periodId);
      
      // Update the academic period document
      await updateDoc(periodRef, {
        ...updateData,
        updatedAt: new Date().toISOString()
      });

      // If setting as active, deactivate all other periods
      if (updateData.isActive) {
        const allPeriods = await this.getAllGradesAcademicPeriods();
        const deactivatePromises = allPeriods
          .filter((period: any) => !(period.academicYear === academicYear && period.term === term))
          .map((period: any) => {
            const otherPeriodId = `${period.academicYear}_${period.term}`;
            const otherPeriodRef = doc(db, 'gradesAcademicPeriod', otherPeriodId);
            return updateDoc(otherPeriodRef, {
              isActive: false,
              updatedAt: new Date().toISOString()
            });
          });
        
        await Promise.all(deactivatePromises);
      }

      console.log(`Updated grades academic period: ${periodId}`);
    } catch (error) {
      console.error('Error updating grades academic period:', error);
      throw error;
    }
  }
};

// Attendance utilities
export const attendanceUtils = {
  // Create attendance period (called when grades period is created)
  async createAttendancePeriod(academicYear: string, term: string, description?: string) {
    try {
      const periodId = `${academicYear}_${term}`;
      const periodRef = doc(db, 'attendance', periodId);
      
      await setDoc(periodRef, {
        academicYear,
        term,
        description: description || `${academicYear} - ${term}`,
        isActive: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      console.log(`Created attendance period: ${periodId}`);
      return periodId;
    } catch (error) {
      console.error('Error creating attendance period:', error);
      throw error;
    }
  },

  // Get all attendance periods
  async getAllAttendancePeriods() {
    try {
      const querySnapshot = await getDocs(collection(db, 'attendance'));
      const periods = querySnapshot.docs
        .filter(doc => !doc.id.includes('/')) // Filter out subcollections
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      return periods;
    } catch (error) {
      console.error('Error getting attendance periods:', error);
      throw error;
    }
  },

  // Get current active attendance period
  async getCurrentAttendancePeriod() {
    try {
      const q = query(collection(db, 'attendance'), where('isActive', '==', true));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return null;
      }
      
      const doc = querySnapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data()
      };
    } catch (error) {
      console.error('Error getting current attendance period:', error);
      throw error;
    }
  },

  // Set active attendance period
  async setActiveAttendancePeriod(academicYear: string, term: string) {
    try {
      // First deactivate all other periods
      const allPeriods = await this.getAllAttendancePeriods();
      const deactivatePromises = allPeriods
        .filter((period: any) => !(period.academicYear === academicYear && period.term === term))
        .map((period: any) => {
          const otherPeriodId = `${period.academicYear}_${period.term}`;
          const otherPeriodRef = doc(db, 'attendance', otherPeriodId);
          return updateDoc(otherPeriodRef, {
            isActive: false,
            updatedAt: new Date().toISOString()
          });
        });
      
      await Promise.all(deactivatePromises);

      // Then activate the selected period
      const periodId = `${academicYear}_${term}`;
      const periodRef = doc(db, 'attendance', periodId);
      await updateDoc(periodRef, {
        isActive: true,
        updatedAt: new Date().toISOString()
      });

      console.log(`Set active attendance period: ${periodId}`);
    } catch (error) {
      console.error('Error setting active attendance period:', error);
      throw error;
    }
  },

  // Mark attendance for a class on a specific date
  async markAttendance(academicYear: string, term: string, className: string, date: string, attendanceData: any) {
    try {
      const periodId = `${academicYear}_${term}`;
      console.log('markAttendance - periodId:', periodId, 'className:', className, 'date:', date);
      console.log('markAttendance - attendanceData:', attendanceData);
      
      // Ensure the period document exists with all required fields
      const periodRef = doc(db, 'attendance', periodId);
      const periodDoc = await getDoc(periodRef);
      
      if (!periodDoc.exists()) {
        console.log('Creating period document');
        await setDoc(periodRef, {
          academicYear,
          term,
          description: `${academicYear} - ${term}`,
          isActive: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
      
      // Create or update attendance for each student in the class
      const promises = Object.keys(attendanceData).map(async (studentId) => {
        const studentAttendanceRef = doc(db, `attendance/${periodId}/students`, studentId);
        console.log('Processing student:', studentId, 'at path:', `attendance/${periodId}/students/${studentId}`);
        const studentAttendanceDoc = await getDoc(studentAttendanceRef);
        
        const studentData = attendanceData[studentId];
        const attendanceRecord = {
          date,
          status: studentData.status,
          remarks: studentData.remarks || '',
          className,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        console.log('Attendance record for student', studentId, ':', attendanceRecord);
        
        if (studentAttendanceDoc.exists()) {
          // Update existing student attendance document
          const existingData = studentAttendanceDoc.data();
          const updatedAttendance = {
            ...existingData.attendance,
            [date]: attendanceRecord
          };
          
          await updateDoc(studentAttendanceRef, {
            attendance: updatedAttendance,
            updatedAt: new Date().toISOString()
          });
        } else {
          // Create new student attendance document
          await setDoc(studentAttendanceRef, {
            studentId,
            academicYear,
            term,
            className,
            attendance: {
              [date]: attendanceRecord
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }
      });
      
      await Promise.all(promises);
      console.log(`Marked attendance for ${className} on ${date}`);
      return periodId;
    } catch (error) {
      console.error('Error marking attendance:', error);
      throw error;
    }
  },

  // Get attendance for a class on a specific date
  async getClassAttendance(academicYear: string, term: string, className: string, date: string) {
    try {
      const periodId = `${academicYear}_${term}`;
      
      // Ensure the period document exists with all required fields
      const periodRef = doc(db, 'attendance', periodId);
      const periodDoc = await getDoc(periodRef);
      
      if (!periodDoc.exists()) {
        await setDoc(periodRef, {
          academicYear,
          term,
          description: `${academicYear} - ${term}`,
          isActive: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
      
      // Get all students in the class
      const students = await studentUtils.getStudents();
      const classStudents = students.filter((student: any) => 
        student.assignedClass === className || student.class === className
      );
      
      // Get attendance for each student on the specific date
      const attendanceData: Record<string, { status: string; remarks: string }> = {};
      
      const promises = classStudents.map(async (student: any) => {
        const studentAttendanceRef = doc(db, `attendance/${periodId}/students`, student.id);
        const studentAttendanceDoc = await getDoc(studentAttendanceRef);
        
        if (studentAttendanceDoc.exists()) {
          const studentData = studentAttendanceDoc.data();
          if (studentData.attendance && studentData.attendance[date]) {
            const attendanceRecord = studentData.attendance[date];
            attendanceData[student.id] = {
              status: attendanceRecord.status,
              remarks: attendanceRecord.remarks || ''
            };
          } else {
            // Default to present if no attendance record exists
            attendanceData[student.id] = {
              status: 'present',
              remarks: ''
            };
          }
        } else {
          // Default to present if no attendance document exists
          attendanceData[student.id] = {
            status: 'present',
            remarks: ''
          };
        }
      });
      
      await Promise.all(promises);
      
      return {
        academicYear,
        term,
        className,
        date,
        attendanceData
      };
    } catch (error) {
      console.error('Error getting class attendance:', error);
      throw error;
    }
  },

  // Get attendance for a student over a date range
  async getStudentAttendance(academicYear: string, term: string, studentId: string, startDate?: string, endDate?: string) {
    try {
      const periodId = `${academicYear}_${term}`;
      console.log('getStudentAttendance - periodId:', periodId, 'studentId:', studentId);
      
      // Ensure the period document exists with all required fields
      const periodRef = doc(db, 'attendance', periodId);
      const periodDoc = await getDoc(periodRef);
      
      if (!periodDoc.exists()) {
        console.log('Period document does not exist, creating it');
        await setDoc(periodRef, {
          academicYear,
          term,
          description: `${academicYear} - ${term}`,
          isActive: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
      
      const studentAttendanceRef = doc(db, `attendance/${periodId}/students`, studentId);
      console.log('Student attendance ref path:', `attendance/${periodId}/students/${studentId}`);
      const studentAttendanceDoc = await getDoc(studentAttendanceRef);
      
      if (!studentAttendanceDoc.exists()) {
        console.log('Student attendance document does not exist for student:', studentId);
        return [];
      }
      
      const studentData = studentAttendanceDoc.data();
      console.log('Student attendance data:', studentData);
      const attendanceRecords: Array<{
        id: string;
        date: string;
        status: string;
        remarks: string;
        className: string;
      }> = [];
      
      if (studentData.attendance) {
        console.log('Processing attendance records:', studentData.attendance);
        Object.keys(studentData.attendance).forEach(date => {
          const attendanceRecord = studentData.attendance[date];
          attendanceRecords.push({
            id: `${studentId}_${date}`,
            date: attendanceRecord.date,
            status: attendanceRecord.status,
            remarks: attendanceRecord.remarks || '',
            className: attendanceRecord.className || ''
          });
        });
      } else {
        console.log('No attendance data found in student document');
      }
      
      // Filter by date range if provided
      if (startDate && endDate) {
        return attendanceRecords.filter(record => 
          record.date >= startDate && record.date <= endDate
        );
      }
      
      return attendanceRecords.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    } catch (error) {
      console.error('Error getting student attendance:', error);
      throw error;
    }
  },

  // Get attendance summary for a class
  async getClassAttendanceSummary(academicYear: string, term: string, className: string, startDate?: string, endDate?: string) {
    try {
      const periodId = `${academicYear}_${term}`;
      
      // Ensure the period document exists with all required fields
      const periodRef = doc(db, 'attendance', periodId);
      const periodDoc = await getDoc(periodRef);
      
      if (!periodDoc.exists()) {
        await setDoc(periodRef, {
          academicYear,
          term,
          description: `${academicYear} - ${term}`,
          isActive: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
      
      // Get all students in the class
      const students = await studentUtils.getStudents();
      const classStudents = students.filter((student: any) => 
        student.assignedClass === className || student.class === className
      );
      
      // Get attendance for each student
      const summary = {
        totalDays: 0,
        students: {} as Record<string, { present: number; absent: number; total: number }>
      };
      
      const promises = classStudents.map(async (student: any) => {
        const studentAttendanceRef = doc(db, `attendance/${periodId}/students`, student.id);
        const studentAttendanceDoc = await getDoc(studentAttendanceRef);
        
        summary.students[student.id] = { present: 0, absent: 0, total: 0 };
        
        if (studentAttendanceDoc.exists()) {
          const studentData = studentAttendanceDoc.data();
          if (studentData.attendance) {
            Object.keys(studentData.attendance).forEach(date => {
              const attendanceRecord = studentData.attendance[date];
              
              // Filter by date range if provided
              if (startDate && endDate) {
                if (date < startDate || date > endDate) {
                  return;
                }
              }
              
              summary.students[student.id].total++;
              
              if (attendanceRecord.status === 'present') {
                summary.students[student.id].present++;
              } else if (attendanceRecord.status === 'absent') {
                summary.students[student.id].absent++;
              }
            });
          }
        }
      });
      
      await Promise.all(promises);
      
      // Calculate total days (use the maximum number of attendance records from any student)
      const maxDays = Math.max(...Object.values(summary.students).map(student => student.total));
      summary.totalDays = maxDays;
      
      return summary;
    } catch (error) {
      console.error('Error getting class attendance summary:', error);
      throw error;
    }
  },

  // Get all students' attendance for a term (admin function)
  async getAllStudentsAttendanceForTerm(academicYear: string, term: string, startDate?: string, endDate?: string) {
    try {
      const periodId = `${academicYear}_${term}`;
      
      // Ensure the period document exists with all required fields
      const periodRef = doc(db, 'attendance', periodId);
      const periodDoc = await getDoc(periodRef);
      
      if (!periodDoc.exists()) {
        await setDoc(periodRef, {
          academicYear,
          term,
          description: `${academicYear} - ${term}`,
          isActive: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
      
      // Get all students
      const students = await studentUtils.getStudents();
      
      // Get attendance for each student
      const allAttendance: Array<{
        studentId: string;
        studentName: string;
        className: string;
        attendance: Array<{
          date: string;
          status: string;
          remarks: string;
        }>;
      }> = [];
      
      const promises = students.map(async (student: any) => {
        const studentAttendanceRef = doc(db, `attendance/${periodId}/students`, student.id);
        const studentAttendanceDoc = await getDoc(studentAttendanceRef);
        
        const studentAttendance: Array<{
          date: string;
          status: string;
          remarks: string;
        }> = [];
        
        if (studentAttendanceDoc.exists()) {
          const studentData = studentAttendanceDoc.data();
          if (studentData.attendance) {
            Object.keys(studentData.attendance).forEach(date => {
              const attendanceRecord = studentData.attendance[date];
              
              // Filter by date range if provided
              if (startDate && endDate) {
                if (date < startDate || date > endDate) {
                  return;
                }
              }
              
              studentAttendance.push({
                date: attendanceRecord.date,
                status: attendanceRecord.status,
                remarks: attendanceRecord.remarks || ''
              });
            });
          }
        }
        
        allAttendance.push({
          studentId: student.id,
          studentName: student.fullName || student.name,
          className: student.assignedClass || student.class || '',
          attendance: studentAttendance.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        });
      });
      
      await Promise.all(promises);
      
      return allAttendance;
    } catch (error) {
      console.error('Error getting all students attendance for term:', error);
      throw error;
    }
  }
};

// Report generation utilities
export const reportUtils = {
  // Upload report to Firebase Storage (automatically creates folder structure if needed)
  async uploadReport(blob: Blob, path: string): Promise<string> {
    try {
      // Firebase Storage automatically creates the folder structure when uploading
      // No need to check if folders exist - just upload the file
      const storageRef = ref(storage, path);
      
      console.log(`Uploading report to: ${path}`);
      
      // Upload the file (this will automatically create the path structure)
      // If file exists, it will be overwritten
      await uploadBytes(storageRef, blob);
      
      // Get the download URL after successful upload
      const downloadURL = await getDownloadURL(storageRef);
      console.log(`Report uploaded successfully: ${path}`);
      return downloadURL;
    } catch (error: any) {
      console.error('Error uploading report:', error);
      
      // Provide more specific error messages
      if (error.code === 'storage/unauthorized') {
        throw new Error('Permission denied. Please check your Firebase Storage rules.');
      } else if (error.code === 'storage/quota-exceeded') {
        throw new Error('Storage quota exceeded. Please contact administrator.');
      } else if (error.code === 'storage/canceled') {
        throw new Error('Upload was canceled.');
      } else {
        throw new Error(`Failed to upload report: ${error.message || 'Unknown error'}`);
      }
    }
  },

  // Delete existing report
  async deleteReport(path: string): Promise<void> {
    try {
      const storageRef = ref(storage, path);
      await deleteObject(storageRef);
      console.log(`Report deleted successfully: ${path}`);
    } catch (error) {
      console.error('Error deleting report:', error);
      throw error;
    }
  },

  // Generate PDF from HTML using jsPDF and html2canvas
  async generatePDFFromHTML(html: string): Promise<Blob> {
    let tempDiv: HTMLDivElement | null = null;
    try {
      console.log('Starting PDF generation from HTML...');
      
      // Create a temporary container element
      tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.top = '-9999px';
      tempDiv.style.width = '1200px'; // Match canvas width for better quality
      tempDiv.style.fontFamily = 'Arial, sans-serif';
      tempDiv.style.fontSize = '12px';
      tempDiv.style.lineHeight = '1.4';
      tempDiv.style.color = '#000';
      tempDiv.style.backgroundColor = '#fff';
      
      // Add to DOM temporarily
      document.body.appendChild(tempDiv);
      console.log('Temporary div added to DOM, scrollHeight:', tempDiv.scrollHeight);
      
      // Wait a bit for the DOM to render
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Configure html2canvas options for high quality (reduced scale to 2.5 for better performance)
      console.log('Starting html2canvas conversion...');
      const canvas = await Promise.race([
        html2canvas(tempDiv, {
          scale: 2.5, // Reduced from 3 to 2.5 for better performance while maintaining quality
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          width: 1200,
          height: tempDiv.scrollHeight,
          logging: false,
          windowWidth: 1200,
          windowHeight: tempDiv.scrollHeight,
          removeContainer: false, // Changed to false to manually remove
          imageTimeout: 15000, // 15 second timeout for images
          foreignObjectRendering: false,
          onclone: (clonedDoc) => {
            // Ensure cloned document is ready
            console.log('html2canvas clone created');
          }
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('html2canvas timeout after 60 seconds')), 60000)
        )
      ]) as HTMLCanvasElement;
      
      console.log('html2canvas conversion completed, canvas size:', canvas.width, 'x', canvas.height);
      
      // Remove temporary element
      if (tempDiv && tempDiv.parentNode) {
        document.body.removeChild(tempDiv);
        tempDiv = null;
      }
      
      // Create PDF with optimized quality - use JPEG for smaller file size
      console.log('Converting canvas to image data...');
      const imgData = canvas.toDataURL('image/jpeg', 0.95); // Use JPEG with 95% quality (much smaller, visually identical)
      console.log('Image data created, length:', imgData.length);
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true // Enable compression for smaller file size
      });
      
      // Calculate dimensions
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 295; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      
      console.log('Adding image to PDF, dimensions:', imgWidth, 'x', imgHeight, 'mm');
      
      let position = 0;
      
      // Add first page
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      // Add additional pages if needed
      let pageCount = 1;
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
        pageCount++;
      }
      
      console.log(`PDF created with ${pageCount} page(s)`);
      
      // Convert to blob
      const pdfBlob = pdf.output('blob');
      console.log('PDF blob created, size:', (pdfBlob.size / 1024).toFixed(2), 'KB');
      return pdfBlob;
    } catch (error) {
      console.error('Error generating PDF:', error);
      
      // Cleanup tempDiv if it still exists
      if (tempDiv && tempDiv.parentNode) {
        try {
          document.body.removeChild(tempDiv);
        } catch (cleanupError) {
          console.warn('Error removing temp div:', cleanupError);
        }
      }
      
      // Provide more specific error message
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          throw new Error('PDF generation timed out. The report may be too large. Please try again.');
        }
        throw new Error(`PDF generation failed: ${error.message}`);
      }
      throw error;
    }
  },

  // Get download URL for a report
  async getReportDownloadURL(path: string): Promise<string> {
    try {
      const storageRef = ref(storage, path);
      const downloadURL = await getDownloadURL(storageRef);
      return downloadURL;
    } catch (error) {
      console.error('Error getting download URL:', error);
      throw error;
    }
  },

  // Check if a report exists for a specific student and term
  async reportExists(academicYear: string, term: string, className: string, studentName: string): Promise<boolean> {
    try {
      const fileName = `${studentName.replace(/\s+/g, '_')}_${academicYear}_${term}.pdf`;
      const path = `reports/${academicYear}_${term}/${className}/${fileName}`;
      const storageRef = ref(storage, path);
      
      try {
        // Try to get download URL - if successful, file exists
        await getDownloadURL(storageRef);
        return true; // File exists
      } catch (error: any) {
        // If error is 'storage/object-not-found', file doesn't exist
        // Other errors (like permission issues) should also return false
        if (error.code === 'storage/object-not-found') {
          return false; // File doesn't exist
        }
        // For other errors, log but still return false
        console.warn('Error checking report existence (treating as non-existent):', error.code);
        return false;
      }
    } catch (error) {
      console.error('Error checking if report exists:', error);
      return false; // Default to false if any error occurs
    }
  },

  // List reports for a specific term and class
  async listReports(academicYear: string, term: string, className: string): Promise<string[]> {
    try {
      const path = `reports/${academicYear}_${term}/${className}/`;
      
      // Note: Firebase Storage doesn't have a direct list method in v9+
      // This would need to be implemented with a different approach
      // For now, we'll return an empty array
      console.log(`Listing reports for: ${path}`);
      return [];
    } catch (error) {
      console.error('Error listing reports:', error);
      throw error;
    }
  }
};

// Promotion operations
export const promotionUtils = {
  // Create a promotion record
  async createPromotion(promotionData: {
    fromClass: string
    toClass: string
    promotedBy: string
    students: string[]
    academicYear: string
    term: string
  }) {
    try {
      const promotionDoc = {
        fromClass: promotionData.fromClass,
        toClass: promotionData.toClass,
        promotedBy: promotionData.promotedBy,
        students: promotionData.students,
        status: 'pending',
        academicYear: promotionData.academicYear,
        term: promotionData.term,
        promotedAt: new Date().toISOString(),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      }
      return await firestoreUtils.addDocument('promotions', promotionDoc)
    } catch (error) {
      console.error('Error creating promotion:', error)
      throw error
    }
  },

  // Get all promotions
  async getAllPromotions() {
    try {
      return await firestoreUtils.getDocuments('promotions')
    } catch (error) {
      console.error('Error getting promotions:', error)
      throw error
    }
  },

  // Get pending promotions for a specific class
  async getPendingPromotionsForClass(className: string) {
    try {
      const allPromotions = await this.getAllPromotions()
      return allPromotions.filter((promo: any) => 
        promo.toClass === className && promo.status === 'pending'
      )
    } catch (error) {
      console.error('Error getting pending promotions:', error)
      throw error
    }
  },

  // Confirm a promotion (merge students to normal status)
  async confirmPromotion(promotionId: string, confirmedBy: string) {
    try {
      const promotionRef = doc(db, 'promotions', promotionId)
      const promotionDoc = await getDoc(promotionRef)
      
      if (!promotionDoc.exists()) {
        throw new Error('Promotion not found')
      }

      const promotionData = promotionDoc.data()
      
      // Update promotion status
      await updateDoc(promotionRef, {
        status: 'confirmed',
        confirmedBy,
        confirmedAt: new Date().toISOString(),
        updatedAt: Timestamp.now()
      })

      // Update all students to normal status
      const updatePromises = promotionData.students.map((studentId: string) =>
        studentUtils.updateStudent(studentId, {
          promotionStatus: 'normal',
          updatedAt: new Date().toISOString()
        })
      )

      await Promise.all(updatePromises)
      return true
    } catch (error) {
      console.error('Error confirming promotion:', error)
      throw error
    }
  },

  // Reverse a promotion
  async reversePromotion(promotionId: string, reversedBy: string) {
    try {
      const promotionRef = doc(db, 'promotions', promotionId)
      const promotionDoc = await getDoc(promotionRef)
      
      if (!promotionDoc.exists()) {
        throw new Error('Promotion not found')
      }

      const promotionData = promotionDoc.data()
      
      if (promotionData.status === 'reversed') {
        throw new Error('Promotion already reversed')
      }

      // Update promotion status
      await updateDoc(promotionRef, {
        status: 'reversed',
        reversedBy,
        reversedAt: new Date().toISOString(),
        updatedAt: Timestamp.now()
      })

      // Move students back to previous class and update status
      const updatePromises = promotionData.students.map((studentId: string) =>
        studentUtils.getStudent(studentId).then(async (student: any) => {
          if (student.promotedFrom) {
            await studentUtils.updateStudent(studentId, {
              assignedClass: student.promotedFrom,
              class: student.promotedFrom,
              promotionStatus: 'reversed',
              previousClass: promotionData.toClass,
              updatedAt: new Date().toISOString()
            })
          }
        })
      )

      await Promise.all(updatePromises)
      return true
    } catch (error) {
      console.error('Error reversing promotion:', error)
      throw error
    }
  },

  // Promote students (updates student records and creates promotion record)
  async promoteStudents(studentIds: string[], fromClass: string, toClass: string | null, promotedBy: string, academicYear: string, term: string) {
    try {
      if (!toClass) {
        throw new Error('Cannot promote from last class without batch completion')
      }

      // Update student records
      const updatePromises = studentIds.map(async (studentId: string) => {
        const student = await studentUtils.getStudent(studentId)
        await studentUtils.updateStudent(studentId, {
          previousClass: fromClass,
          promotedFrom: fromClass,
          assignedClass: toClass,
          class: toClass,
          promotionStatus: 'newly-promoted',
          promotedBy,
          promotionDate: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      })

      await Promise.all(updatePromises)

      // Create promotion record
      const promotionId = await this.createPromotion({
        fromClass,
        toClass,
        promotedBy,
        students: studentIds,
        academicYear,
        term
      })

      return promotionId
    } catch (error) {
      console.error('Error promoting students:', error)
      throw error
    }
  },

  // Mark students to repeat (stay in same class)
  async markStudentsToRepeat(studentIds: string[], className: string) {
    try {
      const updatePromises = studentIds.map((studentId: string) =>
        studentUtils.updateStudent(studentId, {
          promotionStatus: 'repeated',
          updatedAt: new Date().toISOString()
        })
      )

      await Promise.all(updatePromises)
      return true
    } catch (error) {
      console.error('Error marking students to repeat:', error)
      throw error
    }
  },

  // Complete batch (for JHS 3 graduates)
  async completeBatch(studentIds: string[], year: string, createdBy: string) {
    try {
      const batchName = `${year} batch`
      
      // Create completed batch record
      const batchDoc = {
        batchName,
        completionYear: year,
        students: studentIds,
        createdBy,
        completedAt: new Date().toISOString(),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      }
      const batchId = await firestoreUtils.addDocument('completedBatches', batchDoc)

      // Update student records
      const updatePromises = studentIds.map((studentId: string) =>
        studentUtils.updateStudent(studentId, {
          completedYear: year,
          batchName,
          promotionStatus: 'completed',
          updatedAt: new Date().toISOString()
        })
      )

      await Promise.all(updatePromises)

      return batchId
    } catch (error) {
      console.error('Error completing batch:', error)
      throw error
    }
  },

  // Get all completed batches
  async getCompletedBatches() {
    try {
      return await firestoreUtils.getDocuments('completedBatches')
    } catch (error) {
      console.error('Error getting completed batches:', error)
      throw error
    }
  },

  // Get students by promotion status in a class
  async getStudentsByPromotionStatus(className: string, status: 'normal' | 'newly-promoted' | 'repeated' | 'reversed') {
    try {
      const allStudents = await studentUtils.getStudents()
      return allStudents.filter((student: any) => 
        (student.assignedClass === className || student.class === className) &&
        student.promotionStatus === status
      )
    } catch (error) {
      console.error('Error getting students by promotion status:', error)
      throw error
    }
  }
};

// Payment Lock operations
export const paymentLockUtils = {
  // Activate notice (dismissible)
  async activateNotice(email: string, message?: string) {
    try {
      const lockRef = doc(db, 'system', 'paymentLock');
      const lockSnap = await getDoc(lockRef);
      const existingData = lockSnap.exists() ? lockSnap.data() : {};
      
      // Clean up old format fields if they exist and build clean data
      const cleanData: any = {
        isNoticeActive: true,
        noticeActivatedAt: Timestamp.now(),
        activatedBy: email,
        message: message || existingData.message || '',
        updatedAt: Timestamp.now()
      };
      
      // Preserve lock state if it exists
      if ('isLockActive' in existingData) {
        cleanData.isLockActive = existingData.isLockActive;
        cleanData.lockActivatedAt = existingData.lockActivatedAt || null;
      } else {
        cleanData.isLockActive = false;
        cleanData.lockActivatedAt = null;
      }
      
      // Remove old format fields by explicitly setting them to null
      await setDoc(lockRef, {
        ...cleanData,
        isActive: null, // Remove old field
        activatedAt: null // Remove old field
      }, { merge: true });
      
      // Then set the clean data without old fields
      await setDoc(lockRef, cleanData);
      console.log('Notice activated with data:', cleanData);
    } catch (error) {
      console.error('Error activating payment notice:', error);
      throw error;
    }
  },

  // Deactivate notice
  async deactivateNotice() {
    try {
      const lockRef = doc(db, 'system', 'paymentLock');
      const lockSnap = await getDoc(lockRef);
      const existingData = lockSnap.exists() ? lockSnap.data() : {};
      
      await setDoc(lockRef, {
        ...existingData,
        isNoticeActive: false,
        noticeActivatedAt: null,
        updatedAt: Timestamp.now()
      }, { merge: true });
    } catch (error) {
      console.error('Error deactivating payment notice:', error);
      throw error;
    }
  },

  // Activate lock (non-dismissible)
  async activateLock(email: string) {
    try {
      const lockRef = doc(db, 'system', 'paymentLock');
      const lockSnap = await getDoc(lockRef);
      const existingData = lockSnap.exists() ? lockSnap.data() : {};
      
      // Preserve notice state if it exists
      const cleanData: any = {
        isLockActive: true,
        lockActivatedAt: Timestamp.now(),
        activatedBy: email,
        updatedAt: Timestamp.now()
      };
      
      if ('isNoticeActive' in existingData) {
        cleanData.isNoticeActive = existingData.isNoticeActive;
        cleanData.noticeActivatedAt = existingData.noticeActivatedAt || null;
      } else {
        cleanData.isNoticeActive = false;
        cleanData.noticeActivatedAt = null;
      }
      
      if ('message' in existingData) {
        cleanData.message = existingData.message || '';
      }
      
      // Remove old format fields
      await setDoc(lockRef, {
        ...cleanData,
        isActive: null, // Remove old field
        activatedAt: null // Remove old field
      }, { merge: true });
      
      // Then set the clean data without old fields
      await setDoc(lockRef, cleanData);
      console.log('Lock activated with data:', cleanData);
    } catch (error) {
      console.error('Error activating payment lock:', error);
      throw error;
    }
  },

  // Deactivate lock
  async deactivateLock() {
    try {
      const lockRef = doc(db, 'system', 'paymentLock');
      const lockSnap = await getDoc(lockRef);
      const existingData = lockSnap.exists() ? lockSnap.data() : {};
      
      // Preserve notice state
      const cleanData: any = {
        isLockActive: false,
        lockActivatedAt: null,
        updatedAt: Timestamp.now()
      };
      
      if ('isNoticeActive' in existingData) {
        cleanData.isNoticeActive = existingData.isNoticeActive;
        cleanData.noticeActivatedAt = existingData.noticeActivatedAt || null;
      }
      
      if ('message' in existingData) {
        cleanData.message = existingData.message || '';
      }
      
      if ('activatedBy' in existingData) {
        cleanData.activatedBy = existingData.activatedBy || '';
      }
      
      await setDoc(lockRef, cleanData, { merge: true });
    } catch (error) {
      console.error('Error deactivating payment lock:', error);
      throw error;
    }
  },

  // Get lock status
  async getLockStatus() {
    try {
      const lockRef = doc(db, 'system', 'paymentLock');
      const lockSnap = await getDoc(lockRef);
      if (lockSnap.exists()) {
        return { id: lockSnap.id, ...lockSnap.data() };
      }
      return null;
    } catch (error) {
      console.error('Error getting lock status:', error);
      throw error;
    }
  },

  // Dismiss notice for user
  async dismissNoticeForUser(userId: string, lockActivatedAt: Timestamp) {
    try {
      const dismissalRef = doc(db, 'users', userId, 'paymentLockDismissed', 'current');
      await setDoc(dismissalRef, {
        dismissedAt: Timestamp.now(),
        lockActivatedAt: lockActivatedAt
      });
    } catch (error) {
      console.error('Error dismissing notice for user:', error);
      throw error;
    }
  },

  // Check if user has dismissed
  async hasUserDismissed(userId: string, lockActivatedAt: Timestamp) {
    try {
      const dismissalRef = doc(db, 'users', userId, 'paymentLockDismissed', 'current');
      const dismissalSnap = await getDoc(dismissalRef);
      
      if (!dismissalSnap.exists()) {
        return false;
      }

      const data = dismissalSnap.data();
      const dismissalActivatedAt = data?.lockActivatedAt;
      
      // Check if dismissal is for the same activation
      if (dismissalActivatedAt && dismissalActivatedAt.toMillis() === lockActivatedAt.toMillis()) {
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error checking user dismissal:', error);
      return false;
    }
  }
};
