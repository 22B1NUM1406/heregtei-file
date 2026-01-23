// src/firebase-config.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBl8Nh38xSuaBvJ8x1r7cVutwyiqCV8Xzg",
  authDomain: "shop-app-28e75.firebaseapp.com",
  projectId: "shop-app-28e75",
  storageBucket: "shop-app-28e75.firebasestorage.app",
  messagingSenderId: "779779701658",
  appId: "1:779779701658:web:5baba477eef7c4eb665823",
  measurementId: "G-DXPN326NHY"
};

// Firebase инициализаци
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export { app, auth };
export default app;