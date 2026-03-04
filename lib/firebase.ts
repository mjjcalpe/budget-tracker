import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyB32whX0jt2k3tHtuhlItfij0ctMSh0DGo",
  authDomain: "mjcalpe-portfolio.firebaseapp.com",
  projectId: "mjcalpe-portfolio",
  storageBucket: "mjcalpe-portfolio.firebasestorage.app",
  messagingSenderId: "692893680261",
  appId: "1:692893680261:web:5eff4ea33b7ff04b7bdfec"
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export { db, auth, provider };