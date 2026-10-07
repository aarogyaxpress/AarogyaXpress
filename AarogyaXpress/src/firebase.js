import { initializeApp } from "firebase/app"
import { getAuth, GoogleAuthProvider } from "firebase/auth"

const firebaseConfig = {
  apiKey: "AIzaSyCJ686_Ir--GInCc2SUXBKZJ4GITDjDOUY",
  authDomain: "aarogya-xpress.firebaseapp.com",
  projectId: "aarogya-xpress",
  storageBucket: "aarogya-xpress.firebasestorage.app",
  messagingSenderId: "255948440954",
  appId: "1:255948440954:web:12c352313886783aa242c3"
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const provider = new GoogleAuthProvider()