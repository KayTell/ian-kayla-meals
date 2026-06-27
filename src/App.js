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

const TODAY = "2026-06-24";
const ALL_WEEKS = generateWeeks("2025-06-23", "2026-12-28");
const DAY_ORDER = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const DAY_EMOJIS = { Monday:"🌱", Tuesday:"🌤️", Wednesday:"🌿", Thursday:"🌤️", Friday:"🌙", Saturday:"🎉", Sunday:"☕" };
const mealTypeColors = {
  breakfast: { border: "#f0c96e", label: "#b07a10", strip: "#f0c96e" },
  lunch:     { border: "#90bce8", label: "#2a5a8a", strip: "#5a9fd4" },
  dinner:    { border: "#7ec8a0", label: "#1c5a38", strip: "#2e7d5e" },
};
const storeColors = { "Aldi":"#1a6b3c","Giant + Aldi":"#c0392b","Sam's Club":"#0033a0","Giant":"#c0392b","Instacart":"#1a6b3c" };
const storeTypeIcons = { instacart:"📲 Instacart", inperson:"🏪 In Person" };
const statusLabels = {
  set:       { label: "Set",       color: "#888",    bg: "#f4f4f2" },
  draft:     { label: "Draft",     color: "#b0813a", bg: "#fef6ec" },
  cooked:    { label: "Cooked ✓",  color: "#2e7d5e", bg: "#edfaf4" },
  confirmed: { label: "🔒 Locked", color: "#5a3d8a", bg: "#f3eeff" },
};
const cookOptions = ["Kayla 👩‍🍳","Ian 👨‍🍳","Together 🍳","TBD"];

export default function App() {
  const [meals, setMeals] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seeded, setSeeded] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState(CURRENT_WEEK);
  const [weekPickerOpen, setWeekPickerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("week");
  const [modal, setModal] = useState(null);
  const [modalText, setModalText] = useState("");
  const [recipeModal, setRecipeModal] = useState(null);

  const isCurrentWeek = selectedWeek === CURRENT_WEEK;

  // Load data from Supabase
  const loadData = useCallback(async () => {
    const { data: mealsData } = await supabase.from("meals").select("*");
    const { data: recipesData } = await supabase.from("recipes").select("*");

    if (mealsData && mealsData.length === 0 && !seeded) {
      // Seed initial data
      await supabase.from("meals").insert(initialMeals);
      await supabase.from("recipes").insert(
        initialRecipes.map(r => ({
          ...r,
          dishes: JSON.stringify(r.dishes),
          freezer_items: JSON.stringify(r.freezer_items),
          ingredients: JSON.stringify(r.ingredients),
          steps: JSON.stringify(r.steps),
        }))
      );
      setSeeded(true);
      setMeals(initialMeals);
      setRecipes(initialRecipes);
    } else {
      setMeals(mealsData || []);
      setRecipes((recipesData || []).map(r => ({
        ...r,
        dishes: typeof r.dishes === "string" ? JSON.parse(r.dishes) : r.dishes || [],
        freezer_items: typeof r.freezer_items === "string" ? JSON.parse(r.freezer_items) : r.freezer_items || [],
        ingredients: typeof r.ingredients === "string" ? JSON.parse(r.ingredients) : r.ingredients || [],
        steps: typeof r.steps === "string" ? JSON.parse(r.steps) : r.steps || [],
      })));
    }
    setLoading(false);
  }, [seeded]);

  useEffect(() => { loadData(); }, [loadData]);

  // Real-time subscriptions
  useEffect(() => {
    const mealsSub = supabase.channel("meals-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "meals" }, () => loadData())
      .subscribe();
    const recipesSub = supabase.channel("recipes-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "recipes" }, () => loadData())
      .subscribe();
    return () => { supabase.removeChannel(mealsSub); supabase.removeChannel(recipesSub); };
  }, [loadData]);

  const updateMeal = async (id, patch) => {
    setMeals(prev => prev.map(m => m.id === id ? { ...m, ...patch } : m));
    await supabase.from("meals").update(patch).eq("id", id);
  };

  const vote = (id, person, val) => {
    const m = meals.find(x => x.id === id);
    updateMeal(id, { [person]: m[person] === val ? null : val });
  };

  const toggleThaw = async (recipeId, itemId) => {
    const recipe = recipes.find(r => r.id === recipeId);
    const newItems = recipe.freezer_items.map(f => f.id === itemId ? { ...f, thawed: !f.thawed } : f);
    setRecipes(prev => prev.map(r => r.id !== recipeId ? r : { ...r, freezer_items: newItems }));
    await supabase.from("recipes").update({ freezer_items: JSON.stringify(newItems) }).eq("id", recipeId);
    if (recipeModal?.id === recipeId) setRecipeModal(r => ({ ...r, freezer_items: newItems }));
  };

  const openModal = (id, type) => {
    const m = meals.find(x => x.id === id);
    setModal({ id, type });
    setModalText(type === "ian" ? m.ian_note : type === "kayla" ? m.kayla_note : m.cook_note);
  };

  const saveModal = () => {
    if (!modal) return;
    const patch = modal.type === "ian" ? { ian_note: modalText } : modal.type === "kayla" ? { kayla_note: modalText } : { cook_note: modalText };
    updateMeal(modal.id, patch);
    setModal(null);
  };

  const cycleStatus = (id) => {
    const m = meals.find(x => x.id === id);
    if (m.status === "set") return;
    const order = ["draft","cooked","confirmed"];
    updateMeal(id, { status: order[(order.indexOf(m.status) + 1) % order.length] });
  };

  const weekMeals = meals.filter(m => m.week_key === selectedWeek);
  const weekDays = [...new Set(weekMeals.map(m => m.day))].sort((a,b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b));
  const dinnerCount = weekMeals.filter(m => m.meal_type === "dinner").length;
  const approvedDinners = weekMeals.filter(m => m.meal_type === "dinner" && m.ian === "agree" && m.kayla === "agree").length;

  const weeksWithMeals = {};
  meals.forEach(m => { if (!weeksWithMeals[m.week_key]) weeksWithMeals[m.week_key] = 0; if (m.meal_type === "dinner") weeksWithMeals[m.week_key]++; });

  const pastWeeks = ALL_WEEKS.filter(w => w < CURRENT_WEEK);
  const futureWeeks = ALL_WEEKS.filter(w => w > CURRENT_WEEK);

  // Recipe Modal Component
  const RecipeModal = ({ recipe, onClose }) => {
    const totalCost = (recipe.ingredients || []).filter(i => i.price).reduce((s,i) => s + i.price, 0);
    const [costOpen, setCostOpen] = useState(false);
    return (
      <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.65)", display:"flex", alignItems:"flex-end", justifyContent:"center", zIndex:200 }}>
        <div style={{ background:"#faf9f6", borderRadius:"22px 22px 0 0", width:"100%", maxWidth:560, maxHeight:"92vh", overflowY:"auto" }}>
          <div style={{ background:"linear-gradient(135deg,#1c3a2a,#2e5c3e)", borderRadius:"22px 22px 0 0", padding:"24px 20px 20px", color:"#f0ebe0" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
              <div>
                <div style={{ fontSize:24, fontWeight:"bold" }}>{recipe.name}</div>
                <div style={{ fontSize:13, color:"#c8e0c8", marginTop:4 }}>{recipe.description}</div>
              </div>
              <button onClick={onClose} style={{ background:"rgba(255,255,255,0.15)", border:"none", borderRadius:20, padding:"5px 12px", color:"#fff", fontSize:13, cursor:"pointer" }}>✕</button>
            </div>
            <div style={{ display:"flex", gap:10, marginTop:14, flexWrap:"wrap", alignItems:"center" }}>
              <span style={{ background:recipe.status==="draft"?"#fef6ec":"#f3eeff", color:recipe.status==="draft"?"#b0813a":"#5a3d8a", borderRadius:20, padding:"3px 12px", fontSize:11, fontFamily:"sans-serif" }}>
                {recipe.status==="draft"?"📝 Draft Recipe":"🔒 Confirmed Recipe"}
              </span>
              <button onClick={() => setCostOpen(!costOpen)} style={{ background:costOpen?"#b0813a":"rgba(255,255,255,0.15)", border:"1px solid rgba(255,255,255,0.3)", borderRadius:20, padding:"3px 14px", color:"#fff", fontSize:12, fontFamily:"sans-serif", cursor:"pointer" }}>
                💰 Est. Cost: ${totalCost.toFixed(2)} {costOpen?"▲":"▼"}
              </button>
            </div>
            {costOpen && (
              <div style={{ marginTop:12, background:"rgba(0,0,0,0.2)", borderRadius:10, padding:"12px 14px" }}>
                {(recipe.ingredients||[]).filter(i=>i.price).map((ing,i) => (
                  <div key={i} style={{ display:"flex", justifyContent:"space-between", fontFamily:"sans-serif", fontSize:12, color:"#e0ebe0", paddingBottom:6, marginBottom:6, borderBottom:"1px solid rgba(255,255,255,0.1)" }}>
                    <span>{ing.name.split(" — ")[0].split(" (")[0]}</span>
                    <span style={{ fontWeight:"bold" }}>${ing.price.toFixed(2)}</span>
                  </div>
                ))}
                <div style={{ display:"flex", justifyContent:"space-between", fontFamily:"sans-serif", fontSize:13, color:"#fff", fontWeight:"bold", paddingTop:4 }}>
                  <span>Total</span><span>${totalCost.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>

          <div style={{ padding:"20px 18px 40px" }}>
            {recipe.status === "confirmed" && (
              <div style={{ marginBottom:20 }}>
                {recipe.photo ? (
                  <img src={recipe.photo} alt={recipe.name} style={{ width:"100%", borderRadius:14, objectFit:"cover", maxHeight:220 }} />
                ) : (
                  <div style={{ background:"#f4f4f2", border:"2px dashed #ccc", borderRadius:14, padding:"28px 20px", textAlign:"center" }}>
                    <div style={{ fontSize:28, marginBottom:6 }}>📸</div>
                    <div style={{ fontFamily:"sans-serif", fontSize:13, color:"#999", fontWeight:"bold" }}>Photo coming soon</div>
                    <div style={{ fontFamily:"sans-serif", fontSize:11, color:"#bbb", marginTop:4 }}>Upload available after hosting</div>
                  </div>
                )}
              </div>
            )}

            <div style={{ display:"flex", gap:12, marginBottom:20 }}>
              {[["⏱ Prep Time", recipe.prep_time],["🔥 Cook Time", recipe.cook_time]].map(([label,val]) => (
                <div key={label} style={{ flex:1, background:"#fff", border:"1px solid #e0dbd0", borderRadius:10, padding:"10px 12px", textAlign:"center" }}>
                  <div style={{ fontSize:11, fontFamily:"sans-serif", color:"#999", textTransform:"uppercase", letterSpacing:1 }}>{label}</div>
                  <div style={{ fontSize:13, fontWeight:"bold", color:val?"#1c2a1c":"#ccc", marginTop:4, fontFamily:"sans-serif" }}>{val||"TBC"}</div>
                </div>
              ))}
            </div>

            {(recipe.freezer_items||[]).length > 0 && (
              <div style={{ background:"#eef6ff", border:"1px solid #b0d4f4", borderRadius:12, padding:"14px 16px", marginBottom:20 }}>
                <div style={{ fontSize:13, fontWeight:"bold", color:"#2a5a8a", marginBottom:10, fontFamily:"sans-serif" }}>🧊 Freezer Thaw Tracker</div>
                {(recipe.freezer_items||[]).map(item => (
                  <button key={item.id} onClick={() => toggleThaw(recipe.id, item.id)}
                    style={{ display:"flex", alignItems:"center", justifyContent:"space-between", width:"100%", background:item.thawed?"#edfaf4":"#fff", border:`1.5px solid ${item.thawed?"#7ec8a0":"#b0d4f4"}`, borderRadius:8, padding:"8px 12px", fontFamily:"sans-serif", fontSize:12, color:item.thawed?"#2e7d5e":"#2a5a8a", cursor:"pointer", boxSizing:"border-box", marginBottom:6 }}>
                    <span>{item.thawed?"✅":"🧊"} {item.label}</span>
                    <span style={{ fontWeight:"bold", fontSize:11 }}>{item.thawed?"Out of freezer ✓":"Tap — still frozen"}</span>
                  </button>
                ))}
              </div>
            )}

            <div style={{ background:"#fff", border:"1px solid #e0dbd0", borderRadius:12, padding:"14px 16px", marginBottom:20 }}>
              <div style={{ fontSize:13, fontWeight:"bold", color:"#1c2a1c", marginBottom:10, fontFamily:"sans-serif" }}>🍽️ Dishes Needed</div>
              {(recipe.dishes||[]).map((d,i) => (
                <div key={i} style={{ fontFamily:"sans-serif", fontSize:13, color:"#555", paddingBottom:5, marginBottom:5, borderBottom:i<(recipe.dishes||[]).length-1?"1px solid #f0ece4":"none" }}>· {d}</div>
              ))}
            </div>

            <div style={{ background:"#fff", border:"1px solid #e0dbd0", borderRadius:12, padding:"14px 16px", marginBottom:20 }}>
              <div style={{ fontSize:13, fontWeight:"bold", color:"#1c2a1c", marginBottom:10, fontFamily:"sans-serif" }}>🧾 Ingredients</div>
              {(recipe.ingredients||[]).map((ing,i) => (
                <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", fontFamily:"sans-serif", fontSize:13, color:"#444", paddingBottom:8, marginBottom:8, borderBottom:i<(recipe.ingredients||[]).length-1?"1px solid #f0ece4":"none", lineHeight:1.4 }}>
                  <span style={{ flex:1, paddingRight:10 }}>· {ing.name}</span>
                  {ing.price && <span style={{ color:"#2e7d5e", fontWeight:"bold", whiteSpace:"nowrap" }}>${ing.price.toFixed(2)}</span>}
                </div>
              ))}
            </div>

            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:13, fontWeight:"bold", color:"#1c2a1c", marginBottom:12, fontFamily:"sans-serif" }}>👣 Steps</div>
              {(recipe.steps||[]).map(s => (
                <div key={s.step} style={{ background:"#fff", border:"1px solid #e0dbd0", borderRadius:12, padding:"14px 16px", marginBottom:10 }}>
                  <div style={{ display:"flex", gap:12, alignItems:"flex-start" }}>
                    <div style={{ background:"#1c3a2a", color:"#fff", borderRadius:"50%", width:28, height:28, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontFamily:"sans-serif", fontWeight:"bold", flexShrink:0 }}>{s.step}</div>
                    <div>
                      <div style={{ fontSize:14, fontWeight:"bold", color:"#1c2a1c", marginBottom:6, fontFamily:"sans-serif" }}>{s.title}</div>
                      <div style={{ fontSize:13, color:"#555", fontFamily:"sans-serif", lineHeight:1.6 }}>{s.detail}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {recipe.notes && (
              <div style={{ background:"#fef6ec", border:"1px solid #e8c98a", borderRadius:12, padding:"14px 16px" }}>
                <div style={{ fontSize:13, fontWeight:"bold", color:"#b0813a", marginBottom:6, fontFamily:"sans-serif" }}>📝 Notes</div>
                <div style={{ fontSize:13, color:"#7a5a20", fontFamily:"sans-serif", lineHeight:1.6 }}>{recipe.notes}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh", background:"#faf9f6", fontFamily:"sans-serif", color:"#888", flexDirection:"column", gap:12 }}>
      <div style={{ fontSize:32 }}>🍽️</div>
      <div>Loading Ian & Kayla's Meals...</div>
    </div>
  );

  return (
    <div style={{ fontFamily:"'Georgia', serif", background:"#faf9f6", minHeight:"100vh", paddingBottom:80 }}>

      {/* HEADER */}
      <div style={{ background:"linear-gradient(135deg,#1c3a2a,#2e5c3e)", color:"#f0ebe0", padding:"28px 20px 18px", borderBottom:"4px solid #b0813a" }}>
        <div style={{ fontSize:10, letterSpacing:3, textTransform:"uppercase", color:"#b0c9b0", marginBottom:6 }}>Shared Meal Plan</div>
        <h1 style={{ margin:0, fontSize:22, fontWeight:"bold" }}>🍽️ Ian & Kayla's Meals</h1>

        <div style={{ display:"flex", alignItems:"center", gap:10, marginTop:10, flexWrap:"wrap" }}>
          <button onClick={() => setWeekPickerOpen(!weekPickerOpen)}
            style={{ background:"rgba(255,255,255,0.12)", border:"1px solid rgba(255,255,255,0.25)", borderRadius:10, padding:"6px 14px", color:"#fff", fontSize:13, fontFamily:"sans-serif", cursor:"pointer" }}>
            🗓 {isCurrentWeek ? `This Week — ${getWeekLabel(selectedWeek)}` : getWeekLabel(selectedWeek)} {weekPickerOpen?"▲":"▼"}
          </button>
          {!isCurrentWeek && (
            <button onClick={() => { setSelectedWeek(CURRENT_WEEK); setWeekPickerOpen(false); }}
              style={{ background:"#b0813a", border:"none", borderRadius:10, padding:"6px 12px", color:"#fff", fontSize:12, fontFamily:"sans-serif", cursor:"pointer" }}>
              ↩ Current Week
            </button>
          )}
        </div>

        {weekMeals.length > 0 && (
          <div style={{ marginTop:10, display:"flex", gap:10, flexWrap:"wrap" }}>
            <span style={{ background:"#2e7d5e22", border:"1px solid #2e7d5e", borderRadius:20, padding:"3px 12px", fontSize:12, color:"#a0d4b8" }}>✓ {approvedDinners}/{dinnerCount} dinners approved</span>
          </div>
        )}

        <div style={{ display:"flex", gap:8, marginTop:14 }}>
          {[["week","📅 Week"],["library","📖 Recipes"]].map(([tab,label]) => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{ background:activeTab===tab?"#b0813a":"transparent", color:activeTab===tab?"#fff":"#c8e0c8", border:`1px solid ${activeTab===tab?"#b0813a":"#4a7a5a"}`, borderRadius:20, padding:"5px 14px", fontSize:12, fontFamily:"sans-serif", cursor:"pointer" }}>{label}</button>
          ))}
        </div>
      </div>

      {/* WEEK PICKER */}
      {weekPickerOpen && (
        <div style={{ background:"#fff", borderBottom:"2px solid #e0dbd0", padding:"16px 16px 20px", maxHeight:320, overflowY:"auto" }}>
          <div style={{ fontSize:10, fontFamily:"sans-serif", color:"#888", letterSpacing:2, textTransform:"uppercase", marginBottom:8 }}>Current</div>
          <button onClick={() => { setSelectedWeek(CURRENT_WEEK); setWeekPickerOpen(false); }}
            style={{ width:"100%", background:selectedWeek===CURRENT_WEEK?"#1c3a2a":"#f4faf6", color:selectedWeek===CURRENT_WEEK?"#fff":"#1c3a2a", border:"1.5px solid #2e7d5e", borderRadius:10, padding:"10px 14px", fontFamily:"sans-serif", fontSize:13, cursor:"pointer", textAlign:"left", marginBottom:12, fontWeight:"bold" }}>
            📅 {getWeekLabel(CURRENT_WEEK)} — This Week
          </button>

          {futureWeeks.length > 0 && <>
            <div style={{ fontSize:10, fontFamily:"sans-serif", color:"#888", letterSpacing:2, textTransform:"uppercase", marginBottom:8 }}>Upcoming</div>
            {futureWeeks.slice(0,8).map(w => (
              <button key={w} onClick={() => { setSelectedWeek(w); setWeekPickerOpen(false); }}
                style={{ width:"100%", background:selectedWeek===w?"#1c3a2a":"#f9f9f7", color:selectedWeek===w?"#fff":"#444", border:`1px solid ${selectedWeek===w?"#1c3a2a":"#e0dbd0"}`, borderRadius:10, padding:"9px 14px", fontFamily:"sans-serif", fontSize:13, cursor:"pointer", textAlign:"left", marginBottom:6 }}>
                {getWeekLabel(w)} {weeksWithMeals[w] ? `· ${weeksWithMeals[w]} dinners` : "· No plans yet"}
              </button>
            ))}
          </>}

          {pastWeeks.length > 0 && <>
            <div style={{ fontSize:10, fontFamily:"sans-serif", color:"#888", letterSpacing:2, textTransform:"uppercase", marginTop:10, marginBottom:8 }}>Past Weeks</div>
            {[...pastWeeks].reverse().map(w => (
              <button key={w} onClick={() => { setSelectedWeek(w); setWeekPickerOpen(false); }}
                style={{ width:"100%", background:selectedWeek===w?"#1c3a2a":"#f9f9f7", color:selectedWeek===w?"#fff":"#888", border:`1px solid ${selectedWeek===w?"#1c3a2a":"#e0dbd0"}`, borderRadius:10, padding:"9px 14px", fontFamily:"sans-serif", fontSize:13, cursor:"pointer", textAlign:"left", marginBottom:6 }}>
                {getWeekLabel(w)} {weeksWithMeals[w] ? `· ${weeksWithMeals[w]} dinners` : "· No plans"}
              </button>
            ))}
          </>}
        </div>
      )}

      {/* WEEK VIEW */}
      {activeTab === "week" && (
        weekMeals.length === 0 ? (
          <div style={{ padding:"60px 20px", textAlign:"center" }}>
            <div style={{ fontSize:36, marginBottom:12 }}>🗓️</div>
            <div style={{ fontFamily:"sans-serif", fontSize:16, color:"#888", fontWeight:"bold" }}>No plans yet for this week</div>
            <div style={{ fontFamily:"sans-serif", fontSize:13, color:"#aaa", marginTop:6 }}>Come back to Claude to plan this week's meals!</div>
          </div>
        ) : weekDays.map(day => {
          const dayMeals = weekMeals.filter(m => m.day === day);
          const dayDate = dayMeals[0]?.date || "";
          return (
            <div key={day} style={{ marginTop:20 }}>
              <div style={{ padding:"0 16px 8px", fontSize:13, fontFamily:"sans-serif", fontWeight:"bold", color:"#1c3a2a", letterSpacing:1, textTransform:"uppercase", borderBottom:"2px solid #e0dbd0", marginBottom:12 }}>
                {DAY_EMOJIS[day]||"📅"} {day} · {dayDate}
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:14, padding:"0 14px" }}>
                {["breakfast","lunch","dinner"].map(type => {
                  const typeMeals = dayMeals.filter(m => m.meal_type === type);
                  if (!typeMeals.length) return null;
                  const tc = mealTypeColors[type];
                  return (
                    <div key={type}>
                      <div style={{ fontSize:10, fontFamily:"sans-serif", letterSpacing:2, textTransform:"uppercase", color:tc.label, marginBottom:6, paddingLeft:2 }}>
                        {type==="breakfast"?"☀️ Breakfast":type==="lunch"?"🌤 Lunch":"🌙 Dinner"}
                      </div>
                      {typeMeals.map(meal => {
                        const st = statusLabels[meal.status] || statusLabels.draft;
                        const storeColor = storeColors[meal.store] || "#777";
                        const linkedRecipe = meal.recipe_id ? recipes.find(r => r.id === meal.recipe_id) : null;
                        const bothAgree = meal.ian==="agree" && meal.kayla==="agree";
                        const anyDisagree = meal.ian==="disagree" || meal.kayla==="disagree";

                        return (
                          <div key={meal.id} style={{ background:"#fff", borderRadius:14, border:`1px solid ${anyDisagree?"#f4a89a":bothAgree?"#7ec8a0":tc.border}`, boxShadow:"0 2px 10px rgba(0,0,0,0.06)", overflow:"hidden", marginBottom:10 }}>
                            <div style={{ background:tc.strip, height:4 }} />
                            <div style={{ padding:"14px 16px 12px" }}>

                              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                                  <span style={{ fontSize:22 }}>{meal.emoji}</span>
                                  <div>
                                    <div style={{ fontSize:17, fontWeight:"bold", color:"#1c2a1c" }}>{meal.name}</div>
                                    {meal.store && <div style={{ fontSize:11, fontFamily:"sans-serif", color:storeColor, fontWeight:"bold", marginTop:1 }}>🛒 {meal.store} · {storeTypeIcons[meal.store_type]}</div>}
                                  </div>
                                </div>
                                {meal.status !== "set" && (
                                  <button onClick={() => cycleStatus(meal.id)} style={{ background:st.bg, color:st.color, border:`1px solid ${st.color}55`, borderRadius:16, padding:"3px 10px", fontSize:10, fontFamily:"sans-serif", cursor:"pointer" }}>{st.label}</button>
                                )}
                              </div>

                              <p style={{ margin:"0 0 10px", fontSize:13, color:"#666", fontFamily:"sans-serif", lineHeight:1.5 }}>{meal.description}</p>

                              {/* Freezer toggle on card */}
                              {linkedRecipe?.freezer_items?.length > 0 && (
                                <div style={{ marginBottom:10 }}>
                                  {linkedRecipe.freezer_items.map(item => (
                                    <button key={item.id} onClick={() => toggleThaw(linkedRecipe.id, item.id)}
                                      style={{ display:"flex", alignItems:"center", justifyContent:"space-between", width:"100%", background:item.thawed?"#edfaf4":"#eef6ff", border:`1.5px solid ${item.thawed?"#7ec8a0":"#b0d4f4"}`, borderRadius:8, padding:"9px 12px", marginBottom:6, fontFamily:"sans-serif", fontSize:12, color:item.thawed?"#2e7d5e":"#2a5a8a", cursor:"pointer", textAlign:"left", boxSizing:"border-box" }}>
                                      <span>{item.thawed?"✅":"🧊"} {item.label}</span>
                                      <span style={{ fontWeight:"bold", fontSize:11 }}>{item.thawed?"Out of freezer ✓":"Tap — still frozen"}</span>
                                    </button>
                                  ))}
                                </div>
                              )}

                              {/* Dinner only controls */}
                              {meal.meal_type === "dinner" && (<>
                                <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:10, alignItems:"center" }}>
                                  <div style={{ fontSize:11, fontFamily:"sans-serif", color:"#999", marginRight:2 }}>👨‍🍳 Cook:</div>
                                  {cookOptions.map(opt => (
                                    <button key={opt} onClick={() => updateMeal(meal.id, { cook: meal.cook===opt?null:opt })}
                                      style={{ background:meal.cook===opt?"#1c3a2a":"#f4f4f2", color:meal.cook===opt?"#fff":"#555", border:`1px solid ${meal.cook===opt?"#1c3a2a":"#ddd"}`, borderRadius:20, padding:"3px 10px", fontSize:11, fontFamily:"sans-serif", cursor:"pointer" }}>{opt}</button>
                                  ))}
                                </div>

                                {linkedRecipe ? (
                                  <button onClick={() => setRecipeModal(linkedRecipe)}
                                    style={{ marginBottom:10, background:linkedRecipe.status==="draft"?"#fef6ec":"#f3eeff", color:linkedRecipe.status==="draft"?"#b0813a":"#5a3d8a", border:`1px solid ${linkedRecipe.status==="draft"?"#e8c98a":"#c4a8f0"}`, borderRadius:8, padding:"6px 14px", fontSize:12, fontFamily:"sans-serif", cursor:"pointer" }}>
                                    📖 {linkedRecipe.status==="draft"?"View Draft Recipe":"View Recipe"}
                                  </button>
                                ) : (
                                  <div style={{ fontSize:11, fontFamily:"sans-serif", color:"#bbb", fontStyle:"italic", marginBottom:10 }}>Recipe TBD — confirm after cooking</div>
                                )}

                                <div style={{ borderTop:"1px solid #f0ece4", paddingTop:10 }}>
                                  {["ian","kayla"].map(person => (
                                    <div key={person} style={{ marginBottom:person==="ian"?10:0 }}>
                                      <div style={{ fontSize:11, fontFamily:"sans-serif", color:"#888", marginBottom:5, textTransform:"uppercase", letterSpacing:1 }}>{person==="ian"?"Ian's Call":"Kayla's Call"}</div>
                                      <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                                        {["agree","disagree"].map(v => (
                                          <button key={v} onClick={() => vote(meal.id, person, v)}
                                            style={{ background:meal[person]===v?(v==="agree"?"#2e7d5e":"#c0392b"):"#f9f9f7", color:meal[person]===v?"#fff":v==="agree"?"#2e7d5e":"#c0392b", border:`1.5px solid ${v==="agree"?"#2e7d5e":"#c0392b"}`, borderRadius:8, padding:"5px 14px", fontSize:12, fontFamily:"sans-serif", cursor:"pointer" }}>
                                            {v==="agree"?"👍 Looks good":"👎 Swap it"}
                                          </button>
                                        ))}
                                        <button onClick={() => openModal(meal.id, person)}
                                          style={{ background:meal[`${person}_note`]?"#fef6ec":"#f9f9f7", color:meal[`${person}_note`]?"#b0813a":"#aaa", border:`1px solid ${meal[`${person}_note`]?"#b0813a":"#ddd"}`, borderRadius:8, padding:"5px 12px", fontSize:12, fontFamily:"sans-serif", cursor:"pointer" }}>
                                          💬 {meal[`${person}_note`]?"Note ✓":"Note"}
                                        </button>
                                      </div>
                                      {meal[`${person}_note`] && <div style={{ marginTop:6, background:"#fef6ec", borderRadius:7, padding:"6px 10px", fontSize:12, fontFamily:"sans-serif", color:"#7a5a20", borderLeft:"3px solid #b0813a" }}><strong>{person==="ian"?"Ian":"Kayla"}:</strong> {meal[`${person}_note`]}</div>}
                                    </div>
                                  ))}
                                </div>

                                {meal.cook_note && <div style={{ marginTop:8, background:"#edfaf4", borderRadius:8, padding:"7px 10px", fontSize:12, fontFamily:"sans-serif", color:"#2e5c3e", borderLeft:"3px solid #2e7d5e" }}><strong>After cooking:</strong> {meal.cook_note}</div>}
                                {meal.status==="cooked" && !meal.cook_note && (
                                  <button onClick={() => openModal(meal.id, "cook")} style={{ marginTop:8, background:"#edfaf4", color:"#2e7d5e", border:"1px dashed #2e7d5e", borderRadius:8, padding:"5px 12px", fontSize:12, fontFamily:"sans-serif", cursor:"pointer" }}>+ Add cook notes to lock in recipe</button>
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
            </div>
          );
        })
      )}

      {/* RECIPE LIBRARY */}
      {activeTab === "library" && (
        <div style={{ padding:"20px 14px" }}>
          <div style={{ fontSize:13, fontFamily:"sans-serif", color:"#888", marginBottom:16 }}>Tap any recipe to view the full card.</div>
          {recipes.map(recipe => {
            const totalCost = (recipe.ingredients||[]).filter(i=>i.price).reduce((s,i)=>s+i.price,0);
            return (
              <div key={recipe.id} onClick={() => setRecipeModal(recipe)}
                style={{ background:"#fff", borderRadius:14, border:"1px solid #e0dbd0", boxShadow:"0 2px 8px rgba(0,0,0,0.05)", padding:"16px", marginBottom:14, cursor:"pointer" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                  <div>
                    <div style={{ fontSize:17, fontWeight:"bold", color:"#1c2a1c" }}>{recipe.name}</div>
                    <div style={{ fontSize:12, fontFamily:"sans-serif", color:"#888", marginTop:3 }}>{recipe.description}</div>
                  </div>
                  <span style={{ background:recipe.status==="draft"?"#fef6ec":"#f3eeff", color:recipe.status==="draft"?"#b0813a":"#5a3d8a", borderRadius:20, padding:"3px 10px", fontSize:10, fontFamily:"sans-serif", whiteSpace:"nowrap", marginLeft:8 }}>
                    {recipe.status==="draft"?"📝 Draft":"🔒 Locked"}
                  </span>
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", marginTop:10, fontFamily:"sans-serif", fontSize:12, color:"#888" }}>
                  <span>💰 Est. ${totalCost.toFixed(2)}</span><span>Tap to view →</span>
                </div>
              </div>
            );
          })}
          <div style={{ background:"#f3eeff", border:"1px dashed #c4a8f0", borderRadius:14, padding:"20px", textAlign:"center", marginTop:8 }}>
            <div style={{ fontSize:20, marginBottom:6 }}>🍳</div>
            <div style={{ fontFamily:"sans-serif", color:"#8a6ab0", fontSize:13 }}>More recipes appear here as you cook & confirm them!</div>
          </div>
        </div>
      )}

      {/* Modals */}
      {recipeModal && <RecipeModal recipe={recipeModal} onClose={() => setRecipeModal(null)} />}
      {modal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"flex-end", justifyContent:"center", zIndex:100 }}>
          <div style={{ background:"#fff", borderRadius:"18px 18px 0 0", padding:24, width:"100%", maxWidth:500 }}>
            <div style={{ fontFamily:"sans-serif", fontWeight:"bold", fontSize:15, marginBottom:12, color:"#1c2a1c" }}>
              {modal.type==="ian"?"💬 Ian's Note":modal.type==="kayla"?"💬 Kayla's Note":"🍳 Cook Notes"}
            </div>
            <textarea value={modalText} onChange={e => setModalText(e.target.value)}
              placeholder={modal.type==="cook"?"How did it go? What to change?":"Suggest a swap or leave a comment…"}
              style={{ width:"100%", minHeight:90, borderRadius:8, border:"1px solid #ddd", padding:12, fontFamily:"sans-serif", fontSize:14, resize:"vertical", boxSizing:"border-box" }} />
            <div style={{ display:"flex", gap:10, marginTop:12 }}>
              <button onClick={saveModal} style={{ flex:1, background:"#1c3a2a", color:"#fff", border:"none", borderRadius:8, padding:12, fontSize:14, fontFamily:"sans-serif", cursor:"pointer" }}>Save</button>
              <button onClick={() => setModal(null)} style={{ flex:1, background:"#f4f4f2", color:"#555", border:"none", borderRadius:8, padding:12, fontSize:14, fontFamily:"sans-serif", cursor:"pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
