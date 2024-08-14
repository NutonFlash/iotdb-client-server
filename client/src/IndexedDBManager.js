import Logger from "./Logger";

class IndexedDBManager {
  constructor(dbName, storeName) {
    this.dbName = dbName;
    this.storeName = storeName;
    this.db = null;
  }

  // Initialize the IndexedDB database and create the object store
  init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onupgradeneeded = (event) => {
        this.db = event.target.result;
        if (!this.db.objectStoreNames.contains(this.storeName)) {
          this.db.createObjectStore(this.storeName, { keyPath: "id" });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        Logger.info('DBManager', 'IndexedDB initialized')
        resolve();
      };

      request.onerror = (event) => {
        reject(`IndexedDB initialization error: ${event.target.errorCode}`);
      };
    });
  }

  // Destroy the IndexedDB database
  destroy() {
    return new Promise((resolve, reject) => {
      this.close(); // Close the database connection before deleting

      const request = indexedDB.deleteDatabase(this.dbName);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = (event) => {
        reject(`IndexedDB destroy error: ${event.target.errorCode}`);
      };
    });
  }

  // Close the database connection
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  // Write data to the IndexedDB object store
  write(id, data) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(this.storeName, "readwrite");
      const store = transaction.objectStore(this.storeName);

      store.put({ id, data });

      transaction.oncomplete = () => {
        Logger.info('DBManager', `Write collection of ${data.length} points to ${id}`);
        resolve();
      };

      transaction.onerror = (event) => {
        Logger.error('DBManager',`IndexedDB write error: ${event.target.errorCode}`);
        reject();
      };
    });
  }

  // Read data from the IndexedDB object store
  read(id) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(this.storeName, "readonly");
      const store = transaction.objectStore(this.storeName);

      const request = store.get(id);

      request.onsuccess = (event) => {
        if (request.result) {
          resolve(request.result.data);
        } else {
          resolve(null); // Return null if the data does not exist
        }
      };

      request.onerror = (event) => {
        reject(`IndexedDB read error: ${event.target.errorCode}`);
      };
    });
  }

  // Delete data from the IndexedDB object store
  delete(id) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(this.storeName, "readwrite");
      const store = transaction.objectStore(this.storeName);

      const request = store.delete(id);

      transaction.oncomplete = () => {
        resolve();
      };

      transaction.onerror = (event) => {
        reject(`IndexedDB delete error: ${event.target.errorCode}`);
      };
    });
  }
}

export default IndexedDBManager;
