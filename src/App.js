import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase";
import { initialMeals, initialRecipes, CURRENT_WEEK } from "./seedData";

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
// Get current week key in YYYY-MM-DD format matching database
const TODAY_KEY = getWeekKey(new Date().toISOString().slice(0,10));
const ALL_WEEKS = generateWeeks("2025-06-23", "2026-12-28");
const DAY_ORDER = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const DAY_SHORT = { Monday:"Mon",Tuesday:"Tue",Wednesday:"Wed",Thursday:"Thu",Friday:"Fri",Saturday:"Sat",Sunday:"Sun" };
const DAY_EMOJIS = { Monday:"🌱",Tuesday:"🌤️",Wednesday:"🌿",Thursday:"🌤️",Friday:"🌙",Saturday:"🎉",Sunday:"☕" };
const MONTHLY_BUDGET = 500;
const STORES = ["Aldi","Giant","Sam's Club","Harford Seafood","Instacart","Other"];
const PANTRY_CATEGORIES = ["Cabinet","Fridge","Freezer","Cans","Seasoning"];
const QTY_WORDS = ["A Lot","Enough","A Little","Out"];
const QTY_NUMBERS = ["1","2","3","4","5+"];
const QTY_TYPE = { Cabinet:"words",Fridge:"words",Freezer:"words",Cans:"numbers",Seasoning:"words" };
const RESTAURANTS = [
  {name:"Chick-fil-A",emoji:"🐔"},{name:"McDonald's",emoji:"🍟"},{name:"Wendy's",emoji:"🍔"},
  {name:"Burger King",emoji:"👑"},{name:"Lindo's",emoji:"🇲🇽"},{name:"Grandma CC's",emoji:"🏠"},
  {name:"Asian Taste",emoji:"🥢"},{name:"Ni Hao",emoji:"🥡"},{name:"Royal Farms",emoji:"⛽"},
  {name:"Chipotle",emoji:"🌯"},{name:"Qdoba",emoji:"🫔"},{name:"Roma's Little Italy",emoji:"🍝"},
  {name:"Popeyes",emoji:"🍗"},{name:"Katana Sushi",emoji:"🍣"},{name:"Stokos",emoji:"🍗"},
  {name:"Jersey Mike's",emoji:"🥖"},{name:"Super Chicken Rico",emoji:"🐓"},
];
const mealTypeColors = {
  breakfast:{ border:"#f0c96e",label:"#b07a10",strip:"#f0c96e" },
  lunch:    { border:"#90bce8",label:"#2a5a8a",strip:"#5a9fd4" },
  dinner:   { border:"#7ec8a0",label:"#1c5a38",strip:"#2e7d5e" },
};
const storeColors = { "Aldi":"#1a6b3c","Giant":"#c0392b","Sam's Club":"#0033a0","Harford Seafood":"#1a5a8a","Instacart":"#1a6b3c","Other":"#666" };
const statusLabels = {
  set:      {label:"Set",       color:"#888",    bg:"#f4f4f2"},
  draft:    {label:"Draft",     color:"#b0813a", bg:"#fef6ec"},
  cooked:   {label:"Cooked ✓", color:"#2e7d5e", bg:"#edfaf4"},
  confirmed:{label:"🔒 Locked", color:"#5a3d8a", bg:"#f3eeff"},
};
const cookOptions = ["Kayla 👩🏾‍🍳","Ian 👨🏾‍🍳","Together 🍳","TBD"];
const G = "#1c3a2a";

function isLow(item) {
  const qtyType = QTY_TYPE[item.category]||"words";
  if (qtyType==="numbers") return (parseInt(item.qty)||0)<=(parseInt(item.low_threshold)||1);
  const order=["Out","A Little","Enough","A Lot"];
  return order.indexOf(item.qty)<=order.indexOf(item.low_threshold||"A Little");
}

const initialPantryData = [
  {id:"p1",name:"Honey",category:"Cabinet",qty:"A Lot",low_threshold:"A Little",store:"Aldi",price:null,store2:null,price2:null},
  {id:"p2",name:"Peanut Butter",category:"Cabinet",qty:"A Lot",low_threshold:"A Little",store:"Aldi",price:null,store2:null,price2:null},
  {id:"p3",name:"Maple Syrup",category:"Cabinet",qty:"A Lot",low_threshold:"A Little",store:"Aldi",price:null,store2:null,price2:null},
  {id:"p4",name:"Cornstarch",category:"Cabinet",qty:"A Lot",low_threshold:"A Little",store:"Aldi",price:null,store2:null,price2:null},
  {id:"p5",name:"Sriracha",category:"Cabinet",qty:"Out",low_threshold:"A Little",store:"Giant",price:null,store2:null,price2:null},
  {id:"p6",name:"Flour",category:"Cabinet",qty:"A Lot",low_threshold:"A Little",store:"Aldi",price:null,store2:null,price2:null},
  {id:"p7",name:"Baking Powder",category:"Cabinet",qty:"A Lot",low_threshold:"A Little",store:"Aldi",price:null,store2:null,price2:null},
  {id:"p8",name:"Shaoxing Wine",category:"Cabinet",qty:"A Lot",low_threshold:"A Little",store:"Giant",price:null,store2:null,price2:null},
  {id:"p9",name:"Knorr Chicken Bouillon",category:"Cabinet",qty:"A Lot",low_threshold:"A Little",store:"Giant",price:null,store2:null,price2:null},
  {id:"p10",name:"Oyster Sauce",category:"Cabinet",qty:"A Lot",low_threshold:"A Little",store:"Giant",price:null,store2:null,price2:null},
  {id:"p11",name:"Soy Sauce",category:"Cabinet",qty:"A Lot",low_threshold:"A Little",store:"Aldi",price:null,store2:null,price2:null},
  {id:"p12",name:"Sesame Oil",category:"Cabinet",qty:"A Lot",low_threshold:"A Little",store:"Giant",price:null,store2:null,price2:null},
  {id:"p13",name:"Garlic Bulbs",category:"Cabinet",qty:"A Lot",low_threshold:"A Little",store:"Aldi",price:null,store2:null,price2:null},
  {id:"p14",name:"Onions",category:"Cabinet",qty:"A Lot",low_threshold:"A Little",store:"Aldi",price:null,store2:null,price2:null},
  {id:"p15",name:"Sugar",category:"Cabinet",qty:"A Lot",low_threshold:"A Little",store:"Aldi",price:null,store2:null,price2:null},
  {id:"p16",name:"Brown Sugar",category:"Cabinet",qty:"A Lot",low_threshold:"A Little",store:"Aldi",price:null,store2:null,price2:null},
  {id:"p17",name:"Cinnamon",category:"Cabinet",qty:"A Lot",low_threshold:"A Little",store:"Aldi",price:null,store2:null,price2:null},
  {id:"p18",name:"Grain Rice",category:"Cabinet",qty:"A Lot",low_threshold:"A Little",store:"Sam's Club",price:null,store2:null,price2:null},
  {id:"p19",name:"Spaghetti Noodles",category:"Cabinet",qty:"A Little",low_threshold:"A Little",store:"Aldi",price:2.09,store2:null,price2:null},
  {id:"p20",name:"Rotini Noodles",category:"Cabinet",qty:"A Little",low_threshold:"A Little",store:"Aldi",price:null,store2:null,price2:null},
  {id:"p21",name:"Canola Oil",category:"Cabinet",qty:"A Lot",low_threshold:"A Little",store:"Aldi",price:null,store2:null,price2:null},
  {id:"p22",name:"Pancake Mix",category:"Cabinet",qty:"A Lot",low_threshold:"A Little",store:"Aldi",price:null,store2:null,price2:null},
  {id:"p23",name:"Oatmeal",category:"Cabinet",qty:"A Lot",low_threshold:"A Little",store:"Aldi",price:null,store2:null,price2:null},
  {id:"p24",name:"Refried Beans",category:"Cans",qty:"1",low_threshold:"1",store:"Aldi",price:null,store2:null,price2:null},
  {id:"p25",name:"Chili with Beans",category:"Cans",qty:"1",low_threshold:"1",store:"Aldi",price:null,store2:null,price2:null},
  {id:"p26",name:"Nacho Cheese",category:"Cans",qty:"1",low_threshold:"1",store:"Aldi",price:null,store2:null,price2:null},
  {id:"p27",name:"Tomato Paste",category:"Cans",qty:"1",low_threshold:"1",store:"Aldi",price:null,store2:null,price2:null},
  {id:"p28",name:"Pinto Beans",category:"Cans",qty:"1",low_threshold:"1",store:"Aldi",price:null,store2:null,price2:null},
  {id:"p29",name:"Ravioli",category:"Cans",qty:"2",low_threshold:"1",store:"Aldi",price:null,store2:null,price2:null},
  {id:"p30",name:"Bertolli Tomato Sauce",category:"Cans",qty:"4",low_threshold:"2",store:"Giant",price:5.09,store2:"Aldi",price2:null},
  {id:"p31",name:"Eggs",category:"Fridge",qty:"A Little",low_threshold:"A Little",store:"Aldi",price:null,store2:null,price2:null},
  {id:"p32",name:"Butter (Kerrygold)",category:"Fridge",qty:"Enough",low_threshold:"A Little",store:"Instacart",price:7.09,store2:"Aldi",price2:null},
  {id:"p33",name:"Whole Milk",category:"Fridge",qty:"A Lot",low_threshold:"A Little",store:"Aldi",price:3.05,store2:null,price2:null},
  {id:"p34",name:"Sour Cream",category:"Fridge",qty:"Enough",low_threshold:"A Little",store:"Aldi",price:null,store2:null,price2:null},
  {id:"p35",name:"Greek Yogurt",category:"Fridge",qty:"Enough",low_threshold:"A Little",store:"Aldi",price:null,store2:null,price2:null},
  {id:"p36",name:"Sliced Cheese",category:"Fridge",qty:"Enough",low_threshold:"A Little",store:"Aldi",price:null,store2:null,price2:null},
  {id:"p37",name:"Celery",category:"Fridge",qty:"Enough",low_threshold:"A Little",store:"Aldi",price:null,store2:null,price2:null},
  {id:"p38",name:"Carrots",category:"Fridge",qty:"Enough",low_threshold:"A Little",store:"Aldi",price:null,store2:null,price2:null},
  {id:"p39",name:"Chocolate Chips",category:"Fridge",qty:"A Lot",low_threshold:"A Little",store:"Aldi",price:null,store2:null,price2:null},
  {id:"p40",name:"Short Ribs",category:"Freezer",qty:"Enough",low_threshold:"A Little",store:"Giant",price:null,store2:null,price2:null},
  {id:"p41",name:"Chicken Breasts (5lb)",category:"Freezer",qty:"A Lot",low_threshold:"A Little",store:"Instacart",price:10.95,store2:null,price2:null},
  {id:"p42",name:"Chicken Wings",category:"Freezer",qty:"1",low_threshold:"1",store:"Aldi",price:null,store2:null,price2:null},
  {id:"p43",name:"Hotdogs",category:"Freezer",qty:"Enough",low_threshold:"A Little",store:"Aldi",price:null,store2:null,price2:null},
  {id:"p44",name:"Patty Sausage",category:"Freezer",qty:"Enough",low_threshold:"A Little",store:"Aldi",price:null,store2:null,price2:null},
  {id:"p45",name:"Frozen Waffles",category:"Freezer",qty:"Enough",low_threshold:"A Little",store:"Aldi",price:null,store2:null,price2:null},
  {id:"p46",name:"Frozen Fruit",category:"Freezer",qty:"Enough",low_threshold:"A Little",store:"Aldi",price:null,store2:null,price2:null},
  {id:"p47",name:"Waffle Fries",category:"Freezer",qty:"Enough",low_threshold:"A Little",store:"Aldi",price:null,store2:null,price2:null},
  {id:"p48",name:"Season All",category:"Seasoning",qty:"Out",low_threshold:"A Little",store:"Giant",price:null,store2:null,price2:null},
  {id:"p49",name:"Granulated Garlic",category:"Seasoning",qty:"A Lot",low_threshold:"A Little",store:"Aldi",price:null,store2:null,price2:null},
  {id:"p50",name:"Granulated Onion",category:"Seasoning",qty:"A Lot",low_threshold:"A Little",store:"Aldi",price:null,store2:null,price2:null},
  {id:"p51",name:"Paprika",category:"Seasoning",qty:"A Lot",low_threshold:"A Little",store:"Aldi",price:null,store2:null,price2:null},
  {id:"p52",name:"Italian Seasoning",category:"Seasoning",qty:"A Lot",low_threshold:"A Little",store:"Aldi",price:null,store2:null,price2:null},
  {id:"p53",name:"Thyme",category:"Seasoning",qty:"A Lot",low_threshold:"A Little",store:"Aldi",price:null,store2:null,price2:null},
  {id:"p54",name:"Cayenne Pepper",category:"Seasoning",qty:"A Lot",low_threshold:"A Little",store:"Aldi",price:null,store2:null,price2:null},
  {id:"p55",name:"Old Bay Seasoning",category:"Seasoning",qty:"A Lot",low_threshold:"A Little",store:"Giant",price:null,store2:null,price2:null},
  {id:"p56",name:"Grill Mates Roasted Garlic & Herb",category:"Seasoning",qty:"A Lot",low_threshold:"A Little",store:"Giant",price:null,store2:null,price2:null},
];

export default function App() {
  const [meals, setMeals] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [pantry, setPantry] = useState([]);
  const [grocery, setGrocery] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seeded, setSeeded] = useState(false);
  // Open on the week closest to today that has meals, default to today
  const [selectedWeek, setSelectedWeek] = useState(TODAY_KEY);
  const [selectedDayIdx, setSelectedDayIdx] = useState(0);
  const [weekPickerOpen, setWeekPickerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("week");
  const [lastRefresh, setLastRefresh] = useState(null);
  const [modal, setModal] = useState(null);
  const [modalText, setModalText] = useState("");
  const [recipeModal, setRecipeModal] = useState(null);
  const [pantryCheckModal, setPantryCheckModal] = useState(null);
  const [pantryChecks, setPantryChecks] = useState({});
  const [pantryCheckSavings, setPantryCheckSavings] = useState({});
  const [thawState, setThawState] = useState({});
  const [showGroceryTrip, setShowGroceryTrip] = useState(false);
  const [showPlanDay, setShowPlanDay] = useState(null);
  const [showTakeoutModal, setShowTakeoutModal] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [mealBackup, setMealBackup] = useState({});
  const [groceryWeek, setGroceryWeek] = useState(TODAY_KEY);
  const [pantrySearch, setPantrySearch] = useState("");
  const [inventoryEdit, setInventoryEdit] = useState(null);
  const [addItemForm, setAddItemForm] = useState({name:"",category:"Cabinet",store:"Aldi",price:"",store2:"",price2:"",low_threshold:"A Little"});
  const [tripItem, setTripItem] = useState({name:"",store:"Aldi",price:"",qty:"1",exp:""});
  const [tripItems, setTripItems] = useState([]);
  const [newGroceryItem, setNewGroceryItem] = useState("");
  const [newGroceryStore, setNewGroceryStore] = useState("Aldi");
  const [newGroceryPrice, setNewGroceryPrice] = useState("");

  // ── Load data ──────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    const [{ data: mealsData },{ data: recipesData },{ data: pantryData },{ data: groceryData }] = await Promise.all([
      supabase.from("meals").select("*"),
      supabase.from("recipes").select("*"),
      supabase.from("pantry").select("*"),
      supabase.from("grocery").select("*"),
    ]);
    // Always load from database - never re-seed if data exists
    setMeals(mealsData||[]);
    setRecipes((recipesData||[]).map(r=>({...r,
      dishes:typeof r.dishes==="string"?JSON.parse(r.dishes):r.dishes||[],
      freezer_items:typeof r.freezer_items==="string"?JSON.parse(r.freezer_items):r.freezer_items||[],
      ingredients:typeof r.ingredients==="string"?JSON.parse(r.ingredients):r.ingredients||[],
      steps:typeof r.steps==="string"?JSON.parse(r.steps):r.steps||[]
    })));
    // Seed pantry only if completely empty
    if (pantryData && pantryData.length===0 && !seeded) {
      await supabase.from("pantry").insert(initialPantryData);
      setPantry(initialPantryData); setSeeded(true);
    } else { setPantry(pantryData||[]); if(pantryData&&pantryData.length>0)setSeeded(true); }
    setGrocery(groceryData||[]);
    setLoading(false);
  }, [seeded]);

  useEffect(()=>{loadData();},[loadData]);

  // Auto-select best week once meals are loaded
  const mealCount = meals.length;
  useEffect(()=>{
    if(mealCount===0) return;
    const weeksInData=[...new Set(meals.map(m=>m.week_key))].sort();
    if(weeksInData.includes(TODAY_KEY)) return;
    const closest=weeksInData.reduce((prev,curr)=>{
      return Math.abs(new Date(curr)-new Date(TODAY_KEY))<Math.abs(new Date(prev)-new Date(TODAY_KEY))?curr:prev;
    });
    setSelectedWeek(closest);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[mealCount]);

  // No real-time subscriptions - use manual refresh button to see each other's changes
  // This prevents race conditions where Supabase reloads overwrite local updates

  // ── Meal helpers ───────────────────────────────────────────────────────────
  const updateMeal = async (id, patch) => {
    setMeals(prev=>prev.map(m=>m.id===id?{...m,...patch}:m));
    const { error } = await supabase.from("meals").update(patch).eq("id",id);
    if(error) console.error("updateMeal error:", error);
  };
  const vote=(id,person,val)=>{
    const m=meals.find(x=>x.id===id);
    const newVal=m[person]===val?null:val;
    // Track who disagrees for notification clarity
    updateMeal(id,{[person]:newVal});
  };
  const cycleStatus=(id)=>{
    const m=meals.find(x=>x.id===id);
    if(m.status==="set")return;
    if(m.status==="draft"){ setModal({type:"cooked",mealId:id}); setModalText(""); return; }
    const order=["draft","cooked","confirmed"];
    updateMeal(id,{status:order[(order.indexOf(m.status)+1)%order.length]});
  };

  // Change meal with backup + confirm
  const requestMealChange=(id,type)=>{
    const m=meals.find(x=>x.id===id);
    setMealBackup(prev=>({...prev,[id]:{...m}}));
    setConfirmModal({type,mealId:id,mealName:m.name});
  };
  const confirmMealChange=()=>{
    if(!confirmModal)return;
    // Pass as object so plan day modal knows it's editing an existing meal
    if(confirmModal.type==="planday") setShowPlanDay({mealId:confirmModal.mealId,day:null,weekKey:null});
    if(confirmModal.type==="takeout") setShowTakeoutModal({mealId:confirmModal.mealId,day:null,weekKey:null});
    setConfirmModal(null);
  };
  const undoMealChange=(id)=>{
    const backup=mealBackup[id];
    if(!backup)return;
    updateMeal(id,backup);
    setMealBackup(prev=>({...prev,[id]:null}));
  };

  const planDay=async(dayId,recipe)=>{
    const existing=meals.find(m=>m.id===dayId);
    const emoji = recipe.name.match(/^[^\w\s]/)?.[0] || "🍽️";
    const patch = {
      recipe_id: recipe.id,
      original_recipe_id: existing?.recipe_id || existing?.original_recipe_id || null,
      name: recipe.name,
      emoji: emoji,
      description: recipe.description || "",
      status: "draft",
      meal_type: "meal",
      takeout_restaurant: null,
      kayla_order: null,
      ian_order: null,
      takeout_cost: null,
      swap_suggestion: null,
      swap_name: null
    };
    setMeals(prev=>prev.map(m=>m.id===dayId?{...m,...patch}:m));
    // Check if row exists in DB first
    const {data:check} = await supabase.from("meals").select("id").eq("id",dayId).single();
    if(check){
      const {error}=await supabase.from("meals").update(patch).eq("id",dayId);
      if(error) console.error("planDay update error:", error);
    } else {
      // Row doesn't exist, insert it
      const fullMeal={...existing,...patch,id:dayId};
      const {error}=await supabase.from("meals").insert(fullMeal);
      if(error) console.error("planDay insert error:", error);
    }
    setShowPlanDay(null);
  };
  const planTakeout=async(dayId,restaurant)=>{
    const existing=meals.find(m=>m.id===dayId);
    const patch = {
      name: `Takeout — ${restaurant.name}`,
      emoji: restaurant.emoji,
      description: `Order from ${restaurant.name}`,
      status: "draft",
      meal_type: "takeout",
      takeout_restaurant: restaurant.name,
      kayla_order: "",
      ian_order: "",
      takeout_cost: "",
      original_recipe_id: existing?.recipe_id || existing?.original_recipe_id || null,
      recipe_id: null,
      swap_suggestion: null,
      swap_name: null
    };
    setMeals(prev=>prev.map(m=>m.id===dayId?{...m,...patch}:m));
    const {data:check}=await supabase.from("meals").select("id").eq("id",dayId).single();
    if(check){
      const {error}=await supabase.from("meals").update(patch).eq("id",dayId);
      if(error) console.error("planTakeout update error:", error);
    } else {
      const fullMeal={...existing,...patch,id:dayId};
      const {error}=await supabase.from("meals").insert(fullMeal);
      if(error) console.error("planTakeout insert error:", error);
    }
    setShowTakeoutModal(null);
  };
  const revertToMeal=async(id)=>{
    const meal=meals.find(m=>m.id===id);
    const origRecipeId=meal?.original_recipe_id;
    const origRecipe=origRecipeId?recipes.find(r=>r.id===origRecipeId):null;
    const patch = origRecipe ? {
      meal_type:"meal", recipe_id:origRecipeId, original_recipe_id:null,
      name:origRecipe.name, emoji:origRecipe.name.match(/^[^\w\s]/)?.[0]||"🍽️",
      description:origRecipe.description||"", status:"draft",
      takeout_restaurant:null, kayla_order:null, ian_order:null, takeout_cost:null
    } : {
      meal_type:"meal", name:"Not planned yet", emoji:"❓",
      description:"Tap Plan Day to choose a meal", status:"draft",
      takeout_restaurant:null, kayla_order:null, ian_order:null, takeout_cost:null,
      recipe_id:null, original_recipe_id:null
    };
    setMeals(prev=>prev.map(m=>m.id===id?{...m,...patch}:m));
    const { error } = await supabase.from("meals").update(patch).eq("id",id);
    if(error) console.error("revertToMeal error:", error);
  };

  // Thaw
  const toggleThaw=async(recipeId,itemId)=>{
    const r=recipes.find(x=>x.id===recipeId);
    const newItems=r.freezer_items.map(f=>f.id===itemId?{...f,thawed:!f.thawed}:f);
    setRecipes(prev=>prev.map(x=>x.id!==recipeId?x:{...x,freezer_items:newItems}));
    await supabase.from("recipes").update({freezer_items:JSON.stringify(newItems)}).eq("id",recipeId);
    if(recipeModal?.id===recipeId)setRecipeModal(x=>({...x,freezer_items:newItems}));
  };

  // Ingredient edit
  const saveIngredientEdit=async(recipeId,updatedIngredients)=>{
    setRecipes(prev=>prev.map(r=>r.id!==recipeId?r:{...r,ingredients:updatedIngredients}));
    await supabase.from("recipes").update({ingredients:JSON.stringify(updatedIngredients)}).eq("id",recipeId);
    setRecipeModal(prev=>({...prev,ingredients:updatedIngredients}));
  };

  // Modal save
  const saveModal=async()=>{
    if(!modal)return;
    if(modal.type==="cooked") await updateMeal(modal.mealId,{status:"cooked",cook_note:modalText});
    else if(modal.type==="note") await updateMeal(modal.mealId,{[`${modal.person}_note`]:modalText});
    else if(modal.type==="daynote") await updateMeal(modal.mealId,{day_note:modalText});
    setModal(null); setModalText("");
  };

  // Pantry check with auto-prefill
  const openPantryCheck=(recipe,mealId)=>{
    const preChecks={};
    (recipe.ingredients||[]).forEach((ing,i)=>{
      // Try exact pantryKey match first, then fuzzy name match
      const key = `${mealId}-${i}`;
      // Don't overwrite existing manual selections
      if(pantryChecks[key]) return;
      let p = null;
      if(ing.pantryKey){
        p = pantry.find(x=>x.name.toLowerCase()===ing.pantryKey.toLowerCase());
      }
      // Fuzzy fallback - check if ingredient name contains a pantry item name
      if(!p){
        const ingName = ing.name.split("—")[0].split("(")[0].trim().toLowerCase();
        p = pantry.find(x=>ingName.includes(x.name.toLowerCase().substring(0,6))||x.name.toLowerCase().includes(ingName.substring(0,6)));
      }
      if(p&&!isLow(p)){
        preChecks[key]="had";
      } else if(p&&isLow(p)){
        preChecks[key]="bought"; // Pre-check as need to buy if low
      }
    });
    setPantryChecks(prev=>({...prev,...preChecks}));
    setPantryCheckModal({recipe,mealId});
  };

  // Pantry helpers
  const updatePantryItem=async(id,patch)=>{
    setPantry(prev=>prev.map(p=>p.id===id?{...p,...patch}:p));
    const { error } = await supabase.from("pantry").update(patch).eq("id",id);
    if(error) console.error("updatePantryItem error:", error);
  };
  const addPantryItem=async()=>{
    if(!addItemForm.name.trim())return;
    const qtyType=QTY_TYPE[addItemForm.category]||"words";
    const item={id:`p${Date.now()}`,name:addItemForm.name.trim(),category:addItemForm.category,qty:qtyType==="numbers"?"1":"Enough",low_threshold:addItemForm.low_threshold,store:addItemForm.store,price:addItemForm.price?parseFloat(addItemForm.price):null,store2:addItemForm.store2||null,price2:addItemForm.price2?parseFloat(addItemForm.price2):null};
    setPantry(prev=>[...prev,item]);
    await supabase.from("pantry").insert(item);
    setAddItemForm({name:"",category:"Cabinet",store:"Aldi",price:"",store2:"",price2:"",low_threshold:"A Little"});
  };
  const deletePantryItem=async(id)=>{ setPantry(prev=>prev.filter(p=>p.id!==id)); await supabase.from("pantry").delete().eq("id",id); setInventoryEdit(null); };

  // Grocery helpers
  const addToGrocery=async(name,store,price=null,weekKey=null)=>{
    if(grocery.find(g=>g.name.toLowerCase()===name.toLowerCase()&&g.week_key===weekKey))return;
    const item={id:`g${Date.now()}`,name,store:store||"Aldi",price,qty:"1",checked:false,week_key:weekKey||selectedWeek};
    setGrocery(prev=>[...prev,item]);
    await supabase.from("grocery").insert(item);
  };
  const updateGrocery=async(id,patch)=>{ setGrocery(prev=>prev.map(g=>g.id===id?{...g,...patch}:g)); await supabase.from("grocery").update(patch).eq("id",id); };
  const removeGrocery=async(id)=>{ setGrocery(prev=>prev.filter(g=>g.id!==id)); await supabase.from("grocery").delete().eq("id",id); };
  const addManualGrocery=async()=>{
    if(!newGroceryItem.trim())return;
    await addToGrocery(newGroceryItem.trim(),newGroceryStore,newGroceryPrice?parseFloat(newGroceryPrice):null,groceryWeek);
    setNewGroceryItem(""); setNewGroceryPrice("");
  };

  const finishGroceryTrip=async()=>{
    for(const item of tripItems){
      const ex=pantry.find(p=>p.name.toLowerCase()===item.name.toLowerCase());
      if(ex)await updatePantryItem(ex.id,{qty:"Enough"});
      else{const np={id:`p${Date.now()}${Math.random()}`,name:item.name,category:"Cabinet",qty:"Enough",low_threshold:"A Little",store:item.store,price:item.price?parseFloat(item.price):null,store2:null,price2:null};setPantry(prev=>[...prev,np]);await supabase.from("pantry").insert(np);}
      await addToGrocery(item.name,item.store,item.price?parseFloat(item.price):null,selectedWeek);
    }
    setShowGroceryTrip(false); setTripItems([]); setTripItem({name:"",store:"Aldi",price:"",qty:"1",exp:""});
  };

  // ── Derived ────────────────────────────────────────────────────────────────
  const weekMeals=meals.filter(m=>m.week_key===selectedWeek);
  const weekDays=[...new Set(weekMeals.map(m=>m.day))].sort((a,b)=>DAY_ORDER.indexOf(a)-DAY_ORDER.indexOf(b));
  const selectedDay=weekDays[selectedDayIdx]||weekDays[0];
  const dayMeals=weekMeals.filter(m=>m.day===selectedDay);
  const lowPantry=pantry.filter(p=>isLow(p));
  const swapRequests=meals.filter(m=>m.week_key===TODAY_KEY&&(m.ian==="disagree"||m.kayla==="disagree"));
  const totalSavings=Object.values(pantryCheckSavings).reduce((s,v)=>s+v,0);
  const groceryWeekItems=grocery.filter(g=>g.week_key===groceryWeek);
  const groceryByStore=STORES.reduce((acc,s)=>({...acc,[s]:[]}),{});
  groceryWeekItems.forEach(g=>{const k=STORES.includes(g.store)?g.store:"Other";groceryByStore[k].push(g);});
  const groceryTotal=grocery.filter(g=>g.checked&&g.price).reduce((s,g)=>s+parseFloat(g.price),0);
  const takeoutTotal=meals.filter(m=>m.week_key===TODAY_KEY&&m.meal_type==="takeout"&&m.takeout_cost).reduce((s,m)=>s+parseFloat(m.takeout_cost||0),0);
  const totalSpent=98.34+groceryTotal+takeoutTotal-totalSavings;
  const pastWeeks=ALL_WEEKS.filter(w=>w<TODAY_KEY);
  const futureWeeks=ALL_WEEKS.filter(w=>w>TODAY_KEY);
  const weeksWithMeals={};
  meals.forEach(m=>{if(!weeksWithMeals[m.week_key])weeksWithMeals[m.week_key]=0;if(m.meal_type==="dinner"||m.meal_type==="takeout")weeksWithMeals[m.week_key]++;});
  const filteredPantry=pantry.filter(p=>p.name.toLowerCase().includes(pantrySearch.toLowerCase()));
  const pantryByCategory={};
  filteredPantry.forEach(p=>{if(!pantryByCategory[p.category])pantryByCategory[p.category]=[];pantryByCategory[p.category].push(p);});
  const mealIngredientsForWeek=(wk)=>meals.filter(m=>m.week_key===wk&&m.recipe_id&&m.meal_type==="meal").flatMap(m=>{const r=recipes.find(x=>x.id===m.recipe_id);return r?(r.ingredients||[]).filter(i=>i.price).map(i=>({name:i.name.split("—")[0].split("(")[0].trim(),store:(r.store||"Aldi").split("/")[0].trim(),price:i.price,pantryKey:i.pantryKey})):[];});
  const getPantryStatus=(key)=>{if(!key)return null;const p=pantry.find(x=>x.name.toLowerCase()===key.toLowerCase());if(!p)return"need";return isLow(p)?"need":"have";};

  // ── Sync summary ───────────────────────────────────────────────────────────
  const syncSummary=`📋 IAN & KAYLA MEALS — Week of ${getWeekLabel(TODAY_KEY)}

🍽️ THIS WEEK'S PLAN:
${meals.filter(m=>m.week_key===TODAY_KEY).map(m=>`${m.day}${m.date?` ${m.date}`:""} — ${m.emoji||""} ${m.name}${m.cook?` (${m.cook})`:""}${m.status==="cooked"?" ✓ COOKED":m.status==="confirmed"?" 🔒 LOCKED":""}${m.meal_type==="takeout"?` 🥡 $${m.takeout_cost||"?"}${m.kayla_order?` | Kayla: ${m.kayla_order}`:""}${m.ian_order?` | Ian: ${m.ian_order}`:""}`:""}`).join("\n")||"No meals planned"}

✅ APPROVALS:
${meals.filter(m=>m.week_key===TODAY_KEY&&m.ian==="agree"&&m.kayla==="agree").map(m=>`• ${m.name} — both approved`).join("\n")||"• None yet"}

👎 SWAP REQUESTS:
${swapRequests.length?swapRequests.map(m=>`• ${m.day}'s ${m.name} — ${m.ian==="disagree"?"Ian":"Kayla"} wants a swap${m.swap_name?` → ${m.swap_name}`:""}`).join("\n"):"• None"}

📝 DAY NOTES / PLAN CHANGES:
${meals.filter(m=>m.week_key===TODAY_KEY&&m.day_note).map(m=>`• ${m.day}: ${m.day_note}`).join("\n")||"• None"}

🍳 COOK NOTES:
${meals.filter(m=>m.week_key===TODAY_KEY&&m.cook_note).map(m=>`• ${m.name}: ${m.cook_note}`).join("\n")||"• None"}

🛒 GROCERY LIST (${grocery.length} items, $${groceryTotal.toFixed(2)} spent):
${grocery.map(g=>`• ${g.name} — ${g.store}${g.price?` $${parseFloat(g.price).toFixed(2)}`:""} ${g.checked?"✓":""}`).join("\n")||"• Empty"}

⚠️ LOW STOCK:
${lowPantry.map(p=>`• ${p.name} — ${p.qty}`).join("\n")||"• None"}

💰 BUDGET:
Groceries: $${groceryTotal.toFixed(2)}
Takeout: $${takeoutTotal.toFixed(2)}
Pantry savings: -$${totalSavings.toFixed(2)}
Total spent: $${totalSpent.toFixed(2)} of $500`;

  // ── Recipe Modal ───────────────────────────────────────────────────────────
  const RecipeModal=({recipe,onClose})=>{
    const totalCost=(recipe.ingredients||[]).filter(i=>i.price).reduce((s,i)=>s+i.price,0);
    const [costOpen,setCostOpen]=useState(false);
    const [editIdx,setEditIdx]=useState(null);
    const [editStore,setEditStore]=useState("");
    const [editPrice,setEditPrice]=useState("");
    const cleanTime=(t)=>t?t.replace(/\(.*?\)/g,"").replace(/\d+:\d+\s*[–-]\s*\d+:\d+/g,"").trim():null;
    return(
      <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:200}}>
        <div style={{background:"#faf9f6",borderRadius:"22px 22px 0 0",width:"100%",maxWidth:560,maxHeight:"92vh",overflowY:"auto"}}>
          <div style={{background:`linear-gradient(135deg,${G},#2e5c3e)`,borderRadius:"22px 22px 0 0",padding:"22px 18px 18px",color:"#f0ebe0"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div><div style={{fontSize:21,fontWeight:"bold"}}>{recipe.name}</div><div style={{fontSize:12,color:"#c8e0c8",marginTop:3}}>{recipe.description}</div></div>
              <button onClick={onClose} style={{background:"rgba(255,255,255,0.15)",border:"none",borderRadius:20,padding:"5px 12px",color:"#fff",fontSize:13,cursor:"pointer"}}>✕</button>
            </div>
            <div style={{display:"flex",gap:10,marginTop:12,flexWrap:"wrap",alignItems:"center"}}>
              <span style={{background:recipe.status==="confirmed"?"#f3eeff":"#fef6ec",color:recipe.status==="confirmed"?"#5a3d8a":"#b0813a",borderRadius:20,padding:"3px 12px",fontSize:11,fontFamily:"sans-serif"}}>{recipe.status==="confirmed"?"🔒 Confirmed":"📝 Draft"}</span>
              {totalCost>0&&<button onClick={()=>setCostOpen(!costOpen)} style={{background:costOpen?"#b0813a":"rgba(255,255,255,0.15)",border:"1px solid rgba(255,255,255,0.3)",borderRadius:20,padding:"3px 14px",color:"#fff",fontSize:12,fontFamily:"sans-serif",cursor:"pointer"}}>💰 Est. ${totalCost.toFixed(2)} {costOpen?"▲":"▼"}</button>}
            </div>
            {costOpen&&<div style={{marginTop:10,background:"rgba(0,0,0,0.2)",borderRadius:10,padding:"10px 12px"}}>{(recipe.ingredients||[]).filter(i=>i.price).map((ing,i)=><div key={i} style={{display:"flex",justifyContent:"space-between",fontFamily:"sans-serif",fontSize:12,color:"#e0ebe0",paddingBottom:5,marginBottom:5,borderBottom:"1px solid rgba(255,255,255,0.1)"}}><span>{ing.name.split(" — ")[0].split(" (")[0]}</span><span style={{fontWeight:"bold"}}>${ing.price?.toFixed(2)}</span></div>)}<div style={{display:"flex",justifyContent:"space-between",fontFamily:"sans-serif",fontSize:13,color:"#fff",fontWeight:"bold",paddingTop:3}}><span>Total</span><span>${totalCost.toFixed(2)}</span></div></div>}
          </div>
          <div style={{padding:"18px 16px 40px"}}>
            <div style={{display:"flex",gap:10,marginBottom:18}}>{[["⏱ Prep",recipe.prep_time],["🔥 Cook",recipe.cook_time]].map(([label,val])=>{const c=cleanTime(val);return(<div key={label} style={{flex:1,background:"#fff",border:"1px solid #e0dbd0",borderRadius:10,padding:"9px 10px",textAlign:"center"}}><div style={{fontSize:10,fontFamily:"sans-serif",color:"#999",textTransform:"uppercase",letterSpacing:1}}>{label}</div><div style={{fontSize:13,fontWeight:"bold",color:c?"#1c2a1c":"#ccc",marginTop:3,fontFamily:"sans-serif"}}>{c||"TBC"}</div></div>);})}</div>
            {(recipe.freezer_items||[]).length>0&&<div style={{background:"#eef6ff",border:"1px solid #b0d4f4",borderRadius:12,padding:"12px 14px",marginBottom:16}}><div style={{fontSize:12,fontWeight:"bold",color:"#2a5a8a",marginBottom:8,fontFamily:"sans-serif"}}>🧊 Freezer Thaw Tracker</div>{(recipe.freezer_items||[]).map(item=><button key={item.id} onClick={()=>toggleThaw(recipe.id,item.id)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",width:"100%",background:item.thawed?"#edfaf4":"#fff",border:`1.5px solid ${item.thawed?"#7ec8a0":"#b0d4f4"}`,borderRadius:8,padding:"7px 10px",fontFamily:"sans-serif",fontSize:12,color:item.thawed?"#2e7d5e":"#2a5a8a",cursor:"pointer",boxSizing:"border-box",marginBottom:4}}><span>{item.thawed?"✅":"🧊"} {item.label}</span><span style={{fontWeight:"bold",fontSize:11}}>{item.thawed?"Out of freezer ✓":"Tap — still frozen"}</span></button>)}</div>}
            {(recipe.dishes||[]).length>0&&<div style={{background:"#fff",border:"1px solid #e0dbd0",borderRadius:12,padding:"12px 14px",marginBottom:16}}><div style={{fontSize:12,fontWeight:"bold",color:"#1c2a1c",marginBottom:8,fontFamily:"sans-serif"}}>🍽️ Dishes Needed</div>{(recipe.dishes||[]).map((d,i)=><div key={i} style={{fontFamily:"sans-serif",fontSize:12,color:"#555",paddingBottom:4,marginBottom:4,borderBottom:i<(recipe.dishes||[]).length-1?"1px solid #f0ece4":"none"}}>· {d}</div>)}</div>}
            <div style={{background:"#fff",border:"1px solid #e0dbd0",borderRadius:12,padding:"12px 14px",marginBottom:16}}><div style={{fontSize:12,fontWeight:"bold",color:"#1c2a1c",marginBottom:8,fontFamily:"sans-serif"}}>🧾 Ingredients <span style={{fontSize:10,color:"#aaa",fontWeight:"normal"}}>(tap $ to edit)</span></div>{(recipe.ingredients||[]).map((ing,i)=><div key={i} style={{paddingBottom:8,marginBottom:8,borderBottom:i<(recipe.ingredients||[]).length-1?"1px solid #f0ece4":"none"}}>{editIdx===i?<div style={{background:"#f9f6ff",borderRadius:8,padding:"8px"}}><div style={{fontFamily:"sans-serif",fontSize:12,color:"#444",marginBottom:6}}>· {ing.name}</div><div style={{display:"flex",gap:6,flexWrap:"wrap"}}><select value={editStore} onChange={e=>setEditStore(e.target.value)} style={{flex:1,border:"1px solid #ddd",borderRadius:8,padding:"5px",fontFamily:"sans-serif",fontSize:12}}><option value="">No store</option>{STORES.map(s=><option key={s}>{s}</option>)}</select><input type="number" value={editPrice} onChange={e=>setEditPrice(e.target.value)} placeholder="Price $" style={{flex:1,minWidth:60,border:"1px solid #ddd",borderRadius:8,padding:"5px 8px",fontFamily:"sans-serif",fontSize:12}}/><button onClick={()=>{const u=(recipe.ingredients||[]).map((x,j)=>j===i?{...x,store:editStore,price:editPrice?parseFloat(editPrice):x.price}:x);saveIngredientEdit(recipe.id,u);setEditIdx(null);}} style={{background:G,color:"#fff",border:"none",borderRadius:8,padding:"5px 10px",fontFamily:"sans-serif",fontSize:12,cursor:"pointer"}}>Save</button><button onClick={()=>setEditIdx(null)} style={{background:"#f4f4f2",color:"#555",border:"none",borderRadius:8,padding:"5px 10px",fontFamily:"sans-serif",fontSize:12,cursor:"pointer"}}>✕</button></div></div>:<div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}><span style={{fontFamily:"sans-serif",fontSize:12,color:"#444",flex:1,paddingRight:8,lineHeight:1.4}}>· {ing.name}</span><button onClick={()=>{setEditIdx(i);setEditStore(ing.store||"");setEditPrice(ing.price||"");}} style={{background:"#f9f9f7",border:"1px solid #e0dbd0",borderRadius:8,padding:"2px 8px",fontFamily:"sans-serif",fontSize:10,color:ing.price?"#2e7d5e":"#aaa",cursor:"pointer",whiteSpace:"nowrap"}}>{ing.price?`$${ing.price.toFixed(2)}`:"+ price"}</button></div>}</div>)}</div>
            <div style={{marginBottom:16}}><div style={{fontSize:12,fontWeight:"bold",color:"#1c2a1c",marginBottom:10,fontFamily:"sans-serif"}}>👣 Steps</div>{(recipe.steps||[]).map(s=><div key={s.step} style={{background:"#fff",border:"1px solid #e0dbd0",borderRadius:12,padding:"12px 14px",marginBottom:8}}><div style={{display:"flex",gap:10,alignItems:"flex-start"}}><div style={{background:G,color:"#fff",borderRadius:"50%",width:26,height:26,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontFamily:"sans-serif",fontWeight:"bold",flexShrink:0}}>{s.step}</div><div><div style={{fontSize:13,fontWeight:"bold",color:"#1c2a1c",marginBottom:4,fontFamily:"sans-serif"}}>{s.title}</div><div style={{fontSize:12,color:"#555",fontFamily:"sans-serif",lineHeight:1.6}}>{s.detail}</div></div></div></div>)}</div>
            {recipe.notes&&<div style={{background:"#fef6ec",border:"1px solid #e8c98a",borderRadius:12,padding:"12px 14px"}}><div style={{fontSize:12,fontWeight:"bold",color:"#b0813a",marginBottom:4,fontFamily:"sans-serif"}}>📝 Notes</div><div style={{fontSize:12,color:"#7a5a20",fontFamily:"sans-serif",lineHeight:1.6}}>{recipe.notes}</div></div>}
          </div>
        </div>
      </div>
    );
  };

  // ── Pantry Check Modal ─────────────────────────────────────────────────────
  const PantryCheckModal=({recipe,mealId,onClose})=>{
    const checks=pantryChecks;
    const toggle=(i,status)=>{
      const k=`${mealId}-${i}`;
      const newChecks={...pantryChecks,[k]:pantryChecks[k]===status?null:status};
      setPantryChecks(newChecks);
      const saved=(recipe.ingredients||[]).reduce((sum,ing,j)=>{const key=`${mealId}-${j}`;return newChecks[key]==="had"&&ing.price?sum+ing.price:sum;},0);
      setPantryCheckSavings(prev=>({...prev,[mealId]:saved}));
    };
    const saved=(recipe.ingredients||[]).reduce((sum,ing,i)=>{const k=`${mealId}-${i}`;return checks[k]==="had"&&ing.price?sum+ing.price:sum;},0);
    const needToBuy=(recipe.ingredients||[]).filter((_,i)=>checks[`${mealId}-${i}`]!=="had");
    return(
      <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:200}}>
        <div style={{background:"#faf9f6",borderRadius:"22px 22px 0 0",width:"100%",maxWidth:560,maxHeight:"85vh",overflowY:"auto"}}>
          <div style={{background:`linear-gradient(135deg,${G},#2e5c3e)`,borderRadius:"22px 22px 0 0",padding:"18px",color:"#f0ebe0"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{fontSize:17,fontWeight:"bold"}}>🥫 Pantry Check</div><div style={{fontSize:12,color:"#c8e0c8",marginTop:2}}>{recipe.name}</div></div><button onClick={onClose} style={{background:"rgba(255,255,255,0.15)",border:"none",borderRadius:20,padding:"5px 12px",color:"#fff",fontSize:13,cursor:"pointer"}}>✕</button></div>
            <div style={{fontSize:10,color:"#a0d4b8",marginTop:6}}>Pre-filled from your inventory — tap to change</div>
          </div>
          <div style={{padding:"14px 16px 40px"}}>
            {(recipe.ingredients||[]).map((ing,i)=>{const k=`${mealId}-${i}`;const status=checks[k];return(<div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"9px 0",borderBottom:"1px solid #f0ece4"}}><span style={{fontFamily:"sans-serif",fontSize:12,color:"#333",flex:1,paddingRight:8}}>· {ing.name.split("—")[0].split("(")[0].trim()}</span><div style={{display:"flex",gap:5}}><button onClick={()=>toggle(i,"had")} style={{background:status==="had"?"#2e7d5e":"#f4f4f2",color:status==="had"?"#fff":"#555",border:`1.5px solid ${status==="had"?"#2e7d5e":"#ddd"}`,borderRadius:20,padding:"3px 10px",fontFamily:"sans-serif",fontSize:11,cursor:"pointer"}}>✅ Had it</button><button onClick={()=>toggle(i,"bought")} style={{background:status==="bought"?"#b0813a":"#f4f4f2",color:status==="bought"?"#fff":"#555",border:`1.5px solid ${status==="bought"?"#b0813a":"#ddd"}`,borderRadius:20,padding:"3px 10px",fontFamily:"sans-serif",fontSize:11,cursor:"pointer"}}>🛒 Bought</button></div></div>);})}
            <div style={{marginTop:14}}>
              {saved>0&&<div style={{background:"#edfaf4",border:"1px solid #7ec8a0",borderRadius:10,padding:"9px 12px",marginBottom:10,fontFamily:"sans-serif",fontSize:13,color:"#2e7d5e"}}>💰 Saving <strong>${saved.toFixed(2)}</strong> — already had these!</div>}
              {needToBuy.length>0&&<button onClick={async()=>{for(const ing of needToBuy)await addToGrocery(ing.name.split("—")[0].split("(")[0].trim(),"Aldi",ing.price,selectedWeek);onClose();}} style={{width:"100%",background:G,color:"#fff",border:"none",borderRadius:10,padding:"11px",fontFamily:"sans-serif",fontSize:13,cursor:"pointer",marginBottom:6}}>+ Add {needToBuy.length} item{needToBuy.length!==1?"s":""} to Grocery List</button>}
              <button onClick={onClose} style={{width:"100%",background:"#f4f4f2",color:"#555",border:"none",borderRadius:10,padding:"9px",fontFamily:"sans-serif",fontSize:12,cursor:"pointer"}}>Done</button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if(loading)return(<div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",background:"#faf9f6",fontFamily:"sans-serif",color:"#888",flexDirection:"column",gap:12}}><div style={{fontSize:32}}>🍽️</div><div>Loading Ian & Kayla's Meals...</div></div>);

  return(
    <div style={{fontFamily:"'Georgia',serif",background:"#faf9f6",minHeight:"100vh",paddingBottom:80}}>

      {/* ── HEADER ── */}
      <div style={{background:`linear-gradient(135deg,${G},#2e5c3e)`,color:"#f0ebe0",position:"sticky",top:0,zIndex:50,boxShadow:"0 2px 12px rgba(0,0,0,0.3)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px 6px"}}>
          <button onClick={()=>setWeekPickerOpen(!weekPickerOpen)}
            style={{background:"rgba(255,255,255,0.12)",border:"1px solid rgba(255,255,255,0.25)",borderRadius:10,padding:"5px 12px",color:"#fff",fontSize:11,fontFamily:"sans-serif",cursor:"pointer"}}>
            🗓 {getWeekLabel(selectedWeek)} {weekPickerOpen?"▲":"▼"}
          </button>
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            {selectedWeek!==TODAY_KEY&&<button onClick={()=>{setSelectedWeek(TODAY_KEY);setSelectedDayIdx(0);setWeekPickerOpen(false);}} style={{background:"#b0813a",border:"none",borderRadius:10,padding:"5px 10px",color:"#fff",fontSize:11,fontFamily:"sans-serif",cursor:"pointer"}}>↩ Now</button>}
            <button onClick={()=>{loadData();setLastRefresh(new Date().toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"}));}}
              style={{background:"rgba(255,255,255,0.12)",border:"1px solid rgba(255,255,255,0.25)",borderRadius:10,padding:"5px 10px",color:"#fff",fontSize:11,fontFamily:"sans-serif",cursor:"pointer"}}>
              🔄 {lastRefresh||"Refresh"}
            </button>
          </div>
        </div>

        {/* Week picker */}
        {weekPickerOpen&&(
          <div style={{background:"rgba(0,0,0,0.4)",margin:"0 12px 8px",borderRadius:10,overflow:"hidden",maxHeight:260,overflowY:"auto"}}>
            <button onClick={()=>{setSelectedWeek(TODAY_KEY);setSelectedDayIdx(0);setWeekPickerOpen(false);}} style={{display:"block",width:"100%",background:selectedWeek===TODAY_KEY?"rgba(176,129,58,0.6)":"transparent",border:"none",borderBottom:"1px solid rgba(255,255,255,0.1)",padding:"10px 14px",fontFamily:"sans-serif",fontSize:12,color:"#fff",cursor:"pointer",textAlign:"left",fontWeight:"bold"}}>
              📅 {getWeekLabel(TODAY_KEY)} — This Week
            </button>
            {futureWeeks.slice(0,6).map(w=><button key={w} onClick={()=>{setSelectedWeek(w);setSelectedDayIdx(0);setWeekPickerOpen(false);}} style={{display:"block",width:"100%",background:selectedWeek===w?"rgba(176,129,58,0.5)":"transparent",border:"none",borderBottom:"1px solid rgba(255,255,255,0.08)",padding:"8px 14px",fontFamily:"sans-serif",fontSize:11,color:"rgba(255,255,255,0.8)",cursor:"pointer",textAlign:"left"}}>{getWeekLabel(w)} {weeksWithMeals[w]?`· ${weeksWithMeals[w]} dinners`:"· No plans"}</button>)}
            <div style={{padding:"6px 14px",fontFamily:"sans-serif",fontSize:10,color:"rgba(255,255,255,0.4)",textTransform:"uppercase",letterSpacing:1}}>Past Weeks</div>
            {[...pastWeeks].reverse().slice(0,10).map(w=><button key={w} onClick={()=>{setSelectedWeek(w);setSelectedDayIdx(0);setWeekPickerOpen(false);}} style={{display:"block",width:"100%",background:selectedWeek===w?"rgba(176,129,58,0.5)":"transparent",border:"none",borderBottom:"1px solid rgba(255,255,255,0.08)",padding:"8px 14px",fontFamily:"sans-serif",fontSize:11,color:"rgba(255,255,255,0.6)",cursor:"pointer",textAlign:"left"}}>{getWeekLabel(w)} {weeksWithMeals[w]?`· ${weeksWithMeals[w]} dinners`:"· No plans"}</button>)}
          </div>
        )}

        {/* Alerts */}
        <div style={{margin:"0 12px 6px",display:"flex",flexDirection:"column",gap:3}}>
          {swapRequests.flatMap(m=>{
            const banners=[];
            if(m.ian==="disagree") banners.push(<div key={`${m.id}-ian`} style={{background:"rgba(192,57,43,0.35)",border:"1px solid rgba(192,57,43,0.5)",borderRadius:7,padding:"4px 10px",fontFamily:"sans-serif",fontSize:11,color:"#ffd0c8"}}>👎 Ian wants to swap {m.day}'s {m.name}{m.swap_name?` → ${m.swap_name}`:""}</div>);
            if(m.kayla==="disagree") banners.push(<div key={`${m.id}-kayla`} style={{background:"rgba(192,57,43,0.35)",border:"1px solid rgba(192,57,43,0.5)",borderRadius:7,padding:"4px 10px",fontFamily:"sans-serif",fontSize:11,color:"#ffd0c8"}}>👎 Kayla wants to swap {m.day}'s {m.name}{m.swap_name?` → ${m.swap_name}`:""}</div>);
            return banners;
          })}
          {lowPantry.length>0&&<div style={{background:"rgba(192,57,43,0.25)",border:"1px solid rgba(192,57,43,0.4)",borderRadius:7,padding:"4px 10px",fontFamily:"sans-serif",fontSize:11,color:"#ffd0c8"}}>⚠️ Low: {lowPantry.slice(0,3).map(p=>p.name).join(", ")}{lowPantry.length>3?` +${lowPantry.length-3} more`:""}</div>}
          {totalSavings>0&&<div style={{background:"rgba(46,125,94,0.25)",border:"1px solid rgba(46,125,94,0.4)",borderRadius:7,padding:"4px 10px",fontFamily:"sans-serif",fontSize:11,color:"#a0d4b8"}}>💰 Saving ${totalSavings.toFixed(2)} from pantry items</div>}
        </div>

        {/* 7-day strip */}
        {activeTab==="week"&&(
          <div style={{display:"flex",borderTop:"1px solid rgba(255,255,255,0.1)",marginTop:4}}>
            {DAY_ORDER.map(day=>{
              const dinner=weekMeals.find(m=>m.day===day&&(m.meal_type==="dinner"||m.meal_type==="takeout"));
              const hasMeals=weekMeals.some(m=>m.day===day);
              const isSelected=weekDays[selectedDayIdx]===day;
              const isCooked=dinner?.status==="cooked"||dinner?.status==="confirmed";
              const allGood=dinner?.ian==="agree"&&dinner?.kayla==="agree";
              return(
                <button key={day} onClick={()=>{const i=weekDays.indexOf(day);if(i>=0)setSelectedDayIdx(i);}}
                  style={{flex:1,minWidth:0,background:isSelected?"rgba(176,129,58,0.4)":"transparent",border:"none",borderBottom:isSelected?"3px solid #b0813a":"3px solid transparent",padding:"5px 2px 7px",color:hasMeals?"#fff":"rgba(255,255,255,0.25)",fontFamily:"sans-serif",cursor:hasMeals?"pointer":"default",textAlign:"center"}}>
                  <div style={{fontSize:9,textTransform:"uppercase",color:hasMeals?"#b0c9b0":"rgba(255,255,255,0.2)"}}>{DAY_SHORT[day]}</div>
                  <div style={{fontSize:14,margin:"2px 0"}}>{dinner?dinner.emoji:"·"}</div>
                  {dinner&&<div style={{fontSize:8,color:isCooked?"#a0d4b8":allGood?"#a0d4b8":"rgba(255,255,255,0.5)",wordBreak:"break-word",maxWidth:44,margin:"0 auto",lineHeight:1.1}}>{isCooked?"✓":dinner.name.split(" ").slice(0,2).join(" ")}</div>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── WEEK TAB ── */}
      {activeTab==="week"&&(
        <div style={{padding:"14px 12px"}}>
          {weekMeals.length===0?(
            <div style={{padding:"50px 20px",textAlign:"center"}}>
              <div style={{fontSize:36,marginBottom:12}}>🗓️</div>
              <div style={{fontFamily:"sans-serif",fontSize:15,color:"#888",fontWeight:"bold",marginBottom:8}}>No meals planned for this week</div>
              <div style={{fontFamily:"sans-serif",fontSize:12,color:"#aaa"}}>Use the Plan Day button or come back to Claude to add meals!</div>
            </div>
          ):(
            <>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
                <button onClick={()=>setSelectedDayIdx(i=>Math.max(0,i-1))} disabled={selectedDayIdx===0}
                  style={{background:selectedDayIdx===0?"#f0f0f0":G,color:selectedDayIdx===0?"#ccc":"#fff",border:"none",borderRadius:10,padding:"8px 16px",fontFamily:"sans-serif",fontSize:14,cursor:selectedDayIdx===0?"default":"pointer"}}>‹</button>
                <div style={{textAlign:"center"}}>
                  <div style={{fontFamily:"sans-serif",fontWeight:"bold",fontSize:14,color:"#1c3a2a"}}>{DAY_EMOJIS[selectedDay]||"📅"} {selectedDay}</div>
                  <div style={{fontFamily:"sans-serif",fontSize:11,color:"#aaa"}}>{dayMeals[0]?.date||""} · {selectedDayIdx+1}/{weekDays.length}</div>
                </div>
                <button onClick={()=>setSelectedDayIdx(i=>Math.min(weekDays.length-1,i+1))} disabled={selectedDayIdx===weekDays.length-1}
                  style={{background:selectedDayIdx===weekDays.length-1?"#f0f0f0":G,color:selectedDayIdx===weekDays.length-1?"#ccc":"#fff",border:"none",borderRadius:10,padding:"8px 16px",fontFamily:"sans-serif",fontSize:14,cursor:selectedDayIdx===weekDays.length-1?"default":"pointer"}}>›</button>
              </div>

              {/* Day note */}
              <div style={{marginBottom:12}}>
                {dayMeals[0]?.day_note?(
                  <div style={{background:"#fef6ec",border:"1px solid #e8c98a",borderRadius:10,padding:"8px 12px",fontFamily:"sans-serif",fontSize:12,color:"#7a5a20",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span>📝 {dayMeals[0].day_note}</span>
                    <button onClick={()=>{setModal({type:"daynote",mealId:dayMeals[0].id});setModalText(dayMeals[0].day_note);}} style={{background:"none",border:"none",color:"#b0813a",cursor:"pointer",fontSize:11,fontFamily:"sans-serif"}}>Edit</button>
                  </div>
                ):(
                  <button onClick={()=>{if(dayMeals[0])setModal({type:"daynote",mealId:dayMeals[0].id});setModalText("");}}
                    style={{width:"100%",background:"#f9f9f7",border:"1px dashed #ddd",borderRadius:10,padding:"8px 12px",fontFamily:"sans-serif",fontSize:11,color:"#aaa",cursor:"pointer",textAlign:"left"}}>
                    📝 Day note — plans changed? Ate something else? Write it here...
                  </button>
                )}
              </div>

              {["breakfast","lunch","dinner"].map(type=>{
                const typeMeals=dayMeals.filter(m=>m.meal_type===type||(type==="dinner"&&m.meal_type==="takeout")||(type==="dinner"&&m.meal_type==="unplanned")||(type==="dinner"&&!m.meal_type));
                // Show a plan button if dinner has no meals at all
                if(!typeMeals.length && type==="dinner") return(
                  <div key={type} style={{marginBottom:16}}>
                    <div style={{fontSize:10,fontFamily:"sans-serif",letterSpacing:2,textTransform:"uppercase",color:"#1c5a38",marginBottom:6}}>🌙 Dinner</div>
                    <div style={{background:"#fff",borderRadius:14,border:"2px dashed #e0dbd0",padding:"20px 14px",textAlign:"center"}}>
                      <div style={{fontSize:22,marginBottom:6}}>🍽️</div>
                      <div style={{fontFamily:"sans-serif",fontSize:13,color:"#888",marginBottom:12}}>Nothing planned yet</div>
                      <div style={{display:"flex",gap:8,justifyContent:"center"}}>
                        <button onClick={()=>setShowPlanDay({mealId:null,day:selectedDay,weekKey:selectedWeek})} style={{background:G,color:"#fff",border:"none",borderRadius:10,padding:"9px 16px",fontFamily:"sans-serif",fontSize:12,cursor:"pointer"}}>📖 Plan from Recipes</button>
                        <button onClick={()=>setShowTakeoutModal({mealId:null,day:selectedDay,weekKey:selectedWeek})} style={{background:"#e67e22",color:"#fff",border:"none",borderRadius:10,padding:"9px 16px",fontFamily:"sans-serif",fontSize:12,cursor:"pointer"}}>🥡 Takeout</button>
                      </div>
                    </div>
                  </div>
                );
                if(!typeMeals.length)return null;
                const tc=mealTypeColors[type]||mealTypeColors.dinner;
                return(
                  <div key={type} style={{marginBottom:16}}>
                    <div style={{fontSize:10,fontFamily:"sans-serif",letterSpacing:2,textTransform:"uppercase",color:tc.label,marginBottom:6}}>{type==="breakfast"?"☀️ Breakfast":type==="lunch"?"🌤 Lunch":"🌙 Dinner"}</div>
                    {typeMeals.map(meal=>{
                      const st=statusLabels[meal.status]||statusLabels.draft;
                      const linkedRecipe=meal.recipe_id?recipes.find(r=>r.id===meal.recipe_id):null;
                      const bothAgree=meal.ian==="agree"&&meal.kayla==="agree";
                      const anyDisagree=meal.ian==="disagree"||meal.kayla==="disagree";
                      const isCooked=meal.status==="cooked"||meal.status==="confirmed";
                      const isTakeout=meal.meal_type==="takeout";
                      const isUnplanned=meal.status==="unplanned"||meal.status==="set"&&!meal.recipe_id&&!isTakeout;
                      const hasBackup=!!mealBackup[meal.id]?.name;
                      return(
                        <div key={meal.id} style={{background:"#fff",borderRadius:14,border:`1px solid ${anyDisagree?"#f4a89a":bothAgree?"#7ec8a0":isCooked?"#7ec8a0":isTakeout?"#f0c96e":tc.border}`,boxShadow:"0 2px 10px rgba(0,0,0,0.06)",overflow:"hidden",marginBottom:10}}>
                          <div style={{background:isCooked?"#2e7d5e":isTakeout?"#e67e22":tc.strip,height:4}}/>
                          <div style={{padding:"12px 14px"}}>
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                              <div style={{display:"flex",alignItems:"flex-start",gap:8,flex:1}}>
                                <span style={{fontSize:22,flexShrink:0}}>{meal.emoji}</span>
                                <div style={{flex:1}}>
                                  <div style={{fontSize:15,fontWeight:"bold",color:"#1c2a1c",lineHeight:1.3}}>{meal.name}</div>
                                  {meal.store&&!isTakeout&&<div style={{fontSize:10,fontFamily:"sans-serif",color:storeColors[meal.store]||"#777",fontWeight:"bold",marginTop:1}}>🛒 {meal.store}</div>}
                                  {isTakeout&&<div style={{fontSize:10,fontFamily:"sans-serif",color:"#e67e22",fontWeight:"bold",marginTop:1}}>🥡 {meal.takeout_restaurant}</div>}
                                  {meal.swap_name&&<div style={{fontSize:10,fontFamily:"sans-serif",color:meal.swap_suggestion==="thinking"?"#b0813a":"#2e7d5e",marginTop:3,background:meal.swap_suggestion==="thinking"?"#fef6ec":"#edfaf4",borderRadius:6,padding:"2px 8px",display:"inline-block"}}>{meal.swap_suggestion==="thinking"?"🤔 Thinking about it":`→ ${meal.swap_name}`}</div>}
                                </div>
                              </div>
                              {meal.status!=="set"&&!isUnplanned&&(
                                <button onClick={()=>cycleStatus(meal.id)} style={{background:st.bg,color:st.color,border:`1px solid ${st.color}55`,borderRadius:16,padding:"3px 10px",fontSize:10,fontFamily:"sans-serif",cursor:"pointer",flexShrink:0}}>{st.label}</button>
                              )}
                            </div>

                            {!isTakeout&&<p style={{margin:"0 0 10px",fontSize:12,color:"#666",fontFamily:"sans-serif",lineHeight:1.5}}>{meal.description}</p>}

                            {/* Takeout details */}
                            {isTakeout&&(
                              <div style={{marginBottom:10}}>
                                <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:8}}>
                                  <input value={meal.kayla_order||""} onChange={e=>updateMeal(meal.id,{kayla_order:e.target.value})} placeholder="👩🏾 Kayla's order..."
                                    style={{border:"1px solid #f0c96e",borderRadius:8,padding:"7px 10px",fontFamily:"sans-serif",fontSize:12,background:"#fffdf5"}}/>
                                  <input value={meal.ian_order||""} onChange={e=>updateMeal(meal.id,{ian_order:e.target.value})} placeholder="👨🏾 Ian's order..."
                                    style={{border:"1px solid #f0c96e",borderRadius:8,padding:"7px 10px",fontFamily:"sans-serif",fontSize:12,background:"#fffdf5"}}/>
                                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                                    <span style={{fontFamily:"sans-serif",fontSize:12,color:"#888"}}>💰 Total:</span>
                                    <input type="number" value={meal.takeout_cost||""} onChange={e=>updateMeal(meal.id,{takeout_cost:e.target.value})} placeholder="$0.00"
                                      style={{flex:1,border:"1px solid #f0c96e",borderRadius:8,padding:"6px 10px",fontFamily:"sans-serif",fontSize:12}}/>
                                  </div>
                                </div>
                                <button onClick={()=>revertToMeal(meal.id)}
                                  style={{background:"#f4f4f2",color:"#555",border:"1px solid #ddd",borderRadius:8,padding:"6px 12px",fontFamily:"sans-serif",fontSize:11,cursor:"pointer"}}>
                                  ↩ {meal.original_recipe_id?`Restore original meal`:"Not takeout — change meal"}
                                </button>
                              </div>
                            )}

                            {/* Freezer toggles — only for non-takeout */}
                            {!isTakeout&&linkedRecipe?.freezer_items?.map(item=>{
                              const thawed=item.thawed;
                              return(
                                <button key={item.id} onClick={()=>toggleThaw(linkedRecipe.id,item.id)}
                                  style={{display:"flex",alignItems:"center",justifyContent:"space-between",width:"100%",background:thawed?"#edfaf4":"#eef6ff",border:`1.5px solid ${thawed?"#7ec8a0":"#b0d4f4"}`,borderRadius:8,padding:"7px 10px",marginBottom:5,fontFamily:"sans-serif",fontSize:11,color:thawed?"#2e7d5e":"#2a5a8a",cursor:"pointer",textAlign:"left",boxSizing:"border-box"}}>
                                  <span>{thawed?"✅":"🧊"} {item.label}</span>
                                  <span style={{fontWeight:"bold",fontSize:10}}>{thawed?"Out ✓":"Still frozen — tap"}</span>
                                </button>
                              );
                            })}

                            {/* Cook + recipe buttons */}
                            {!isTakeout&&meal.status!=="set"&&(
                              <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:10,alignItems:"center"}}>
                                <div style={{fontSize:10,fontFamily:"sans-serif",color:"#999"}}>👨🏾‍🍳</div>
                                {cookOptions.map(opt=><button key={opt} onClick={()=>updateMeal(meal.id,{cook:meal.cook===opt?null:opt})} style={{background:meal.cook===opt?G:"#f4f4f2",color:meal.cook===opt?"#fff":"#555",border:`1px solid ${meal.cook===opt?G:"#ddd"}`,borderRadius:20,padding:"3px 10px",fontSize:10,fontFamily:"sans-serif",cursor:"pointer"}}>{opt}</button>)}
                              </div>
                            )}

                            {linkedRecipe&&!isTakeout&&(
                              <div style={{display:"flex",gap:7,marginBottom:10,flexWrap:"wrap"}}>
                                <button onClick={()=>setRecipeModal(linkedRecipe)} style={{background:linkedRecipe.status==="confirmed"?"#f3eeff":"#fef6ec",color:linkedRecipe.status==="confirmed"?"#5a3d8a":"#b0813a",border:`1px solid ${linkedRecipe.status==="confirmed"?"#c4a8f0":"#e8c98a"}`,borderRadius:8,padding:"6px 12px",fontSize:11,fontFamily:"sans-serif",cursor:"pointer"}}>📖 {linkedRecipe.status==="confirmed"?"Recipe":"Draft Recipe"}</button>
                                <button onClick={()=>openPantryCheck(linkedRecipe,meal.id)} style={{background:"#eef6ff",color:"#2a5a8a",border:"1px solid #b0d4f4",borderRadius:8,padding:"6px 12px",fontSize:11,fontFamily:"sans-serif",cursor:"pointer"}}>🥫 Pantry Check</button>
                              </div>
                            )}

                            {/* Change / Takeout buttons */}
                            {meal.status!=="set"&&!isTakeout&&(
                              <div style={{display:"flex",gap:7,marginBottom:10,flexWrap:"wrap"}}>
                                <button onClick={()=>setConfirmModal({type:"planday",mealId:meal.id,mealName:meal.name})} style={{background:"#f4f4f2",color:"#555",border:"1px solid #ddd",borderRadius:8,padding:"5px 10px",fontSize:11,fontFamily:"sans-serif",cursor:"pointer"}}>🔄 Change Meal</button>
                                <button onClick={()=>setConfirmModal({type:"takeout",mealId:meal.id,mealName:meal.name})} style={{background:"#fef5ec",color:"#e67e22",border:"1px solid #f0c96e",borderRadius:8,padding:"5px 10px",fontSize:11,fontFamily:"sans-serif",cursor:"pointer"}}>🥡 Make Takeout</button>
                              </div>
                            )}

                            {/* Votes */}
                            {meal.status!=="set"&&(
                              <div style={{borderTop:"1px solid #f0ece4",paddingTop:10}}>
                                {["ian","kayla"].map(person=>(
                                  <div key={person} style={{marginBottom:person==="ian"?10:0}}>
                                    <div style={{fontSize:10,fontFamily:"sans-serif",color:"#888",marginBottom:5,textTransform:"uppercase",letterSpacing:1}}>{person==="ian"?"Ian's Call":"Kayla's Call"}</div>
                                    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                                      <button onClick={()=>vote(meal.id,person,"agree")} style={{background:meal[person]==="agree"?"#2e7d5e":"#f9f9f7",color:meal[person]==="agree"?"#fff":"#2e7d5e",border:"1.5px solid #2e7d5e",borderRadius:8,padding:"5px 12px",fontSize:11,fontFamily:"sans-serif",cursor:"pointer"}}>👍 Looks good</button>
                                      <button onClick={()=>{vote(meal.id,person,"disagree");setModal({type:"swap",mealId:meal.id,person});}} style={{background:meal[person]==="disagree"?"#c0392b":"#f9f9f7",color:meal[person]==="disagree"?"#fff":"#c0392b",border:"1.5px solid #c0392b",borderRadius:8,padding:"5px 12px",fontSize:11,fontFamily:"sans-serif",cursor:"pointer"}}>👎 Swap it</button>
                                      <button onClick={()=>{setModal({type:"note",mealId:meal.id,person});setModalText(meal[`${person}_note`]||"");}} style={{background:meal[`${person}_note`]?"#fef6ec":"#f9f9f7",color:meal[`${person}_note`]?"#b0813a":"#aaa",border:`1px solid ${meal[`${person}_note`]?"#b0813a":"#ddd"}`,borderRadius:8,padding:"5px 10px",fontSize:11,fontFamily:"sans-serif",cursor:"pointer"}}>💬{meal[`${person}_note`]?" ✓":""}</button>
                                    </div>
                                    {meal[`${person}_note`]&&<div style={{marginTop:5,background:"#fef6ec",borderRadius:7,padding:"6px 10px",fontSize:11,fontFamily:"sans-serif",color:"#7a5a20",borderLeft:"3px solid #b0813a"}}><strong>{person==="ian"?"Ian":"Kayla"}:</strong> {meal[`${person}_note`]}</div>}
                                  </div>
                                ))}
                              </div>
                            )}
                            {isCooked&&meal.cook_note&&<div style={{marginTop:8,background:"#edfaf4",borderRadius:8,padding:"7px 10px",fontSize:11,fontFamily:"sans-serif",color:"#2e5c3e",borderLeft:"3px solid #2e7d5e"}}><strong>Cook notes:</strong> {meal.cook_note}</div>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      {/* ── RECIPES TAB ── */}
      {activeTab==="library"&&(
        <div style={{padding:"16px 12px"}}>
          {recipes.map(r=>{const total=(r.ingredients||[]).filter(i=>i.price).reduce((s,i)=>s+i.price,0);return(
            <div key={r.id} style={{background:"#fff",borderRadius:14,border:"1px solid #e0dbd0",padding:"12px 14px",marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                <div style={{flex:1}}><div style={{fontSize:15,fontWeight:"bold",color:"#1c2a1c"}}>{r.name}</div><div style={{fontFamily:"sans-serif",fontSize:11,color:"#aaa",marginTop:2}}>⏱ {r.cook_time}{total>0?` · 💰 $${total.toFixed(2)}`:""}</div></div>
                <span style={{background:r.status==="confirmed"?"#f3eeff":"#fef6ec",color:r.status==="confirmed"?"#5a3d8a":"#b0813a",borderRadius:20,padding:"3px 10px",fontSize:10,fontFamily:"sans-serif",whiteSpace:"nowrap",marginLeft:8}}>{r.status==="confirmed"?"🔒 Confirmed":"📝 Draft"}</span>
              </div>
              <button onClick={()=>setRecipeModal(r)} style={{width:"100%",background:"#f3eeff",color:"#5a3d8a",border:"1px solid #c4a8f0",borderRadius:8,padding:"7px",fontFamily:"sans-serif",fontSize:12,cursor:"pointer"}}>📖 View Recipe</button>
            </div>
          );})}
          <div style={{background:"#f3eeff",border:"1px dashed #c4a8f0",borderRadius:14,padding:"18px",textAlign:"center",marginTop:4}}><div style={{fontSize:18,marginBottom:4}}>🍳</div><div style={{fontFamily:"sans-serif",color:"#8a6ab0",fontSize:12}}>More recipes appear as you cook & confirm!</div></div>
        </div>
      )}

      {/* ── GROCERY TAB ── */}
      {activeTab==="grocery"&&(
        <div style={{padding:"14px 12px"}}>
          <button onClick={()=>setShowGroceryTrip(true)} style={{width:"100%",background:`linear-gradient(135deg,${G},#2e5c3e)`,color:"#fff",border:"none",borderRadius:12,padding:"13px",fontFamily:"sans-serif",fontSize:13,cursor:"pointer",marginBottom:12,fontWeight:"bold"}}>🛒 Start Grocery Trip</button>
          {/* Week toggle for grocery */}
          {(()=>{
            const nextWeekKey = ALL_WEEKS[ALL_WEEKS.indexOf(TODAY_KEY)+1]||TODAY_KEY;
            return (
              <div style={{display:"flex",gap:6,marginBottom:12}}>
                <button onClick={()=>setGroceryWeek(TODAY_KEY)} style={{flex:1,background:groceryWeek===TODAY_KEY?G:"#f4f4f2",color:groceryWeek===TODAY_KEY?"#fff":"#555",border:`1px solid ${groceryWeek===TODAY_KEY?G:"#ddd"}`,borderRadius:10,padding:"7px 4px",fontFamily:"sans-serif",fontSize:10,cursor:"pointer"}}>
                  📅 {getWeekLabel(TODAY_KEY)}
                </button>
                <button onClick={()=>setGroceryWeek(nextWeekKey)} style={{flex:1,background:groceryWeek===nextWeekKey?G:"#f4f4f2",color:groceryWeek===nextWeekKey?"#fff":"#555",border:`1px solid ${groceryWeek===nextWeekKey?G:"#ddd"}`,borderRadius:10,padding:"7px 4px",fontFamily:"sans-serif",fontSize:10,cursor:"pointer"}}>
                  📅 {getWeekLabel(nextWeekKey)}
                </button>
              </div>
            );
          })()}

          {/* From meals */}
          {mealIngredientsForWeek(groceryWeek).length>0&&(
            <div style={{background:"#f4faf6",border:"1px solid #7ec8a0",borderRadius:12,padding:"12px",marginBottom:12}}>
              <div style={{fontFamily:"sans-serif",fontSize:12,fontWeight:"bold",color:"#1c5a38",marginBottom:8}}>🍽️ From This Week's Meals</div>
              {mealIngredientsForWeek(groceryWeek).slice(0,8).map((ing,i)=>{
                const status=getPantryStatus(ing.pantryKey);
                const added=grocery.find(g=>g.name===ing.name&&g.week_key===groceryWeek);
                return(
                  <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                    <div><div style={{fontFamily:"sans-serif",fontSize:12,color:"#333"}}>· {ing.name}</div>{ing.price&&<div style={{fontFamily:"sans-serif",fontSize:10,color:"#aaa"}}>${ing.price.toFixed(2)}</div>}</div>
                    <button onClick={()=>{if(!added)addToGrocery(ing.name,ing.store,ing.price,groceryWeek);}} style={{background:added?"#e0e0e0":status==="have"?"#edfaf4":"#fef6ec",color:added?"#888":status==="have"?"#2e7d5e":"#b0813a",border:`1px solid ${added?"#ddd":status==="have"?"#7ec8a0":"#e8c98a"}`,borderRadius:20,padding:"3px 10px",fontSize:10,fontFamily:"sans-serif",cursor:added?"default":"pointer",whiteSpace:"nowrap"}}>
                      {added?"Added ✓":status==="have"?"✅ Have it":"🛒 Need it"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Low stock */}
          {lowPantry.length>0&&(
            <div style={{background:"#fff8ec",border:"1px solid #f0c96e",borderRadius:12,padding:"12px",marginBottom:12}}>
              <div style={{fontFamily:"sans-serif",fontSize:12,fontWeight:"bold",color:"#b07a10",marginBottom:6}}>⚠️ Low Stock</div>
              {lowPantry.map(item=>(
                <div key={item.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                  <div><div style={{fontFamily:"sans-serif",fontSize:12,color:"#444"}}>· {item.name}</div><div style={{fontFamily:"sans-serif",fontSize:10,color:"#aaa"}}>{item.store} · {item.qty}</div></div>
                  <button onClick={()=>addToGrocery(item.name,item.store,item.price,groceryWeek)} style={{background:grocery.find(g=>g.name===item.name)?"#e0e0e0":"#b0813a",color:grocery.find(g=>g.name===item.name)?"#888":"#fff",border:"none",borderRadius:20,padding:"3px 10px",fontSize:10,fontFamily:"sans-serif",cursor:"pointer"}}>{grocery.find(g=>g.name===item.name)?"Added ✓":"+Add"}</button>
                </div>
              ))}
            </div>
          )}

          {/* Add item */}
          <div style={{background:"#fff",border:"1px solid #e0dbd0",borderRadius:12,padding:"12px",marginBottom:12}}>
            <div style={{fontFamily:"sans-serif",fontSize:12,fontWeight:"bold",color:"#1c2a1c",marginBottom:8}}>➕ Add Item</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:6}}>
              <input value={newGroceryItem} onChange={e=>setNewGroceryItem(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addManualGrocery()} placeholder="Item name..."
                style={{flex:2,minWidth:100,border:"1px solid #ddd",borderRadius:8,padding:"7px 10px",fontFamily:"sans-serif",fontSize:12}}/>
              <input type="number" value={newGroceryPrice} onChange={e=>setNewGroceryPrice(e.target.value)} placeholder="$"
                style={{flex:1,minWidth:50,border:"1px solid #ddd",borderRadius:8,padding:"7px 8px",fontFamily:"sans-serif",fontSize:12}}/>
            </div>
            <div style={{display:"flex",gap:6}}>
              <select value={newGroceryStore} onChange={e=>setNewGroceryStore(e.target.value)} style={{flex:1,border:"1px solid #ddd",borderRadius:8,padding:"7px",fontFamily:"sans-serif",fontSize:12}}>{STORES.map(s=><option key={s}>{s}</option>)}</select>
              <button onClick={addManualGrocery} style={{background:G,color:"#fff",border:"none",borderRadius:8,padding:"7px 14px",fontFamily:"sans-serif",fontSize:12,cursor:"pointer"}}>Add</button>
            </div>
          </div>

          {groceryWeekItems.length===0?<div style={{textAlign:"center",padding:"30px",fontFamily:"sans-serif",color:"#aaa"}}><div style={{fontSize:24,marginBottom:6}}>🛒</div><div>Grocery list is empty!</div></div>:(
            <>
              {STORES.filter(s=>groceryByStore[s]?.length>0).map(store=>(
                <div key={store} style={{marginBottom:12}}>
                  <div style={{fontFamily:"sans-serif",fontSize:11,fontWeight:"bold",color:storeColors[store]||"#555",textTransform:"uppercase",letterSpacing:1,marginBottom:5}}>🛒 {store}</div>
                  <div style={{background:"#fff",border:"1px solid #e0dbd0",borderRadius:12,overflow:"hidden"}}>
                    {groceryByStore[store].map((item,i)=>(
                      <div key={item.id} style={{padding:"9px 12px",borderBottom:i<groceryByStore[store].length-1?"1px solid #f4f4f2":"none"}}>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <button onClick={()=>updateGrocery(item.id,{checked:!item.checked})} style={{width:20,height:20,borderRadius:"50%",border:`2px solid ${item.checked?"#2e7d5e":"#ccc"}`,background:item.checked?"#2e7d5e":"transparent",cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:11}}>{item.checked?"✓":""}</button>
                          <span style={{flex:1,fontFamily:"sans-serif",fontSize:12,color:item.checked?"#aaa":"#333",textDecoration:item.checked?"line-through":"none"}}>{item.name}{item.price?<span style={{color:"#2e7d5e"}}> · ${parseFloat(item.price).toFixed(2)}</span>:null}</span>
                          <button onClick={()=>removeGrocery(item.id)} style={{background:"none",border:"none",color:"#ddd",cursor:"pointer",fontSize:16}}>×</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <div style={{background:"#fff",border:"1px solid #e0dbd0",borderRadius:12,padding:"12px",marginBottom:10}}>
                <div style={{fontFamily:"sans-serif",fontSize:12,fontWeight:"bold",color:"#1c2a1c",marginBottom:6}}>💰 Spend</div>
                <div style={{display:"flex",justifyContent:"space-between",fontFamily:"sans-serif",fontSize:12,color:"#555",marginBottom:3}}><span>Groceries</span><span style={{color:"#2e7d5e",fontWeight:"bold"}}>${groceryTotal.toFixed(2)}</span></div>
                {takeoutTotal>0&&<div style={{display:"flex",justifyContent:"space-between",fontFamily:"sans-serif",fontSize:12,color:"#555",marginBottom:3}}><span>🥡 Takeout</span><span style={{color:"#e67e22",fontWeight:"bold"}}>${takeoutTotal.toFixed(2)}</span></div>}
                {totalSavings>0&&<div style={{display:"flex",justifyContent:"space-between",fontFamily:"sans-serif",fontSize:12,color:"#555",marginBottom:3}}><span>🥫 Pantry savings</span><span style={{color:"#2e7d5e",fontWeight:"bold"}}>-${totalSavings.toFixed(2)}</span></div>}
                <div style={{borderTop:"1px solid #f0ece4",paddingTop:5,marginTop:3,display:"flex",justifyContent:"space-between",fontFamily:"sans-serif",fontSize:13,fontWeight:"bold"}}><span>Total</span><span style={{color:totalSpent>MONTHLY_BUDGET?"#c0392b":"#2e7d5e"}}>${totalSpent.toFixed(2)}</span></div>
                <div style={{background:"#f0f0f0",borderRadius:20,height:8,overflow:"hidden",marginTop:6}}><div style={{background:totalSpent>MONTHLY_BUDGET?"#c0392b":"#2e7d5e",height:"100%",width:`${Math.min(100,(totalSpent/MONTHLY_BUDGET)*100)}%`,borderRadius:20}}/></div>
              </div>
              <button onClick={()=>grocery.forEach(g=>removeGrocery(g.id))} style={{width:"100%",background:"#f4f4f2",color:"#888",border:"1px solid #ddd",borderRadius:10,padding:"9px",fontFamily:"sans-serif",fontSize:12,cursor:"pointer"}}>🗑 Clear List</button>
            </>
          )}
        </div>
      )}

      {/* ── INVENTORY TAB ── */}
      {activeTab==="inventory"&&(
        <div style={{padding:"14px 12px"}}>
          <input value={pantrySearch} onChange={e=>setPantrySearch(e.target.value)} placeholder="🔍 Search inventory..."
            style={{width:"100%",border:"1px solid #ddd",borderRadius:10,padding:"9px 12px",fontFamily:"sans-serif",fontSize:13,marginBottom:12,boxSizing:"border-box"}}/>
          {lowPantry.length>0&&<div style={{background:"#fff8ec",border:"1px solid #f0c96e",borderRadius:12,padding:"10px 12px",marginBottom:12}}><div style={{fontFamily:"sans-serif",fontSize:11,fontWeight:"bold",color:"#b07a10",marginBottom:5}}>⚠️ Needs Restocking</div>{lowPantry.map(p=><div key={p.id} style={{fontFamily:"sans-serif",fontSize:12,color:"#7a5a20",marginBottom:2}}>· {p.name} — {p.qty}</div>)}</div>}
          {Object.entries(pantryByCategory).map(([cat,items])=>(
            <div key={cat} style={{marginBottom:12}}>
              <div style={{fontFamily:"sans-serif",fontSize:10,fontWeight:"bold",color:"#888",textTransform:"uppercase",letterSpacing:1,marginBottom:5}}>{cat}</div>
              <div style={{background:"#fff",border:"1px solid #e0dbd0",borderRadius:12,overflow:"hidden"}}>
                {items.map((item,i)=>{
                  const qtyType=QTY_TYPE[item.category]||"words";
                  const options=qtyType==="numbers"?QTY_NUMBERS:QTY_WORDS;
                  const low=isLow(item);
                  const isEditing=inventoryEdit===item.id;
                  return(
                    <div key={item.id} style={{padding:"10px 12px",borderBottom:i<items.length-1?"1px solid #f4f4f2":"none",background:isEditing?"#f9f6ff":"transparent"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                        <div><div style={{fontFamily:"sans-serif",fontSize:12,color:low?"#b07a10":"#333",fontWeight:low?"bold":"normal"}}>{item.name} {low&&"⚠️"}</div><div style={{fontFamily:"sans-serif",fontSize:10,color:"#aaa"}}>{item.store}{item.price?` · $${item.price}`:""}</div></div>
                        <button onClick={()=>setInventoryEdit(isEditing?null:item.id)} style={{background:isEditing?"#5a3d8a":"#f4f4f2",color:isEditing?"#fff":"#888",border:"none",borderRadius:20,padding:"3px 10px",fontSize:10,fontFamily:"sans-serif",cursor:"pointer"}}>{isEditing?"✓ Done":"✏️"}</button>
                      </div>
                      <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:isEditing?8:0}}>
                        {options.map(opt=><button key={opt} onClick={()=>updatePantryItem(item.id,{qty:opt})} style={{background:item.qty===opt?(opt==="Out"||opt==="1"?"#c0392b":opt==="A Little"?"#b0813a":"#2e7d5e"):"#f4f4f2",color:item.qty===opt?"#fff":"#888",border:`1px solid ${item.qty===opt?(opt==="Out"||opt==="1"?"#c0392b":opt==="A Little"?"#b0813a":"#2e7d5e"):"#e0e0e0"}`,borderRadius:20,padding:"2px 9px",fontSize:10,fontFamily:"sans-serif",cursor:"pointer"}}>{opt}</button>)}
                      </div>
                      {isEditing&&(
                        <div style={{background:"#f4f0ff",borderRadius:10,padding:"10px",marginTop:4}}>
                          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:6}}>
                            <div style={{flex:1}}><div style={{fontFamily:"sans-serif",fontSize:10,color:"#888",marginBottom:2}}>Primary Store</div><select value={item.store||""} onChange={e=>updatePantryItem(item.id,{store:e.target.value})} style={{width:"100%",border:"1px solid #ddd",borderRadius:7,padding:"5px",fontFamily:"sans-serif",fontSize:11}}>{STORES.map(s=><option key={s}>{s}</option>)}</select></div>
                            <div style={{flex:1}}><div style={{fontFamily:"sans-serif",fontSize:10,color:"#888",marginBottom:2}}>Price $</div><input type="number" value={item.price||""} onChange={e=>updatePantryItem(item.id,{price:parseFloat(e.target.value)||null})} placeholder="0.00" style={{width:"100%",border:"1px solid #ddd",borderRadius:7,padding:"5px",fontFamily:"sans-serif",fontSize:11,boxSizing:"border-box"}}/></div>
                          </div>
                          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:6}}>
                            <div style={{flex:1}}><div style={{fontFamily:"sans-serif",fontSize:10,color:"#888",marginBottom:2}}>Alt Store</div><select value={item.store2||""} onChange={e=>updatePantryItem(item.id,{store2:e.target.value||null})} style={{width:"100%",border:"1px solid #ddd",borderRadius:7,padding:"5px",fontFamily:"sans-serif",fontSize:11}}><option value="">None</option>{STORES.map(s=><option key={s}>{s}</option>)}</select></div>
                            <div style={{flex:1}}><div style={{fontFamily:"sans-serif",fontSize:10,color:"#888",marginBottom:2}}>Alt Price $</div><input type="number" value={item.price2||""} onChange={e=>updatePantryItem(item.id,{price2:parseFloat(e.target.value)||null})} placeholder="0.00" style={{width:"100%",border:"1px solid #ddd",borderRadius:7,padding:"5px",fontFamily:"sans-serif",fontSize:11,boxSizing:"border-box"}}/></div>
                          </div>
                          <div style={{marginBottom:6}}><div style={{fontFamily:"sans-serif",fontSize:10,color:"#888",marginBottom:3}}>Flag low when qty reaches:</div><div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{options.map(opt=><button key={opt} onClick={()=>updatePantryItem(item.id,{low_threshold:opt})} style={{background:item.low_threshold===opt?"#c0392b":"#f4f4f2",color:item.low_threshold===opt?"#fff":"#888",border:`1px solid ${item.low_threshold===opt?"#c0392b":"#ddd"}`,borderRadius:20,padding:"2px 9px",fontSize:10,fontFamily:"sans-serif",cursor:"pointer"}}>{opt}</button>)}</div></div>
                          <button onClick={()=>deletePantryItem(item.id)} style={{background:"#fff0f0",color:"#c0392b",border:"1px solid #f4a89a",borderRadius:8,padding:"4px 12px",fontFamily:"sans-serif",fontSize:10,cursor:"pointer"}}>🗑 Remove</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          <div style={{background:"#fff",border:"1px solid #e0dbd0",borderRadius:12,padding:"12px",marginTop:4}}>
            <div style={{fontFamily:"sans-serif",fontSize:12,fontWeight:"bold",color:"#1c2a1c",marginBottom:8}}>➕ Add Item</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:6}}>
              <input value={addItemForm.name} onChange={e=>setAddItemForm(a=>({...a,name:e.target.value}))} placeholder="Item name..." style={{flex:2,minWidth:100,border:"1px solid #ddd",borderRadius:8,padding:"7px 10px",fontFamily:"sans-serif",fontSize:12}}/>
              <select value={addItemForm.category} onChange={e=>setAddItemForm(a=>({...a,category:e.target.value}))} style={{flex:1,border:"1px solid #ddd",borderRadius:8,padding:"7px",fontFamily:"sans-serif",fontSize:12}}>{PANTRY_CATEGORIES.map(c=><option key={c}>{c}</option>)}</select>
            </div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:6}}>
              <select value={addItemForm.store} onChange={e=>setAddItemForm(a=>({...a,store:e.target.value}))} style={{flex:1,border:"1px solid #ddd",borderRadius:8,padding:"7px",fontFamily:"sans-serif",fontSize:12}}>{STORES.map(s=><option key={s}>{s}</option>)}</select>
              <input type="number" value={addItemForm.price} onChange={e=>setAddItemForm(a=>({...a,price:e.target.value}))} placeholder="$ price" style={{flex:1,minWidth:60,border:"1px solid #ddd",borderRadius:8,padding:"7px 8px",fontFamily:"sans-serif",fontSize:12}}/>
            </div>
            <button onClick={addPantryItem} style={{width:"100%",background:G,color:"#fff",border:"none",borderRadius:8,padding:"9px",fontFamily:"sans-serif",fontSize:12,cursor:"pointer"}}>Add to Inventory</button>
          </div>
        </div>
      )}

      {/* ── BUDGET TAB ── */}
      {activeTab==="analytics"&&(
        <div style={{padding:"14px 12px"}}>
          <div style={{background:"#fff",border:"1px solid #e0dbd0",borderRadius:14,padding:"16px",marginBottom:12}}>
            <div style={{fontFamily:"sans-serif",fontWeight:"bold",fontSize:14,color:"#1c2a1c",marginBottom:10}}>💰 Monthly Budget</div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:10}}>
              <div><div style={{fontFamily:"sans-serif",fontSize:26,fontWeight:"bold",color:totalSpent>MONTHLY_BUDGET?"#c0392b":"#2e7d5e"}}>${totalSpent.toFixed(2)}</div><div style={{fontFamily:"sans-serif",fontSize:11,color:"#888"}}>spent this month</div></div>
              <div style={{textAlign:"right"}}><div style={{fontFamily:"sans-serif",fontSize:16,fontWeight:"bold",color:totalSpent>MONTHLY_BUDGET?"#c0392b":"#2e7d5e"}}>${(MONTHLY_BUDGET-totalSpent).toFixed(2)}</div><div style={{fontFamily:"sans-serif",fontSize:11,color:"#888"}}>{totalSpent>MONTHLY_BUDGET?"over budget":"remaining"}</div></div>
            </div>
            <div style={{background:"#f0f0f0",borderRadius:20,height:18,overflow:"hidden",marginBottom:8}}><div style={{background:totalSpent>MONTHLY_BUDGET?"linear-gradient(90deg,#e74c3c,#c0392b)":"linear-gradient(90deg,#27ae60,#2e7d5e)",height:"100%",width:`${Math.min(100,(totalSpent/MONTHLY_BUDGET)*100)}%`,borderRadius:20,display:"flex",alignItems:"center",justifyContent:"flex-end",paddingRight:8}}><span style={{color:"#fff",fontSize:9,fontFamily:"sans-serif",fontWeight:"bold"}}>{Math.round((totalSpent/MONTHLY_BUDGET)*100)}%</span></div></div>
            <div style={{display:"flex",flexDirection:"column",gap:3,fontFamily:"sans-serif",fontSize:11,color:"#888"}}>
              <div style={{display:"flex",justifyContent:"space-between"}}><span>Groceries</span><span>${groceryTotal.toFixed(2)}</span></div>
              {takeoutTotal>0&&<div style={{display:"flex",justifyContent:"space-between",color:"#e67e22"}}><span>🥡 Takeout</span><span>${takeoutTotal.toFixed(2)}</span></div>}
              {totalSavings>0&&<div style={{display:"flex",justifyContent:"space-between",color:"#2e7d5e"}}><span>🥫 Pantry savings</span><span>-${totalSavings.toFixed(2)}</span></div>}
            </div>
          </div>
          <div style={{background:"#fff",border:"1px solid #e0dbd0",borderRadius:14,padding:"16px"}}>
            <div style={{fontFamily:"sans-serif",fontWeight:"bold",fontSize:14,color:"#1c2a1c",marginBottom:12}}>🍳 Recipe Stats</div>
            {recipes.map(r=>{const times=meals.filter(m=>m.recipe_id===r.id&&(m.status==="confirmed"||m.status==="cooked")).length;return(<div key={r.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,paddingBottom:10,borderBottom:"1px solid #f4f4f2"}}><div><div style={{fontFamily:"sans-serif",fontSize:12,color:"#333",fontWeight:"bold"}}>{r.name}</div><div style={{fontFamily:"sans-serif",fontSize:10,color:"#aaa"}}>Made {times} time{times!==1?"s":""}</div></div><span style={{background:r.status==="confirmed"?"#f3eeff":"#fef6ec",color:r.status==="confirmed"?"#5a3d8a":"#b0813a",borderRadius:20,padding:"3px 10px",fontSize:10,fontFamily:"sans-serif"}}>{r.status==="confirmed"?"🔒":"📝"}</span></div>);})}
          </div>
        </div>
      )}

      {/* ── SYNC TAB ── */}
      {activeTab==="sync"&&(
        <div style={{padding:"14px 12px"}}>
          <div style={{background:"#fff",border:"1px solid #e0dbd0",borderRadius:14,padding:"14px"}}>
            <div style={{fontFamily:"sans-serif",fontWeight:"bold",fontSize:14,color:"#1c2a1c",marginBottom:2}}>📋 Update Claude</div>
            <div style={{fontFamily:"sans-serif",fontSize:11,color:"#888",marginBottom:10}}>Copy and paste into Claude for a full update</div>
            <pre style={{fontFamily:"sans-serif",fontSize:10,color:"#444",background:"#f9f9f7",borderRadius:8,padding:10,whiteSpace:"pre-wrap",lineHeight:1.6,margin:"0 0 10px",maxHeight:320,overflow:"auto"}}>{syncSummary}</pre>
            <button onClick={()=>{try{navigator.clipboard.writeText(syncSummary);}catch(e){}alert("Copied! Paste into Claude 🙌");}} style={{width:"100%",background:G,color:"#fff",border:"none",borderRadius:8,padding:"11px",fontFamily:"sans-serif",fontSize:13,cursor:"pointer"}}>📋 Copy to Clipboard</button>
          </div>
        </div>
      )}

      {/* ── BOTTOM NAV ── */}
      <div style={{position:"fixed",bottom:0,left:0,right:0,background:"#fff",borderTop:"1px solid #e0dbd0",display:"flex",zIndex:100,boxShadow:"0 -2px 12px rgba(0,0,0,0.08)"}}>
        {[["week","📅","Week"],["library","📖","Recipes"],["grocery","🛒","Grocery"],["inventory","🥫","Pantry"],["analytics","📊","Budget"],["sync","📋","Sync"]].map(([tab,icon,label])=>(
          <button key={tab} onClick={()=>setActiveTab(tab)} style={{flex:1,background:"none",border:"none",padding:"8px 0 10px",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
            <span style={{fontSize:17}}>{icon}</span>
            <span style={{fontFamily:"sans-serif",fontSize:9,color:activeTab===tab?"#b0813a":"#aaa",fontWeight:activeTab===tab?"bold":"normal"}}>{label}</span>
            {activeTab===tab&&<div style={{width:4,height:4,borderRadius:"50%",background:"#b0813a"}}/>}
          </button>
        ))}
      </div>

      {/* ── MODALS ── */}

      {/* Cooked */}
      {modal?.type==="cooked"&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:150}}><div style={{background:"#fff",borderRadius:"18px 18px 0 0",padding:22,width:"100%",maxWidth:560}}><div style={{fontFamily:"sans-serif",fontWeight:"bold",fontSize:15,marginBottom:4,color:"#1c2a1c"}}>✅ Mark as Cooked</div><div style={{fontFamily:"sans-serif",fontSize:12,color:"#888",marginBottom:10}}>How did it go? Any notes?</div><textarea value={modalText} onChange={e=>setModalText(e.target.value)} placeholder="It was great! Next time add more garlic... or plans changed, we ended up doing..." style={{width:"100%",minHeight:70,borderRadius:8,border:"1px solid #ddd",padding:10,fontFamily:"sans-serif",fontSize:13,resize:"vertical",boxSizing:"border-box"}}/><div style={{display:"flex",gap:8,marginTop:10}}><button onClick={saveModal} style={{flex:1,background:"#2e7d5e",color:"#fff",border:"none",borderRadius:8,padding:11,fontSize:13,fontFamily:"sans-serif",cursor:"pointer"}}>✅ Confirm Cooked</button><button onClick={()=>setModal(null)} style={{flex:1,background:"#f4f4f2",color:"#555",border:"none",borderRadius:8,padding:11,fontSize:13,fontFamily:"sans-serif",cursor:"pointer"}}>Cancel</button></div></div></div>}

      {/* Note */}
      {modal?.type==="note"&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:150}}><div style={{background:"#fff",borderRadius:"18px 18px 0 0",padding:22,width:"100%",maxWidth:560}}><div style={{fontFamily:"sans-serif",fontWeight:"bold",fontSize:15,marginBottom:10,color:"#1c2a1c"}}>💬 {modal.person==="ian"?"Ian's":"Kayla's"} Note</div><textarea value={modalText} onChange={e=>setModalText(e.target.value)} placeholder="Leave a comment..." style={{width:"100%",minHeight:70,borderRadius:8,border:"1px solid #ddd",padding:10,fontFamily:"sans-serif",fontSize:13,resize:"vertical",boxSizing:"border-box"}}/><div style={{display:"flex",gap:8,marginTop:10}}><button onClick={saveModal} style={{flex:1,background:G,color:"#fff",border:"none",borderRadius:8,padding:11,fontSize:13,fontFamily:"sans-serif",cursor:"pointer"}}>Save</button><button onClick={()=>setModal(null)} style={{flex:1,background:"#f4f4f2",color:"#555",border:"none",borderRadius:8,padding:11,fontSize:13,fontFamily:"sans-serif",cursor:"pointer"}}>Cancel</button></div></div></div>}

      {/* Day note */}
      {modal?.type==="daynote"&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:150}}><div style={{background:"#fff",borderRadius:"18px 18px 0 0",padding:22,width:"100%",maxWidth:560}}><div style={{fontFamily:"sans-serif",fontWeight:"bold",fontSize:15,marginBottom:3,color:"#1c2a1c"}}>📝 Day Note</div><div style={{fontFamily:"sans-serif",fontSize:11,color:"#888",marginBottom:10}}>Plans changed? Ate something different? This shows in your Claude update.</div><textarea value={modalText} onChange={e=>setModalText(e.target.value)} placeholder="e.g. Plans changed, we just had packet ramen. Or: recipe went wrong so we ordered Chick-fil-A..." style={{width:"100%",minHeight:70,borderRadius:8,border:"1px solid #ddd",padding:10,fontFamily:"sans-serif",fontSize:13,resize:"vertical",boxSizing:"border-box"}}/><div style={{display:"flex",gap:8,marginTop:10}}><button onClick={saveModal} style={{flex:1,background:G,color:"#fff",border:"none",borderRadius:8,padding:11,fontSize:13,fontFamily:"sans-serif",cursor:"pointer"}}>Save</button><button onClick={()=>setModal(null)} style={{flex:1,background:"#f4f4f2",color:"#555",border:"none",borderRadius:8,padding:11,fontSize:13,fontFamily:"sans-serif",cursor:"pointer"}}>Cancel</button></div></div></div>}

      {/* Swap */}
      {modal?.type==="swap"&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:150}}><div style={{background:"#faf9f6",borderRadius:"22px 22px 0 0",width:"100%",maxWidth:560,maxHeight:"80vh",overflowY:"auto",padding:"18px 14px 40px"}}><div style={{fontFamily:"sans-serif",fontWeight:"bold",fontSize:15,color:"#1c2a1c",marginBottom:2}}>👎 Request a Swap</div><div style={{fontFamily:"sans-serif",fontSize:11,color:"#888",marginBottom:12}}>Your choice shows on the meal card and in notifications</div><button onClick={()=>{updateMeal(modal.mealId,{swap_suggestion:"thinking",swap_name:"Thinking about it 🤔"});setModal(null);}} style={{width:"100%",background:"#fef6ec",color:"#b0813a",border:"1px solid #e8c98a",borderRadius:10,padding:"12px 14px",fontFamily:"sans-serif",fontSize:13,cursor:"pointer",marginBottom:10,textAlign:"left",fontWeight:"bold"}}>🤔 Thinking about it — flag for now</button><div style={{fontFamily:"sans-serif",fontSize:10,color:"#888",textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>Or choose from your recipes:</div>{recipes.map(r=><button key={r.id} onClick={()=>{updateMeal(modal.mealId,{swap_suggestion:r.id,swap_name:r.name});setModal(null);}} style={{width:"100%",background:"#fff",color:"#333",border:"1px solid #e0dbd0",borderRadius:10,padding:"11px 14px",fontFamily:"sans-serif",fontSize:13,cursor:"pointer",marginBottom:5,textAlign:"left",display:"flex",justifyContent:"space-between",alignItems:"center"}}><span>{r.name}</span><span style={{fontSize:10,color:r.status==="confirmed"?"#5a3d8a":"#b0813a"}}>{r.status==="confirmed"?"🔒":"📝"}</span></button>)}<button onClick={()=>setModal(null)} style={{width:"100%",background:"#f4f4f2",color:"#555",border:"none",borderRadius:10,padding:"11px",fontFamily:"sans-serif",fontSize:13,cursor:"pointer",marginTop:4}}>Cancel</button></div></div>}

      {/* Confirm change */}
      {confirmModal&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:150,padding:20}}><div style={{background:"#fff",borderRadius:16,padding:22,width:"100%",maxWidth:360}}><div style={{fontFamily:"sans-serif",fontWeight:"bold",fontSize:15,marginBottom:6,color:"#1c2a1c"}}>⚠️ Are you sure?</div><div style={{fontFamily:"sans-serif",fontSize:13,color:"#555",marginBottom:16}}>You're about to {confirmModal.type==="takeout"?"change this to takeout":"change this meal"}. This will replace <strong>{confirmModal.mealName}</strong>. You can undo after.</div><div style={{display:"flex",gap:8}}><button onClick={confirmMealChange} style={{flex:1,background:confirmModal.type==="takeout"?"#e67e22":G,color:"#fff",border:"none",borderRadius:8,padding:11,fontSize:13,fontFamily:"sans-serif",cursor:"pointer"}}>{confirmModal.type==="takeout"?"🥡 Yes, Takeout":"🔄 Yes, Change"}</button><button onClick={()=>setConfirmModal(null)} style={{flex:1,background:"#f4f4f2",color:"#555",border:"none",borderRadius:8,padding:11,fontSize:13,fontFamily:"sans-serif",cursor:"pointer"}}>Cancel</button></div></div></div>}

      {/* Plan day */}
      {showPlanDay&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:150}}><div style={{background:"#faf9f6",borderRadius:"22px 22px 0 0",width:"100%",maxWidth:560,maxHeight:"80vh",overflowY:"auto",padding:"18px 14px 40px"}}>
        <div style={{fontFamily:"sans-serif",fontWeight:"bold",fontSize:15,color:"#1c2a1c",marginBottom:10}}>📖 Plan This Day</div>
        {recipes.map(r=><button key={r.id} onClick={async()=>{
          const {mealId, day, weekKey} = showPlanDay;
          if(mealId){
            // Editing an existing meal row
            await planDay(mealId, r);
          } else {
            // Creating a new meal for a blank day
            const emoji=r.name.match(/^[^\w\s]/)?.[0]||"🍽️";
            const newId=`${(day||"").toLowerCase().replace(/\s/g,"")}-d-${Date.now()}`;
            const newMeal={
              id:newId, week_key:weekKey, day:day, date:"", meal_type:"meal",
              emoji:emoji, name:r.name, description:r.description||"",
              store:r.store||null, store_type:"instacart", cook:null, status:"draft",
              ian:null, ian_note:"", kayla:null, kayla_note:"", cook_note:"", day_note:"",
              recipe_id:r.id, original_recipe_id:null, swap_suggestion:null, swap_name:null,
              takeout_restaurant:null, kayla_order:null, ian_order:null, takeout_cost:null
            };
            setMeals(prev=>[...prev,newMeal]);
            const {error}=await supabase.from("meals").insert(newMeal);
            if(error) console.error("insert meal error:",error);
          }
          setShowPlanDay(null);
        }} style={{width:"100%",background:"#fff",color:"#333",border:"1px solid #e0dbd0",borderRadius:10,padding:"12px 14px",fontFamily:"sans-serif",fontSize:13,cursor:"pointer",marginBottom:6,textAlign:"left",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div><div>{r.name}</div><div style={{fontSize:10,color:"#aaa",marginTop:2}}>⏱ {r.cook_time}</div></div>
          <span style={{fontSize:10,color:r.status==="confirmed"?"#5a3d8a":"#b0813a"}}>{r.status==="confirmed"?"🔒":"📝"}</span>
        </button>)}
        <button onClick={()=>{setShowTakeoutModal(showPlanDay);setShowPlanDay(null);}} style={{width:"100%",background:"#fef5ec",color:"#e67e22",border:"1px solid #f0c96e",borderRadius:10,padding:"12px",fontFamily:"sans-serif",fontSize:13,cursor:"pointer",marginBottom:6}}>🥡 Takeout Instead</button>
        <button onClick={()=>setShowPlanDay(null)} style={{width:"100%",background:"#f4f4f2",color:"#555",border:"none",borderRadius:10,padding:"11px",fontFamily:"sans-serif",fontSize:13,cursor:"pointer"}}>Cancel</button>
      </div></div>}

      {/* Takeout */}
      {showTakeoutModal&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:150}}><div style={{background:"#faf9f6",borderRadius:"22px 22px 0 0",width:"100%",maxWidth:560,maxHeight:"80vh",overflowY:"auto",padding:"18px 14px 40px"}}>
        <div style={{fontFamily:"sans-serif",fontWeight:"bold",fontSize:15,color:"#1c2a1c",marginBottom:10}}>🥡 Where are you ordering from?</div>
        {RESTAURANTS.map(r=><button key={r.name} onClick={async()=>{
          const {mealId, day, weekKey} = showTakeoutModal;
          if(mealId){
            await planTakeout(mealId, r);
          } else {
            const newId=`${(day||"").toLowerCase().replace(/\s/g,"")}-d-${Date.now()}`;
            const newMeal={
              id:newId, week_key:weekKey, day:day, date:"", meal_type:"takeout",
              emoji:r.emoji, name:`Takeout — ${r.name}`, description:`Order from ${r.name}`,
              store:null, store_type:null, cook:null, status:"draft",
              ian:null, ian_note:"", kayla:null, kayla_note:"", cook_note:"", day_note:"",
              recipe_id:null, original_recipe_id:null, swap_suggestion:null, swap_name:null,
              takeout_restaurant:r.name, kayla_order:"", ian_order:"", takeout_cost:""
            };
            setMeals(prev=>[...prev,newMeal]);
            const {error}=await supabase.from("meals").insert(newMeal);
            if(error) console.error("insert takeout error:",error);
          }
          setShowTakeoutModal(null);
        }} style={{width:"100%",background:"#fff",color:"#333",border:"1px solid #e0dbd0",borderRadius:10,padding:"11px 14px",fontFamily:"sans-serif",fontSize:13,cursor:"pointer",marginBottom:5,textAlign:"left"}}>{r.emoji} {r.name}</button>)}
        <button onClick={()=>setShowTakeoutModal(null)} style={{width:"100%",background:"#f4f4f2",color:"#555",border:"none",borderRadius:10,padding:"11px",fontFamily:"sans-serif",fontSize:13,cursor:"pointer",marginTop:4}}>Cancel</button>
      </div></div>}

      {/* Grocery trip */}
      {showGroceryTrip&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:150}}><div style={{background:"#faf9f6",borderRadius:"22px 22px 0 0",width:"100%",maxWidth:560,padding:"18px 14px 40px",maxHeight:"85vh",overflowY:"auto"}}><div style={{fontFamily:"sans-serif",fontWeight:"bold",fontSize:15,color:"#1c2a1c",marginBottom:2}}>🛒 Grocery Trip</div><div style={{fontFamily:"sans-serif",fontSize:11,color:"#888",marginBottom:12}}>{tripItems.length} item{tripItems.length!==1?"s":""} added — updates pantry & grocery list</div>{tripItems.length>0&&<div style={{background:"#f4faf6",borderRadius:10,padding:"8px 12px",marginBottom:10}}>{tripItems.map((item,i)=><div key={i} style={{fontFamily:"sans-serif",fontSize:11,color:"#333",marginBottom:2,display:"flex",justifyContent:"space-between"}}><span>✅ {item.name} · {item.store}</span><span style={{color:"#2e7d5e"}}>{item.price?`$${item.price}`:""}</span></div>)}</div>}<div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:10}}><input value={tripItem.name} onChange={e=>setTripItem(t=>({...t,name:e.target.value}))} placeholder="Item name..." style={{border:"1px solid #ddd",borderRadius:8,padding:"9px 12px",fontFamily:"sans-serif",fontSize:13}}/><div style={{display:"flex",gap:6}}><select value={tripItem.store} onChange={e=>setTripItem(t=>({...t,store:e.target.value}))} style={{flex:1,border:"1px solid #ddd",borderRadius:8,padding:"7px",fontFamily:"sans-serif",fontSize:12}}>{STORES.map(s=><option key={s}>{s}</option>)}</select><input type="number" value={tripItem.price} onChange={e=>setTripItem(t=>({...t,price:e.target.value}))} placeholder="$ price" style={{flex:1,border:"1px solid #ddd",borderRadius:8,padding:"7px",fontFamily:"sans-serif",fontSize:12}}/></div><div style={{display:"flex",gap:6}}><input value={tripItem.qty} onChange={e=>setTripItem(t=>({...t,qty:e.target.value}))} placeholder="Qty" style={{flex:1,border:"1px solid #ddd",borderRadius:8,padding:"7px",fontFamily:"sans-serif",fontSize:12}}/><input type="date" value={tripItem.exp} onChange={e=>setTripItem(t=>({...t,exp:e.target.value}))} style={{flex:1,border:"1px solid #ddd",borderRadius:8,padding:"7px",fontFamily:"sans-serif",fontSize:11}}/></div></div><div style={{display:"flex",gap:6}}><button onClick={()=>{if(!tripItem.name.trim())return;setTripItems(p=>[...p,{...tripItem}]);setTripItem({name:"",store:"Aldi",price:"",qty:"1",exp:""});}} style={{flex:2,background:G,color:"#fff",border:"none",borderRadius:10,padding:"11px",fontFamily:"sans-serif",fontSize:13,cursor:"pointer"}}>+ Add Another</button><button onClick={finishGroceryTrip} style={{flex:1,background:"#2e7d5e",color:"#fff",border:"none",borderRadius:10,padding:"11px",fontFamily:"sans-serif",fontSize:13,cursor:"pointer"}}>✓ Done</button></div><button onClick={()=>{setShowGroceryTrip(false);setTripItems([]);}} style={{width:"100%",background:"#f4f4f2",color:"#555",border:"none",borderRadius:10,padding:"9px",fontFamily:"sans-serif",fontSize:13,cursor:"pointer",marginTop:6}}>Cancel</button></div></div>}

      {recipeModal&&<RecipeModal recipe={recipeModal} onClose={()=>setRecipeModal(null)}/>}
      {pantryCheckModal&&<PantryCheckModal recipe={pantryCheckModal.recipe} mealId={pantryCheckModal.mealId} onClose={()=>setPantryCheckModal(null)}/>}
    </div>
  );
}
