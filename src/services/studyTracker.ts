import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, signInAnonymously, Auth } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, onSnapshot, Firestore, Unsubscribe } from 'firebase/firestore';
import { StudySubject, StatsMap } from '../types';

const netlifyFirebaseConfig = {
  apiKey: "AIzaSyAY6j40lEWfskNXqCpDWKMiOuVsF1rAAH4",
  authDomain: "study-tracker-pro-dashboard.firebaseapp.com",
  projectId: "study-tracker-pro-dashboard",
  storageBucket: "study-tracker-pro-dashboard.firebasestorage.app",
  messagingSenderId: "12330692555",
  appId: "1:12330692555:web:1baf87adf42ca3381d904e",
  measurementId: "G-CQWW6MB1KK"
};

let db: Firestore | null = null;
let auth: Auth | null = null;
let app: FirebaseApp | null = null;
let unsubscribeSnapshot: Unsubscribe | null = null;

function bufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
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
      salt: salt as BufferSource,
      iterations: 100000,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

interface EncryptedPayload {
  ciphertext: string;
  salt: string;
  iv: string;
  updatedAt: number;
}

async function encryptData(dataObj: any, password: string): Promise<EncryptedPayload> {
  const enc = new TextEncoder();
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const encoded = enc.encode(JSON.stringify(dataObj));
  const ciphertext = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv as BufferSource
    },
    key,
    encoded
  );
  return {
    ciphertext: bufferToBase64(ciphertext),
    salt: bufferToBase64(salt.buffer),
    iv: bufferToBase64(iv.buffer),
    updatedAt: Date.now()
  };
}

async function decryptData(encryptedObj: any, password: string): Promise<any | null> {
  try {
    const salt = new Uint8Array(base64ToBuffer(encryptedObj.salt));
    const iv = new Uint8Array(base64ToBuffer(encryptedObj.iv));
    const ciphertext = base64ToBuffer(encryptedObj.ciphertext);
    const key = await deriveKey(password, salt);
    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv as BufferSource
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

async function initFirebase(): Promise<Firestore | null> {
  if (!db) {
    try {
      app = initializeApp(netlifyFirebaseConfig);
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

function getTodayString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function checkSyncStatus(): { roomId: string; password: string; isConnected: boolean } {
  const savedRoom = localStorage.getItem('history_st_sync_room') || '';
  const savedPass = localStorage.getItem('history_st_sync_password') || '';
  return {
    roomId: savedRoom,
    password: savedPass,
    isConnected: !!(savedRoom && savedPass)
  };
}

export async function connectStudyTracker(roomId: string, password: string): Promise<{ success: boolean; subjects?: StudySubject[]; message?: string }> {
  if (!roomId || !password) {
    return { success: false, message: "ルームIDとパスワードの両方を入力してください。" };
  }
  
  const database = await initFirebase();
  if (!database) {
    return { success: false, message: "ネットワークエラーが発生しました。" };
  }
  
  try {
    const docRef = doc(database, 'rooms', roomId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return { success: false, message: "指定されたルームが見つかりません。Study Trackerで作成したルームIDを指定してください。" };
    }
    
    const remoteData = docSnap.data();
    if (remoteData?.ciphertext) {
      const decryptedData = await decryptData(remoteData, password);
      if (!decryptedData) {
        return { success: false, message: "パスワードが間違っています。" };
      }
      
      localStorage.setItem('history_st_sync_room', roomId);
      localStorage.setItem('history_st_sync_password', password);
      setupRealtimeSync();
      
      // Upload current local stats immediately on connect
      const localStatsStr = localStorage.getItem('history_quiz_stats_v3');
      if (localStatsStr) {
        syncHistoryStatsToCloud(JSON.parse(localStatsStr));
      }
      
      return { success: true, subjects: decryptedData.subjects || [] };
    } else {
      return { success: false, message: "このルームは暗号化されていない古い形式のため連携できません。" };
    }
  } catch (err: any) {
    return { success: false, message: err?.message || "通信エラーが発生しました。" };
  }
}

export async function fetchStudyTrackerSubjects(): Promise<StudySubject[]> {
  const statusInfo = checkSyncStatus();
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
    console.error("fetchStudyTrackerSubjects error:", e);
    return [];
  }
}

export function disconnectStudyTracker(): void {
  localStorage.removeItem('history_st_sync_room');
  localStorage.removeItem('history_st_sync_password');
  localStorage.removeItem('history_st_sync_subject');
  if (unsubscribeSnapshot) {
    unsubscribeSnapshot();
    unsubscribeSnapshot = null;
  }
}

export async function pushStudyTrackerRecord(minutes: number, seconds: number, quizModeText: string): Promise<boolean> {
  const statusInfo = checkSyncStatus();
  if (!statusInfo.isConnected) {
    return false;
  }
  
  const database = await initFirebase();
  if (!database) {
    return false;
  }
  
  try {
    const docRef = doc(database, 'rooms', statusInfo.roomId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return false;
    }
    
    const remoteData = docSnap.data();
    const decryptedData = await decryptData(remoteData, statusInfo.password);
    
    if (!decryptedData) {
      return false;
    }
    
    let subjectId = localStorage.getItem('history_st_sync_subject');
    let subjects = decryptedData.subjects || [];
    
    if (!subjectId) {
      let historySub = subjects.find((s: any) => s.name === '歴史' || s.name === '社会');
      if (historySub) {
        subjectId = historySub.id;
      } else {
        subjectId = 'sub_history_' + Date.now();
        subjects.push({
          id: subjectId,
          name: '歴史',
          color: '#d97706',
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
    return false;
  }
}

export async function syncHistoryStatsToCloud(localStats: StatsMap): Promise<void> {
  const statusInfo = checkSyncStatus();
  if (!statusInfo.isConnected) return;
  
  const database = await initFirebase();
  if (!database) return;
  
  try {
    const docRef = doc(database, 'rooms', statusInfo.roomId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return;
    
    const remoteData = docSnap.data();
    const decryptedData = await decryptData(remoteData, statusInfo.password);
    if (!decryptedData) return;
    
    decryptedData.historyStats = localStats;
    const encrypted = await encryptData(decryptedData, statusInfo.password);
    await setDoc(docRef, encrypted);
  } catch (e) {
    console.error("Cloud sync failed:", e);
  }
}

export async function setupRealtimeSync(onUpdated?: (stats: StatsMap) => void): Promise<void> {
  const statusInfo = checkSyncStatus();
  if (!statusInfo.isConnected) return;
  
  const database = await initFirebase();
  if (!database) return;
  
  const docRef = doc(database, 'rooms', statusInfo.roomId);
  
  if (unsubscribeSnapshot) {
    unsubscribeSnapshot();
  }
  
  unsubscribeSnapshot = onSnapshot(docRef, async (docSnap) => {
    if (!docSnap.exists()) return;
    
    const remoteData = docSnap.data();
    const decryptedData = await decryptData(remoteData, statusInfo.password);
    if (!decryptedData || !decryptedData.historyStats) return;
    
    const remoteStats = decryptedData.historyStats;
    const localStatsStr = localStorage.getItem('history_quiz_stats_v3');
    let localStats: StatsMap = localStatsStr ? JSON.parse(localStatsStr) : {};
    
    let hasChanges = false;
    
    if (Object.keys(remoteStats).length === 0 && Object.keys(localStats).length > 0) {
      localStats = {};
      hasChanges = true;
    } else {
      for (const key in remoteStats) {
        if (!localStats[key]) {
          localStats[key] = remoteStats[key];
          hasChanges = true;
        } else {
          const maxCorrect = Math.max(localStats[key].correct || 0, remoteStats[key].correct || 0);
          const maxWrong = Math.max(localStats[key].wrong || 0, remoteStats[key].wrong || 0);
          const localStreak = typeof localStats[key].streak === 'number' ? localStats[key].streak : (localStats[key].correct >= 3 ? 3 : 0);
          const remoteStreak = typeof remoteStats[key].streak === 'number' ? remoteStats[key].streak : (remoteStats[key].correct >= 3 ? 3 : 0);
          const maxStreak = Math.max(localStreak, remoteStreak);
          const isWeak = (remoteStats[key].isWeak !== undefined) ? remoteStats[key].isWeak : (maxStreak < 3 && maxWrong > 0);

          if (localStats[key].correct !== maxCorrect || 
              localStats[key].wrong !== maxWrong || 
              localStats[key].streak !== maxStreak ||
              localStats[key].isWeak !== isWeak) {
            localStats[key] = {
              correct: maxCorrect,
              wrong: maxWrong,
              streak: maxStreak,
              isWeak: isWeak
            };
            hasChanges = true;
          }
        }
      }
    }
    
    if (hasChanges) {
      localStorage.setItem('history_quiz_stats_v3', JSON.stringify(localStats));
      if (onUpdated) {
        onUpdated(localStats);
      }
    }
  });
}
