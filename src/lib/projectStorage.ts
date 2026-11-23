import type { FrameFinish, FrameGridId, StudioMode, StudioParams } from '../engine/types';

const DB_NAME = 'polypet-studio-db';
const DB_VERSION = 1;
const STORE_NAME = 'projects';
const ACTIVE_KEY = 'current-session';

export interface SavedStudioProject {
  imageDataUrl: string;
  imageLabel: string;
  brushMap: number[];
  bgMaskMap?: number[];
  brushWidth: number;
  brushHeight: number;
  params: StudioParams;
  mode: StudioMode;
  frameGrid: FrameGridId;
  gutterPercent: number;
  frameFinish: FrameFinish;
  savedAt: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveProjectToIndexedDB(project: SavedStudioProject): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(project, ACTIVE_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Gracefully skip if browser disables IndexedDB (e.g., private iframe restrictions)
  }
}

export async function loadProjectFromIndexedDB(): Promise<SavedStudioProject | null> {
  try {
    const db = await openDb();
    const result = await new Promise<SavedStudioProject | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(ACTIVE_KEY);
      req.onsuccess = () => resolve((req.result as SavedStudioProject | undefined) ?? null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return result;
  } catch {
    return null;
  }
}
