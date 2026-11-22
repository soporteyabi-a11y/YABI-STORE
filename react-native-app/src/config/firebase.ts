import {initializeApp, getApps, getApp} from 'firebase/app';
import {initializeAuth, getReactNativePersistence} from 'firebase/auth';
import {getFirestore} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const firebaseConfig = {
  apiKey: 'AIzaSyBN43iwLvZeMK8Mqc-9Cgvgit--sfys2NY',
  authDomain: 'yabi-store.firebaseapp.com',
  databaseURL: 'https://yabi-store-default-rtdb.firebaseio.com',
  projectId: 'yabi-store',
  storageBucket: 'yabi-store.firebasestorage.app',
  messagingSenderId: '944408167941',
  appId: '1:944408167941:web:f6b381be1eab30ef6c3e6c',
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export const db = getFirestore(app);
