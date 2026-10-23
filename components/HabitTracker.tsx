"use client";

import React, { useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";

type Period = "daily" | "weekly" | "monthly";
type Mode = "check" | "quantity";
type Log = { id: string; date: string; amount: number; createdAt: string };
type Habit = { id: string; name: string; mode: Mode; unit: string; goal: number; period: Period; benchmarks: number[]; spaceId: string; logMode: "add" | "total"; paused: boolean; logs: Log[] };
const KEY = "stillroom-habits-v1";
const uid = () => typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2);
const dateKey = (d: Date) => [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");
const periodStart = (date: Date, period: Period) => { const d = new Date(date.getFullYear(),date.getMonth(),date.getDate()); if(period==="weekly") d.setDate(d.getDate() - ((d.getDay()+6)%7)); if(period==="monthly") d.setDate(1); return dateKey(d); };
const totalFor = (h: Habit, date: Date) => { const start=periodStart(date,h.period); const end=periodStart(date,h.period); void end; const logs=h.logs.filter(l=>periodStart(new Date(l.date+"T12:00:00"),h.period)===start).sort((a,b)=>a.createdAt.localeCompare(b.createdAt)); return h.logMode==="total" ? (logs.at(-1)?.amount ?? 0) : logs.reduce((s,l)=>s+l.amount,0); };
const classes = "rounded-md border line-border bg-transparent px-3 py-2 text-sm";
const sample = (h: Habit): Habit => ({...h,logs:[...h.logs]});

export function HabitTracker({ spaces, compact=false, initialDate, selectedDate: selectedDateProp, onSelectedDateChange, createTrigger=0 }: {spaces: {id:string;name:string;accent:string}[];compact?:boolean;initialDate?:string;selectedDate?:string;onSelectedDateChange?:(date:string)=>void;createTrigger?:number}) {
  const [initial] = useState<{habits: Habit[]; warning: string}>(() => {
    if (typeof window === "undefined") return { habits: [], warning: "" };
    try {
      const raw = window.localStorage.getItem(KEY);
      if (!raw) return { habits: [], warning: "" };
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed) || !parsed.every((h: unknown) => !!h && typeof h === "object" && "id" in h && "logs" in h && Array.isArray(h.logs))) throw new Error("Invalid tracker data");
      return { habits: parsed as Habit[], warning: "" };
    } catch { return { habits: [], warning: "Saved habit data could not be read. It has not been overwritten." }; }
  });
  const [habits,setHabits]=useState<Habit[]>(initial.habits);
  const [warning,setWarning]=useState(initial.warning);
  const [editing,setEditing]=useState<string|null>(createTrigger > 0 ? "new" : null);
  const [name,setName]=useState("");
  const [mode,setMode]=useState<Mode>("quantity");
  const [unit,setUnit]=useState("oz");
  const [goal,setGoal]=useState("80");
  const [period,setPeriod]=useState<Period>("daily");
  const [benchmarks,setBenchmarks]=useState("8, 16, 24");
  const [spaceId,setSpaceId]=useState("");
  const [logMode,setLogMode]=useState<"add"|"total">("add");
  const [manual,setManual]=useState<Record<string,string>>({});
  const [selectedDate,setSelectedDate]=useState(initialDate ?? dateKey(new Date()));
  const [historyId,setHistoryId]=useState<string|null>(null);
  const save=(next:Habit[])=>{if(warning) return; try{localStorage.setItem(KEY,JSON.stringify(next));setHabits(next);}catch{setWarning("Habit changes could not be saved. Check browser storage.");}};
  const selectedDay = selectedDateProp ?? selectedDate;
  const selectDate=(value:string)=>{if(onSelectedDateChange)onSelectedDateChange(value);else setSelectedDate(value);};
  const date=useMemo(()=>new Date(selectedDay+"T12:00:00"),[selectedDay]);
  const startEdit=(h?:Habit)=>{setEditing(h?.id??"new");setName(h?.name??"");setMode(h?.mode??"quantity");setUnit(h?.unit??"oz");setGoal(String(h?.goal??80));setPeriod(h?.period??"daily");setBenchmarks(h?.benchmarks.join(", ")??"8, 16, 24");setSpaceId(h?.spaceId??"");setLogMode(h?.logMode??"add");};
  const saveEdit=()=>{const n=Number(goal);const values=benchmarks.split(",").map(v=>Number(v.trim())).filter(v=>Number.isFinite(v)&&v>0);if(!name.trim()||mode==="quantity"&&(!Number.isFinite(n)||n<=0||!unit.trim())){setWarning("Enter a name, a positive goal, and a unit.");return;}setWarning("");const existing=habits.find(h=>h.id===editing);const item:Habit={id:existing?.id??uid(),name:name.trim(),mode,unit:mode==="check"?"times":unit.trim(),goal:mode==="check"?1:n,period,benchmarks:mode==="check"?[1]:values,spaceId,logMode:mode==="check"?"add":logMode,paused:existing?.paused??false,logs:existing?.logs??[]};save(existing?habits.map(h=>h.id===existing.id?item:h):[...habits,item]);setEditing(null);};
  const log=(h:Habit,amount:number,when=selectedDay)=>{if(!Number.isFinite(amount)||amount<0) return; const entry:Log={id:uid(),date:when,amount,createdAt:new Date().toISOString()};const next=sample(h);if(h.mode==="check"){const start=periodStart(new Date(when+"T12:00:00"),h.period);next.logs=next.logs.filter(l=>periodStart(new Date(l.date+"T12:00:00"),h.period)!==start);if(amount)next.logs.push(entry);}else next.logs.push(entry);save(habits.map(x=>x.id===h.id?next:x));};
  const updateLog=(h:Habit,id:string,amount:number)=>{if(!Number.isFinite(amount)||amount<0)return;save(habits.map(x=>x.id===h.id?{...h,logs:h.logs.map(l=>l.id===id?{...l,amount}:l)}:x));};
  const deleteLog=(h:Habit,id:string)=>save(habits.map(x=>x.id===h.id?{...h,logs:h.logs.filter(l=>l.id!==id)}:x));
  return <section className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-editorial text-3xl">Little things, often.</h2><p className="text-sm text-stone-500">A few things you’re tending to.</p></div><button className={classes+" flex items-center gap-2"} onClick={()=>startEdit()}><Plus size={16}/> New habit</button></div>
    {warning&&<p role="alert" className="rounded-md border border-amber-500 p-3 text-sm">{warning} <button className="underline" onClick={()=>setWarning("")}>Dismiss</button></p>}
    <div className="flex items-center gap-3"><button aria-label="Previous day" onClick={()=>{const d=new Date(date);d.setDate(d.getDate()-1);selectDate(dateKey(d));}}><ChevronLeft size={19}/></button><label className="text-sm">Viewing <input aria-label="Habit date" type="date" value={selectedDay} onChange={e=>selectDate(e.target.value)} className={classes}/></label><button aria-label="Next day" onClick={()=>{const d=new Date(date);d.setDate(d.getDate()+1);selectDate(dateKey(d));}}><ChevronRight size={19}/></button><button className="text-xs underline" onClick={()=>selectDate(dateKey(new Date()))}>Today</button></div>
    {!habits.length&&<div className="rounded-md border border-dashed line-border p-8 text-center text-sm text-stone-500">Create a habit to start tracking your little victories.</div>}
    <div className={compact?"grid gap-3 md:grid-cols-2":"grid gap-4 md:grid-cols-2"}>{habits.filter(h=>!h.paused).map(h=>{const total=totalFor(h,date);const pct=Math.max(0,total/h.goal*100);const accent=spaces.find(s=>s.id===h.spaceId)?.accent??"#84917A";return <article key={h.id} className="rounded-lg border line-border surface p-4">
      <div className="flex items-start justify-between gap-3"><div><h3 className="font-editorial text-2xl">{h.name}</h3><p className="text-xs text-stone-500">{h.period} · {spaces.find(s=>s.id===h.spaceId)?.name??"Personal"}</p></div><button className="text-xs underline underline-offset-4" onClick={()=>startEdit(h)}>Edit</button></div>
      <div className="mt-4 flex flex-wrap items-baseline gap-1"><strong className="text-2xl font-medium tabular-nums">{total.toLocaleString()}</strong><span className="text-sm text-stone-500">/ {h.goal.toLocaleString()} {h.mode==="check"?"completed":h.unit}</span><span className="ml-auto text-xs text-stone-500">{Math.round(pct)}%</span></div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-700" role="progressbar" aria-label={`${h.name} progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100,Math.round(pct))}><div className="h-full rounded-full" style={{width:Math.min(100,pct)+"%",background:accent}}/></div>
      {h.mode==="check"?<button className={classes+" mt-4 flex min-h-11 items-center gap-2"} onClick={()=>log(h,total?0:1)}><Check size={17}/>{total?"Mark not done":"Mark done"}</button>:<><div className="mt-4 flex flex-wrap gap-2">{h.benchmarks.map((n,i)=><button key={i} className={classes+" min-h-11"} onClick={()=>log(h,n)}> {h.logMode==="add"?"+":""}{n.toLocaleString()} {h.unit}</button>)}</div><form className="mt-3 flex gap-2" onSubmit={e=>{e.preventDefault();const n=Number(manual[h.id]);if(manual[h.id]?.trim()&&Number.isFinite(n)&&n>=0){log(h,n);setManual(x=>({...x,[h.id]:""}));}}}><input aria-label={"Amount for "+h.name} inputMode="decimal" type="number" min="0" step="any" placeholder={h.logMode==="add"?"Add amount":"Current total"} className={classes+" min-w-0 flex-1"} value={manual[h.id]??""} onChange={e=>setManual(x=>({...x,[h.id]:e.target.value}))}/><button className={classes} type="submit">Log</button></form></>}
      <div className="mt-4 flex items-center justify-between text-xs"><button className="underline underline-offset-4" onClick={()=>setHistoryId(historyId===h.id?null:h.id)}> {historyId===h.id?"Hide history":"View / edit history"}</button><button className="underline underline-offset-4" onClick={()=>{const last=[...h.logs].filter(l=>l.date===selectedDay).sort((a,b)=>b.createdAt.localeCompare(a.createdAt))[0];if(last)deleteLog(h,last.id);}} disabled={!h.logs.some(l=>l.date===selectedDay)}>Undo last entry</button></div>
      {historyId===h.id&&<div className="mt-4 space-y-2 border-t line-border pt-3">{[...h.logs].sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt.localeCompare(a.createdAt)).map(l=><div key={l.id} className="flex items-center gap-2 text-xs"><span className="min-w-24">{l.date}</span><input type="number" aria-label={"Edit logged amount on "+l.date} min="0" step="any" className={classes+" w-24"} defaultValue={l.amount} key={l.id+":"+l.amount} onBlur={e=>{const n=Number(e.target.value);if(e.target.value!==""&&n!==l.amount)updateLog(h,l.id,n);}}/><span>{h.unit}</span><button aria-label="Delete log" onClick={()=>deleteLog(h,l.id)}><Trash2 size={15}/></button></div>)}{!h.logs.length&&<p className="text-stone-500">No entries yet.</p>}</div>}
    </article>;})}</div>
    {habits.some(h=>h.paused)&&<div className="text-sm"><h3 className="mb-2">Paused habits</h3>{habits.filter(h=>h.paused).map(h=><button key={h.id} className={classes+" mr-2"} onClick={()=>save(habits.map(x=>x.id===h.id?{...x,paused:false}:x))}>Resume {h.name}</button>)}</div>}
    {editing!==null&&<div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4" role="presentation"><div role="dialog" aria-modal="true" aria-label="Habit editor" className="mx-auto my-8 max-w-lg rounded-lg border line-border surface p-5 shadow-xl"><div className="flex items-center justify-between"><h2 className="font-editorial text-3xl">{editing==="new"?"New habit":"Edit habit"}</h2><button onClick={()=>setEditing(null)} aria-label="Close">✕</button></div><form className="mt-5 space-y-4" onSubmit={e=>{e.preventDefault();saveEdit();}}>
      <label className="block text-sm">Name<input required className={classes+" mt-1 w-full"} value={name} onChange={e=>setName(e.target.value)}/></label>
      <label className="block text-sm">Tracking type<select className={classes+" mt-1 w-full"} value={mode} onChange={e=>setMode(e.target.value as Mode)}><option value="check">Simple check-off</option><option value="quantity">Track a quantity</option></select></label>
      {mode==="quantity"&&<><div className="grid grid-cols-2 gap-3"><label className="text-sm">Goal<input required type="number" min="0.00001" step="any" className={classes+" mt-1 w-full"} value={goal} onChange={e=>setGoal(e.target.value)}/></label><label className="text-sm">Unit<input required className={classes+" mt-1 w-full"} value={unit} onChange={e=>setUnit(e.target.value)}/></label></div><label className="block text-sm">Quick-add benchmarks (comma-separated)<input className={classes+" mt-1 w-full"} value={benchmarks} onChange={e=>setBenchmarks(e.target.value)}/></label><label className="block text-sm">Logging style<select className={classes+" mt-1 w-full"} value={logMode} onChange={e=>setLogMode(e.target.value as "add"|"total")}><option value="add">Add each amount to total</option><option value="total">Record current total (e.g. steps)</option></select></label></>}
      <label className="block text-sm">Goal frequency<select className={classes+" mt-1 w-full"} value={period} onChange={e=>setPeriod(e.target.value as Period)}><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select></label>
      <label className="block text-sm">Space (optional)<select className={classes+" mt-1 w-full"} value={spaceId} onChange={e=>setSpaceId(e.target.value)}><option value="">No Space</option>{spaces.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
      <div className="flex flex-wrap gap-2"><button type="submit" className="min-h-11 rounded-md bg-stone-800 px-5 py-2 text-sm text-white dark:bg-stone-100 dark:text-stone-900">Save habit</button><button type="button" className={classes} onClick={()=>setEditing(null)}>Cancel</button>{editing!=="new"&&<><button type="button" className={classes} onClick={()=>{save(habits.map(h=>h.id===editing?{...h,paused:!h.paused}:h));setEditing(null);}}>{habits.find(h=>h.id===editing)?.paused?"Resume":"Pause"}</button><button type="button" className={classes} onClick={()=>{if(confirm("Delete this habit and all its history?")){save(habits.filter(h=>h.id!==editing));setEditing(null);}}}>Delete</button></>}</div>
    </form></div></div>}
    <p className="text-xs text-stone-500">Habits are stored in this browser only. Clearing browser data may erase them.</p>
  </section>;
}
