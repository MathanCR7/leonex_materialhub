// public/sw.js

const CACHE_NAME = 'materialhub-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  // Add paths to your main JS/CSS bundles if you know them,
  // otherwise, we will cache them dynamically.
];

// --- IndexedDB Configuration ---
const DB_NAME = 'MaterialHubDB';
const DB_VERSION = 1;
const STORE_NAME = 'pendingSubmissions';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = (event) => reject('IndexedDB error: ' + request.error);
    request.onsuccess = (event) => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      db.createObjectStore(STORE_NAME, { keyPath: 'id' });
    };
  });
}

// --- Service Worker Lifecycle ---

self.addEventListener('install', (event) => {
  console.log('[SW] Install');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching app shell');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activate');
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Removing old cache', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// --- Network & Caching Strategy ---

self.addEventListener('fetch', (event) => {
  // We only cache GET requests for assets
  if (event.request.method !== 'GET') {
    return;
  }
  
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).then((fetchResponse) => {
        return caches.open(CACHE_NAME).then((cache) => {
          // Don't cache API responses
          if (!event.request.url.includes('/api/')) {
            cache.put(event.request, fetchResponse.clone());
          }
          return fetchResponse;
        });
      });
    }).catch(() => {
        // Fallback for when both cache and network fail (e.g., for an uncached page offline)
        // You could return a custom offline.html page here if you had one.
    })
  );
});

// --- Background Sync Logic ---

self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered', event);
  if (event.tag === 'sync-new-submissions') {
    event.waitUntil(syncSubmissions());
  }
});

async function syncSubmissions() {
  console.log('[SW] Starting submission sync...');
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  const pendingSubmissions = await new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
  });

  if (pendingSubmissions.length === 0) {
    console.log('[SW] No pending submissions to sync.');
    return;
  }

  console.log(`[SW] Found ${pendingSubmissions.length} pending submissions.`);

  for (const submission of pendingSubmissions) {
    try {
      const formData = new FormData();
      
      // Append text data
      for (const key in submission.formData) {
        formData.append(key, submission.formData[key]);
      }
      
      // Append "good media" files
      for (const key in submission.files.goodMedia) {
        const file = submission.files.goodMedia[key];
        if (file instanceof File) {
            formData.append(key, file, file.name);
        }
      }

      // Append "defect media" files
      for (const key in submission.files.defectMedia) {
        const fileList = submission.files.defectMedia[key];
        if (Array.isArray(fileList)) {
            fileList.forEach(file => {
                if (file instanceof File) {
                    formData.append(key, file, file.name);
                }
            });
        }
      }
      
      // Determine the API endpoint (create vs update)
      const apiUrl = submission.isUpdate 
        ? `/api/material-data/update/${submission.submissionId}` 
        : '/api/material-data/submit';
      
      const response = await fetch(apiUrl, {
        method: submission.isUpdate ? 'PUT' : 'POST',
        body: formData,
        // We don't set Content-Type header; the browser does it for FormData with files
      });

      if (response.ok) {
        console.log(`[SW] Successfully submitted offline entry ${submission.id}`);
        const deleteTx = db.transaction(STORE_NAME, 'readwrite');
        await deleteTx.objectStore(STORE_NAME).delete(submission.id);
        
        // Notify the client/tab that a sync was successful
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
            client.postMessage({
                type: 'SYNC_SUCCESS',
                message: `Submission for ${submission.formData.material_code} was successfully uploaded.`,
            });
        });

      } else {
        console.error(`[SW] Failed to submit offline entry ${submission.id}. Server responded with ${response.status}`);
        // The entry remains in IndexedDB to be retried later.
      }
    } catch (error) {
      console.error(`[SW] Network error during sync for submission ${submission.id}:`, error);
      // We are offline again or the server is down. Break the loop and wait for the next sync event.
      return; 
    }
  }
}