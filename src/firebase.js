import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCxQucZmYQEMdSHQb02ludw3Sa2A33vaNc",
  authDomain: "wishr-245a7.firebaseapp.com",
  projectId: "wishr-245a7",
  storageBucket: "wishr-245a7.firebasestorage.app",
  messagingSenderId: "1021553653277",
  appId: "1:1021553653277:web:7a3dab215b6b5c9d1c78f4"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
