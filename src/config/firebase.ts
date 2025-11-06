// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAiIHSI6KZ-tIJEMU1Spb3d9EBLSUEHw6Q",
  authDomain: "school-management-e6e17.firebaseapp.com",
  projectId: "school-management-e6e17",
  storageBucket: "school-management-e6e17.firebasestorage.app",
  messagingSenderId: "825014911436",
  appId: "1:825014911436:web:9338c1e7395a0f6e951d69"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);

// Set authentication persistence to local storage
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error('Error setting auth persistence:', error);
});

export default app;
