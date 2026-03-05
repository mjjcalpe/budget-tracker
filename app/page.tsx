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
  const [savings, setSavings] = useState(0);
  
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
    <div className="h-screen bg-black flex flex-col items-center justify-center p-6 text-white font-sans">
      <div className="w-full max-w-sm bg-zinc-900 p-8 rounded-3xl border border-zinc-800 shadow-2xl">
        <h1 className="text-3xl font-black text-blue-500 mb-6 text-center tracking-tighter uppercase">Vault</h1>
        
        <form onSubmit={handleEmailAuth} className="space-y-4">
          <input type="email" placeholder="Email" className="w-full bg-zinc-800 p-4 rounded-xl outline-none text-sm border border-transparent focus:border-blue-500/50" value={email} onChange={e => setEmail(e.target.value)} required />
          <input type="password" placeholder="Password" className="w-full bg-zinc-800 p-4 rounded-xl outline-none text-sm border border-transparent focus:border-blue-500/50" value={password} onChange={e => setPassword(e.target.value)} required />
          {authError && <p className="text-red-500 text-[10px] text-center font-bold uppercase">{authError}</p>}
          <button type="submit" className="w-full bg-blue-600 py-4 rounded-xl font-bold uppercase tracking-widest text-xs active:scale-95 transition-transform">
            {isRegistering ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <button onClick={() => setIsRegistering(!isRegistering)} className="w-full mt-4 text-zinc-500 text-[9px] uppercase font-black hover:text-white tracking-widest">
          {isRegistering ? 'Already have an account? Login' : 'Need an account? Register'}
        </button>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-zinc-800"></span></div>
          <div className="relative flex justify-center text-[9px] uppercase font-black text-zinc-600">
            <span className="bg-zinc-900 px-3 tracking-widest">Or</span>
          </div>
        </div>

        {/* GOOGLE SIGN IN RESTORED */}
        <button 
          onClick={() => signInWithPopup(auth, provider)} 
          className="w-full bg-white text-black py-4 rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-transform"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Continue with Google
        </button>
      </div>
    </div>
  );
  const totalSpent = list.reduce((a, b) => a + b.amount, 0);
  const remaining = budget - totalSpent;
  const selectedDateExpenses = list.filter(i => i.date === selectedDate);
  const otherExpenses = list.filter(i => i.date !== selectedDate);

  return (
    <main className="p-4 max-w-4xl mx-auto text-white bg-black min-h-screen text-[11px] font-sans">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-black text-blue-500 tracking-tighter uppercase">Vault</h1>
        <div className="flex items-center gap-4">
          <span className="text-zinc-500 uppercase font-bold text-[9px]">{user.email?.split('@')[0]}</span>
          <button onClick={() => signOut(auth)} className="bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg text-zinc-500 font-bold hover:text-white">LOGOUT</button>
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className={`p-4 rounded-2xl border ${remaining < 0 ? 'border-red-500 bg-red-500/5' : 'border-zinc-800 bg-zinc-900'}`}>
          <div className="flex justify-between items-start mb-1">
            <span className="text-zinc-500 font-bold uppercase text-[9px]">Remaining</span>
            <button onClick={() => setIsEditingBudget(true)} className="text-blue-500 text-[9px] uppercase font-bold">Edit</button>
          </div>
          {isEditingBudget ? (
            <input autoFocus className="bg-transparent text-xl font-black w-full outline-none border-b border-blue-500" value={tempBudget} onChange={e => setTempBudget(e.target.value)} onBlur={() => saveSettings('budget')} />
          ) : (
            <p className={`text-2xl font-black ${remaining < 0 ? 'text-red-500' : 'text-green-500'}`}>{formatPHP(remaining)}</p>
          )}
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800">
          <div className="flex justify-between items-start mb-1">
            <span className="text-zinc-500 font-bold uppercase text-[9px]">Savings</span>
            <button onClick={() => setIsEditingSavings(true)} className="text-blue-400 text-[9px] uppercase font-bold">Edit</button>
          </div>
          {isEditingSavings ? (
            <input autoFocus className="bg-transparent text-xl font-black w-full outline-none border-b border-blue-400" value={tempSavings} onChange={e => setTempSavings(e.target.value)} onBlur={() => saveSettings('savings')} />
          ) : (
            <p className="text-2xl font-black text-blue-400">{formatPHP(savings)}</p>
          )}
        </div>
      </div>

      {/* CALENDAR NAVIGATION */}
      <div className="flex gap-4 mb-4 justify-center items-center bg-zinc-900/50 p-2 rounded-xl border border-zinc-800/50">
        <select value={viewMonth} onChange={(e) => setViewMonth(Number(e.target.value))} className="bg-transparent font-bold outline-none cursor-pointer">
          {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((m, i) => <option key={m} value={i} className="bg-zinc-900">{m}</option>)}
        </select>
        <select value={viewYear} onChange={(e) => setViewYear(Number(e.target.value))} className="bg-transparent font-bold outline-none cursor-pointer">
          {[2024, 2025, 2026].map(y => <option key={y} value={y} className="bg-zinc-900">{y}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-8">
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

      {/* INPUT & SELECTED DAY */}
      <div className="bg-zinc-900 p-5 rounded-3xl border border-zinc-800 space-y-5 shadow-xl mb-8">
        <div className="flex flex-col gap-3">
          <input className="w-full bg-zinc-800 p-4 rounded-xl outline-none border border-transparent focus:border-zinc-700 text-sm" placeholder="Label" value={label} onChange={e => setLabel(e.target.value)} />
          <div className="flex gap-2">
            <input type="number" className="flex-1 bg-zinc-800 p-4 rounded-xl outline-none border border-transparent focus:border-zinc-700 text-sm" placeholder="Amount" value={amount} onChange={e => setAmount(e.target.value)} />
            <button onClick={saveExpense} className="px-6 rounded-xl font-black bg-blue-600 text-[10px] uppercase tracking-tighter active:scale-95 transition-transform">
              {editingId ? 'Update' : 'Add'}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-blue-500 font-black uppercase text-[8px] px-1 tracking-widest">Transactions for {selectedDate}</p>
          {selectedDateExpenses.length === 0 && <p className="text-zinc-700 italic px-1 text-[10px]">No records.</p>}
          {selectedDateExpenses.map(item => (
            <ExpenseItem key={item.id} item={item} onEdit={setEditingId} onDelete={deleteExpense} setLabel={setLabel} setAmount={setAmount} />
          ))}
        </div>
      </div>

      {/* HISTORY FEED */}
      <div className="space-y-6 pb-20">
        <p className="text-zinc-600 font-black uppercase text-[8px] px-1 tracking-widest">Other History</p>
        {otherExpenses.length === 0 && <p className="text-zinc-800 italic px-1 text-[10px]">Empty history.</p>}
        
        {Array.from(new Set(otherExpenses.map(i => i.date))).map(dateGroup => (
          <div key={dateGroup} className="space-y-2">
            <p className="text-zinc-800 font-bold text-[8px] px-2 border-l border-zinc-800 ml-1">{dateGroup}</p>
            {otherExpenses.filter(i => i.date === dateGroup).map(item => (
              <ExpenseItem key={item.id} item={item} onEdit={setEditingId} onDelete={deleteExpense} setLabel={setLabel} setAmount={setAmount} />
            ))}
          </div>
        ))}
      </div>
    </main>
  );
}

// MOBILE OPTIMIZED ITEM COMPONENT
function ExpenseItem({ item, onEdit, onDelete, setLabel, setAmount }: any) {
  const formatPHP = (num: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 0 }).format(num);

  return (
    <div className="bg-zinc-900/60 p-3 px-4 rounded-2xl flex justify-between items-center border border-zinc-800/50">
      <div className="flex flex-col gap-2">
        <span className="text-zinc-200 font-bold text-sm tracking-tight">{item.label}</span>
        <div className="flex gap-4">
          <button 
            onClick={() => { onEdit(item.id); setLabel(item.label); setAmount(item.amount.toString()); window.scrollTo({ top: 0, behavior: 'smooth' }); }} 
            className="text-blue-500 text-[9px] font-black uppercase tracking-tighter"
          >
            Edit
          </button>
          <button 
            onClick={() => onDelete(item.id)} 
            className="text-red-500/80 text-[9px] font-black uppercase tracking-tighter"
          >
            Delete
          </button>
        </div>
      </div>
      <span className="font-mono font-black text-zinc-100 text-sm">{formatPHP(item.amount)}</span>
    </div>
  );
}