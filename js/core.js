// Core Application JS
document.addEventListener('DOMContentLoaded', () => {
    console.log('Sadaqah Jariyah App Initialized');

    // Smooth transitions for glass cards
    const cards = document.querySelectorAll('.glass-panel');
    cards.forEach(card => {
        card.addEventListener('touchstart', () => {
            card.style.transform = 'scale(0.98)';
        });
        card.addEventListener('touchend', () => {
            card.style.transform = 'scale(1)';
        });
    });
});

// Offline Support Helper - IndexedDB Wrapper
const dbName = "SadaqahJariyahDB";
const dbVersion = 1;

async function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, dbVersion);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('quranData')) {
                db.createObjectStore('quranData');
            }
            if (!db.objectStoreNames.contains('tafsirData')) {
                db.createObjectStore('tafsirData');
            }
        };

        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (event) => reject(event.target.error);
    });
}

async function saveToCache(storeName, key, data) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        store.put(data, key);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
}

async function getFromCache(storeName, key) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Global helpers for Quran and Tafsir data
async function getQuranData() {
    const data = await getFromCache('quranData', 'fullQuran');
    return data ? data.surahs : null;
}


async function saveTafsirToDB(id, data) {
    return await saveToCache('tafsirData', id, { data });
}


async function getTafsirFromDB(id) {
    return await getFromCache('tafsirData', id);
}

