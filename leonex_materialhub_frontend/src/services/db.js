// src/services/db.js

const DB_NAME = 'MaterialHubDB';
const DB_VERSION = 1;
const STORE_NAME = 'pendingSubmissions';

let db;

function initDB() {
  return new Promise((resolve, reject) => {
    if (db) {
      return resolve(db);
    }
    console.log('Opening IndexedDB...');
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error('IndexedDB error:', request.error);
      reject('IndexedDB error: ' + request.error);
    };

    request.onsuccess = (event) => {
      db = event.target.result;
      console.log('IndexedDB opened successfully.');
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      console.log('Upgrading IndexedDB...');
      const dbInstance = event.target.result;
      if (!dbInstance.objectStoreNames.contains(STORE_NAME)) {
        dbInstance.createObjectStore(STORE_NAME, { keyPath: 'id' });
        console.log('Object store "pendingSubmissions" created.');
      }
    };
  });
}

export async function addPendingSubmission(submission) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.add(submission);
    tx.oncomplete = () => resolve();
    tx.onerror = (event) => reject(event.target.error);
  });
}