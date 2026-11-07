const feedList = document.querySelector("#feed-list");
const feedStatus = document.querySelector("#feed-status");
const NEWS_URL = location.protocol === "chrome-extension:"
    ? "https://mohammedajmal112.github.io/Planora/news.json"
    : "news.json";

function getHttpUrl(value) {
    if (typeof value !== "string" || !value) return "";

    try {
        const url = new URL(value);
        return url.protocol === "https:" || url.protocol === "http:" ? url.href : "";
    } catch {
        return "";
    }
}

function createFeedItem(article) {
    const item = document.createElement("article");
    item.className = "feed-item";

    const imageUrl = getHttpUrl(article.image);
    if (imageUrl) {
        const image = document.createElement("img");
        image.src = imageUrl;
        image.alt = "";
        image.loading = "lazy";
        image.addEventListener("error", () => image.remove(), { once: true });
        item.append(image);
    }

    const content = document.createElement("div");
    const articleUrl = getHttpUrl(article.url);
    const title = document.createElement(articleUrl ? "a" : "p");
    title.className = "feed-title";
    title.textContent = article.title;

    if (articleUrl) {
        title.href = articleUrl;
        title.target = "_blank";
        title.rel = "noopener noreferrer";
    }

    const publisher = document.createElement("span");
    publisher.className = "feed-author";
    publisher.textContent = article.source?.name || "Unknown publisher";

    content.append(title, publisher);
    item.append(content);
    return item;
}

async function loadHeadlines() {
    feedList.replaceChildren();

    try {
        const response = await fetch(NEWS_URL, { cache: "no-store" });
        if (!response.ok) {
            throw new Error(`News data request failed with status ${response.status}`);
        }

        const data = await response.json();
        const articles = Array.isArray(data) ? data : data.articles;
        if (!Array.isArray(articles)) {
            throw new Error("The news data did not contain an articles array.");
        }

        const validArticles = articles.filter(
            (article) => typeof article?.title === "string" && article.title.trim()
        );
        feedList.replaceChildren(...validArticles.map(createFeedItem));
        feedStatus.textContent = validArticles.length
            ? ""
            : "No headlines are available right now.";
    } catch (error) {
        console.error("Could not load news:", error);
        feedStatus.textContent = "Could not load headlines. The news cache may not have been generated yet.";
    }
}

loadHeadlines();

const clock = document.querySelector("#current-time");

function updateClock() {
    const now = new Date();
    clock.dateTime = now.toISOString();
    clock.textContent = new Intl.DateTimeFormat(undefined, {
        hour: "2-digit",
        minute: "2-digit",
    }).format(now);
}

updateClock();
setInterval(updateClock, 1000);

const todoList = document.querySelector("#todo-list");
const todoForm = document.querySelector("#todo-form");
const todoInput = document.querySelector("#todo-input");
const todoStatus = document.querySelector("#todo-status");
const TODO_STORAGE_KEY = "planora-todos";
let todos = loadTodos();

function loadTodos() {
    try {
        const savedTodos = JSON.parse(localStorage.getItem(TODO_STORAGE_KEY) || "[]");
        if (!Array.isArray(savedTodos)) {
            throw new Error("Saved to-dos are not a list.");
        }
        return savedTodos.filter(
            (todo) => typeof todo?.id === "string" && typeof todo.text === "string"
                && typeof todo.completed === "boolean"
        );
    } catch (error) {
        console.error("Could not read saved to-dos:", error);
        todoStatus.textContent = "Could not read saved tasks from this browser.";
        return [];
    }
}

function saveTodos() {
    try {
        localStorage.setItem(TODO_STORAGE_KEY, JSON.stringify(todos));
        todoStatus.textContent = "";
    } catch (error) {
        console.error("Could not save to-dos:", error);
        todoStatus.textContent = "Could not save tasks in this browser.";
    }
}

function renderTodos() {
    todoList.replaceChildren();

    for (const todo of todos) {
        const item = document.createElement("li");
        const label = document.createElement("label");
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = todo.completed;
        checkbox.setAttribute("aria-label", `Mark "${todo.text}" as complete`);
        checkbox.addEventListener("change", () => {
            todo.completed = checkbox.checked;
            saveTodos();
            renderTodos();
        });

        const text = document.createElement("span");
        text.className = "todo-text";
        text.textContent = todo.text;
        if (todo.completed) text.classList.add("is-complete");

        const actions = document.createElement("div");
        actions.className = "todo-actions";
        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.textContent = "Edit";
        editButton.setAttribute("aria-label", `Edit "${todo.text}"`);
        editButton.addEventListener("click", () => editTodo(todo, item));

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.textContent = "Delete";
        deleteButton.setAttribute("aria-label", `Delete "${todo.text}"`);
        deleteButton.addEventListener("click", () => {
            todos = todos.filter((savedTodo) => savedTodo.id !== todo.id);
            saveTodos();
            renderTodos();
        });

        label.append(checkbox, text);
        actions.append(editButton, deleteButton);
        item.append(label, actions);
        todoList.append(item);
    }
}

function editTodo(todo, item) {
    const editInput = document.createElement("input");
    editInput.type = "text";
    editInput.value = todo.text;
    editInput.setAttribute("aria-label", "Edit to-do item");

    const saveButton = document.createElement("button");
    saveButton.type = "button";
    saveButton.textContent = "Save";

    const cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.textContent = "Cancel";

    const saveEdit = () => {
        const updatedText = editInput.value.trim();
        if (!updatedText) {
            editInput.focus();
            return;
        }
        todo.text = updatedText;
        saveTodos();
        renderTodos();
    };

    saveButton.addEventListener("click", saveEdit);
    cancelButton.addEventListener("click", renderTodos);
    editInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") saveEdit();
        if (event.key === "Escape") renderTodos();
    });

    item.replaceChildren(editInput, saveButton, cancelButton);
    editInput.focus();
    editInput.select();
}

todoForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = todoInput.value.trim();
    if (!text) return;

    todos.push({
        id: crypto.randomUUID(),
        text,
        completed: false,
    });
    saveTodos();
    renderTodos();
    todoForm.reset();
    todoInput.focus();
});

renderTodos();

const weatherTemperature = document.querySelector("#weather-temperature");
const weatherCondition = document.querySelector("#weather-condition");
const weatherLocation = document.querySelector("#weather-location");
const weatherIcon = document.querySelector("#weather-icon");
const weatherStatus = document.querySelector("#weather-status");
const locationButton = document.querySelector("#use-location");

function describeWeather(code) {
    if (code === 0) return ["Clear sky", "☀️"];
    if ([1, 2].includes(code)) return ["Partly cloudy", "🌤️"];
    if (code === 3) return ["Overcast", "☁️"];
    if ([45, 48].includes(code)) return ["Foggy", "🌫️"];
    if ([51, 53, 55, 56, 57].includes(code)) return ["Drizzle", "🌦️"];
    if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return ["Rain", "🌧️"];
    if ([71, 73, 75, 77, 85, 86].includes(code)) return ["Snow", "❄️"];
    if ([95, 96, 99].includes(code)) return ["Thunderstorm", "⛈️"];
    return ["Current conditions", "🌡️"];
}

async function loadWeather(latitude, longitude, locationName) {
    weatherCondition.textContent = "Loading weather...";
    weatherStatus.textContent = "";

    const params = new URLSearchParams({
        latitude: String(latitude),
        longitude: String(longitude),
        current: "temperature_2m,weather_code",
        timezone: "auto",
    });

    try {
        const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
        if (!response.ok) {
            throw new Error(`Weather request failed with status ${response.status}`);
        }

        const data = await response.json();
        const current = data.current;
        if (typeof current?.temperature_2m !== "number" || typeof current.weather_code !== "number") {
            throw new Error("The weather response is missing current conditions.");
        }

        const [description, icon] = describeWeather(current.weather_code);
        weatherTemperature.textContent = `${Math.round(current.temperature_2m)}°C`;
        weatherCondition.textContent = description;
        weatherLocation.textContent = locationName;
        weatherIcon.textContent = icon;
    } catch (error) {
        console.error("Could not load weather:", error);
        weatherCondition.textContent = "Weather unavailable";
        weatherStatus.textContent = "Could not load weather. Please try again.";
    }
}

loadWeather(13.0827, 80.2707, "Chennai");

locationButton.addEventListener("click", () => {
    if (!navigator.geolocation) {
        weatherStatus.textContent = "Location is not supported by this browser.";
        return;
    }

    locationButton.disabled = true;
    weatherStatus.textContent = "Finding your location...";

    const requestPosition = (options) => new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });

    requestPosition({ enableHighAccuracy: false, timeout: 20000, maximumAge: 600000 })
        .catch((error) => {
            if (error.code === error.PERMISSION_DENIED) throw error;
            return requestPosition({ enableHighAccuracy: false, timeout: 30000, maximumAge: Infinity });
        })
        .then(({ coords }) => {
            loadWeather(coords.latitude, coords.longitude, "Your location");
        })
        .catch((error) => {
            console.error("Could not get your location:", error);
            weatherStatus.textContent = error.code === error.PERMISSION_DENIED
                ? "Location access was denied. Weather is still showing for Chennai."
                : "Your device could not determine your location. Weather is still showing for Chennai; try again shortly.";
        })
        .finally(() => {
            locationButton.disabled = false;
        });
});
