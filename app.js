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

function renderPlan() {
  const table = document.getElementById("plan-table");

  // 제목 줄: 빈칸 + 월~일
  let html = "<tr><th></th>" + DAYS.map((d) => `<th>${d}</th>`).join("") + "</tr>";

  // 아침/점심/저녁 줄
  MEALS.forEach((meal) => {
    html += `<tr><th>${meal}</th>`;
    DAYS.forEach((day) => {
      const key = `${day}-${meal}`;
      const chosen = data.plan[key] || "";
      const options = data.menus
        .map((m) => `<option ${m.name === chosen ? "selected" : ""}>${m.name}</option>`)
        .join("");
      const cant = whoCantEat(chosen);
      const warning = cant.length ? `<div class="warn">⚠️ ${cant.join(", ")}</div>` : "";
      html += `<td>
        <select data-key="${key}">
          <option value="">-</option>${options}
        </select>${warning}
      </td>`;
    });
    html += "</tr>";
  });

  table.innerHTML = html;

  // 메뉴를 고르면 저장하고 다시 그리기
  table.querySelectorAll("select").forEach((select) => {
    select.addEventListener("change", () => {
      data.plan[select.dataset.key] = select.value;
      saveData();
      renderPlan();
    });
  });
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
