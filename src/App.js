import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "./supabase";
import { initialMeals, initialRecipes, CURRENT_WEEK } from "./seedData";

// ── Helpers ──────────────────────────────────────────────────────────────────
function getWeekKey(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().slice(0, 10);
}
function getWeekLabel(weekKey) {
  const start = new Date(weekKey + "T00:00:00");
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const fmt = (d) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(start)} – ${fmt(end)}`;
}
function generateWeeks(startDate, endDate) {
  const weeks = [];
  const cur = new Date(startDate + "T00:00:00");
  while (cur <= new Date(endDate + "T00:00:00")) {
    weeks.push(getWeekKey(cur));
    cur.setDate(cur.getDate() + 7);
  }
  return weeks;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const TODAY = "2026-06-24";
const ALL_WEEKS = generateWeeks("2025-06-23", "2026-12-28");
const DAY_ORDER = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const DAY_SHORT = { Monday:"Mon",Tuesday:"Tue",Wednesday:"Wed",Thursday:"Thu",Friday:"Fri",Saturday:"Sat",Sunday:"Sun" };
const DAY_EMOJIS = { Monday:"🌱",Tuesday:"🌤️",Wednesday:"🌿",Thursday:"🌤️",Friday:"🌙",Saturday:"🎉",Sunday:"☕" };
const MONTHLY_BUDGET = 500;
const STORES = ["Aldi","Giant","Sam's Club","Instacart","Other"];
const PANTRY_CATEGORIES = ["Cabinet","Fridge","Freezer","Cans","Seasoning"];

const mealTypeColors = {
  breakfast:{ border:"#f0c96e", label:"#b07a10", strip:"#f0c96e" },
  lunch:    { border:"#90bce8", label:"#2a5a8a", strip:"#5a9fd4" },
  dinner:   { border:"#7ec8a0", label:"#1c5a38", strip:"#2e7d5e" },
};
const storeColors = { "Aldi":"#1a6b3c","Giant + Aldi":"#c0392b","Sam's Club":"#0033a0","Giant":"#c0392b","Instacart":"#1a6b3c","Other":"#666" };
const storeTypeIcons = { instacart:"📲 Instacart", inperson:"🏪 In Person" };
const statusLabels = {
  set:      { label:"Set",       color:"#888",    bg:"#f4f4f2" },
  draft:    { label:"Draft",     color:"#b0813a", bg:"#fef6ec" },
  cooked:   { label:"Cooked ✓", color:"#2e7d5e", bg:"#edfaf4" },
  confirmed:{ label:"🔒 Locked", color:"#5a3d8a", bg:"#f3eeff" },
};
const cookOptions = ["Kayla 👩🏾‍🍳","Ian 👨🏾‍🍳","Together 🍳","TBD"];

// Quantity types per category
const QTY_TYPE = { Cabinet:"words", Fridge:"words", Freezer:"words", Cans:"numbers", Seasoning:"words" };
const QTY_WORDS = ["A Lot","Enough","A Little","Out"];
const QTY_NUMBERS = ["1","2","3","4","5+"];

const initialPantry = [
  { id:"p1",  name:"Honey (24oz)",            category:"Cabinet",  qty:"A Lot",  store:"Aldi" },
  { id:"p2",  name:"Peanut Butter",            category:"Cabinet",  qty:"A Lot",  store:"Aldi" },
  { id:"p3",  name:"Maple Syrup",              category:"Cabinet",  qty:"A Lot",  store:"Aldi" },
  { id:"p4",  name:"Cornstarch",               category:"Cabinet",  qty:"A Lot",  store:"Aldi" },
  { id:"p5",  name:"Sriracha",                 category:"Cabinet",  qty:"Out",    store:"Giant" },
  { id:"p6",  name:"Flour",                    category:"Cabinet",  qty:"A Lot",  store:"Aldi" },
  { id:"p7",  name:"Baking Powder",            category:"Cabinet",  qty:"A Lot",  store:"Aldi" },
  { id:"p8",  name:"Shaoxing Wine",            category:"Cabinet",  qty:"A Lot",  store:"Giant" },
  { id:"p9",  name:"Knorr Chicken Bouillon",   category:"Cabinet",  qty:"A Lot",  store:"Giant" },
  { id:"p10", name:"Oyster Sauce",             category:"Cabinet",  qty:"A Lot",  store:"Giant" },
  { id:"p11", name:"Soy Sauce",                category:"Cabinet",  qty:"A Lot",  store:"Aldi" },
  { id:"p12", name:"Sesame Oil",               category:"Cabinet",  qty:"A Lot",  store:"Giant" },
  { id:"p13", name:"Garlic Bulbs",             category:"Cabinet",  qty:"A Lot",  store:"Aldi" },
  { id:"p14", name:"Onions",                   category:"Cabinet",  qty:"A Lot",  store:"Aldi" },
  { id:"p15", name:"Sugar",                    category:"Cabinet",  qty:"A Lot",  store:"Aldi" },
  { id:"p16", name:"Brown Sugar",              category:"Cabinet",  qty:"A Lot",  store:"Aldi" },
  { id:"p17", name:"Cinnamon",                 category:"Cabinet",  qty:"A Lot",  store:"Aldi" },
  { id:"p18", name:"Old Bay Seasoning",        category:"Seasoning",qty:"A Lot",  store:"Giant" },
  { id:"p19", name:"Grain Rice (large bag)",   category:"Cabinet",  qty:"A Lot",  store:"Sam's Club" },
  { id:"p20", name:"Spaghetti Noodles",        category:"Cabinet",  qty:"A Little",store:"Aldi" },
  { id:"p21", name:"Rotini Noodles",           category:"Cabinet",  qty:"A Little",store:"Aldi" },
  { id:"p22", name:"Canola Oil",               category:"Cabinet",  qty:"A Lot",  store:"Aldi" },
  { id:"p23", name:"Pancake Mix",              category:"Cabinet",  qty:"A Lot",  store:"Aldi" },
  { id:"p24", name:"Oatmeal (variety)",        category:"Cabinet",  qty:"A Lot",  store:"Aldi" },
  { id:"p25", name:"Refried Beans",            category:"Cans",     qty:"1",      store:"Aldi" },
  { id:"p26", name:"Refried Beans w/ Chiles",  category:"Cans",     qty:"1",      store:"Aldi" },
  { id:"p27", name:"Brown Sugar Hickory Beans",category:"Cans",     qty:"1",      store:"Aldi" },
  { id:"p28", name:"Chili with Beans",         category:"Cans",     qty:"1",      store:"Aldi" },
  { id:"p29", name:"Nacho Cheese",             category:"Cans",     qty:"1",      store:"Aldi" },
  { id:"p30", name:"Chopped Green Chiles",     category:"Cans",     qty:"1",      store:"Aldi" },
  { id:"p31", name:"Tomato Paste",             category:"Cans",     qty:"1",      store:"Aldi" },
  { id:"p32", name:"Pinto Beans",              category:"Cans",     qty:"1",      store:"Aldi" },
  { id:"p33", name:"Ravioli",                  category:"Cans",     qty:"2",      store:"Aldi" },
  { id:"p34", name:"Bertolli Tomato Sauce",    category:"Cans",     qty:"4",      store:"Giant" },
  { id:"p35", name:"Eggs",                     category:"Fridge",   qty:"A Little",store:"Aldi" },
  { id:"p36", name:"Butter (Kerrygold)",       category:"Fridge",   qty:"Enough", store:"Instacart" },
  { id:"p37", name:"Whole Milk",               category:"Fridge",   qty:"A Lot",  store:"Aldi" },
  { id:"p38", name:"Sour Cream",               category:"Fridge",   qty:"Enough", store:"Aldi" },
  { id:"p39", name:"Greek Yogurt",             category:"Fridge",   qty:"Enough", store:"Aldi" },
  { id:"p40", name:"Sliced Cheese",            category:"Fridge",   qty:"Enough", store:"Aldi" },
  { id:"p41", name:"Celery",                   category:"Fridge",   qty:"Enough", store:"Aldi" },
  { id:"p42", name:"Carrots",                  category:"Fridge",   qty:"Enough", store:"Aldi" },
  { id:"p43", name:"Chocolate Chips",          category:"Fridge",   qty:"A Lot",  store:"Aldi" },
  { id:"p44", name:"Short Ribs",               category:"Freezer",  qty:"Enough", store:"Giant" },
  { id:"p45", name:"Chicken Breasts (5lb)",    category:"Freezer",  qty:"A Lot",  store:"Instacart" },
  { id:"p46", name:"Wings (16)",               category:"Freezer",  qty:"Enough", store:"Aldi" },
  { id:"p47", name:"Hotdogs",                  category:"Freezer",  qty:"Enough", store:"Aldi" },
  { id:"p48", name:"Patty Sausage",            category:"Freezer",  qty:"Enough", store:"Aldi" },
  { id:"p49", name:"Frozen Waffles",           category:"Freezer",  qty:"Enough", store:"Aldi" },
  { id:"p50", name:"Frozen Fruit",             category:"Freezer",  qty:"Enough", store:"Aldi" },
  { id:"p51", name:"Waffle Fries",             category:"Freezer",  qty:"Enough", store:"Aldi" },
  { id:"p52", name:"Season All",               category:"Seasoning",qty:"Out",    store:"Giant" },
  { id:"p53", name:"Granulated Garlic",        category:"Seasoning",qty:"A Lot",  store:"Aldi" },
  { id:"p54", name:"Granulated Onion",         category:"Seasoning",qty:"A Lot",  store:"Aldi" },
  { id:"p55", name:"Paprika",                  category:"Seasoning",qty:"A Lot",  store:"Aldi" },
  { id:"p56", name:"Italian Seasoning",        category:"Seasoning",qty:"A Lot",  store:"Aldi" },
  { id:"p57", name:"Thyme",                    category:"Seasoning",qty:"A Lot",  store:"Aldi" },
  { id:"p58", name:"Cayenne Pepper",           category:"Seasoning",qty:"A Lot",  store:"Aldi" },
  { id:"p59", name:"Grill Mates Roasted Garlic & Herb",category:"Seasoning",qty:"A Lot",store:"Giant" },
];

const weeklySpend = { [CURRENT_WEEK]: 98.34 };

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [meals, setMeals] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [pantry, setPantry] = useState(initialPantry);
  const [groceryList, setGroceryList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seeded, setSeeded] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState(CURRENT_WEEK);
  const [weekPickerOpen, setWeekPickerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("week");
  const [modal, setModal] = useState(null);
  const [modalText, setModalText] = useState("");
  const [recipeModal, setRecipeModal] = useState(null);
  const [newGroceryItem, setNewGroceryItem] = useState("");
  const [newGroceryStore, setNewGroceryStore] = useState("Aldi");
  const [newGroceryPrice, setNewGroceryPrice] = useState("");
  const [pantrySearch, setPantrySearch] = useState("");
  const [addPantryName, setAddPantryName] = useState("");
  const [addPantryStore, setAddPantryStore] = useState("Aldi");
  const [addPantryCategory, setAddPantryCategory] = useState("Cabinet");
  const [editIngredient, setEditIngredient] = useState(null);
  const dayRefs = useRef({});

  const isCurrentWeek = selectedWeek === CURRENT_WEEK;

  const loadData = useCallback(async () => {
    const { data: mealsData } = await supabase.from("meals").select("*");
    const { data: recipesData } = await supabase.from("recipes").select("*");
    if (mealsData && mealsData.length === 0 && !seeded) {
      await supabase.from("meals").insert(initialMeals);
      await supabase.from("recipes").insert(
        initialRecipes.map(r => ({ ...r, dishes: JSON.stringify(r.dishes), freezer_items: JSON.stringify(r.freezer_items), ingredients: JSON.stringify(r.ingredients), steps: JSON.stringify(r.steps) }))
      );
      setSeeded(true);
      setMeals(initialMeals);
      setRecipes(initialRecipes);
    } else {
      setMeals(mealsData || []);
      setRecipes((recipesData || []).map(r => ({ ...r,
        dishes: typeof r.dishes==="string"?JSON.parse(r.dishes):r.dishes||[],
        freezer_items: typeof r.freezer_items==="string"?JSON.parse(r.freezer_items):r.freezer_items||[],
        ingredients: typeof r.ingredients==="string"?JSON.parse(r.ingredients):r.ingredients||[],
        steps: typeof r.steps==="string"?JSON.parse(r.steps):r.steps||[]
      })));
    }
    setLoading(false);
  }, [seeded]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const s1 = supabase.channel("meals-ch").on("postgres_changes",{event:"*",schema:"public",table:"meals"},()=>loadData()).subscribe();
    const s2 = supabase.channel("recipes-ch").on("postgres_changes",{event:"*",schema:"public",table:"recipes"},()=>loadData()).subscribe();
    return () => { supabase.removeChannel(s1); supabase.removeChannel(s2); };
  }, [loadData]);

  const updateMeal = async (id, patch) => {
    setMeals(prev => prev.map(m => m.id===id?{...m,...patch}:m));
    await supabase.from("meals").update(patch).eq("id", id);
  };
  const vote = (id, person, val) => { const m=meals.find(x=>x.id===id); updateMeal(id,{[person]:m[person]===val?null:val}); };

  const toggleThaw = async (recipeId, itemId) => {
    const recipe = recipes.find(r=>r.id===recipeId);
    const newItems = recipe.freezer_items.map(f=>f.id===itemId?{...f,thawed:!f.thawed}:f);
    setRecipes(prev=>prev.map(r=>r.id!==recipeId?r:{...r,freezer_items:newItems}));
    await supabase.from("recipes").update({freezer_items:JSON.stringify(newItems)}).eq("id",recipeId);
    if (recipeModal?.id===recipeId) setRecipeModal(r=>({...r,freezer_items:newItems}));
  };

  const saveIngredientEdit = async (recipeId, updatedIngredients) => {
    setRecipes(prev=>prev.map(r=>r.id!==recipeId?r:{...r,ingredients:updatedIngredients}));
    await supabase.from("recipes").update({ingredients:JSON.stringify(updatedIngredients)}).eq("id",recipeId);
    setRecipeModal(prev=>({...prev,ingredients:updatedIngredients}));
    setEditIngredient(null);
  };

  const openModal = (id, type) => {
    const m=meals.find(x=>x.id===id);
    setModal({id,type});
    setModalText(type==="ian"?m.ian_note:type==="kayla"?m.kayla_note:m.cook_note);
  };
  const saveModal = () => {
    if (!modal) return;
    const patch=modal.type==="ian"?{ian_note:modalText}:modal.type==="kayla"?{kayla_note:modalText}:{cook_note:modalText};
    updateMeal(modal.id,patch);
    setModal(null);
  };
  const cycleStatus = (id) => {
    const m=meals.find(x=>x.id===id);
    if (m.status==="set") return;
    const order=["draft","cooked","confirmed"];
    updateMeal(id,{status:order[(order.indexOf(m.status)+1)%order.length]});
  };

  const updatePantryQty = (id, qty) => setPantry(prev=>prev.map(p=>p.id===id?{...p,qty}:p));
  const isLow = (qty) => qty==="Out"||qty==="A Little"||qty==="1";

  const addToGrocery = (name, store, price=null) => {
    if (groceryList.find(g=>g.name.toLowerCase()===name.toLowerCase())) return;
    setGroceryList(prev=>[...prev,{id:`g${Date.now()}`,name,store:store||"Aldi",price,checked:false}]);
  };
  const toggleGroceryCheck = (id) => setGroceryList(prev=>prev.map(g=>g.id===id?{...g,checked:!g.checked}:g));
  const removeGrocery = (id) => setGroceryList(prev=>prev.filter(g=>g.id!==id));
  const updateGroceryPrice = (id, price) => setGroceryList(prev=>prev.map(g=>g.id===id?{...g,price:parseFloat(price)||null}:g));
  const updateGroceryStore = (id, store) => setGroceryList(prev=>prev.map(g=>g.id===id?{...g,store}:g));

  const addManualGrocery = () => {
    if (!newGroceryItem.trim()) return;
    addToGrocery(newGroceryItem.trim(), newGroceryStore, newGroceryPrice?parseFloat(newGroceryPrice):null);
    setNewGroceryItem(""); setNewGroceryPrice("");
  };

  const addPantryItem = () => {
    if (!addPantryName.trim()) return;
    const qtyType = QTY_TYPE[addPantryCategory]||"words";
    setPantry(prev=>[...prev,{id:`p${Date.now()}`,name:addPantryName.trim(),category:addPantryCategory,qty:qtyType==="numbers"?"1":"Enough",store:addPantryStore}]);
    setAddPantryName("");
  };

  const scrollToDay = (day) => {
    const el = dayRefs.current[day];
    if (el) el.scrollIntoView({behavior:"smooth", block:"start"});
  };

  // Derived data
  const weekMeals = meals.filter(m=>m.week_key===selectedWeek);
  const weekDays = [...new Set(weekMeals.map(m=>m.day))].sort((a,b)=>DAY_ORDER.indexOf(a)-DAY_ORDER.indexOf(b));
  const dinnerCount = weekMeals.filter(m=>m.meal_type==="dinner").length;
  const approvedDinners = weekMeals.filter(m=>m.meal_type==="dinner"&&m.ian==="agree"&&m.kayla==="agree").length;
  const lowPantry = pantry.filter(p=>isLow(p.qty));
  const weeksWithMeals = {};
  meals.forEach(m=>{ if(!weeksWithMeals[m.week_key])weeksWithMeals[m.week_key]=0; if(m.meal_type==="dinner")weeksWithMeals[m.week_key]++; });

  // Grocery
  const mealIngredients = weekMeals.filter(m=>m.meal_type==="dinner"&&m.recipe_id).flatMap(m=>{
    const r=recipes.find(x=>x.id===m.recipe_id);
    return r?(r.ingredients||[]).filter(i=>i.price).map(i=>({name:i.name.split("—")[0].split("(")[0].trim(),store:(r.store||"Aldi").split("/")[0].trim(),price:i.price})):[];
  });
  const groceryByStore = STORES.reduce((acc,s)=>({...acc,[s]:[]}),{});
  groceryList.forEach(g=>{ const key=STORES.includes(g.store)?g.store:"Other"; groceryByStore[key].push(g); });
  const groceryTotal = groceryList.filter(g=>g.price).reduce((s,g)=>s+g.price,0);

  // Projected spend from upcoming planned meals
  const projectedIngredients = weekMeals.filter(m=>m.meal_type==="dinner"&&m.recipe_id&&m.status==="draft").flatMap(m=>{
    const r=recipes.find(x=>x.id===m.recipe_id);
    return r?(r.ingredients||[]).filter(i=>i.price).map(i=>i.price):[];
  });
  const projectedSpend = projectedIngredients.reduce((s,p)=>s+p,0);

  // Budget
  const currentMonthSpent = weeklySpend[CURRENT_WEEK]||0;
  const totalSpent = Object.values(weeklySpend).reduce((a,b)=>a+b,0);
  const budgetPct = Math.min(100,(currentMonthSpent/MONTHLY_BUDGET)*100);
  const overBudget = currentMonthSpent > MONTHLY_BUDGET;

  const filteredPantry = pantry.filter(p=>p.name.toLowerCase().includes(pantrySearch.toLowerCase()));
  const pantryByCategory = {};
  filteredPantry.forEach(p=>{ if(!pantryByCategory[p.category])pantryByCategory[p.category]=[]; pantryByCategory[p.category].push(p); });

  // ── Recipe Modal ──────────────────────────────────────────────────────────
  const RecipeModal = ({ recipe, onClose }) => {
    const totalCost=(recipe.ingredients||[]).filter(i=>i.price).reduce((s,i)=>s+i.price,0);
    const [costOpen,setCostOpen]=useState(false);
    const [editIdx,setEditIdx]=useState(null);
    const [editStore,setEditStore]=useState("");
    const [editPrice,setEditPrice]=useState("");

    const startEdit=(i,ing)=>{ setEditIdx(i); setEditStore(ing.store||""); setEditPrice(ing.price||""); };
    const saveEdit=()=>{
      const updated=(recipe.ingredients||[]).map((ing,i)=>i===editIdx?{...ing,store:editStore,price:editPrice?parseFloat(editPrice):ing.price}:ing);
      saveIngredientEdit(recipe.id,updated);
      setEditIdx(null);
    };

    return (
      <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:200,overflowY:"auto"}}>
        <div style={{background:"#faf9f6",borderRadius:"22px 22px 0 0",width:"100%",maxWidth:560,maxHeight:"92vh",overflowY:"auto"}}>
          <div style={{background:"linear-gradient(135deg,#1c3a2a,#2e5c3e)",borderRadius:"22px 22px 0 0",padding:"24px 20px 20px",color:"#f0ebe0"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div>
                <div style={{fontSize:22,fontWeight:"bold"}}>{recipe.name}</div>
                <div style={{fontSize:13,color:"#c8e0c8",marginTop:4}}>{recipe.description}</div>
              </div>
              <button onClick={onClose} style={{background:"rgba(255,255,255,0.15)",border:"none",borderRadius:20,padding:"5px 12px",color:"#fff",fontSize:13,cursor:"pointer"}}>✕</button>
            </div>
            <div style={{display:"flex",gap:10,marginTop:14,flexWrap:"wrap",alignItems:"center"}}>
              <span style={{background:recipe.status==="draft"?"#fef6ec":"#f3eeff",color:recipe.status==="draft"?"#b0813a":"#5a3d8a",borderRadius:20,padding:"3px 12px",fontSize:11,fontFamily:"sans-serif"}}>
                {recipe.status==="draft"?"📝 Draft":"🔒 Confirmed"}
              </span>
              <button onClick={()=>setCostOpen(!costOpen)} style={{background:costOpen?"#b0813a":"rgba(255,255,255,0.15)",border:"1px solid rgba(255,255,255,0.3)",borderRadius:20,padding:"3px 14px",color:"#fff",fontSize:12,fontFamily:"sans-serif",cursor:"pointer"}}>
                💰 Est. ${totalCost.toFixed(2)} {costOpen?"▲":"▼"}
              </button>
            </div>
            {costOpen&&(
              <div style={{marginTop:12,background:"rgba(0,0,0,0.2)",borderRadius:10,padding:"12px 14px"}}>
                {(recipe.ingredients||[]).filter(i=>i.price).map((ing,i)=>(
                  <div key={i} style={{display:"flex",justifyContent:"space-between",fontFamily:"sans-serif",fontSize:12,color:"#e0ebe0",paddingBottom:6,marginBottom:6,borderBottom:"1px solid rgba(255,255,255,0.1)"}}>
                    <span>{ing.name.split(" — ")[0].split(" (")[0]}</span>
                    <span style={{fontWeight:"bold"}}>${ing.price?.toFixed(2)}</span>
                  </div>
                ))}
                <div style={{display:"flex",justifyContent:"space-between",fontFamily:"sans-serif",fontSize:13,color:"#fff",fontWeight:"bold",paddingTop:4}}>
                  <span>Total</span><span>${totalCost.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>

          <div style={{padding:"20px 18px 40px"}}>
            {/* Time */}
            <div style={{display:"flex",gap:12,marginBottom:20}}>
              {[["⏱ Prep",recipe.prep_time],["🔥 Cook",recipe.cook_time]].map(([label,val])=>(
                <div key={label} style={{flex:1,background:"#fff",border:"1px solid #e0dbd0",borderRadius:10,padding:"10px 12px",textAlign:"center"}}>
                  <div style={{fontSize:11,fontFamily:"sans-serif",color:"#999",textTransform:"uppercase",letterSpacing:1}}>{label}</div>
                  <div style={{fontSize:13,fontWeight:"bold",color:val?"#1c2a1c":"#ccc",marginTop:4,fontFamily:"sans-serif"}}>{val||"TBC"}</div>
                </div>
              ))}
            </div>

            {/* Freezer */}
            {(recipe.freezer_items||[]).length>0&&(
              <div style={{background:"#eef6ff",border:"1px solid #b0d4f4",borderRadius:12,padding:"14px 16px",marginBottom:20}}>
                <div style={{fontSize:13,fontWeight:"bold",color:"#2a5a8a",marginBottom:10,fontFamily:"sans-serif"}}>🧊 Freezer Thaw Tracker</div>
                {(recipe.freezer_items||[]).map(item=>(
                  <button key={item.id} onClick={()=>toggleThaw(recipe.id,item.id)}
                    style={{display:"flex",alignItems:"center",justifyContent:"space-between",width:"100%",background:item.thawed?"#edfaf4":"#fff",border:`1.5px solid ${item.thawed?"#7ec8a0":"#b0d4f4"}`,borderRadius:8,padding:"8px 12px",fontFamily:"sans-serif",fontSize:12,color:item.thawed?"#2e7d5e":"#2a5a8a",cursor:"pointer",boxSizing:"border-box",marginBottom:6}}>
                    <span>{item.thawed?"✅":"🧊"} {item.label}</span>
                    <span style={{fontWeight:"bold",fontSize:11}}>{item.thawed?"Out of freezer ✓":"Tap — still frozen"}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Dishes */}
            <div style={{background:"#fff",border:"1px solid #e0dbd0",borderRadius:12,padding:"14px 16px",marginBottom:20}}>
              <div style={{fontSize:13,fontWeight:"bold",color:"#1c2a1c",marginBottom:10,fontFamily:"sans-serif"}}>🍽️ Dishes Needed</div>
              {(recipe.dishes||[]).map((d,i)=>(
                <div key={i} style={{fontFamily:"sans-serif",fontSize:13,color:"#555",paddingBottom:5,marginBottom:5,borderBottom:i<(recipe.dishes||[]).length-1?"1px solid #f0ece4":"none"}}>· {d}</div>
              ))}
            </div>

            {/* Ingredients with edit */}
            <div style={{background:"#fff",border:"1px solid #e0dbd0",borderRadius:12,padding:"14px 16px",marginBottom:20}}>
              <div style={{fontSize:13,fontWeight:"bold",color:"#1c2a1c",marginBottom:10,fontFamily:"sans-serif"}}>🧾 Ingredients <span style={{fontSize:11,color:"#aaa",fontWeight:"normal"}}>(tap price/store to edit)</span></div>
              {(recipe.ingredients||[]).map((ing,i)=>(
                <div key={i} style={{paddingBottom:10,marginBottom:10,borderBottom:i<(recipe.ingredients||[]).length-1?"1px solid #f0ece4":"none"}}>
                  {editIdx===i?(
                    <div style={{background:"#f9f6ff",borderRadius:8,padding:"10px"}}>
                      <div style={{fontFamily:"sans-serif",fontSize:13,color:"#444",marginBottom:8}}>· {ing.name}</div>
                      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                        <select value={editStore} onChange={e=>setEditStore(e.target.value)}
                          style={{flex:1,minWidth:80,border:"1px solid #ddd",borderRadius:8,padding:"6px",fontFamily:"sans-serif",fontSize:12}}>
                          <option value="">No store</option>
                          {STORES.map(s=><option key={s}>{s}</option>)}
                        </select>
                        <input type="number" value={editPrice} onChange={e=>setEditPrice(e.target.value)} placeholder="Price $"
                          style={{flex:1,minWidth:70,border:"1px solid #ddd",borderRadius:8,padding:"6px 10px",fontFamily:"sans-serif",fontSize:12}}/>
                        <button onClick={saveEdit} style={{background:"#1c3a2a",color:"#fff",border:"none",borderRadius:8,padding:"6px 12px",fontFamily:"sans-serif",fontSize:12,cursor:"pointer"}}>Save</button>
                        <button onClick={()=>setEditIdx(null)} style={{background:"#f4f4f2",color:"#555",border:"none",borderRadius:8,padding:"6px 12px",fontFamily:"sans-serif",fontSize:12,cursor:"pointer"}}>Cancel</button>
                      </div>
                    </div>
                  ):(
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                      <span style={{fontFamily:"sans-serif",fontSize:13,color:"#444",flex:1,paddingRight:10,lineHeight:1.4}}>· {ing.name}</span>
                      <button onClick={()=>startEdit(i,ing)}
                        style={{background:"#f9f9f7",border:"1px solid #e0dbd0",borderRadius:8,padding:"3px 10px",fontFamily:"sans-serif",fontSize:11,color:ing.price?"#2e7d5e":"#aaa",cursor:"pointer",whiteSpace:"nowrap"}}>
                        {ing.price?`$${ing.price.toFixed(2)}`:"+ price"} {ing.store?`· ${ing.store}`:""}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Steps */}
            <div style={{marginBottom:20}}>
              <div style={{fontSize:13,fontWeight:"bold",color:"#1c2a1c",marginBottom:12,fontFamily:"sans-serif"}}>👣 Steps</div>
              {(recipe.steps||[]).map(s=>(
                <div key={s.step} style={{background:"#fff",border:"1px solid #e0dbd0",borderRadius:12,padding:"14px 16px",marginBottom:10}}>
                  <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
                    <div style={{background:"#1c3a2a",color:"#fff",borderRadius:"50%",width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontFamily:"sans-serif",fontWeight:"bold",flexShrink:0}}>{s.step}</div>
                    <div>
                      <div style={{fontSize:14,fontWeight:"bold",color:"#1c2a1c",marginBottom:6,fontFamily:"sans-serif"}}>{s.title}</div>
                      <div style={{fontSize:13,color:"#555",fontFamily:"sans-serif",lineHeight:1.6}}>{s.detail}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {recipe.notes&&(
              <div style={{background:"#fef6ec",border:"1px solid #e8c98a",borderRadius:12,padding:"14px 16px"}}>
                <div style={{fontSize:13,fontWeight:"bold",color:"#b0813a",marginBottom:6,fontFamily:"sans-serif"}}>📝 Notes</div>
                <div style={{fontSize:13,color:"#7a5a20",fontFamily:"sans-serif",lineHeight:1.6}}>{recipe.notes}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",background:"#faf9f6",fontFamily:"sans-serif",color:"#888",flexDirection:"column",gap:12}}>
      <div style={{fontSize:32}}>🍽️</div><div>Loading Ian & Kayla's Meals...</div>
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{fontFamily:"'Georgia',serif",background:"#faf9f6",minHeight:"100vh",paddingBottom:80}}>

      {/* ── CALENDAR HEADER ── */}
      <div style={{background:"linear-gradient(135deg,#1c3a2a,#2e5c3e)",color:"#f0ebe0",position:"sticky",top:0,zIndex:50,boxShadow:"0 2px 12px rgba(0,0,0,0.3)"}}>

        {/* Title row */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 16px 8px"}}>
          <div>
            <div style={{fontSize:10,letterSpacing:3,textTransform:"uppercase",color:"#b0c9b0"}}>Shared Meal Plan</div>
            <div style={{fontSize:18,fontWeight:"bold",marginTop:2}}>🍽️ Ian & Kayla</div>
          </div>
          <button onClick={()=>setWeekPickerOpen(!weekPickerOpen)}
            style={{background:"rgba(255,255,255,0.12)",border:"1px solid rgba(255,255,255,0.25)",borderRadius:10,padding:"6px 12px",color:"#fff",fontSize:12,fontFamily:"sans-serif",cursor:"pointer"}}>
            🗓 {getWeekLabel(selectedWeek).split("–")[0].trim()} {weekPickerOpen?"▲":"▼"}
          </button>
        </div>

        {/* Low stock bar */}
        {lowPantry.length>0&&(
          <div style={{margin:"0 12px 8px",background:"rgba(192,57,43,0.3)",border:"1px solid rgba(192,57,43,0.5)",borderRadius:8,padding:"5px 12px",fontFamily:"sans-serif",fontSize:11,color:"#ffd0c8"}}>
            ⚠️ Low: {lowPantry.slice(0,4).map(i=>i.name).join(", ")}{lowPantry.length>4?` +${lowPantry.length-4} more`:""}
          </div>
        )}

        {/* 7-day calendar strip */}
        {activeTab==="week"&&(
          <div style={{display:"flex",borderTop:"1px solid rgba(255,255,255,0.1)"}}>
            {DAY_ORDER.map(day=>{
              const dayMs = weekMeals.filter(m=>m.day===day);
              const dinnerEmojis = dayMs.filter(m=>m.meal_type==="dinner").map(m=>m.emoji);
              const hasMeals = dayMs.length>0;
              const allGood = dayMs.filter(m=>m.meal_type==="dinner").every(m=>m.ian==="agree"&&m.kayla==="agree") && dayMs.filter(m=>m.meal_type==="dinner").length>0;
              return (
                <button key={day} onClick={()=>{ if(hasMeals) scrollToDay(day); }}
                  style={{flex:1,background:"transparent",border:"none",borderRight:"1px solid rgba(255,255,255,0.08)",padding:"8px 4px 10px",color:hasMeals?"#fff":"rgba(255,255,255,0.3)",fontFamily:"sans-serif",cursor:hasMeals?"pointer":"default",textAlign:"center",transition:"background 0.2s"}}>
                  <div style={{fontSize:9,textTransform:"uppercase",letterSpacing:0.5,color:hasMeals?"#b0c9b0":"rgba(255,255,255,0.2)"}}>{DAY_SHORT[day]}</div>
                  <div style={{fontSize:16,margin:"3px 0"}}>{hasMeals?(dinnerEmojis[0]||DAY_EMOJIS[day]):"·"}</div>
                  {allGood&&<div style={{fontSize:9,color:"#a0d4b8"}}>✓</div>}
                  {!hasMeals&&<div style={{fontSize:9,color:"rgba(255,255,255,0.15)"}}>–</div>}
                </button>
              );
            })}
          </div>
        )}

        {!isCurrentWeek&&(
          <div style={{padding:"6px 12px 8px"}}>
            <button onClick={()=>{setSelectedWeek(CURRENT_WEEK);setWeekPickerOpen(false);}}
              style={{background:"#b0813a",border:"none",borderRadius:10,padding:"4px 14px",color:"#fff",fontSize:11,fontFamily:"sans-serif",cursor:"pointer"}}>
              ↩ Back to Current Week
            </button>
          </div>
        )}
      </div>

      {/* WEEK PICKER */}
      {weekPickerOpen&&(
        <div style={{background:"#fff",borderBottom:"2px solid #e0dbd0",padding:"16px",maxHeight:300,overflowY:"auto",position:"sticky",top:0,zIndex:40}}>
          <div style={{fontSize:10,fontFamily:"sans-serif",color:"#888",letterSpacing:2,textTransform:"uppercase",marginBottom:8}}>Current</div>
          <button onClick={()=>{setSelectedWeek(CURRENT_WEEK);setWeekPickerOpen(false);}}
            style={{width:"100%",background:selectedWeek===CURRENT_WEEK?"#1c3a2a":"#f4faf6",color:selectedWeek===CURRENT_WEEK?"#fff":"#1c3a2a",border:"1.5px solid #2e7d5e",borderRadius:10,padding:"10px 14px",fontFamily:"sans-serif",fontSize:13,cursor:"pointer",textAlign:"left",marginBottom:12,fontWeight:"bold"}}>
            📅 {getWeekLabel(CURRENT_WEEK)} — This Week
          </button>
          {[{label:"Upcoming",weeks:futureWeeks.slice(0,6)},{label:"Past Weeks",weeks:[...pastWeeks].reverse()}].map(({label,weeks})=>(
            weeks.length>0&&<div key={label}>
              <div style={{fontSize:10,fontFamily:"sans-serif",color:"#888",letterSpacing:2,textTransform:"uppercase",marginBottom:8,marginTop:8}}>{label}</div>
              {weeks.map(w=>(
                <button key={w} onClick={()=>{setSelectedWeek(w);setWeekPickerOpen(false);}}
                  style={{width:"100%",background:selectedWeek===w?"#1c3a2a":"#f9f9f7",color:selectedWeek===w?"#fff":"#555",border:`1px solid ${selectedWeek===w?"#1c3a2a":"#e0dbd0"}`,borderRadius:10,padding:"9px 14px",fontFamily:"sans-serif",fontSize:13,cursor:"pointer",textAlign:"left",marginBottom:6}}>
                  {getWeekLabel(w)} {weeksWithMeals[w]?`· ${weeksWithMeals[w]} dinners`:"· No plans yet"}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* ── WEEK TAB ── */}
      {activeTab==="week"&&(
        <div style={{padding:"16px 14px"}}>
          {weekMeals.length===0?(
            <div style={{padding:"60px 20px",textAlign:"center"}}>
              <div style={{fontSize:36,marginBottom:12}}>🗓️</div>
              <div style={{fontFamily:"sans-serif",fontSize:16,color:"#888",fontWeight:"bold"}}>No plans yet for this week</div>
              <div style={{fontFamily:"sans-serif",fontSize:13,color:"#aaa",marginTop:6}}>Come back to Claude to plan!</div>
            </div>
          ):(
            weekDays.map(day=>{
              const dayMs = weekMeals.filter(m=>m.day===day);
              return (
                <div key={day} ref={el=>dayRefs.current[day]=el} style={{marginBottom:28,scrollMarginTop:160}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12,paddingBottom:8,borderBottom:"2px solid #e0dbd0"}}>
                    <span style={{fontSize:18}}>{DAY_EMOJIS[day]||"📅"}</span>
                    <div>
                      <div style={{fontFamily:"sans-serif",fontWeight:"bold",fontSize:14,color:"#1c3a2a",textTransform:"uppercase",letterSpacing:1}}>{day}</div>
                      <div style={{fontFamily:"sans-serif",fontSize:11,color:"#aaa"}}>{dayMs[0]?.date}</div>
                    </div>
                    <div style={{marginLeft:"auto",fontFamily:"sans-serif",fontSize:11,color:"#aaa"}}>{approvedDinners}/{dinnerCount} approved</div>
                  </div>

                  {["breakfast","lunch","dinner"].map(type=>{
                    const typeMeals=dayMs.filter(m=>m.meal_type===type);
                    if (!typeMeals.length) return null;
                    const tc=mealTypeColors[type];
                    return (
                      <div key={type} style={{marginBottom:14}}>
                        <div style={{fontSize:10,fontFamily:"sans-serif",letterSpacing:2,textTransform:"uppercase",color:tc.label,marginBottom:6,paddingLeft:2}}>
                          {type==="breakfast"?"☀️ Breakfast":type==="lunch"?"🌤 Lunch":"🌙 Dinner"}
                        </div>
                        {typeMeals.map(meal=>{
                          const st=statusLabels[meal.status]||statusLabels.draft;
                          const storeColor=storeColors[meal.store]||"#777";
                          const linkedRecipe=meal.recipe_id?recipes.find(r=>r.id===meal.recipe_id):null;
                          const bothAgree=meal.ian==="agree"&&meal.kayla==="agree";
                          const anyDisagree=meal.ian==="disagree"||meal.kayla==="disagree";
                          return (
                            <div key={meal.id} style={{background:"#fff",borderRadius:14,border:`1px solid ${anyDisagree?"#f4a89a":bothAgree?"#7ec8a0":tc.border}`,boxShadow:"0 2px 10px rgba(0,0,0,0.06)",overflow:"hidden",marginBottom:10}}>
                              <div style={{background:tc.strip,height:4}}/>
                              <div style={{padding:"14px 16px 12px"}}>
                                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                                    <span style={{fontSize:22}}>{meal.emoji}</span>
                                    <div>
                                      <div style={{fontSize:17,fontWeight:"bold",color:"#1c2a1c"}}>{meal.name}</div>
                                      {meal.store&&<div style={{fontSize:11,fontFamily:"sans-serif",color:storeColor,fontWeight:"bold",marginTop:1}}>🛒 {meal.store} · {storeTypeIcons[meal.store_type]}</div>}
                                    </div>
                                  </div>
                                  {meal.status!=="set"&&<button onClick={()=>cycleStatus(meal.id)} style={{background:st.bg,color:st.color,border:`1px solid ${st.color}55`,borderRadius:16,padding:"3px 10px",fontSize:10,fontFamily:"sans-serif",cursor:"pointer"}}>{st.label}</button>}
                                </div>
                                <p style={{margin:"0 0 10px",fontSize:13,color:"#666",fontFamily:"sans-serif",lineHeight:1.5}}>{meal.description}</p>

                                {linkedRecipe?.freezer_items?.length>0&&(
                                  <div style={{marginBottom:10}}>
                                    {linkedRecipe.freezer_items.map(item=>(
                                      <button key={item.id} onClick={()=>toggleThaw(linkedRecipe.id,item.id)}
                                        style={{display:"flex",alignItems:"center",justifyContent:"space-between",width:"100%",background:item.thawed?"#edfaf4":"#eef6ff",border:`1.5px solid ${item.thawed?"#7ec8a0":"#b0d4f4"}`,borderRadius:8,padding:"9px 12px",marginBottom:6,fontFamily:"sans-serif",fontSize:12,color:item.thawed?"#2e7d5e":"#2a5a8a",cursor:"pointer",textAlign:"left",boxSizing:"border-box"}}>
                                        <span>{item.thawed?"✅":"🧊"} {item.label}</span>
                                        <span style={{fontWeight:"bold",fontSize:11}}>{item.thawed?"Out of freezer ✓":"Tap — still frozen"}</span>
                                      </button>
                                    ))}
                                  </div>
                                )}

                                {meal.meal_type==="dinner"&&(<>
                                  <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12,alignItems:"center"}}>
                                    <div style={{fontSize:11,fontFamily:"sans-serif",color:"#999",marginRight:2}}>👨🏾‍🍳 Cook:</div>
                                    {cookOptions.map(opt=>(
                                      <button key={opt} onClick={()=>updateMeal(meal.id,{cook:meal.cook===opt?null:opt})}
                                        style={{background:meal.cook===opt?"#1c3a2a":"#f4f4f2",color:meal.cook===opt?"#fff":"#555",border:`1px solid ${meal.cook===opt?"#1c3a2a":"#ddd"}`,borderRadius:20,padding:"4px 12px",fontSize:11,fontFamily:"sans-serif",cursor:"pointer"}}>{opt}</button>
                                    ))}
                                  </div>
                                  {linkedRecipe?(
                                    <button onClick={()=>setRecipeModal(linkedRecipe)}
                                      style={{marginBottom:12,background:linkedRecipe.status==="draft"?"#fef6ec":"#f3eeff",color:linkedRecipe.status==="draft"?"#b0813a":"#5a3d8a",border:`1px solid ${linkedRecipe.status==="draft"?"#e8c98a":"#c4a8f0"}`,borderRadius:8,padding:"7px 16px",fontSize:12,fontFamily:"sans-serif",cursor:"pointer"}}>
                                      📖 {linkedRecipe.status==="draft"?"View Draft Recipe":"View Recipe"}
                                    </button>
                                  ):(
                                    <div style={{fontSize:11,fontFamily:"sans-serif",color:"#bbb",fontStyle:"italic",marginBottom:12}}>Recipe TBD — confirm after cooking</div>
                                  )}
                                  <div style={{borderTop:"1px solid #f0ece4",paddingTop:12}}>
                                    {["ian","kayla"].map(person=>(
                                      <div key={person} style={{marginBottom:person==="ian"?12:0}}>
                                        <div style={{fontSize:11,fontFamily:"sans-serif",color:"#888",marginBottom:6,textTransform:"uppercase",letterSpacing:1}}>{person==="ian"?"Ian's Call":"Kayla's Call"}</div>
                                        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                                          {["agree","disagree"].map(v=>(
                                            <button key={v} onClick={()=>vote(meal.id,person,v)}
                                              style={{background:meal[person]===v?(v==="agree"?"#2e7d5e":"#c0392b"):"#f9f9f7",color:meal[person]===v?"#fff":v==="agree"?"#2e7d5e":"#c0392b",border:`1.5px solid ${v==="agree"?"#2e7d5e":"#c0392b"}`,borderRadius:8,padding:"6px 16px",fontSize:12,fontFamily:"sans-serif",cursor:"pointer"}}>
                                              {v==="agree"?"👍 Looks good":"👎 Swap it"}
                                            </button>
                                          ))}
                                          <button onClick={()=>openModal(meal.id,person)}
                                            style={{background:meal[`${person}_note`]?"#fef6ec":"#f9f9f7",color:meal[`${person}_note`]?"#b0813a":"#aaa",border:`1px solid ${meal[`${person}_note`]?"#b0813a":"#ddd"}`,borderRadius:8,padding:"6px 12px",fontSize:12,fontFamily:"sans-serif",cursor:"pointer"}}>
                                            💬 {meal[`${person}_note`]?"Note ✓":"Note"}
                                          </button>
                                        </div>
                                        {meal[`${person}_note`]&&<div style={{marginTop:6,background:"#fef6ec",borderRadius:7,padding:"7px 10px",fontSize:12,fontFamily:"sans-serif",color:"#7a5a20",borderLeft:"3px solid #b0813a"}}><strong>{person==="ian"?"Ian":"Kayla"}:</strong> {meal[`${person}_note`]}</div>}
                                      </div>
                                    ))}
                                  </div>
                                  {meal.cook_note&&<div style={{marginTop:10,background:"#edfaf4",borderRadius:8,padding:"8px 12px",fontSize:12,fontFamily:"sans-serif",color:"#2e5c3e",borderLeft:"3px solid #2e7d5e"}}><strong>After cooking:</strong> {meal.cook_note}</div>}
                                  {meal.status==="cooked"&&!meal.cook_note&&(
                                    <button onClick={()=>openModal(meal.id,"cook")} style={{marginTop:10,background:"#edfaf4",color:"#2e7d5e",border:"1px dashed #2e7d5e",borderRadius:8,padding:"6px 12px",fontSize:12,fontFamily:"sans-serif",cursor:"pointer"}}>+ Add cook notes to lock in recipe</button>
                                  )}
                                </>)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── RECIPES TAB ── */}
      {activeTab==="library"&&(
        <div style={{padding:"20px 14px"}}>
          {recipes.map(recipe=>{
            const totalCost=(recipe.ingredients||[]).filter(i=>i.price).reduce((s,i)=>s+i.price,0);
            return (
              <div key={recipe.id} onClick={()=>setRecipeModal(recipe)}
                style={{background:"#fff",borderRadius:14,border:"1px solid #e0dbd0",boxShadow:"0 2px 8px rgba(0,0,0,0.05)",padding:"16px",marginBottom:14,cursor:"pointer"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <div>
                    <div style={{fontSize:17,fontWeight:"bold",color:"#1c2a1c"}}>{recipe.name}</div>
                    <div style={{fontSize:12,fontFamily:"sans-serif",color:"#888",marginTop:3}}>{recipe.description}</div>
                  </div>
                  <span style={{background:recipe.status==="draft"?"#fef6ec":"#f3eeff",color:recipe.status==="draft"?"#b0813a":"#5a3d8a",borderRadius:20,padding:"3px 10px",fontSize:10,fontFamily:"sans-serif",whiteSpace:"nowrap",marginLeft:8}}>
                    {recipe.status==="draft"?"📝 Draft":"🔒 Locked"}
                  </span>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",marginTop:10,fontFamily:"sans-serif",fontSize:12,color:"#888"}}>
                  <span>💰 Est. ${totalCost.toFixed(2)}</span><span style={{color:"#b0813a"}}>Tap to view →</span>
                </div>
              </div>
            );
          })}
          <div style={{background:"#f3eeff",border:"1px dashed #c4a8f0",borderRadius:14,padding:"20px",textAlign:"center"}}>
            <div style={{fontSize:20,marginBottom:6}}>🍳</div>
            <div style={{fontFamily:"sans-serif",color:"#8a6ab0",fontSize:13}}>More recipes appear as you cook & confirm!</div>
          </div>
        </div>
      )}

      {/* ── GROCERY TAB ── */}
      {activeTab==="grocery"&&(
        <div style={{padding:"16px 14px"}}>

          {/* From this week's meals */}
          {mealIngredients.length>0&&(
            <div style={{background:"#f4faf6",border:"1px solid #7ec8a0",borderRadius:12,padding:"14px",marginBottom:16}}>
              <div style={{fontFamily:"sans-serif",fontSize:13,fontWeight:"bold",color:"#1c5a38",marginBottom:10}}>🍽️ From this week's meals</div>
              {mealIngredients.map((ing,i)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                  <div>
                    <div style={{fontFamily:"sans-serif",fontSize:13,color:"#333"}}>· {ing.name}</div>
                    <div style={{fontFamily:"sans-serif",fontSize:11,color:"#aaa"}}>{ing.store} · ${ing.price?.toFixed(2)}</div>
                  </div>
                  <button onClick={()=>addToGrocery(ing.name,ing.store,ing.price)}
                    style={{background:groceryList.find(g=>g.name===ing.name)?"#e0e0e0":"#2e7d5e",color:groceryList.find(g=>g.name===ing.name)?"#888":"#fff",border:"none",borderRadius:20,padding:"4px 12px",fontSize:11,fontFamily:"sans-serif",cursor:"pointer"}}>
                    {groceryList.find(g=>g.name===ing.name)?"Added ✓":"+Add"}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Low stock */}
          {lowPantry.length>0&&(
            <div style={{background:"#fff8ec",border:"1px solid #f0c96e",borderRadius:12,padding:"14px",marginBottom:16}}>
              <div style={{fontFamily:"sans-serif",fontSize:13,fontWeight:"bold",color:"#b07a10",marginBottom:10}}>⚠️ Low Stock</div>
              {lowPantry.map(item=>(
                <div key={item.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                  <div>
                    <div style={{fontFamily:"sans-serif",fontSize:13,color:"#444"}}>· {item.name}</div>
                    <div style={{fontFamily:"sans-serif",fontSize:11,color:"#aaa"}}>{item.store} · {item.qty}</div>
                  </div>
                  <button onClick={()=>addToGrocery(item.name,item.store)}
                    style={{background:groceryList.find(g=>g.name===item.name)?"#e0e0e0":"#b0813a",color:groceryList.find(g=>g.name===item.name)?"#888":"#fff",border:"none",borderRadius:20,padding:"4px 12px",fontSize:11,fontFamily:"sans-serif",cursor:"pointer"}}>
                    {groceryList.find(g=>g.name===item.name)?"Added ✓":"+Add"}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add item */}
          <div style={{background:"#fff",border:"1px solid #e0dbd0",borderRadius:12,padding:"14px",marginBottom:16}}>
            <div style={{fontFamily:"sans-serif",fontSize:13,fontWeight:"bold",color:"#1c2a1c",marginBottom:10}}>➕ Add Item</div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:8}}>
              <input value={newGroceryItem} onChange={e=>setNewGroceryItem(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addManualGrocery()}
                placeholder="Item name..."
                style={{flex:2,minWidth:120,border:"1px solid #ddd",borderRadius:8,padding:"8px 12px",fontFamily:"sans-serif",fontSize:13}}/>
              <input type="number" value={newGroceryPrice} onChange={e=>setNewGroceryPrice(e.target.value)} placeholder="$ price"
                style={{flex:1,minWidth:70,border:"1px solid #ddd",borderRadius:8,padding:"8px 10px",fontFamily:"sans-serif",fontSize:13}}/>
            </div>
            <div style={{display:"flex",gap:8}}>
              <select value={newGroceryStore} onChange={e=>setNewGroceryStore(e.target.value)}
                style={{flex:1,border:"1px solid #ddd",borderRadius:8,padding:"8px",fontFamily:"sans-serif",fontSize:13}}>
                {STORES.map(s=><option key={s}>{s}</option>)}
              </select>
              <button onClick={addManualGrocery}
                style={{background:"#1c3a2a",color:"#fff",border:"none",borderRadius:8,padding:"8px 18px",fontFamily:"sans-serif",fontSize:13,cursor:"pointer"}}>Add</button>
            </div>
          </div>

          {/* List by store */}
          {groceryList.length===0?(
            <div style={{textAlign:"center",padding:"40px 20px",fontFamily:"sans-serif",color:"#aaa"}}>
              <div style={{fontSize:28,marginBottom:8}}>🛒</div>
              <div>Your grocery list is empty!</div>
            </div>
          ):(
            <>
              {STORES.map(store=>{
                const items=groceryByStore[store]||[];
                if (!items.length) return null;
                return (
                  <div key={store} style={{marginBottom:16}}>
                    <div style={{fontFamily:"sans-serif",fontSize:12,fontWeight:"bold",color:storeColors[store]||"#555",textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>
                      🛒 {store}
                    </div>
                    <div style={{background:"#fff",border:"1px solid #e0dbd0",borderRadius:12,overflow:"hidden"}}>
                      {items.map((item,i)=>(
                        <div key={item.id} style={{padding:"10px 14px",borderBottom:i<items.length-1?"1px solid #f4f4f2":"none"}}>
                          <div style={{display:"flex",alignItems:"center",gap:10}}>
                            <button onClick={()=>toggleGroceryCheck(item.id)}
                              style={{width:22,height:22,borderRadius:"50%",border:`2px solid ${item.checked?"#2e7d5e":"#ccc"}`,background:item.checked?"#2e7d5e":"transparent",cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:12}}>
                              {item.checked?"✓":""}
                            </button>
                            <span style={{flex:1,fontFamily:"sans-serif",fontSize:13,color:item.checked?"#aaa":"#333",textDecoration:item.checked?"line-through":"none"}}>{item.name}</span>
                            <button onClick={()=>removeGrocery(item.id)} style={{background:"none",border:"none",color:"#ddd",cursor:"pointer",fontSize:18,lineHeight:1}}>×</button>
                          </div>
                          {/* Inline store + price edit */}
                          <div style={{display:"flex",gap:8,marginTop:6,marginLeft:32}}>
                            <select value={item.store} onChange={e=>updateGroceryStore(item.id,e.target.value)}
                              style={{border:"1px solid #eee",borderRadius:6,padding:"3px 6px",fontFamily:"sans-serif",fontSize:11,color:"#888",background:"#fafafa"}}>
                              {STORES.map(s=><option key={s}>{s}</option>)}
                            </select>
                            <div style={{display:"flex",alignItems:"center",gap:4}}>
                              <span style={{fontFamily:"sans-serif",fontSize:11,color:"#aaa"}}>$</span>
                              <input type="number" value={item.price||""} onChange={e=>updateGroceryPrice(item.id,e.target.value)} placeholder="price"
                                style={{width:60,border:"1px solid #eee",borderRadius:6,padding:"3px 6px",fontFamily:"sans-serif",fontSize:11,color:item.price?"#2e7d5e":"#aaa"}}/>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Projected + total */}
              <div style={{background:"#fff",border:"1px solid #e0dbd0",borderRadius:12,padding:"16px",marginTop:8}}>
                <div style={{fontFamily:"sans-serif",fontSize:13,fontWeight:"bold",color:"#1c2a1c",marginBottom:12}}>💰 Spend Summary</div>
                <div style={{display:"flex",justifyContent:"space-between",fontFamily:"sans-serif",fontSize:13,color:"#555",marginBottom:8}}>
                  <span>Current list total</span>
                  <span style={{fontWeight:"bold",color:"#1c2a1c"}}>${groceryTotal.toFixed(2)}</span>
                </div>
                {projectedSpend>0&&(
                  <div style={{display:"flex",justifyContent:"space-between",fontFamily:"sans-serif",fontSize:13,color:"#555",marginBottom:8}}>
                    <span>Projected (uncooked meals)</span>
                    <span style={{fontWeight:"bold",color:"#b0813a"}}>${projectedSpend.toFixed(2)}</span>
                  </div>
                )}
                <div style={{borderTop:"1px solid #f0ece4",paddingTop:8,display:"flex",justifyContent:"space-between",fontFamily:"sans-serif",fontSize:14,fontWeight:"bold"}}>
                  <span>Est. total</span>
                  <span style={{color:(groceryTotal+projectedSpend)>MONTHLY_BUDGET?"#c0392b":"#2e7d5e"}}>${(groceryTotal+projectedSpend).toFixed(2)}</span>
                </div>
                <div style={{fontFamily:"sans-serif",fontSize:11,color:"#aaa",marginTop:6,textAlign:"right"}}>Monthly budget: ${MONTHLY_BUDGET}</div>
              </div>

              <button onClick={()=>setGroceryList([])}
                style={{width:"100%",background:"#f4f4f2",color:"#888",border:"1px solid #ddd",borderRadius:10,padding:"10px",fontFamily:"sans-serif",fontSize:13,cursor:"pointer",marginTop:12}}>
                🗑 Clear List
              </button>
            </>
          )}
        </div>
      )}

      {/* ── PANTRY TAB ── */}
      {activeTab==="pantry"&&(
        <div style={{padding:"16px 14px"}}>
          <input value={pantrySearch} onChange={e=>setPantrySearch(e.target.value)} placeholder="🔍 Search pantry..."
            style={{width:"100%",border:"1px solid #ddd",borderRadius:10,padding:"10px 14px",fontFamily:"sans-serif",fontSize:13,marginBottom:14,boxSizing:"border-box"}}/>

          {lowPantry.length>0&&(
            <div style={{background:"#fff8ec",border:"1px solid #f0c96e",borderRadius:12,padding:"12px 14px",marginBottom:14}}>
              <div style={{fontFamily:"sans-serif",fontSize:12,fontWeight:"bold",color:"#b07a10",marginBottom:8}}>⚠️ Needs Restocking</div>
              {lowPantry.map(item=>(
                <div key={item.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                  <span style={{fontFamily:"sans-serif",fontSize:13,color:"#7a5a20"}}>· {item.name} <span style={{color:"#b07a10",fontSize:11}}>({item.qty})</span></span>
                  <div style={{display:"flex",gap:6}}>
                    <button onClick={()=>addToGrocery(item.name,item.store)}
                      style={{background:"#b0813a",color:"#fff",border:"none",borderRadius:20,padding:"3px 10px",fontSize:11,fontFamily:"sans-serif",cursor:"pointer"}}>+List</button>
                    <button onClick={()=>updatePantryQty(item.id,QTY_TYPE[item.category]==="numbers"?"1":"Enough")}
                      style={{background:"#2e7d5e",color:"#fff",border:"none",borderRadius:20,padding:"3px 10px",fontSize:11,fontFamily:"sans-serif",cursor:"pointer"}}>Restocked</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {Object.entries(pantryByCategory).map(([cat,items])=>(
            <div key={cat} style={{marginBottom:16}}>
              <div style={{fontFamily:"sans-serif",fontSize:11,fontWeight:"bold",color:"#888",textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>{cat}</div>
              <div style={{background:"#fff",border:"1px solid #e0dbd0",borderRadius:12,overflow:"hidden"}}>
                {items.map((item,i)=>{
                  const qtyType=QTY_TYPE[item.category]||"words";
                  const options=qtyType==="numbers"?QTY_NUMBERS:QTY_WORDS;
                  const low=isLow(item.qty);
                  return (
                    <div key={item.id} style={{padding:"10px 14px",borderBottom:i<items.length-1?"1px solid #f4f4f2":"none"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                        <div>
                          <div style={{fontFamily:"sans-serif",fontSize:13,color:low?"#b07a10":"#333",fontWeight:low?"bold":"normal"}}>{item.name}</div>
                          <div style={{fontFamily:"sans-serif",fontSize:11,color:"#aaa"}}>{item.store}</div>
                        </div>
                        {low&&(
                          <button onClick={()=>addToGrocery(item.name,item.store)}
                            style={{background:"#1c3a2a",color:"#fff",border:"none",borderRadius:20,padding:"3px 10px",fontSize:10,fontFamily:"sans-serif",cursor:"pointer"}}>+List</button>
                        )}
                      </div>
                      {/* Qty selector */}
                      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                        {options.map(opt=>(
                          <button key={opt} onClick={()=>updatePantryQty(item.id,opt)}
                            style={{background:item.qty===opt?(opt==="Out"?"#c0392b":opt==="A Little"||opt==="1"?"#b0813a":"#2e7d5e"):"#f4f4f2",color:item.qty===opt?"#fff":"#888",border:`1px solid ${item.qty===opt?(opt==="Out"?"#c0392b":opt==="A Little"||opt==="1"?"#b0813a":"#2e7d5e"):"#e0e0e0"}`,borderRadius:20,padding:"3px 10px",fontSize:11,fontFamily:"sans-serif",cursor:"pointer"}}>
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Add pantry item */}
          <div style={{background:"#fff",border:"1px solid #e0dbd0",borderRadius:12,padding:"14px",marginTop:4}}>
            <div style={{fontFamily:"sans-serif",fontSize:13,fontWeight:"bold",color:"#1c2a1c",marginBottom:10}}>➕ Add to Pantry</div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              <input value={addPantryName} onChange={e=>setAddPantryName(e.target.value)} placeholder="Item name..."
                style={{flex:2,minWidth:120,border:"1px solid #ddd",borderRadius:8,padding:"8px 12px",fontFamily:"sans-serif",fontSize:13}}/>
              <select value={addPantryStore} onChange={e=>setAddPantryStore(e.target.value)}
                style={{flex:1,minWidth:80,border:"1px solid #ddd",borderRadius:8,padding:"8px",fontFamily:"sans-serif",fontSize:13}}>
                {STORES.map(s=><option key={s}>{s}</option>)}
              </select>
              <select value={addPantryCategory} onChange={e=>setAddPantryCategory(e.target.value)}
                style={{flex:1,minWidth:80,border:"1px solid #ddd",borderRadius:8,padding:"8px",fontFamily:"sans-serif",fontSize:13}}>
                {PANTRY_CATEGORIES.map(c=><option key={c}>{c}</option>)}
              </select>
              <button onClick={addPantryItem}
                style={{background:"#1c3a2a",color:"#fff",border:"none",borderRadius:8,padding:"8px 16px",fontFamily:"sans-serif",fontSize:13,cursor:"pointer"}}>Add</button>
            </div>
          </div>
        </div>
      )}

      {/* ── ANALYTICS TAB ── */}
      {activeTab==="analytics"&&(
        <div style={{padding:"16px 14px"}}>
          <div style={{background:"#fff",border:"1px solid #e0dbd0",borderRadius:14,padding:"18px",marginBottom:16}}>
            <div style={{fontFamily:"sans-serif",fontWeight:"bold",fontSize:15,color:"#1c2a1c",marginBottom:4}}>💰 Monthly Budget</div>
            <div style={{fontFamily:"sans-serif",fontSize:12,color:"#888",marginBottom:14}}>June 2026 · ${MONTHLY_BUDGET} budget</div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:10}}>
              <div>
                <div style={{fontFamily:"sans-serif",fontSize:28,fontWeight:"bold",color:overBudget?"#c0392b":"#2e7d5e"}}>${currentMonthSpent.toFixed(2)}</div>
                <div style={{fontFamily:"sans-serif",fontSize:12,color:"#888"}}>spent this month</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontFamily:"sans-serif",fontSize:18,fontWeight:"bold",color:overBudget?"#c0392b":"#2e7d5e"}}>${(MONTHLY_BUDGET-currentMonthSpent).toFixed(2)}</div>
                <div style={{fontFamily:"sans-serif",fontSize:12,color:"#888"}}>{overBudget?"over budget":"remaining"}</div>
              </div>
            </div>
            <div style={{background:"#f0f0f0",borderRadius:20,height:20,overflow:"hidden",marginBottom:8}}>
              <div style={{background:overBudget?"linear-gradient(90deg,#e74c3c,#c0392b)":"linear-gradient(90deg,#27ae60,#2e7d5e)",height:"100%",width:`${budgetPct}%`,borderRadius:20,display:"flex",alignItems:"center",justifyContent:"flex-end",paddingRight:8}}>
                <span style={{color:"#fff",fontSize:10,fontFamily:"sans-serif",fontWeight:"bold"}}>{Math.round(budgetPct)}%</span>
              </div>
            </div>
            {projectedSpend>0&&(
              <div style={{fontFamily:"sans-serif",fontSize:12,color:"#b0813a",marginTop:8}}>
                📊 Projected additional spend from planned meals: <strong>${projectedSpend.toFixed(2)}</strong>
              </div>
            )}
          </div>

          <div style={{background:"#fff",border:"1px solid #e0dbd0",borderRadius:14,padding:"18px",marginBottom:16}}>
            <div style={{fontFamily:"sans-serif",fontWeight:"bold",fontSize:15,color:"#1c2a1c",marginBottom:14}}>📅 Weekly Spend</div>
            {Object.entries(weeklySpend).map(([wk,amt])=>{
              const pct=Math.min(100,(amt/MONTHLY_BUDGET)*100);
              const over=amt>MONTHLY_BUDGET;
              return (
                <div key={wk} style={{marginBottom:12}}>
                  <div style={{display:"flex",justifyContent:"space-between",fontFamily:"sans-serif",fontSize:12,color:"#555",marginBottom:4}}>
                    <span>{getWeekLabel(wk)}{wk===CURRENT_WEEK?" (current)":""}</span>
                    <span style={{fontWeight:"bold",color:over?"#c0392b":"#2e7d5e"}}>${amt.toFixed(2)}</span>
                  </div>
                  <div style={{background:"#f0f0f0",borderRadius:20,height:10,overflow:"hidden"}}>
                    <div style={{background:over?"#c0392b":"#2e7d5e",height:"100%",width:`${pct}%`,borderRadius:20}}/>
                  </div>
                </div>
              );
            })}
            <div style={{marginTop:10,fontFamily:"sans-serif",fontSize:12,color:"#888",borderTop:"1px solid #f0f0f0",paddingTop:10}}>
              Total this month: <strong style={{color:"#1c2a1c"}}>${totalSpent.toFixed(2)}</strong> of <strong>${MONTHLY_BUDGET}</strong>
            </div>
          </div>

          <div style={{background:"#fff",border:"1px solid #e0dbd0",borderRadius:14,padding:"18px"}}>
            <div style={{fontFamily:"sans-serif",fontWeight:"bold",fontSize:15,color:"#1c2a1c",marginBottom:14}}>🍳 Recipe Stats</div>
            {recipes.map(r=>{
              const times=meals.filter(m=>m.recipe_id===r.id&&(m.status==="confirmed"||m.status==="cooked")).length;
              return (
                <div key={r.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,paddingBottom:12,borderBottom:"1px solid #f4f4f2"}}>
                  <div>
                    <div style={{fontFamily:"sans-serif",fontSize:13,color:"#333",fontWeight:"bold"}}>{r.name}</div>
                    <div style={{fontFamily:"sans-serif",fontSize:11,color:"#aaa"}}>Made {times} time{times!==1?"s":""}</div>
                  </div>
                  <span style={{background:r.status==="confirmed"?"#f3eeff":"#fef6ec",color:r.status==="confirmed"?"#5a3d8a":"#b0813a",borderRadius:20,padding:"3px 10px",fontSize:10,fontFamily:"sans-serif"}}>
                    {r.status==="confirmed"?"🔒":"📝"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── BOTTOM NAV ── */}
      <div style={{position:"fixed",bottom:0,left:0,right:0,background:"#fff",borderTop:"1px solid #e0dbd0",display:"flex",zIndex:100,boxShadow:"0 -2px 12px rgba(0,0,0,0.08)"}}>
        {[
          ["week","📅","Week"],
          ["library","📖","Recipes"],
          ["grocery","🛒","Grocery"],
          ["pantry","🥫","Pantry"],
          ["analytics","📊","Budget"],
        ].map(([tab,icon,label])=>(
          <button key={tab} onClick={()=>setActiveTab(tab)}
            style={{flex:1,background:"none",border:"none",padding:"10px 0 12px",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
            <span style={{fontSize:20}}>{icon}</span>
            <span style={{fontFamily:"sans-serif",fontSize:10,color:activeTab===tab?"#b0813a":"#aaa",fontWeight:activeTab===tab?"bold":"normal"}}>{label}</span>
            {activeTab===tab&&<div style={{width:4,height:4,borderRadius:"50%",background:"#b0813a"}}/>}
          </button>
        ))}
      </div>

      {/* Modals */}
      {recipeModal&&<RecipeModal recipe={recipeModal} onClose={()=>setRecipeModal(null)}/>}
      {modal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:150}}>
          <div style={{background:"#fff",borderRadius:"18px 18px 0 0",padding:24,width:"100%",maxWidth:500}}>
            <div style={{fontFamily:"sans-serif",fontWeight:"bold",fontSize:15,marginBottom:12,color:"#1c2a1c"}}>
              {modal.type==="ian"?"💬 Ian's Note":modal.type==="kayla"?"💬 Kayla's Note":"🍳 Cook Notes"}
            </div>
            <textarea value={modalText} onChange={e=>setModalText(e.target.value)}
              placeholder={modal.type==="cook"?"How did it go? What to change?":"Suggest a swap or leave a comment…"}
              style={{width:"100%",minHeight:90,borderRadius:8,border:"1px solid #ddd",padding:12,fontFamily:"sans-serif",fontSize:14,resize:"vertical",boxSizing:"border-box"}}/>
            <div style={{display:"flex",gap:10,marginTop:12}}>
              <button onClick={saveModal} style={{flex:1,background:"#1c3a2a",color:"#fff",border:"none",borderRadius:8,padding:12,fontSize:14,fontFamily:"sans-serif",cursor:"pointer"}}>Save</button>
              <button onClick={()=>setModal(null)} style={{flex:1,background:"#f4f4f2",color:"#555",border:"none",borderRadius:8,padding:12,fontSize:14,fontFamily:"sans-serif",cursor:"pointer"}}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const futureWeeks = ALL_WEEKS.filter(w => w > CURRENT_WEEK);
const pastWeeks = ALL_WEEKS.filter(w => w < CURRENT_WEEK);
