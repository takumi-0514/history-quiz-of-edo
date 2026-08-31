import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const netlifyFirebaseConfig = {
  apiKey: "AIzaSyAY6j40lEWfskNXqCpDWKMiOuVsF1rAAH4",
  authDomain: "study-tracker-pro-dashboard.firebaseapp.com",
  projectId: "study-tracker-pro-dashboard",
  storageBucket: "study-tracker-pro-dashboard.firebasestorage.app",
  messagingSenderId: "12330692555",
  appId: "1:12330692555:web:1baf87adf42ca3381d904e",
  measurementId: "G-CQWW6MB1KK"
};

let db = null;
let auth = null;

function bufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function base64ToBuffer(base64) {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function deriveKey(password, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );
  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

async function encryptData(dataObj, password) {
  const enc = new TextEncoder();
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const encoded = enc.encode(JSON.stringify(dataObj));
  const ciphertext = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv
    },
    key,
    encoded
  );
  return {
    ciphertext: bufferToBase64(ciphertext),
    salt: bufferToBase64(salt),
    iv: bufferToBase64(iv),
    updatedAt: Date.now()
  };
}

async function decryptData(encryptedObj, password) {
  try {
    const salt = base64ToBuffer(encryptedObj.salt);
    const iv = base64ToBuffer(encryptedObj.iv);
    const ciphertext = base64ToBuffer(encryptedObj.ciphertext);
    const key = await deriveKey(password, salt);
    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv
      },
      key,
      ciphertext
    );
    const dec = new TextDecoder();
    return JSON.parse(dec.decode(decrypted));
  } catch (e) {
    console.error("Decryption failed:", e);
    return null;
  }
}

async function initFirebase() {
  if (!db) {
    try {
      const app = initializeApp(netlifyFirebaseConfig);
      auth = getAuth(app);
      db = getFirestore(app);
      await signInAnonymously(auth);
    } catch (error) {
      console.error("Firebase init error:", error);
      return null;
    }
  }
  return db;
}

function getTodayString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export async function checkSyncStatus() {
  const savedRoom = localStorage.getItem('history_st_sync_room');
  const savedPass = localStorage.getItem('history_st_sync_password');
  return {
    roomId: savedRoom || '',
    password: savedPass || '',
    isConnected: !!(savedRoom && savedPass)
  };
}

export async function connectStudyTracker(roomId, password) {
  if (!roomId || !password) {
    alert("ルームIDとパスワードの両方を入力してください。");
    return { success: false };
  }
  
  const database = await initFirebase();
  if (!database) {
    alert("ネットワークエラーが発生しました。");
    return { success: false };
  }
  
  const docRef = doc(database, 'rooms', roomId);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    alert("指定されたルームが見つかりません。Study Trackerで作成したルームIDを指定してください。");
    return { success: false };
  }
  
  const remoteData = docSnap.data();
  if (remoteData.ciphertext) {
    const decryptedData = await decryptData(remoteData, password);
    if (!decryptedData) {
      alert("パスワードが間違っています。");
      return { success: false };
    }
    
    // 成功
    localStorage.setItem('history_st_sync_room', roomId);
    localStorage.setItem('history_st_sync_password', password);
    alert("Study Trackerと連携しました！");
    return { success: true, subjects: decryptedData.subjects || [] };
  } else {
    alert("このルームは暗号化されていない古い形式のため連携できません。");
    return { success: false };
  }
}

export async function fetchStudyTrackerSubjects() {
    const statusInfo = await checkSyncStatus();
    if (!statusInfo.isConnected) return [];
    
    const database = await initFirebase();
    if (!database) return [];
    
    try {
        const docRef = doc(database, 'rooms', statusInfo.roomId);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) return [];
        
        const remoteData = docSnap.data();
        const decryptedData = await decryptData(remoteData, statusInfo.password);
        if (!decryptedData) return [];
        
        return decryptedData.subjects || [];
    } catch (e) {
        return [];
    }
}

export function disconnectStudyTracker() {
  localStorage.removeItem('history_st_sync_room');
  localStorage.removeItem('history_st_sync_password');
  localStorage.removeItem('history_st_sync_subject');
  alert("Study Trackerとの連携を解除しました。");
}

export async function pushStudyTrackerRecord(minutes, seconds, quizModeText) {
  const statusInfo = await checkSyncStatus();
  if (!statusInfo.isConnected) {
    alert("Study Trackerと連携されていません。");
    return false;
  }
  
  const database = await initFirebase();
  if (!database) {
    alert("通信エラーが発生しました。");
    return false;
  }
  
  try {
    const docRef = doc(database, 'rooms', statusInfo.roomId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      alert("同期ルームが見つかりません。");
      return false;
    }
    
    const remoteData = docSnap.data();
    const decryptedData = await decryptData(remoteData, statusInfo.password);
    
    if (!decryptedData) {
      alert("復号化に失敗しました。パスワードが変更された可能性があります。");
      return false;
    }
    
    let subjectId = localStorage.getItem('history_st_sync_subject');
    let subjects = decryptedData.subjects || [];
    
    if (!subjectId) {
        let historySub = subjects.find(s => s.name === '歴史' || s.name === '社会');
        if (historySub) {
          subjectId = historySub.id;
        } else {
          subjectId = 'sub_history_' + Date.now();
          subjects.push({
            id: subjectId,
            name: '歴史',
            color: '#d97706', // amber-600
            weeklyGoalMinutes: 120
          });
          decryptedData.subjects = subjects;
        }
    }

    
    const today = getTodayString();
    
    // Add to logs (timeSchedules/logs structure) - minutes
    if (minutes > 0) {
      let logs = decryptedData.logs || [];
      logs.push({
        id: 'log_history_' + Date.now(),
        subjectId: subjectId,
        date: today,
        minutes: minutes,
        note: `[歴史暗記道場] ${quizModeText}`
      });
      decryptedData.logs = logs;
    }
    
    // Add to problemLogs - detailed record in seconds
    let pLogs = decryptedData.problemLogs || [];
    pLogs.push({
      id: 'plog_history_' + Date.now(),
      subjectId: subjectId,
      name: `歴史暗記道場 (${quizModeText})`,
      seconds: seconds,
      date: today
    });
    decryptedData.problemLogs = pLogs;
    
    // Encrypt and save back
    const encrypted = await encryptData(decryptedData, statusInfo.password);
    await setDoc(docRef, encrypted);
    
    return true;
  } catch(e) {
    console.error(e);
    alert("同期中にエラーが発生しました。");
    return false;
  }
}

// Global expose
window.checkSyncStatus = checkSyncStatus;
window.connectStudyTracker = connectStudyTracker;
window.disconnectStudyTracker = disconnectStudyTracker;
window.pushStudyTrackerRecord = pushStudyTrackerRecord;
window.fetchStudyTrackerSubjects = fetchStudyTrackerSubjects;
