import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDOU2gxiWFTvsrZL6wVH85LfrqBtyXoL6M",
  authDomain: "gen-lang-client-0685314272.firebaseapp.com",
  projectId: "gen-lang-client-0685314272",
  storageBucket: "gen-lang-client-0685314272.firebasestorage.app",
  messagingSenderId: "742334437402",
  appId: "1:742334437402:web:9cc8c77b74ca102f6059a3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth and get a reference to the service
export const auth = getAuth(app);

// Initialize Firestore
export const db = getFirestore(app);

export default app;

