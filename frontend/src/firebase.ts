import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAdwjyZKoqUScy1d7tK5NrHXmMNJ2vNyNA",
  authDomain: "tmt-project-fcdc8.firebaseapp.com",
  projectId: "tmt-project-fcdc8",
  storageBucket: "tmt-project-fcdc8.firebasestorage.app",
  messagingSenderId: "998936501976",
  appId: "1:998936501976:web:7a6e2ac7f4b3a9ff0741ad"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);