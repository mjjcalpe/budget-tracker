'use client'
import { useState, useEffect } from 'react'
import { db, auth, provider } from '../lib/firebase'
import { collection, addDoc, onSnapshot, query, where, orderBy, deleteDoc, doc, setDoc } from 'firebase/firestore'
import { 
  signInWithPopup, 
  onAuthStateChanged, 
  signOut, 
  User, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  updateProfile 
} from 'firebase/auth'

export default function CleanVault() {
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [authError, setAuthError] = useState('');

  const [list, setList] = useState<any[]>([]);
  const [budget, setBudget] = useState(2000);
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [tempBudget, setTempBudget] = useState('');
  
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState<'expense' | 'savings'>('expense');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  // Sync Budget Settings
  useEffect(() => {
    if (!user) return;
    const budgetRef = doc(db, "settings", user.uid);
    return onSnapshot(budgetRef, (docSnap) => {
      if (docSnap.exists()) {
        setBudget(docSnap.data().monthlyBudget);
        setTempBudget(docSnap.data().monthlyBudget.toString());
      }
    });
  }, [user]);

  // Sync Expenses
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "expenses"), where("uid", "==", user.uid), orderBy("date", "desc"));
    return onSnapshot(q, (snapshot) => {
      setList(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, [user]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      setAuthError(err.message.replace('Firebase:', ''));
    }
  };

  const saveBudget = async () => {
    if (!user || !tempBudget) return;
    await setDoc(doc(db, "settings", user.uid), { monthlyBudget: parseFloat(tempBudget) }, { merge: true });
    setIsEditingBudget(false);
  };

  const saveEntry = async () => {
    if (!label || !amount || !user) return;
    await addDoc(collection(db, "expenses"), {
      label, amount: parseFloat(amount), date: selectedDate, isSavings: mode === 'savings', uid: user.uid, createdAt: Date.now()
    });
    setLabel(''); setAmount('');
  };

  if (!user) return (
    <div className="h-screen bg-black flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm bg-zinc-900 p-8 rounded-3xl border border-zinc-800 shadow-2xl">
        <h1 className="text-3xl font-black text-blue-500 mb-6 text-center tracking-tighter">Budget Tracker</h1>
        
        <form onSubmit={handleEmailAuth} className="space-y-4">
          <input 
            type="email" placeholder="Email" className="w-full bg-zinc-800 p-3 rounded-xl outline-none text-sm"
            value={email} onChange={e => setEmail(e.target.value)} required
          />
          <input 
            type="password" placeholder="Password" className="w-full bg-zinc-800 p-3 rounded-xl outline-none text-sm"
            value={password} onChange={e => setPassword(e.target.value)} required
          />
          {authError && <p className="text-red-500 text-[10px] text-center">{authError}</p>}
          <button type="submit" className="w-full bg-blue-600 py-3 rounded-xl font-bold uppercase tracking-widest text-xs">
            {isRegistering ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button onClick={() => setIsRegistering(!isRegistering)} className="text-zinc-500 text-[10px] uppercase font-bold hover:text-white">
            {isRegistering ? 'Already have an account? Login' : 'Need an account? Register'}
          </button>
        </div>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-zinc-800"></span></div>
          <div className="relative flex justify-center text-[10px] uppercase font-bold text-zinc-600"><span className="bg-zinc-900 px-2">Or</span></div>
        </div>

        <button onClick={() => signInWithPopup(auth, provider)} className="w-full bg-white text-black py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2">
          Continue with Google
        </button>
      </div>
    </div>
  );

  const totalSpent = list.filter(i => !i.isSavings).reduce((a, b) => a + b.amount, 0);
  const totalSavings = list.filter(i => i.isSavings).reduce((a, b) => a + b.amount, 0);
  const remaining = budget - totalSpent;

  return (
    <main className="p-4 max-w-4xl mx-auto text-white bg-black min-h-screen text-[11px]">
      {/* TOP NAVBAR */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-black text-blue-500">Budget Tracker</h1>
        <div className="flex items-center gap-4">
          <span className="text-zinc-500 uppercase font-bold text-[9px]">{user.email?.split('@')[0]}</span>
          <button onClick={() => signOut(auth)} className="bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg text-zinc-500 font-bold">LOGOUT</button>
        </div>
      </div>

      {/* REMAINDER OF UI (Budget Cards, Calendar, Inputs) - Same as previous version */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className={`p-4 rounded-2xl border ${remaining < 0 ? 'border-red-500 bg-red-500/5' : 'border-zinc-800 bg-zinc-900'}`}>
          <div className="flex justify-between items-start">
            <span className="text-zinc-500 font-bold uppercase text-[9px]">Remaining</span>
            <button onClick={() => setIsEditingBudget(true)} className="text-blue-500">Edit</button>
          </div>
          {isEditingBudget ? (
            <input 
              autoFocus className="bg-transparent text-xl font-black w-full outline-none border-b border-blue-500"
              value={tempBudget} onChange={e => setTempBudget(e.target.value)} onBlur={saveBudget}
            />
          ) : (
            <p className={`text-2xl font-black ${remaining < 0 ? 'text-red-500' : 'text-green-500'}`}>${remaining.toFixed(0)}</p>
          )}
        </div>
        <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800">
          <span className="text-zinc-500 font-bold uppercase text-[9px]">Total Savings</span>
          <p className="text-2xl font-black text-blue-400">${totalSavings.toFixed(0)}</p>
        </div>
      </div>

      {/* CALENDAR & INPUTS (Copying from previous logic to ensure it's complete) */}
      <div className="flex gap-4 mb-4 justify-center items-center bg-zinc-900/50 p-2 rounded-xl border border-zinc-800/50">
        <select value={viewMonth} onChange={(e) => setViewMonth(Number(e.target.value))} className="bg-transparent font-bold outline-none">
          {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((m, i) => <option key={m} value={i} className="bg-zinc-900">{m}</option>)}
        </select>
        <select value={viewYear} onChange={(e) => setViewYear(Number(e.target.value))} className="bg-transparent font-bold outline-none">
          {[2024, 2025, 2026].map(y => <option key={y} value={y} className="bg-zinc-900">{y}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-6">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={i} className="text-center text-zinc-700 font-bold text-[8px] mb-1">{d}</div>)}
        {Array.from({ length: new Date(viewYear, viewMonth, 1).getDay() }).map((_, i) => <div key={`e-${i}`} />)}
        {Array.from({ length: new Date(viewYear, viewMonth + 1, 0).getDate() }).map((_, i) => {
          const d = `${viewYear}-${(viewMonth + 1).toString().padStart(2, '0')}-${(i + 1).toString().padStart(2, '0')}`;
          const dayTotal = list.filter(item => item.date === d && !item.isSavings).reduce((a, b) => a + b.amount, 0);
          return (
            <button key={i} onClick={() => setSelectedDate(d)} className={`h-10 rounded-lg flex flex-col items-center justify-center border ${selectedDate === d ? 'border-blue-500 bg-blue-500/10' : 'border-zinc-800 bg-zinc-950'}`}>
              <span className="font-bold text-[9px]">{i + 1}</span>
              {dayTotal > 0 && <span className="text-[7px] text-red-500 font-bold">-{dayTotal.toFixed(0)}</span>}
            </button>
          );
        })}
      </div>

      <div className="bg-zinc-900 p-4 rounded-3xl border border-zinc-800 space-y-4">
        <div className="flex p-1 bg-black rounded-xl border border-zinc-800">
          <button onClick={() => setMode('expense')} className={`flex-1 py-2 rounded-lg font-bold ${mode === 'expense' ? 'bg-zinc-800 text-red-400' : 'text-zinc-600'}`}>EXPENSE</button>
          <button onClick={() => setMode('savings')} className={`flex-1 py-2 rounded-lg font-bold ${mode === 'savings' ? 'bg-zinc-800 text-blue-400' : 'text-zinc-600'}`}>SAVINGS</button>
        </div>
        <div className="flex gap-2">
          <input className="flex-1 bg-zinc-800 p-3 rounded-xl outline-none" placeholder="Description" value={label} onChange={e => setLabel(e.target.value)} />
          <input type="number" className="w-20 bg-zinc-800 p-3 rounded-xl outline-none" placeholder="0" value={amount} onChange={e => setAmount(e.target.value)} />
          <button onClick={saveEntry} className="px-4 rounded-xl font-black bg-blue-600">SAVE</button>
        </div>
        <div className="space-y-1">
          {list.filter(i => i.date === selectedDate).map(item => (
            <div key={item.id} className="bg-black/40 p-2 px-3 rounded-xl flex justify-between border border-transparent hover:border-zinc-800">
              <span className="text-zinc-300">{item.label} {item.isSavings && <span className="text-blue-500 ml-1">●</span>}</span>
              <span className={`font-mono font-bold ${item.isSavings ? 'text-blue-400' : 'text-zinc-100'}`}>${item.amount.toFixed(0)}</span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}