import { useState, useCallback } from "react";

// ── Constants ────────────────────────────────────────────────────────────────
const PROTEINS = ["Beef", "Chicken", "Pork", "Shrimp", "Salmon", "Fish", "Bacon", "Beans", "Other/None"];
const DAYS = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const DINNER_DAYS = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

const SEASONAL_VEGGIES = {
  0: ["Roasted Brussels Sprouts", "Butternut Squash", "Sweet Potato", "Braised Kale", "Roasted Carrots"],
  1: ["Roasted Brussels Sprouts", "Butternut Squash", "Sweet Potato", "Braised Kale", "Roasted Beets"],
  2: ["Asparagus", "Snap Peas", "Roasted Radishes", "Wilted Spinach", "Spring Onions"],
  3: ["Asparagus", "Snap Peas", "Roasted Radishes", "Wilted Spinach", "Spring Onions"],
  4: ["Roasted Asparagus", "Snap Peas", "Grilled Zucchini", "Roasted Corn", "Sautéed Mushrooms"],
  5: ["Grilled Zucchini", "Roasted Corn", "Cucumber Salad", "Grilled Bell Peppers", "Caprese"],
  6: ["Grilled Corn", "Sautéed Green Beans", "Roasted Cherry Tomatoes", "Grilled Zucchini", "Cucumber Salad"],
  7: ["Grilled Corn", "Sautéed Green Beans", "Roasted Cherry Tomatoes", "Grilled Zucchini", "Corn on the Cob"],
  8: ["Roasted Broccoli", "Sautéed Green Beans", "Roasted Sweet Potato", "Corn on the Cob", "Grilled Eggplant"],
  9: ["Roasted Butternut Squash", "Sautéed Brussels Sprouts", "Roasted Carrots", "Braised Cabbage", "Sweet Potato Mash"],
  10: ["Roasted Butternut Squash", "Braised Kale", "Roasted Parsnips", "Sweet Potato Mash", "Sautéed Brussels Sprouts"],
  11: ["Roasted Brussels Sprouts", "Butternut Squash", "Sweet Potato", "Braised Kale", "Roasted Beets"],
};

const FALLBACK_RECIPES = [
  { name: "Butter Chicken", protein: "Chicken", isFamilyFavorite: true, dinner: true },
  { name: "Kabob Koobideh", protein: "Beef", isFamilyFavorite: true, dinner: true },
  { name: "Chicken Tikka Masala", protein: "Chicken", isFamilyFavorite: true, dinner: true },
  { name: "Lasagna", protein: "Beef", isFamilyFavorite: true, dinner: true },
  { name: "Beef and Broccoli", protein: "Beef", isFamilyFavorite: true, dinner: true },
  { name: "Shrimp Scampi", protein: "Shrimp", isFamilyFavorite: true, dinner: true },
  { name: "Chicken Alfredo", protein: "Chicken", isFamilyFavorite: false, dinner: true },
  { name: "Classic Chili", protein: "Beef", isFamilyFavorite: false, dinner: true },
  { name: "Instant Pot Pulled Pork", protein: "Pork", isFamilyFavorite: false, dinner: true },
  { name: "Sheet Pan Chicken Fajitas", protein: "Chicken", isFamilyFavorite: false, dinner: true },
  { name: "Air Fryer Salmon", protein: "Salmon", isFamilyFavorite: false, dinner: true },
  { name: "Shrimp Paella", protein: "Shrimp", isFamilyFavorite: false, dinner: true },
  { name: "Carnitas", protein: "Pork", isFamilyFavorite: false, dinner: true },
  { name: "Instant Pot Chicken Teriyaki", protein: "Chicken", isFamilyFavorite: false, dinner: true },
  { name: "Beef Enchiladas", protein: "Beef", isFamilyFavorite: false, dinner: true },
  { name: "Parmesan Crusted Salmon", protein: "Salmon", isFamilyFavorite: false, dinner: true },
  { name: "Instant Pot Red Beans and Rice", protein: "Beans", isFamilyFavorite: false, dinner: true },
  { name: "Orange Chicken", protein: "Chicken", isFamilyFavorite: false, dinner: true },
  { name: "Riveting Ribs", protein: "Pork", isFamilyFavorite: false, dinner: true },
  { name: "Shrimp and Grits", protein: "Shrimp", isFamilyFavorite: false, dinner: true },
];

// ── Worker API helpers ───────────────────────────────────────────────────────
const WORKER_URL = "https://meal-planner-api.bob-a-mayer.workers.dev";

async function fetchSheetRecipes() {
  let res;
  try {
    res = await fetch(`${WORKER_URL}/recipes`);
  } catch(e) {
    throw new Error(`Network error — check your internet connection. (${e.message})`);
  }
  if (!res.ok) {
    let detail = "";
    try { const e = await res.json(); detail = e?.error || ""; } catch(_) {}
    throw new Error(`Worker error ${res.status}${detail ? ": " + detail : ""}`);
  }
  const data = await res.json();
  if (!data.recipes?.length) throw new Error("No recipes returned from Worker — check your sheet tab name and data layout.");
  return data.recipes;
}

async function appendSheetRecipe(recipe) {
  const res = await fetch(`${WORKER_URL}/recipes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(recipe),
  });
  if (!res.ok) {
    let detail = "";
    try { const e = await res.json(); detail = e?.error || ""; } catch(_) {}
    throw new Error(`Save error ${res.status}${detail ? ": " + detail : ""}`);
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length-1; i>0; i--) { const j = Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; }
  return a;
}
function getSeasonalVeggies(count) {
  const pool = shuffle(SEASONAL_VEGGIES[new Date().getMonth()] || SEASONAL_VEGGIES[0]);
  return [...pool.slice(0, Math.max(0,count)), "Salad", "Frozen Veggies"];
}
function suggestDinners(recipes, proteinInventory, favCount) {
  const pool = recipes.filter(r => r.dinner);
  const used = new Set(); const out = [];
  shuffle(pool.filter(r => r.isFamilyFavorite)).slice(0, favCount).forEach(r => { out.push({...r,isFav:true}); used.add(r.name); });
  for (const {protein, qty} of proteinInventory) {
    if (!protein||qty<=0) continue;
    shuffle(pool.filter(r => r.protein===protein && !used.has(r.name))).slice(0,qty).forEach(r => { out.push({...r,isFav:false}); used.add(r.name); });
  }
  return out;
}
function getWeekLabel() {
  const now = new Date(); const sat = new Date(now); sat.setDate(now.getDate()-now.getDay()+6);
  const fri = new Date(sat); fri.setDate(sat.getDate()+6);
  return `${sat.getMonth()+1}/${sat.getDate()}–${fri.getMonth()+1}/${fri.getDate()}`;
}

// ── CSS ───────────────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@300;400;500&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  :root{--cream:#FAF7F2;--ink:#1A1A1A;--sage:#7A9E7E;--warm:#E8DDD0;--warm2:#D4C4B0;--gold:#C8A96E;--lsage:#EBF0EB;--fav:#FFF5E6;--red:#C0392B;}
  body{background:var(--cream);font-family:'DM Sans',sans-serif;color:var(--ink);}
  .app{max-width:860px;margin:0 auto;padding:24px 16px 80px;}
  h1{font-family:'Playfair Display',serif;font-size:2rem;margin-bottom:4px;}
  .sub{font-size:.88rem;color:#888;font-weight:300;margin-bottom:24px;}

  /* Nav */
  .nav{display:flex;border:2px solid var(--ink);border-radius:10px;overflow:hidden;margin-bottom:28px;}
  .nb{flex:1;padding:10px 4px;background:none;border:none;border-right:1px solid var(--warm2);font-family:'DM Sans',sans-serif;font-size:.78rem;font-weight:500;cursor:pointer;color:#888;transition:all .15s;}
  .nb:last-child{border-right:none;}
  .nb.on{background:var(--ink);color:white;}
  .nb:hover:not(.on){background:var(--warm);}

  /* Cards */
  .card{background:white;border:1px solid var(--warm2);border-radius:12px;padding:20px;margin-bottom:14px;}
  .step{margin-bottom:32px;}
  .sh{display:flex;align-items:center;gap:12px;margin-bottom:16px;}
  .sn{width:30px;height:30px;border-radius:50%;background:var(--ink);color:white;display:flex;align-items:center;justify-content:center;font-size:.8rem;font-weight:500;flex-shrink:0;}
  .st{font-family:'Playfair Display',serif;font-size:1.2rem;}

  /* Banner */
  .banner{display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:8px;font-size:.82rem;margin-bottom:14px;}
  .banner.ok{background:var(--lsage);border:1px solid var(--sage);color:#2d6a32;}
  .banner.warn{background:#FEF9EC;border:1px solid var(--gold);color:#7a5c00;}
  .banner.err{background:#FEF2F2;border:1px solid #fca5a5;color:var(--red);}
  .dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;}
  .dot.g{background:var(--sage);} .dot.y{background:var(--gold);} .dot.r{background:var(--red);}

  /* Inputs */
  select,input[type=text],input[type=password]{font-family:'DM Sans',sans-serif;font-size:.9rem;border:1px solid var(--warm2);border-radius:8px;padding:9px 12px;background:var(--cream);color:var(--ink);width:100%;outline:none;transition:border-color .2s;}
  select:focus,input:focus{border-color:var(--sage);}

  /* Stepper */
  .stepper{display:inline-flex;align-items:center;border:2px solid var(--ink);border-radius:8px;overflow:hidden;height:42px;}
  .sb{width:42px;height:100%;border:none;background:var(--ink);color:white;font-size:1.4rem;font-weight:300;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .15s;flex-shrink:0;line-height:1;}
  .sb:hover:not(:disabled){background:#444;} .sb:disabled{background:#bbb;cursor:not-allowed;}
  .sv{min-width:52px;text-align:center;font-size:1.05rem;font-weight:700;height:100%;display:flex;align-items:center;justify-content:center;background:white;color:var(--ink);border-left:2px solid var(--ink);border-right:2px solid var(--ink);}
  .sl{font-size:.72rem;color:#999;text-align:center;margin-top:4px;}

  /* Protein rows */
  .pr{display:flex;flex-direction:column;gap:8px;margin-bottom:16px;padding-bottom:16px;border-bottom:1px solid var(--warm);}
  .pr:last-of-type{border-bottom:none;padding-bottom:0;}
  .pr-top{display:flex;align-items:center;gap:10px;}
  .pr-bot{display:flex;align-items:center;gap:10px;padding-left:42px;}
  .pr-lbl{font-size:.8rem;color:#888;min-width:56px;}

  .rm-btn{width:32px;height:32px;border-radius:50%;background:none;border:1px solid var(--warm2);color:#aaa;cursor:pointer;font-size:1rem;display:flex;align-items:center;justify-content:center;transition:all .15s;flex-shrink:0;}
  .rm-btn:hover{background:#fee;border-color:#e88;color:#c44;}
  .add-btn{background:none;border:1px dashed var(--warm2);border-radius:8px;padding:8px 16px;font-family:'DM Sans',sans-serif;font-size:.85rem;color:var(--sage);cursor:pointer;transition:all .15s;}
  .add-btn:hover{border-color:var(--sage);background:var(--lsage);}

  /* Days grid */
  .dg{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;}
  .dc{display:flex;align-items:center;gap:8px;padding:10px 14px;border-radius:8px;border:1px solid var(--warm2);cursor:pointer;transition:all .15s;user-select:none;background:var(--cream);font-size:.88rem;}
  .dc.on{background:var(--lsage);border-color:var(--sage);}
  .dc input{accent-color:var(--sage);}

  /* Lunch row */
  .lr{display:grid;grid-template-columns:90px 1fr;gap:12px;align-items:center;margin-bottom:10px;}
  .ll{font-size:.85rem;font-weight:500;color:#666;}

  /* Out chips */
  .wg{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;}
  .oc{display:flex;align-items:center;justify-content:space-between;padding:8px 12px;border-radius:8px;border:1px solid var(--warm2);cursor:pointer;transition:all .15s;font-size:.82rem;background:var(--cream);}
  .oc.out{background:#FEF3F2;border-color:#E88;color:#c44;}
  .oc.home{background:var(--lsage);border-color:var(--sage);}

  /* Pref row */
  .pfr{display:flex;align-items:center;gap:16px;margin-bottom:8px;}
  .pfr label{font-size:.88rem;flex:1;color:#444;}

  /* Buttons */
  .btn{background:var(--ink);color:white;border:none;border-radius:10px;padding:13px 28px;font-family:'DM Sans',sans-serif;font-size:.95rem;font-weight:500;cursor:pointer;transition:all .15s;}
  .btn:hover:not(:disabled){background:#333;transform:translateY(-1px);}
  .btn:disabled{background:#bbb;cursor:not-allowed;transform:none;}
  .btn2{background:white;color:var(--ink);border:1px solid var(--warm2);border-radius:10px;padding:10px 20px;font-family:'DM Sans',sans-serif;font-size:.88rem;cursor:pointer;transition:all .15s;}
  .btn2:hover{border-color:var(--ink);}

  /* Suggestions */
  .sl-list{display:flex;flex-direction:column;gap:8px;}
  .si{display:flex;align-items:center;gap:10px;padding:11px 14px;border-radius:10px;border:1px solid var(--warm2);background:var(--cream);}
  .si.fav{background:var(--fav);border-color:var(--gold);}
  .pill{font-size:.72rem;padding:2px 8px;border-radius:20px;background:var(--warm);color:#666;white-space:nowrap;flex-shrink:0;}
  .pill.fav{background:var(--gold);color:white;}
  .rn{font-size:.88rem;flex:1;}
  .swp{font-size:.75rem;color:var(--sage);background:none;border:1px solid var(--sage);border-radius:6px;padding:3px 8px;cursor:pointer;flex-shrink:0;transition:all .15s;}
  .swp:hover{background:var(--sage);color:white;}

  /* Mapping */
  .mr{display:flex;flex-direction:column;gap:8px;padding:12px 0;border-bottom:1px solid var(--warm);}
  .mr:last-child{border-bottom:none;}
  .mrn{font-size:.9rem;font-weight:500;}
  .mrp{font-size:.75rem;color:#999;}
  .dps{display:flex;flex-wrap:wrap;gap:6px;}
  .dp{padding:4px 12px;border-radius:20px;font-size:.78rem;border:1px solid var(--warm2);cursor:pointer;transition:all .15s;background:var(--cream);}
  .dp.on{background:var(--sage);color:white;border-color:var(--sage);}

  /* Output */
  .wg-table{width:100%;border-collapse:collapse;font-size:.78rem;}
  .wg-table th{background:var(--ink);color:white;padding:9px 6px;text-align:center;font-family:'Playfair Display',serif;font-weight:400;font-size:.82rem;}
  .wg-table th:first-child{text-align:left;}
  .wg-table td{padding:9px 6px;vertical-align:top;text-align:center;border-bottom:1px solid var(--warm);border-right:1px solid var(--warm);}
  .wg-table td:first-child{text-align:left;font-weight:500;color:#666;font-size:.75rem;background:var(--cream);}
  .wg-table tr:last-child td{border-bottom:none;}
  .ot{color:#bbb;font-style:italic;font-size:.75rem;}
  .vt{font-size:.72rem;color:var(--sage);}
  .ft{font-size:.68rem;color:var(--gold);}

  /* Add recipe form */
  .fl{margin-bottom:14px;}
  .flbl{font-size:.82rem;font-weight:500;color:#555;margin-bottom:5px;display:block;}
  .cg{display:grid;grid-template-columns:repeat(2,1fr);gap:6px;}
  .cc{display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:8px;border:1px solid var(--warm2);cursor:pointer;font-size:.84rem;transition:all .15s;background:var(--cream);user-select:none;}
  .cc.on{background:var(--lsage);border-color:var(--sage);}
  .cc input{accent-color:var(--sage);}

  /* Settings */
  .sf{margin-bottom:16px;}
  .sflbl{font-size:.82rem;font-weight:500;color:#555;margin-bottom:5px;display:block;}
  .sfhint{font-size:.75rem;color:#aaa;margin-top:4px;}
  .irow{display:flex;gap:8px;}

  /* Misc */
  .slbl{font-size:.72rem;text-transform:uppercase;letter-spacing:1px;color:#aaa;margin-bottom:10px;font-weight:500;}
  .div{height:1px;background:var(--warm);margin:16px 0;}
  .oa{display:flex;gap:10px;margin-top:14px;flex-wrap:wrap;}
  .cp{color:var(--sage);font-size:.82rem;margin-top:6px;}
  .it{font-size:.8rem;color:#888;margin-top:6px;}
  .ok-msg{color:var(--sage);font-size:.84rem;margin-top:8px;font-weight:500;}
  .err-msg{color:var(--red);font-size:.84rem;margin-top:8px;}
`;

// ── Stepper ────────────────────────────────────────────────────────────────────
function Stepper({ value, min=0, max=7, onChange, label }) {
  return (
    <div>
      <div className="stepper">
        <button className="sb" onClick={()=>onChange(Math.max(min,value-1))} disabled={value<=min}>−</button>
        <div className="sv">{value}</div>
        <button className="sb" onClick={()=>onChange(Math.min(max,value+1))} disabled={value>=max}>+</button>
      </div>
      {label && <div className="sl">{label}</div>}
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function MealPlanner() {
  const [tab, setTab] = useState("plan");

  // Sheet connection
  const [showKey, setShowKey] = useState(false);
  const [sheetStatus, setSheetStatus] = useState("disconnected");
  const [sheetError, setSheetError] = useState("");
  const [loadingSheet, setLoadingSheet] = useState(false);

  // Recipes
  const [recipes, setRecipes] = useState(FALLBACK_RECIPES);

  // Planner
  const [step, setStep] = useState(1);
  const [proteinRows, setProteinRows] = useState([{ protein:"", qty:1 }]);
  const [favCount, setFavCount] = useState(2);
  const [dinnerSel, setDinnerSel] = useState(Object.fromEntries(DINNER_DAYS.map(d=>[d,false])));
  const [satLunch, setSatLunch] = useState("");
  const [sunLunch, setSunLunch] = useState("");
  const [lunchOut, setLunchOut] = useState(Object.fromEntries(["Monday","Tuesday","Wednesday","Thursday","Friday"].map(d=>[d,false])));
  const [suggestions, setSuggestions] = useState([]);
  const [dayMap, setDayMap] = useState({});
  const [vegMap, setVegMap] = useState({ vegs:[], assigned:{} });
  const [output, setOutput] = useState(null);
  const [copied, setCopied] = useState(false);

  // Add recipe
  const [nr, setNr] = useState({ name:"", protein:"", isFamilyFavorite:false, dinner:false, lunch:false, breakfast:false, dessert:false, seasoning:false, side:false, snack:false });
  const [addStatus, setAddStatus] = useState("");
  const [addLoading, setAddLoading] = useState(false);

  const selDays = DINNER_DAYS.filter(d => dinnerSel[d]);

  // Connect sheet
  async function connectSheet() {
    setLoadingSheet(true); setSheetError("");
    try {
      const data = await fetchSheetRecipes();
      if (!data.length) throw new Error("No recipes found — check Sheet ID and column layout.");
      setRecipes(data); setSheetStatus("ok");
    } catch(e) { setSheetStatus("err"); setSheetError(e.message); }
    finally { setLoadingSheet(false); }
  }

  // Planner
  function genSuggestions() {
    const inv = proteinRows.filter(r=>r.protein&&r.qty>0);
    const sugg = suggestDinners(recipes, inv, favCount).slice(0, selDays.length);
    setSuggestions(sugg);
    setDayMap(Object.fromEntries(sugg.map((_,i)=>[i, selDays[i]||""])));
    setVegMap({ vegs: getSeasonalVeggies(selDays.length), assigned:{} });
    setStep(2);
  }

  const swapRecipe = useCallback((idx) => {
    const cur = suggestions[idx];
    const used = new Set(suggestions.map(s=>s.name));
    // If it's a fav slot — swap with any dinner recipe (not just same protein)
    // If it's a protein slot — swap within same protein only to respect inventory
    const pool = cur.isFav
      ? recipes.filter(r => r.dinner && !used.has(r.name))
      : recipes.filter(r => r.dinner && r.protein === cur.protein && !used.has(r.name));
    if (!pool.length) {
      // Fallback: open it up to any dinner recipe if pool is empty
      const fallback = recipes.filter(r => r.dinner && !used.has(r.name));
      if (!fallback.length) return;
      const next = fallback[Math.floor(Math.random()*fallback.length)];
      setSuggestions(prev=>{ const c=[...prev]; c[idx]={...next,isFav:cur.isFav}; return c; });
      return;
    }
    const next = pool[Math.floor(Math.random()*pool.length)];
    setSuggestions(prev=>{ const c=[...prev]; c[idx]={...next,isFav:cur.isFav}; return c; });
  }, [suggestions, recipes]);

  function buildOutput() {
    const dinnerByDay={};
    suggestions.forEach((r,i)=>{ const d=dayMap[i]; if(d) dinnerByDay[d]=r; });
    const vegByDay={};
    vegMap.vegs.forEach((v,i)=>{
      (vegMap.assigned[i]||[]).forEach(d=>{ if(!vegByDay[d]) vegByDay[d]=[]; vegByDay[d].push(v); });
    });
    setOutput({dinnerByDay,vegByDay}); setStep(3);
  }

  function copyPlan() {
    let txt = `MEAL PLAN ${getWeekLabel()}\n${"─".repeat(36)}\n`;
    DAYS.forEach(day=>{
      txt+=`\n${day.toUpperCase()}\n`;
      if(day==="Saturday") txt+=`  Lunch: ${satLunch||"—"}\n`;
      else if(day==="Sunday") txt+=`  Lunch: ${sunLunch||"—"}\n`;
      else txt+=`  Lunch: ${lunchOut[day]?"Office/Out":"Leftovers"}\n`;
      const d=output.dinnerByDay[day]; txt+=`  Dinner: ${d?d.name:"—"}\n`;
      const v=output.vegByDay[day]; if(v?.length) txt+=`  Veg: ${v.join(", ")}\n`;
    });
    navigator.clipboard.writeText(txt).then(()=>{ setCopied(true); setTimeout(()=>setCopied(false),2500); });
  }

  // Add recipe
  async function saveRecipe() {
    if(!nr.name) { setAddStatus("err:Enter a recipe name."); return; }
    if(!nr.protein) { setAddStatus("err:Select a protein."); return; }
    setAddLoading(true); setAddStatus("");
    try {
      if(sheetStatus==="ok") {
        await appendSheetRecipe(nr);
        const updated = await fetchSheetRecipes();
        if(updated.length) setRecipes(updated);
      } else {
        setRecipes(prev=>[...prev,{...nr}]);
      }
      setAddStatus("ok");
      setNr({name:"",protein:"",isFamilyFavorite:false,dinner:false,lunch:false,breakfast:false,dessert:false,seasoning:false,side:false,snack:false});
    } catch(e) { setAddStatus("err:"+e.message); }
    finally { setAddLoading(false); }
  }

  return (
    <>
      <style>{css}</style>
      <div className="app">
        <h1>Weekly Meal Planner</h1>
        <p className="sub">Plan your week around what you have.</p>

        <nav className="nav">
          {[["plan","Plan Week"],["add","Add Recipe"],["settings","⚙ Settings"]].map(([id,lbl])=>(
            <button key={id} className={`nb ${tab===id?"on":""}`} onClick={()=>setTab(id)}>{lbl}</button>
          ))}
        </nav>

        {/* ── SETTINGS ── */}
        {tab==="settings" && (
          <div>
            <div className="sh"><div className="st">Google Sheets Connection</div></div>

            {sheetStatus==="ok" && <div className="banner ok"><div className="dot g"/>Connected — {recipes.length} recipes loaded.</div>}
            {sheetStatus==="disconnected" && <div className="banner warn"><div className="dot y"/>Not connected — using {FALLBACK_RECIPES.length} built-in recipes.</div>}
            {sheetStatus==="err" && <div className="banner err"><div className="dot r"/>{sheetError}</div>}

            <div className="card">
              <p className="it" style={{marginBottom:16}}>Your recipes are served via a secure Cloudflare Worker — no API keys needed here.</p>
              <p className="it" style={{marginBottom:20}}>Worker URL: <strong>meal-planner-api.bob-a-mayer.workers.dev</strong></p>
              <button className="btn" onClick={connectSheet} disabled={loadingSheet}>{loadingSheet?"Connecting…":"Load Recipes from Sheet"}</button>
              {sheetStatus==="ok" && (
                <button className="btn2" style={{marginLeft:10}} onClick={()=>{ setSheetStatus("disconnected"); setRecipes(FALLBACK_RECIPES); }}>Disconnect</button>
              )}
            </div>

            <div className="card">
              <div className="slbl">How your sheet is read</div>
              <p className="it">Tab name: <strong>Recipe Master List</strong>, starting at row 4.</p>
              <p className="it" style={{marginTop:8}}>Column order: A: # &nbsp;·&nbsp; B: Recipe Name &nbsp;·&nbsp; C: Protein &nbsp;·&nbsp; D: Dessert &nbsp;·&nbsp; E: Breakfast &nbsp;·&nbsp; F: Lunch &nbsp;·&nbsp; G: Dinner &nbsp;·&nbsp; H: Seasoning &nbsp;·&nbsp; I: Side &nbsp;·&nbsp; J: Snack &nbsp;·&nbsp; K: Family Favorite</p>
              <p className="it" style={{marginTop:8}}>Mark cells with <strong>X</strong> for yes. Protein must match dropdown options exactly.</p>
            </div>
          </div>
        )}

        {/* ── ADD RECIPE ── */}
        {tab==="add" && (
          <div>
            <div className="sh"><div className="st">Add a Recipe</div></div>

            {sheetStatus!=="ok" && (
              <div className="banner warn"><div className="dot y"/>Not connected to Google Sheets — recipe added locally for this session only.</div>
            )}

            <div className="card">
              <div className="fl">
                <label className="flbl">Recipe Name *</label>
                <input type="text" placeholder="e.g. Sheet Pan Lemon Herb Chicken" value={nr.name} onChange={e=>setNr(r=>({...r,name:e.target.value}))} />
              </div>

              <div className="fl">
                <label className="flbl">Protein *</label>
                <select value={nr.protein} onChange={e=>setNr(r=>({...r,protein:e.target.value}))}>
                  <option value="">Select protein…</option>
                  {PROTEINS.map(p=><option key={p}>{p}</option>)}
                </select>
              </div>

              <div className="fl">
                <label className="flbl">Meal Type (select all that apply)</label>
                <div className="cg">
                  {[["dinner","Dinner"],["lunch","Lunch"],["breakfast","Breakfast"],["dessert","Dessert"],["seasoning","Seasoning"],["side","Side"],["snack","Snack/App"]].map(([k,lbl])=>(
                    <label key={k} className={`cc ${nr[k]?"on":""}`}>
                      <input type="checkbox" checked={!!nr[k]} onChange={e=>setNr(r=>({...r,[k]:e.target.checked}))} />
                      {lbl}
                    </label>
                  ))}
                </div>
              </div>

              <div className="fl">
                <label className={`cc ${nr.isFamilyFavorite?"on":""}`} style={{display:"inline-flex"}}>
                  <input type="checkbox" checked={nr.isFamilyFavorite} onChange={e=>setNr(r=>({...r,isFamilyFavorite:e.target.checked}))} />
                  ⭐ Family Favorite
                </label>
              </div>

              <button className="btn" onClick={saveRecipe} disabled={addLoading}>
                {addLoading?"Saving…": sheetStatus==="ok"?"Save to Google Sheet":"Add Locally"}
              </button>
              {addStatus==="ok" && <p className="ok-msg">✓ Recipe added!</p>}
              {addStatus.startsWith("err:") && <p className="err-msg">{addStatus.slice(4)}</p>}
            </div>
          </div>
        )}

        {/* ── PLAN WEEK ── */}
        {tab==="plan" && (
          <>
            <div className={`banner ${sheetStatus==="ok"?"ok":"warn"}`}>
              <div className={`dot ${sheetStatus==="ok"?"g":"y"}`}/>
              {sheetStatus==="ok" ? `Using your Google Sheet — ${recipes.length} recipes` : "Using built-in recipes — connect your sheet in Settings"}
            </div>

            {/* Step 1 */}
            {step>=1 && (
              <div className="step">
                <div className="sh"><div className="sn">1</div><div className="st">What's in your kitchen?</div></div>

                <div className="card">
                  <div className="slbl">Protein Inventory</div>
                  {proteinRows.map((row,i)=>(
                    <div className="pr" key={i}>
                      <div className="pr-top">
                        <button className="rm-btn" onClick={()=>setProteinRows(prev=>prev.filter((_,j)=>j!==i))}>×</button>
                        <select value={row.protein} onChange={e=>{ const c=[...proteinRows]; c[i].protein=e.target.value; setProteinRows(c); }}>
                          <option value="">Select protein…</option>
                          {PROTEINS.filter(p=>p!=="Other/None").map(p=><option key={p}>{p}</option>)}
                        </select>
                      </div>
                      <div className="pr-bot">
                        <span className="pr-lbl">Meals:</span>
                        <Stepper value={row.qty} min={1} max={7} onChange={v=>{ const c=[...proteinRows]; c[i].qty=v; setProteinRows(c); }}
                          label={row.qty===1?"1 meal":`${row.qty} meals`} />
                      </div>
                    </div>
                  ))}
                  <button className="add-btn" onClick={()=>setProteinRows(prev=>[...prev,{protein:"",qty:1}])}>+ Add protein</button>
                </div>

                <div className="card">
                  <div className="pfr">
                    <label>Family Favorites to include</label>
                    <Stepper value={favCount} min={0} max={7} onChange={setFavCount}
                      label={favCount===0?"none":favCount===1?"1 favorite":`${favCount} favorites`} />
                  </div>
                </div>

                <div className="card">
                  <div className="slbl">Which nights need dinner?</div>
                  <div className="dg">
                    {DINNER_DAYS.map(day=>(
                      <label key={day} className={`dc ${dinnerSel[day]?"on":""}`}>
                        <input type="checkbox" checked={dinnerSel[day]} onChange={()=>setDinnerSel(prev=>({...prev,[day]:!prev[day]}))} />
                        {day}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="card">
                  <div className="slbl">Weekend Lunches</div>
                  <div className="lr"><span className="ll">Saturday</span><input type="text" placeholder="e.g. Smash burgers, TikTok pasta…" value={satLunch} onChange={e=>setSatLunch(e.target.value)} /></div>
                  <div className="lr"><span className="ll">Sunday</span><input type="text" placeholder="e.g. Crab Rangoon…" value={sunLunch} onChange={e=>setSunLunch(e.target.value)} /></div>
                </div>

                <div className="card">
                  <div className="slbl">Weekday Lunches — mark days you're out</div>
                  <div className="wg">
                    {["Monday","Tuesday","Wednesday","Thursday","Friday"].map(day=>(
                      <div key={day} className={`oc ${lunchOut[day]?"out":"home"}`} onClick={()=>setLunchOut(prev=>({...prev,[day]:!prev[day]}))}>
                        <span>{day.slice(0,3)}</span><span>{lunchOut[day]?"Out":"Home"}</span>
                      </div>
                    ))}
                  </div>
                  <p className="it">Home = leftovers.</p>
                </div>

                <button className="btn" disabled={selDays.length===0} onClick={genSuggestions}>Suggest Dinners →</button>
              </div>
            )}

            {/* Step 2 */}
            {step>=2 && (
              <div className="step">
                <div className="sh"><div className="sn">2</div><div className="st">Map your week</div></div>

                <div className="card">
                  <div className="slbl">Suggested Dinners</div>
                  <div className="sl-list">
                    {suggestions.map((r,i)=>(
                      <div key={i} className={`si ${r.isFav?"fav":""}`}>
                        <span className={`pill ${r.isFav?"fav":""}`}>{r.isFav?"⭐ Fav":r.protein}</span>
                        <span className="rn">{r.name}</span>
                        <button className="swp" onClick={()=>swapRecipe(i)}>swap</button>
                      </div>
                    ))}
                  </div>
                  <div className="div"/>
                  <div className="slbl">Assign dinners to days</div>
                  {suggestions.map((r,i)=>(
                    <div className="mr" key={i}>
                      <div><div className="mrn">{r.name}</div><div className="mrp">{r.protein}</div></div>
                      <div className="dps">
                        {selDays.map(day=>(
                          <div key={day} className={`dp ${dayMap[i]===day?"on":""}`}
                            onClick={()=>setDayMap(prev=>({...prev,[i]:prev[i]===day?"":day}))}>
                            {day.slice(0,3)}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="card">
                  <div className="slbl">Seasonal Veggies — assign to nights</div>
                  <p className="it" style={{marginBottom:12}}>Salad &amp; Frozen Veggies can go on multiple nights.</p>
                  {vegMap.vegs.map((veg,i)=>(
                    <div className="mr" key={i}>
                      <div className="mrn">{veg}</div>
                      <div className="dps">
                        {selDays.map(day=>(
                          <div key={day} className={`dp ${(vegMap.assigned[i]||[]).includes(day)?"on":""}`}
                            onClick={()=>setVegMap(prev=>{
                              const a={...prev.assigned}; if(!a[i]) a[i]=[];
                              const ix=a[i].indexOf(day); ix>-1?a[i].splice(ix,1):a[i].push(day);
                              return {...prev,assigned:a};
                            })}>
                            {day.slice(0,3)}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <button className="btn" onClick={buildOutput}>Build Meal Plan →</button>
              </div>
            )}

            {/* Step 3 */}
            {step>=3 && output && (
              <div className="step">
                <div className="sh"><div className="sn">3</div><div className="st">Your Week — {getWeekLabel()}</div></div>
                <div className="card" style={{overflowX:"auto"}}>
                  <table className="wg-table">
                    <thead>
                      <tr><th></th>{DAYS.map(d=><th key={d}>{d.slice(0,3)}</th>)}</tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Lunch</td>
                        {DAYS.map(day=>(
                          <td key={day}>
                            {day==="Saturday"?satLunch||<span className="ot">—</span>
                            :day==="Sunday"?sunLunch||<span className="ot">—</span>
                            :<span className="ot">{lunchOut[day]?"Office":"Leftovers"}</span>}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td>Dinner</td>
                        {DAYS.map(day=>{ const r=output.dinnerByDay[day]; return <td key={day}>{r?<>{r.name}{r.isFav&&<div className="ft">⭐</div>}</>:<span className="ot">—</span>}</td>; })}
                      </tr>
                      <tr>
                        <td>Veg</td>
                        {DAYS.map(day=>{ const v=output.vegByDay[day]; return <td key={day}>{v?.length?v.map((x,i)=><div key={i} className="vt">{x}</div>):<span className="ot">—</span>}</td>; })}
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="oa">
                  <button className="btn" onClick={copyPlan}>Copy to Clipboard</button>
                  <button className="btn2" onClick={()=>{ setStep(1); setOutput(null); setSuggestions([]); }}>Start Over</button>
                </div>
                {copied && <p className="cp">✓ Copied! Paste into Apple Notes.</p>}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}



