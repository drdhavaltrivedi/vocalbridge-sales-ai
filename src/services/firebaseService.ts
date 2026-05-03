import { 
  collection, 
  addDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  getDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Client, Call, KnowledgeBaseDoc, OperationType, Settings, KnowledgeCategory } from '../types';

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const firebaseService = {
  // Clients
  async getClients() {
    const path = 'clients';
    try {
      const q = query(collection(db, path), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Client));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  },

  async addClient(client: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) {
    const path = 'clients';
    try {
      const docRef = await addDoc(collection(db, path), {
        ...client,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  async updateClient(id: string, updates: Partial<Client>) {
    const path = `clients/${id}`;
    try {
      const docRef = doc(db, 'clients', id);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async deleteClient(id: string) {
    const path = `clients/${id}`;
    try {
      await deleteDoc(doc(db, 'clients', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  // Calls
  async getCalls() {
    const path = 'calls';
    try {
      const q = query(collection(db, path), orderBy('startTime', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Call));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  },

  async addCall(call: Omit<Call, 'id'>) {
    const path = 'calls';
    try {
      const docRef = await addDoc(collection(db, path), {
        ...call,
        startTime: serverTimestamp(),
      });
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  async getCallsByClientId(clientId: string) {
    const path = 'calls';
    try {
      const q = query(
        collection(db, path),
        where('clientId', '==', clientId),
        orderBy('startTime', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Call));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  },

  async updateCall(id: string, updates: Partial<Call>) {
    const path = `calls/${id}`;
    try {
      const docRef = doc(db, 'calls', id);
      await updateDoc(docRef, updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  // Knowledge Base
  async getKnowledgeBase() {
    const path = 'knowledge_base';
    try {
      const snapshot = await getDocs(collection(db, path));
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as KnowledgeBaseDoc));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  },

  async addKnowledgeBaseDoc(doc: Omit<KnowledgeBaseDoc, 'id' | 'lastUpdated'>) {
    const path = 'knowledge_base';
    try {
      const docRef = await addDoc(collection(db, path), {
        ...doc,
        lastUpdated: serverTimestamp(),
      });
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  async updateKnowledgeBaseDoc(id: string, updates: Partial<KnowledgeBaseDoc>) {
    const path = `knowledge_base/${id}`;
    try {
      const docRef = doc(db, 'knowledge_base', id);
      await updateDoc(docRef, {
        ...updates,
        lastUpdated: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async deleteKnowledgeBaseDoc(id: string) {
    const path = `knowledge_base/${id}`;
    try {
      await deleteDoc(doc(db, 'knowledge_base', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  // Knowledge Categories
  async getCategories() {
    const path = 'knowledge_categories';
    try {
      const q = query(collection(db, path), orderBy('name', 'asc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as KnowledgeCategory));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  },

  async addCategory(cat: Omit<KnowledgeCategory, 'id'>) {
    const path = 'knowledge_categories';
    try {
      const docRef = await addDoc(collection(db, path), cat);
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  async updateCategory(id: string, updates: Partial<KnowledgeCategory>) {
    const path = `knowledge_categories/${id}`;
    try {
      const docRef = doc(db, 'knowledge_categories', id);
      await updateDoc(docRef, updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async deleteCategory(id: string) {
    const path = `knowledge_categories/${id}`;
    try {
      await deleteDoc(doc(db, 'knowledge_categories', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  // Settings
  async getSettings() {
    const path = 'settings';
    try {
      const snapshot = await getDocs(collection(db, path));
      if (snapshot.empty) return null;
      const d = snapshot.docs[0];
      return { id: d.id, ...d.data() } as Settings;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  },

  async updateSettings(id: string, updates: Partial<Settings>) {
    const path = `settings/${id}`;
    try {
      const docRef = doc(db, 'settings', id);
      await setDoc(docRef, {
        ...updates,
        lastUpdated: serverTimestamp(),
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }
};
