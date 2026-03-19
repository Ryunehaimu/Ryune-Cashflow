import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, where, serverTimestamp, orderBy, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export type Wallet = {
  id?: string;
  userId: string;
  name: string;
  balance: number;
  currency: string;
};

export type Transaction = {
  id?: string;
  userId: string;
  walletId: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  description: string;
  date: any; // Firestore Timestamp
};

export type Debt = {
  id?: string;
  userId: string;
  amount: number;
  person: string;
  description?: string;
  type: 'given' | 'taken'; // given = they owe you, taken = you owe them
  isPaid: boolean;
  date: any;
};

// WALLETS
export const addWallet = async (wallet: Omit<Wallet, 'id'>) => {
  const colRef = collection(db, 'wallets');
  return await addDoc(colRef, wallet);
};

export const getWallets = async (userId: string) => {
  const q = query(collection(db, 'wallets'), where('userId', '==', userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Wallet));
};

export const getWalletById = async (walletId: string) => {
  const docSnap = await getDoc(doc(db, 'wallets', walletId));
  if (docSnap.exists()) return { id: docSnap.id, ...docSnap.data() } as Wallet;
  return null;
};

export const updateWalletBalance = async (walletId: string, newBalance: number) => {
  const docRef = doc(db, 'wallets', walletId);
  return await updateDoc(docRef, { balance: newBalance });
}

export const deleteWallet = async (id: string) => {
  await deleteDoc(doc(db, 'wallets', id));
};

// TRANSACTIONS
export const addTransaction = async (transaction: Omit<Transaction, 'id' | 'date'> & { date?: Date | any }, walletId: string) => {
  const colRef = collection(db, 'transactions');
  const payload = {
    ...transaction,
    date: transaction.date ? transaction.date : serverTimestamp(),
  };
  const newDocRef = await addDoc(colRef, payload);
  
  const walletRef = doc(db, 'wallets', walletId);
  const walletSnap = await getDoc(walletRef);
  
  if (walletSnap.exists()) {
    const currentBalance = walletSnap.data().balance || 0;
    const newBalance = transaction.type === 'income' 
      ? currentBalance + transaction.amount 
      : currentBalance - transaction.amount;
    await updateDoc(walletRef, { balance: newBalance });
  }
  
  return newDocRef;
};

export const getTransactions = async (userId: string) => {
  const q = query(collection(db, 'transactions'), where('userId', '==', userId), orderBy('date', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
};

export const getTransactionsByWallet = async (userId: string, walletId: string) => {
  const q = query(collection(db, 'transactions'), where('userId', '==', userId), orderBy('date', 'desc'));
  const snapshot = await getDocs(q);
  const all = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
  return all.filter(t => t.walletId === walletId);
};

// DEBTS
export const addDebt = async (debt: Omit<Debt, 'id' | 'date'> & { date?: Date | any }) => {
  const colRef = collection(db, 'debts');
  const payload = {
    ...debt,
    date: debt.date ? debt.date : serverTimestamp(),
  };
  return await addDoc(colRef, payload);
};

export const getDebts = async (userId: string) => {
  const q = query(collection(db, 'debts'), where('userId', '==', userId), orderBy('date', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Debt));
};

export const updateDebtStatus = async (id: string, isPaid: boolean) => {
  const docRef = doc(db, 'debts', id);
  return await updateDoc(docRef, { isPaid });
};

export const deleteDebt = async (id: string) => {
  await deleteDoc(doc(db, 'debts', id));
};
