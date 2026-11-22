import {initializeApp, getApps, getApp} from 'firebase/app';
import {getAuth} from 'firebase/auth';
import {getFirestore} from 'firebase/firestore';
import {getFunctions} from 'firebase/functions';
import {getStorage} from 'firebase/storage';

export const yabiFirebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyBN43iwLvZeMK8Mqc-9Cgvgit--sfys2NY',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'yabi-store.firebaseapp.com',
  databaseURL:
    import.meta.env.VITE_FIREBASE_DATABASE_URL || 'https://yabi-store-default-rtdb.firebaseio.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'yabi-store',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'yabi-store.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '944408167941',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:944408167941:web:f6b381be1eab30ef6c3e6c',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-7RPG7ZT8QM',
};

const app = getApps().length > 0 ? getApp() : initializeApp(yabiFirebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const functions = getFunctions(app);
export const storage = getStorage(app);
export default app;
