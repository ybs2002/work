// =============================================
// 우리집 식단 관리 앱
// 데이터는 브라우저의 localStorage 에 저장돼요.
// (새로고침하거나 창을 닫아도 남아 있어요)
// =============================================

const DAYS = ["월", "화", "수", "목", "금", "토", "일"];
const MEALS = ["아침", "점심", "저녁"];
const STORAGE_KEY = "family-meal-app";

// ----- 1. 데이터 불러오기 / 저장하기 -----

// 처음 실행할 때 보여줄 예시 데이터
const defaultData = {
  family: [
    { name: "아빠", avoid: [] },
    { name: "엄마", avoid: ["새우"] },
    { name: "아이", avoid: ["땅콩"] },
  ],
  menus: [
    { name: "김치찌개", ingredients: ["김치", "돼지고기", "두부"] },
    { name: "계란말이", ingredients: ["계란", "대파"] },
    { name: "새우볶음밥", ingredients: ["새우", "밥", "계란"] },
    { name: "된장국", ingredients: ["된장", "두부", "애호박"] },
  ],
  plan: {},    // 예: { "월-아침": "계란말이" }
  bought: [],  // 장보기에서 체크한 재료 이름들
};

function loadData() {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved ? JSON.parse(saved) : defaultData;
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

let data = loadData();

// "김치, 두부 ,  " → ["김치", "두부"] 처럼 쉼표 글자를 목록으로 바꿔요
function splitByComma(text) {
  return text.split(",").map((s) => s.trim()).filter((s) => s !== "");
}

// ----- 2. 탭 전환 -----

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(tab.dataset.tab).classList.add("active");
    renderAll();
  });
});

// ----- 3. 주간 식단표 -----

// 이 메뉴를 못 먹는 가족 이름 목록을 알려줘요
function whoCantEat(menuName) {
  const menu = data.menus.find((m) => m.name === menuName);
  if (!menu) return [];
  return data.family
    .filter((person) => person.avoid.some((food) => menu.ingredients.includes(food)))
    .map((person) => person.name);
}

// 오늘이 무슨 요일인지 알려줘요 ("월" ~ "일")
// getDay() 는 일요일=0, 월요일=1 ... 토요일=6 이라서 순서를 맞춰 줘요
function todayName() {
  return DAYS[(new Date().getDay() + 6) % 7];
}

function renderPlan() {
  const box = document.getElementById("plan-days");
  const today = todayName();

  // 요일마다 카드 1개씩 만들기
  box.innerHTML = DAYS.map((day) => {
    // 카드 안에 아침/점심/저녁 한 줄씩
    const rows = MEALS.map((meal) => {
      const key = `${day}-${meal}`;
      const chosen = data.plan[key] || "";
      const options = data.menus
        .map((m) => `<option ${m.name === chosen ? "selected" : ""}>${m.name}</option>`)
        .join("");
      const cant = whoCantEat(chosen);
      const warning = cant.length ? `<div class="warn">⚠️ ${cant.join(", ")} 못 먹어요</div>` : "";
      return `<div class="meal-row">
          <label>${meal}</label>
          <select data-key="${key}">
            <option value="">- 선택 -</option>${options}
          </select>
          <button class="dice" data-key="${key}" title="메뉴 추천">🎲</button>
        </div>${warning}`;
    }).join("");

    const isToday = day === today;
    return `<div class="day-card ${isToday ? "today" : ""}">
        <h3>${day}요일${isToday ? '<span class="today-badge">오늘</span>' : ""}</h3>
        ${rows}
      </div>`;
  }).join("");

  // 메뉴를 고르면 저장하고 다시 그리기
  box.querySelectorAll("select").forEach((select) => {
    select.addEventListener("change", () => {
      data.plan[select.dataset.key] = select.value;
      saveData();
      renderPlan();
    });
  });

  // 🎲 버튼을 누르면 추천 메뉴로 채우기
  box.querySelectorAll(".dice").forEach((btn) => {
    btn.addEventListener("click", () => {
      const menuName = recommendMenu(btn.dataset.key);
      if (!menuName) {
        alert("먼저 🍳 메뉴 탭에서 메뉴를 추가해 주세요!");
        return;
      }
      data.plan[btn.dataset.key] = menuName;
      saveData();
      renderPlan();
    });
  });
}

// ----- 메뉴 추천 -----
// 좋은 후보부터 차례로 찾아요:
//   1순위: 가족 모두 먹을 수 있고 + 이번 주에 아직 안 먹은 메뉴
//   2순위: 가족 모두 먹을 수 있는 메뉴
//   3순위: 아무 메뉴나
// 그 안에서 랜덤으로 하나를 골라요.
function recommendMenu(currentKey) {
  // 이번 주 식단에 이미 들어간 메뉴들 (지금 바꾸려는 칸은 빼고)
  const usedThisWeek = Object.entries(data.plan)
    .filter(([key]) => key !== currentKey)
    .map(([, menuName]) => menuName);

  const allNames = data.menus.map((m) => m.name);
  const everyoneCanEat = allNames.filter((name) => whoCantEat(name).length === 0);
  const notEatenYet = everyoneCanEat.filter((name) => !usedThisWeek.includes(name));

  // 후보가 있는 첫 번째 목록을 골라요
  const candidates = [notEatenYet, everyoneCanEat, allNames].find((list) => list.length > 0);
  if (!candidates) return null; // 메뉴가 하나도 없을 때

  // 0 ~ (개수-1) 사이의 랜덤 숫자로 하나 뽑기
  const randomIndex = Math.floor(Math.random() * candidates.length);
  return candidates[randomIndex];
}

// ----- 4. 메뉴 관리 -----

function renderMenus() {
  const list = document.getElementById("menu-list");
  list.innerHTML = data.menus
    .map((m, i) => `<li>
      <div><strong>${m.name}</strong><small>${m.ingredients.join(", ")}</small></div>
      <button class="delete" data-index="${i}">삭제</button>
    </li>`)
    .join("");

  list.querySelectorAll(".delete").forEach((btn) => {
    btn.addEventListener("click", () => {
      data.menus.splice(btn.dataset.index, 1);
      saveData();
      renderMenus();
    });
  });
}

document.getElementById("menu-form").addEventListener("submit", (e) => {
  e.preventDefault(); // 페이지 새로고침 막기
  const name = document.getElementById("menu-name").value.trim();
  const ingredients = splitByComma(document.getElementById("menu-ingredients").value);
  data.menus.push({ name, ingredients });
  saveData();
  e.target.reset();
  renderMenus();
});

// ----- 5. 가족 관리 -----

function renderFamily() {
  const list = document.getElementById("family-list");
  list.innerHTML = data.family
    .map((p, i) => `<li>
      <div><strong>${p.name}</strong>
        <small>못 먹는 재료: ${p.avoid.length ? p.avoid.join(", ") : "없음"}</small></div>
      <button class="delete" data-index="${i}">삭제</button>
    </li>`)
    .join("");

  list.querySelectorAll(".delete").forEach((btn) => {
    btn.addEventListener("click", () => {
      data.family.splice(btn.dataset.index, 1);
      saveData();
      renderFamily();
    });
  });
}

document.getElementById("family-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = document.getElementById("member-name").value.trim();
  const avoid = splitByComma(document.getElementById("member-avoid").value);
  data.family.push({ name, avoid });
  saveData();
  e.target.reset();
  renderFamily();
});

// ----- 6. 장보기 목록 -----

function renderShopping() {
  // 식단표에 들어간 메뉴들의 재료를 중복 없이 모으기
  const needed = new Set();
  Object.values(data.plan).forEach((menuName) => {
    const menu = data.menus.find((m) => m.name === menuName);
    if (menu) menu.ingredients.forEach((food) => needed.add(food));
  });

  const list = document.getElementById("shopping-list");
  if (needed.size === 0) {
    list.innerHTML = "<li>식단표에 메뉴를 먼저 넣어주세요 🙂</li>";
    return;
  }

  list.innerHTML = [...needed]
    .map((food) => {
      const done = data.bought.includes(food);
      return `<li class="${done ? "done" : ""}">
        <label><input type="checkbox" data-food="${food}" ${done ? "checked" : ""}>
        <span>${food}</span></label>
      </li>`;
    })
    .join("");

  list.querySelectorAll("input").forEach((box) => {
    box.addEventListener("change", () => {
      const food = box.dataset.food;
      if (box.checked) data.bought.push(food);
      else data.bought = data.bought.filter((f) => f !== food);
      saveData();
      renderShopping();
    });
  });
}

// ----- 7. 처음 화면 그리기 -----

function renderAll() {
  renderPlan();
  renderMenus();
  renderFamily();
  renderShopping();
}

renderAll();
