// firebase-config.js
const firebaseConfig = {
    apiKey: "AIzaSyCih_aW41pRmsic452-YAkvCMpTqdkiMjA",
    authDomain: "ugatrade-f51b8.firebaseapp.com",
    projectId: "ugatrade-f51b8",
    storageBucket: "ugatrade-f51b8.firebasestorage.app",
    messagingSenderId: "107996484161",
    appId: "1:107996484161:web:e44b607396236fcce42cc0",
    measurementId: "G-JRRFYPZDF9"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

const fAuth = firebase.auth();
const fDb = firebase.firestore();
const fStorage = firebase.storage();
