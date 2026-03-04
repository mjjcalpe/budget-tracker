'use client'
import { useState, useEffect } from 'react'
import { db, auth, provider } from '../lib/firebase'
import { collection, addDoc, onSnapshot, query, where, orderBy, deleteDoc, doc, setDoc, updateDoc } from 'firebase/firestore'
import { 
  signInWithPopup, 
  onAuthStateChanged, 
  signOut, 
  User, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword 
} from 'firebase/auth'

export default function CleanVault() {
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [authError, setAuthError] = useState('');

  const [list, setList] = useState<any[]>([]);
  const [budget, setBudget] = useState(2000);
  const [savings, setSavings] = useState(0); // New state for editable savings
  
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [isEditingSavings, setIsEditingSavings] = useState(false);
  
  const [tempBudget, setTempBudget] = useState('');
  const [tempSavings, setTempSavings] = useState('');
  
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const formatPHP = (num: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  // Sync Settings (Budget & Savings)
  useEffect(() => {
    if (!user) return;
    const settingsRef = doc(db, "settings", user.uid);
    return onSnapshot(settingsRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setBudget(data.monthlyBudget || 0);
        setTempBudget((data.monthlyBudget || 0).toString());
        setSavings(data.totalSavings || 0);
        setTempSavings((data.totalSavings || 0).toString());
      }
    });
  }, [user]);

  // Sync Expenses Only
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

  const saveSettings = async (type: 'budget' | 'savings') => {
    if (!user) return;
    const updateData = type === 'budget' 
      ? { monthlyBudget: parseFloat(tempBudget) || 0 }
      : { totalSavings: parseFloat(tempSavings) || 0 };
    
    await setDoc(doc(db, "settings", user.uid), updateData, { merge: true });
    type === 'budget' ? setIsEditingBudget(false) : setIsEditingSavings(false);
  };

  const saveExpense = async () => {
    if (!label || !amount || !user) return;
    const data = {
      label, 
      amount: parseFloat(amount), 
      date: selectedDate, 
      uid: user.uid, 
      updatedAt: Date.now()
    };

    if (editingId) {
      await updateDoc(doc(db, "expenses", editingId), data);
      setEditingId(null);
    } else {
      await addDoc(collection(db, "expenses"), { ...data, createdAt: Date.now() });
    }
    setLabel(''); setAmount('');
  };

  const deleteExpense = async (id: string) => {
    if (confirm("Delete this expense?")) {
      await deleteDoc(doc(db, "expenses", id));
    }
  };

  if (!user) return (
    <div className="h-screen bg-black flex flex-col items-center justify-center p-6 text-white">
      <div className="w-full max-w-sm bg-zinc-900 p-8 rounded-3xl border border-zinc-800 shadow-2xl">
        <h1 className="text-3xl font-black text-blue-500 mb-6 text-center tracking-tighter">Budget Tracker</h1>
        <form onSubmit={handleEmailAuth} className="space-y-4">
          <input type="email" placeholder="Email" className="w-full bg-zinc-800 p-3 rounded-xl outline-none text-sm" value={email} onChange={e => setEmail(e.target.value)} required />
          <input type="password" placeholder="Password" className="w-full bg-zinc-800 p-3 rounded-xl outline-none text-sm" value={password} onChange={e => setPassword(e.target.value)} required />
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
        <div className="relative my-6"><div className="absolute inset-0 flex items-center"><span className="w-full border-t border-zinc-800"></span></div><div className="relative flex justify-center text-[10px] uppercase font-bold text-zinc-600"><span className="bg-zinc-900 px-2">Or</span></div></div>
        <button onClick={() => signInWithPopup(auth, provider)} className="w-full bg-white text-black py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2">Continue with Google</button>
      </div>
    </div>
  );

  const totalSpent = list.reduce((a, b) => a + b.amount, 0);
  const remaining = budget - totalSpent;

  return (
    <main className="p-4 max-w-4xl mx-auto text-white bg-black min-h-screen text-[11px]">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-black text-blue-500 tracking-tighter">Vault Tracker</h1>
        <div className="flex items-center gap-4">
          <span className="text-zinc-500 uppercase font-bold text-[9px]">{user.email?.split('@')[0]}</span>
          <button onClick={() => signOut(auth)} className="bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg text-zinc-500 font-bold hover:text-white">LOGOUT</button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        {/* REMAINING CARD */}
        <div className={`p-4 rounded-2xl border ${remaining < 0 ? 'border-red-500 bg-red-500/5' : 'border-zinc-800 bg-zinc-900'}`}>
          <div className="flex justify-between items-start">
            <span className="text-zinc-500 font-bold uppercase text-[9px]">Remaining</span>
            <button onClick={() => setIsEditingBudget(true)} className="text-blue-500 text-[9px] uppercase font-bold hover:underline">Edit</button>
          </div>
          {isEditingBudget ? (
            <input autoFocus className="bg-transparent text-xl font-black w-full outline-none border-b border-blue-500" value={tempBudget} onChange={e => setTempBudget(e.target.value)} onBlur={() => saveSettings('budget')} />
          ) : (
            <p className={`text-2xl font-black ${remaining < 0 ? 'text-red-500' : 'text-green-500'}`}>{formatPHP(remaining)}</p>
          )}
        </div>

        {/* EDITABLE SAVINGS CARD */}
        <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800">
          <div className="flex justify-between items-start">
            <span className="text-zinc-500 font-bold uppercase text-[9px]">Total Savings</span>
            <button onClick={() => setIsEditingSavings(true)} className="text-blue-400 text-[9px] uppercase font-bold hover:underline">Edit</button>
          </div>
          {isEditingSavings ? (
            <input autoFocus className="bg-transparent text-xl font-black w-full outline-none border-b border-blue-400" value={tempSavings} onChange={e => setTempSavings(e.target.value)} onBlur={() => saveSettings('savings')} />
          ) : (
            <p className="text-2xl font-black text-blue-400">{formatPHP(savings)}</p>
          )}
        </div>
      </div>

      {/* CALENDAR */}
      <div className="flex gap-4 mb-4 justify-center items-center bg-zinc-900/50 p-2 rounded-xl border border-zinc-800/50">
        <select value={viewMonth} onChange={(e) => setViewMonth(Number(e.target.value))} className="bg-transparent font-bold outline-none cursor-pointer">
          {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((m, i) => <option key={m} value={i} className="bg-zinc-900">{m}</option>)}
        </select>
        <select value={viewYear} onChange={(e) => setViewYear(Number(e.target.value))} className="bg-transparent font-bold outline-none cursor-pointer">
          {[2024, 2025, 2026].map(y => <option key={y} value={y} className="bg-zinc-900">{y}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-6">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={i} className="text-center text-zinc-700 font-bold text-[8px] mb-1">{d}</div>)}
        {Array.from({ length: new Date(viewYear, viewMonth, 1).getDay() }).map((_, i) => <div key={`e-${i}`} />)}
        {Array.from({ length: new Date(viewYear, viewMonth + 1, 0).getDate() }).map((_, i) => {
          const d = `${viewYear}-${(viewMonth + 1).toString().padStart(2, '0')}-${(i + 1).toString().padStart(2, '0')}`;
          const dayTotal = list.filter(item => item.date === d).reduce((a, b) => a + b.amount, 0);
          return (
            <button key={i} onClick={() => setSelectedDate(d)} className={`h-10 rounded-lg flex flex-col items-center justify-center border transition-all ${selectedDate === d ? 'border-blue-500 bg-blue-500/10' : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700'}`}>
              <span className="font-bold text-[9px]">{i + 1}</span>
              {dayTotal > 0 && <span className="text-[7px] text-red-500 font-bold">-{dayTotal}</span>}
            </button>
          );
        })}
      </div>

      {/* INPUT SECTION (Expenses Only Now) */}
      <div className="bg-zinc-900 p-4 rounded-3xl border border-zinc-800 space-y-4 shadow-xl">
        <div className="flex gap-2">
          <input className="flex-1 bg-zinc-800 p-3 rounded-xl outline-none border border-transparent focus:border-zinc-700" placeholder="What did you buy?" value={label} onChange={e => setLabel(e.target.value)} />
          <input type="number" className="w-24 bg-zinc-800 p-3 rounded-xl outline-none border border-transparent focus:border-zinc-700" placeholder="Amount" value={amount} onChange={e => setAmount(e.target.value)} />
          <button onClick={saveExpense} className="px-5 rounded-xl font-black bg-blue-600 text-[10px] uppercase tracking-tighter active:scale-95 transition-transform">
            {editingId ? 'Update' : 'Add Expense'}
          </button>
          {editingId && <button onClick={() => {setEditingId(null); setLabel(''); setAmount('');}} className="px-2 text-zinc-500 hover:text-white transition-colors">✕</button>}
        </div>

        <div className="space-y-1">
          <p className="text-zinc-600 font-bold uppercase text-[8px] mb-2 px-1">Transactions for {selectedDate}</p>
          {list.filter(i => i.date === selectedDate).length === 0 && <p className="text-zinc-700 italic px-1">No expenses recorded today.</p>}
          {list.filter(i => i.date === selectedDate).map(item => (
            <div key={item.id} className="group bg-black/40 p-2 px-3 rounded-xl flex justify-between items-center border border-transparent hover:border-zinc-800 transition-colors">
              <div className="flex flex-col">
                <span className="text-zinc-300 font-medium">{item.label}</span>
                <div className="flex gap-3 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button onClick={() => { setEditingId(item.id); setLabel(item.label); setAmount(item.amount.toString()); }} className="text-blue-500 text-[8px] font-bold uppercase tracking-widest hover:underline">Edit</button>
                   <button onClick={() => deleteExpense(item.id)} className="text-red-500 text-[8px] font-bold uppercase tracking-widest hover:underline">Delete</button>
                </div>
              </div>
              <span className="font-mono font-bold text-zinc-100">{formatPHP(item.amount)}</span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}