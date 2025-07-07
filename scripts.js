
const WEATHER_API_KEY = "88fb1367ca32cd633aaaa9802008440e";
const WEATHER_API_URL = "https://api.openweathermap.org/data/2.5/weather";

const cepForm = document.getElementById("formCep");
const cepInput = document.getElementById("cepInput"); 
const searchBtn = document.getElementById("searchBtn");


const loading = document.getElementById("loading");
const errorMessage = document.getElementById("error-message");
const errorText = document.getElementById("error-text");
const results = document.getElementById("results");
const favoriteBtn = document.getElementById("favoriteBtn"); 


const locationCep = document.getElementById("cepLocalizacao");
const locationStreet = document.getElementById("logradouroLocalizacao");
const locationDistrict = document.getElementById("bairroLocalizacao");
const locationCity = document.getElementById("cidadeLocalizacao");
const locationState = document.getElementById("estadoLocalizacao");


const weatherIcon = document.getElementById("weather-icon");
const temperature = document.getElementById("temperature"); 
const weatherDescription = document.getElementById("weatherDescription"); 
const feelsLike = document.getElementById("feelsLike"); 
const humidity = document.getElementById("humidity"); 
const windSpeed = document.getElementById("windSpeed"); 

const historyList = document.getElementById("history-list");
const favoritesList = document.getElementById("favorites-list");
const clearHistoryBtn = document.getElementById("clearHistoryBtn"); 
const clearFavoritesBtn = document.getElementById("clearFavoritesBtn");


let currentLocationData = null;
let currentWeatherData = null;


cepForm.addEventListener("submit", handleBuscaPorCepOuCidade);
favoriteBtn.addEventListener("click", toggleFavorite);
clearHistoryBtn.addEventListener("click", clearHistory);
clearFavoritesBtn.addEventListener("click", clearFavorites);
cepInput.addEventListener("input", formatCepInput);

document.addEventListener("DOMContentLoaded", () => {
    loadHistory();
    loadFavorites();
});


function formatCepInput(e) {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 5) {
        value = value.replace(/^(\d{5})(\d)/, "$1-$2");
    }
    e.target.value = value;
}
async function handleBuscaPorCepOuCidade(e) {
    e.preventDefault();

    const cep = cepInput.value.replace(/\D/g, "");
    const cidade = document.getElementById("cidadeInput").value.trim();

    if (cep && isValidCep(cep)) {
        await searchLocationAndWeather(cep);
    } else if (cidade) {
        await searchWeatherByCity(cidade);
    } else {
        showError("Digite um CEP válido ou o nome de uma cidade.");
    }
}


function isValidCep(cep) {
    return cep.length === 8 && /^\d+$/.test(cep);
}

function formatCep(cep) {
    return cep.replace(/^(\d{5})(\d{3})$/, "$1-$2");
}


async function handleCepSubmit(e) {
    e.preventDefault();

    const cep = cepInput.value.replace(/\D/g, "");

    if (!isValidCep(cep)) {
        showError("Por favor, digite um CEP válido (8 dígitos)");
        return;
    }

    await searchLocationAndWeather(cep);
}

async function searchLocationAndWeather(cep) {
    showLoading();
    hideError();
    hideResults();

    try {
        const locationData = await fetchLocationData(cep);

        if (locationData.erro) {
            throw new Error("CEP não encontrado");
        }

        const weatherData = await fetchWeatherData(locationData.localidade, locationData.uf);

        currentLocationData = { ...locationData, cep };
        currentWeatherData = weatherData;

        displayLocationData(currentLocationData);
        displayWeatherData(currentWeatherData);

        addToHistory(currentLocationData, currentWeatherData);
        updateFavoriteButton();
        showResults();
    } catch (error) {
        console.error("Erro:", error);
        showError(error.message || "Erro ao buscar informações. Tente novamente.");
    } finally {
        hideLoading();
    }
    toggleCepInfo(true);

}

async function fetchLocationData(cep) {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    if (!response.ok) {
        throw new Error("Erro ao consultar CEP");
    }
    return await response.json();
}

async function fetchCoordinates(city, state) {
    const query = `${city},${state},BR`;
    const url = `http://api.openweathermap.org/geo/1.0/direct?q=${query}&limit=1&appid=${WEATHER_API_KEY}`;

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error("Erro ao buscar coordenadas da cidade");
    }
    const data = await response.json();
    if (data.length === 0) {
        throw new Error("Cidade não encontrada para consulta do clima");
    }
    return {
        lat: data[0].lat,
        lon: data[0].lon,
    };
}

async function fetchWeatherData(city, state) {
    try {
        const coordinates = await fetchCoordinates(city, state);
        const url = `${WEATHER_API_URL}?lat=${coordinates.lat}&lon=${coordinates.lon}&appid=${WEATHER_API_KEY}&units=metric&lang=pt_br`;

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error("Erro ao consultar dados do clima");
        }
        const weatherData = await response.json();
        weatherData.coord = coordinates;
        return weatherData;
    } catch (error) {
        console.error("Erro ao buscar dados do clima:", error);
        throw new Error("Não foi possível obter dados do clima para esta localização");
    }
}


function displayLocationData(data) {
    locationCep.textContent = `CEP: ${formatCep(data.cep)}`; 
    locationStreet.textContent = `Logradouro: ${data.logradouro || "Não informado"}`; 
    locationDistrict.textContent = `Bairro: ${data.bairro || "Não informado"}`;
    locationCity.textContent = `Cidade: ${data.localidade || "Não informado"}`; 
    locationState.textContent = `Estado: ${data.uf || "Não informado"}`; 
}


function displayWeatherData(data) {
    temperature.textContent = `${Math.round(data.main.temp)}°C`; 
    weatherDescription.textContent = data.weather[0].description;
    feelsLike.textContent = `${Math.round(data.main.feels_like)}°C`;
    humidity.textContent = `${data.main.humidity}%`;
    windSpeed.textContent = `${Math.round(data.wind.speed * 3.6)} km/h`;

    const iconCode = data.weather[0].icon;
    if (weatherIcon) {
        weatherIcon.src = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
        weatherIcon.alt = data.weather[0].description;
    }

    if (data.coord) {
        console.log(`Coordenadas: Lat ${data.coord.lat}, Lon ${data.coord.lon}`);
    }
}


function getHistory() {
    return JSON.parse(localStorage.getItem("weatherAppHistory") || "[]");
}

function getFavorites() {
    return JSON.parse(localStorage.getItem("weatherAppFavorites") || "[]");
}

function addToHistory(locationData, weatherData) {
    const history = getHistory();

    const newEntry = {
        cep: locationData.cep,
        city: locationData.localidade,
        state: locationData.uf,
        temperature: Math.round(weatherData.main.temp),
        description: weatherData.weather[0].description,
        date: new Date().toLocaleString("pt-BR"),
    };

    const existingIndex = history.findIndex((entry) => entry.cep === newEntry.cep);
    if (existingIndex > -1) {
        history.splice(existingIndex, 1);
    }

    history.unshift(newEntry);

    if (history.length > 5) {
        history.splice(5);
    }

    localStorage.setItem("weatherAppHistory", JSON.stringify(history));
    loadHistory();
}

function toggleFavorite() {
    if (!currentLocationData) return;

    const favorites = getFavorites();
    const cep = currentLocationData.cep;
    const existingIndex = favorites.findIndex((fav) => fav.cep === cep);

    if (existingIndex > -1) {
        favorites.splice(existingIndex, 1);
        favoriteBtn.innerHTML = '<i class="far fa-heart"></i> Adicionar aos Favoritos';
        favoriteBtn.classList.remove("favorited");
    } else {
        favorites.push({
            cep: currentLocationData.cep,
            city: currentLocationData.localidade,
            state: currentLocationData.uf,
            date: new Date().toLocaleString("pt-BR"),
        });
        favoriteBtn.innerHTML = '<i class="fas fa-heart"></i> Remover dos Favoritos';
        favoriteBtn.classList.add("favorited");
    }

    localStorage.setItem("weatherAppFavorites", JSON.stringify(favorites));
    loadFavorites();
}

function updateFavoriteButton() {
    if (!currentLocationData) return;

    const favorites = getFavorites();
    const isFavorited = favorites.some((fav) => fav.cep === currentLocationData.cep);

    if (isFavorited) {
        favoriteBtn.innerHTML = '<i class="fas fa-heart"></i> Remover dos Favoritos';
        favoriteBtn.classList.add("favorited");
    } else {
        favoriteBtn.innerHTML = '<i class="far fa-heart"></i> Adicionar aos Favoritos';
        favoriteBtn.classList.remove("favorited");
    }
}

function loadHistory() {
    const history = getHistory();

    if (history.length === 0) {
        historyList.innerHTML = '<p class="empty-message">Nenhuma consulta realizada ainda</p>';
        clearHistoryBtn.classList.add("hidden");
        return;
    }

    historyList.innerHTML = history
        .map(
            (entry) => `
            <div class="history-item" onclick="searchFromHistory('${entry.cep}')">
                <div class="item-info">
                    <strong>${entry.city} - ${entry.state}</strong><br>
                    <small>CEP: ${formatCep(entry.cep)} | ${entry.temperature}°C - ${entry.description}</small><br>
                    <small>Consultado em: ${entry.date}</small>
                </div>
                <div class="item-actions">
                    <button onclick="event.stopPropagation(); removeFromHistory('${entry.cep}')" title="Remover">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `,
        )
        .join("");

    clearHistoryBtn.classList.remove("hidden");
}

function loadFavorites() {
    const favorites = getFavorites();

    if (favorites.length === 0) {
        favoritesList.innerHTML = '<p class="empty-message">Nenhum local favoritado ainda</p>';
        clearFavoritesBtn.classList.add("hidden");
        return;
    }

    favoritesList.innerHTML = favorites
        .map(
            (fav) => `
            <div class="favorite-item" onclick="searchFromHistory('${fav.cep}')">
                <div class="item-info">
                    <strong>${fav.city} - ${fav.state}</strong><br>
                    <small>CEP: ${formatCep(fav.cep)}</small><br>
                    <small>Favoritado em: ${fav.date}</small>
                </div>
                <div class="item-actions">
                    <button onclick="event.stopPropagation(); removeFromFavorites('${fav.cep}')" title="Remover">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `,
        )
        .join("");

    clearFavoritesBtn.classList.remove("hidden");
}

async function searchFromHistory(cep) {
    cepInput.value = formatCep(cep);
    await searchLocationAndWeather(cep);
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function removeFromHistory(cep) {
    const history = getHistory();
    const filteredHistory = history.filter((entry) => entry.cep !== cep);
    localStorage.setItem("weatherAppHistory", JSON.stringify(filteredHistory));
    loadHistory();
}

function removeFromFavorites(cep) {
    const favorites = getFavorites();
    const filteredFavorites = favorites.filter((fav) => fav.cep !== cep);
    localStorage.setItem("weatherAppFavorites", JSON.stringify(filteredFavorites));
    loadFavorites();

    if (currentLocationData && currentLocationData.cep === cep) {
        updateFavoriteButton();
    }
}

function clearHistory() {
    if (confirm("Tem certeza que deseja limpar todo o histórico?")) {
        localStorage.removeItem("weatherAppHistory");
        loadHistory();
    }
}

function clearFavorites() {
    if (confirm("Tem certeza que deseja limpar todos os favoritos?")) {
        localStorage.removeItem("weatherAppFavorites");
        loadFavorites();
        updateFavoriteButton();
    }
}

function showLoading() {
    loading.classList.remove("hidden");
    searchBtn.disabled = true;
}

function hideLoading() {
    loading.classList.add("hidden");
    searchBtn.disabled = false;
}

function showError(message) {
    errorText.textContent = message;
    errorMessage.classList.remove("hidden");
}

function hideError() {
    errorMessage.classList.add("hidden");
}

function showResults() {
    results.classList.remove("hidden");
}

function hideResults() {
    results.classList.add("hidden");
}
async function searchWeatherByCity(city) {
    showLoading();
    hideError();
    hideResults();

    try {
        const coordinates = await fetchCoordinatesOnlyCity(city);
        const weatherData = await fetchWeatherDataFromCoordinates(coordinates);

        currentLocationData = {
            cep: "N/A",
            logradouro: "N/A",
            bairro: "N/A",
            localidade: city,
            uf: "N/A"
        };

        currentWeatherData = weatherData;

        displayLocationData(currentLocationData);
        displayWeatherData(currentWeatherData);
        updateFavoriteButton();
        showResults();
    } catch (error) {
        showError(error.message || "Erro ao buscar clima da cidade.");
    } finally {
        hideLoading();
    }
    toggleCepInfo(false);

}
async function fetchCoordinatesOnlyCity(city) {
    const query = `${city},BR`;
    const url = `https://api.openweathermap.org/geo/1.0/direct?q=${query}&limit=1&appid=${WEATHER_API_KEY}`;

    const response = await fetch(url);
    if (!response.ok) throw new Error("Erro ao buscar coordenadas.");

    const data = await response.json();
    if (data.length === 0) throw new Error("Cidade não encontrada.");

    return {
        lat: data[0].lat,
        lon: data[0].lon,
    };
}

async function fetchWeatherDataFromCoordinates({ lat, lon }) {
    const url = `${WEATHER_API_URL}?lat=${lat}&lon=${lon}&appid=${WEATHER_API_KEY}&units=metric&lang=pt_br`;

    const response = await fetch(url);
    if (!response.ok) throw new Error("Erro ao consultar dados do clima.");

    const weatherData = await response.json();
    weatherData.coord = { lat, lon };
    return weatherData;
}
function toggleCepInfo(show) {
    const cepInfo = document.getElementById("containerInfoCep");
    if (cepInfo) {
        cepInfo.style.display = show ? "block" : "none";
    }
}
