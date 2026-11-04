/* ==========================================================
   CONFIGURACIÓN DE AULA DIDÁCTICA 360
   Este es el único archivo que debes editar para conectar
   los juegos con tu Firebase.
   ========================================================== */

// 1) Pega aquí la configuración de tu app web de Firebase
//    (Firebase → Configuración del proyecto → Tus apps → Configuración del SDK).
//    Debe incluir databaseURL (Realtime Database).
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyDt7g3908OPnnHOtSXaa48mEQRYyuU58sI",
  authDomain: "pamava-ruleta.firebaseapp.com",
  databaseURL: "https://pamava-ruleta-default-rtdb.firebaseio.com",
  projectId: "pamava-ruleta",
  storageBucket: "pamava-ruleta.firebasestorage.app",
  messagingSenderId: "197228563038",
  appId: "1:197228563038:web:72c6674deeb867979ec2cf"
};

// 2) Clave para abrir el panel del profesor (cámbiala).
window.CLAVE_PROFESOR = "profe2026";

// 3) Puntaje de la ruleta
window.PUNTOS = {
  base: 100,           // puntos por responder bien
  bonusVelocidad: 50,  // extra máximo según qué tan rápido respondió
  penalizacion: 30     // puntos que se restan por responder mal
};
