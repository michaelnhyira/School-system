import { teacherUtils } from './firebaseUtils';

// Ghanaian names and data for realistic teacher profiles
const GHANAIAN_FIRST_NAMES = {
  male: [
    'Kwame', 'Kofi', 'Kwaku', 'Yaw', 'Kojo', 'Kwabena', 'Kweku', 'Kodwo', 'Kobina', 'Kwadwo', 'Kwasi',
    'John', 'David', 'Samuel', 'Michael', 'Daniel', 'Emmanuel', 'Prince', 'Bright', 'Gideon', 'Isaac',
    'Richard', 'Joseph', 'Peter', 'Paul', 'James', 'Andrew', 'Matthew', 'Mark', 'Luke', 'Stephen',
    'Francis', 'Anthony', 'Patrick', 'Vincent', 'Gabriel', 'Raphael', 'Benedict', 'Dominic', 'Thomas'
  ],
  female: [
    'Akosua', 'Ama', 'Akua', 'Adwoa', 'Yaa', 'Efua', 'Esi', 'Abena', 'Araba', 'Afia', 'Efia',
    'Mary', 'Grace', 'Comfort', 'Patience', 'Joyce', 'Esther', 'Ruth', 'Sarah', 'Hannah', 'Rebecca',
    'Elizabeth', 'Margaret', 'Dorothy', 'Florence', 'Catherine', 'Agnes', 'Helen', 'Jane', 'Rose', 'Faith',
    'Cecilia', 'Theresa', 'Monica', 'Veronica', 'Christina', 'Bernadette', 'Immaculate', 'Perpetua', 'Clare'
  ]
};

const GHANAIAN_LAST_NAMES = [
  'Asante', 'Mensah', 'Osei', 'Owusu', 'Appiah', 'Boateng', 'Adjei', 'Darko', 'Nkrumah', 'Acheampong',
  'Agyeman', 'Bonsu', 'Dankwa', 'Frimpong', 'Gyasi', 'Kwarteng', 'Mintah', 'Nyarko', 'Opoku', 'Quansah',
  'Sarpong', 'Tetteh', 'Wiredu', 'Yeboah', 'Zanu', 'Amoah', 'Baffour', 'Danso', 'Essien', 'Fosu',
  'Gyan', 'Hanson', 'Ibrahim', 'Johnson', 'Kofi', 'Lamptey', 'Mills', 'Nartey', 'Ofori', 'Poku'
];

const GHANAIAN_CITIES = [
  'Accra', 'Kumasi', 'Tamale', 'Sekondi-Takoradi', 'Sunyani', 'Cape Coast', 'Koforidua', 'Techiman',
  'Ho', 'Wa', 'Bolgatanga', 'Tema', 'Ashaiman', 'Tema New Town', 'Madina', 'Kasoa', 'Teshie', 'Labadi'
];

const RELIGIONS = ['Christian', 'Islamic', 'Traditional', 'Other'];
const MARITAL_STATUS = ['Single', 'Married', 'Divorced', 'Widowed'];
const GENDERS = ['Male', 'Female'];

const QUALIFICATIONS = [
  'Bachelor of Education (B.Ed)',
  'Master of Education (M.Ed)',
  'Bachelor of Arts in Education',
  'Master of Arts in Education',
  'Postgraduate Diploma in Education',
  'Bachelor of Science in Education',
  'Master of Science in Education',
  'PhD in Education',
  'Certificate in Education',
  'Diploma in Education'
];

const SPECIALIZATIONS = [
  'Mathematics', 'English Language', 'Science', 'Social Studies', 'French', 'ICT', 'Physical Education',
  'Creative Arts', 'Religious Studies', 'Ghanaian Language', 'Pre-Technical Skills', 'Home Economics',
  'Agricultural Science', 'Visual Arts', 'Music', 'Integrated Science', 'Literature', 'History',
  'Geography', 'Economics', 'Chemistry', 'Physics', 'Biology', 'Accounting', 'Business Studies'
];

const CLASSES = [
  'Creche', 'Nursery 1', 'Nursery 2', 'Kindergarten 1', 'Kindergarten 2',
  'Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6',
  'JHS 1', 'JHS 2', 'JHS 3'
];

interface TeacherData {
  fullName: string;
  dob: string;
  gender: string;
  maritalStatus: string;
  nationality: string;
  religion: string;
  address: string;
  contactNumber: string;
  qualification: string;
  licenseNumber: string;
  specialization: string;
  previousExperience: string;
  staffId: string;
  appointmentDate: string;
  subjects: string[];
  assignedClass?: string;
  kinName: string;
  relationship: string;
  occupation: string;
  kinContact: string;
  kinAddress: string;
}

export const generateTeacherData = (): TeacherData[] => {
  const teachers: TeacherData[] = [];
  let staffCounter = 1;

  for (let i = 0; i < 20; i++) {
    const gender = GENDERS[Math.floor(Math.random() * GENDERS.length)];
    const firstName = gender === 'Male' 
      ? GHANAIAN_FIRST_NAMES.male[Math.floor(Math.random() * GHANAIAN_FIRST_NAMES.male.length)]
      : GHANAIAN_FIRST_NAMES.female[Math.floor(Math.random() * GHANAIAN_FIRST_NAMES.female.length)];
    
    const lastName = GHANAIAN_LAST_NAMES[Math.floor(Math.random() * GHANAIAN_LAST_NAMES.length)];
    const fullName = `${gender === 'Male' ? 'Mr.' : 'Ms.'} ${firstName} ${lastName}`;
    
    // Generate realistic age (25-60 years)
    const age = 25 + Math.floor(Math.random() * 36);
    const birthYear = new Date().getFullYear() - age;
    const birthMonth = Math.floor(Math.random() * 12) + 1;
    const birthDay = Math.floor(Math.random() * 28) + 1;
    const dob = `${birthYear}-${birthMonth.toString().padStart(2, '0')}-${birthDay.toString().padStart(2, '0')}`;
    
    const city = GHANAIAN_CITIES[Math.floor(Math.random() * GHANAIAN_CITIES.length)];
    const religion = RELIGIONS[Math.floor(Math.random() * RELIGIONS.length)];
    const maritalStatus = MARITAL_STATUS[Math.floor(Math.random() * MARITAL_STATUS.length)];
    
    // Generate address
    const streetNumber = Math.floor(Math.random() * 999) + 1;
    const address = `${streetNumber} ${city} Street, ${city}`;
    
    // Generate phone number (Ghana format)
    const phoneNumber = `0${Math.floor(Math.random() * 9) + 2}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}`;
    
    // Generate qualification and specialization
    const qualification = QUALIFICATIONS[Math.floor(Math.random() * QUALIFICATIONS.length)];
    const specialization = SPECIALIZATIONS[Math.floor(Math.random() * SPECIALIZATIONS.length)];
    
    // Generate subjects (1-3 subjects per teacher)
    const numSubjects = 1 + Math.floor(Math.random() * 3);
    const availableSubjects = [...SPECIALIZATIONS];
    const subjects = [];
    for (let j = 0; j < numSubjects; j++) {
      const randomIndex = Math.floor(Math.random() * availableSubjects.length);
      subjects.push(availableSubjects.splice(randomIndex, 1)[0]);
    }
    
    // Generate assigned class (optional - 70% chance)
    const assignedClass = Math.random() > 0.3 ? CLASSES[Math.floor(Math.random() * CLASSES.length)] : '';
    
    // Generate experience
    const experience = Math.floor(Math.random() * 15) + 1;
    
    // Generate appointment date (within last 5 years)
    const appointmentYear = new Date().getFullYear() - Math.floor(Math.random() * 5);
    const appointmentMonth = Math.floor(Math.random() * 12) + 1;
    const appointmentDay = Math.floor(Math.random() * 28) + 1;
    const appointmentDate = `${appointmentYear}-${appointmentMonth.toString().padStart(2, '0')}-${appointmentDay.toString().padStart(2, '0')}`;
    
    // Generate next of kin information
    const kinFirstName = gender === 'Male' 
      ? GHANAIAN_FIRST_NAMES.male[Math.floor(Math.random() * GHANAIAN_FIRST_NAMES.male.length)]
      : GHANAIAN_FIRST_NAMES.female[Math.floor(Math.random() * GHANAIAN_FIRST_NAMES.female.length)];
    const kinLastName = GHANAIAN_LAST_NAMES[Math.floor(Math.random() * GHANAIAN_LAST_NAMES.length)];
    const kinName = `${kinFirstName} ${kinLastName}`;
    
    const relationships = ['Spouse', 'Sibling', 'Parent', 'Child', 'Cousin', 'Friend'];
    const relationship = relationships[Math.floor(Math.random() * relationships.length)];
    
    const occupations = ['Teacher', 'Nurse', 'Engineer', 'Business Owner', 'Farmer', 'Driver', 'Mechanic', 'Accountant', 'Civil Servant', 'Trader'];
    const occupation = occupations[Math.floor(Math.random() * occupations.length)];
    
    const kinContact = `0${Math.floor(Math.random() * 9) + 2}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}`;
    const kinAddress = address; // Same address for simplicity
    
    const teacher: TeacherData = {
      fullName,
      dob,
      gender,
      maritalStatus,
      nationality: 'Ghanaian',
      religion,
      address,
      contactNumber: phoneNumber,
      qualification,
      licenseNumber: `TL${new Date().getFullYear()}${staffCounter.toString().padStart(4, '0')}`,
      specialization,
      previousExperience: `${experience} years teaching experience`,
      staffId: `STF${staffCounter.toString().padStart(4, '0')}`,
      appointmentDate,
      subjects,
      assignedClass: assignedClass || undefined,
      kinName,
      relationship,
      occupation,
      kinContact,
      kinAddress
    };
    
    teachers.push(teacher);
    staffCounter++;
  }
  
  return teachers;
};

export const createTeachersInFirestore = async (count: number = 20) => {
  try {
    console.log(`🚀 Creating ${count} teachers in Firestore...`);
    
    const teachersData = generateTeacherData();
    const createdTeachers = [];
    
    for (const teacherData of teachersData) {
      try {
        const teacherId = await teacherUtils.createTeacher(teacherData);
        createdTeachers.push({ id: teacherId, ...teacherData });
        console.log(`✅ Created teacher: ${teacherData.fullName} - ${teacherData.subjects.join(', ')}`);
      } catch (error) {
        console.error(`❌ Error creating teacher ${teacherData.fullName}:`, error);
      }
    }
    
    console.log(`🎉 Successfully created ${createdTeachers.length} teachers in Firestore`);
    return createdTeachers;
  } catch (error) {
    console.error('❌ Error creating teachers:', error);
    throw error;
  }
};

