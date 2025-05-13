var myMap;
var multiRoute;
var allPlacemarks = [];

// Функция для удаления Markdown-символов
function stripMarkdown(text) {
    return text
        .replace(/[#*`]+/g, '')
        .replace(/_{2,}/g, '')
        .replace(/\n{2,}/g, '\n')
        .replace(/^\s+/gm, '')
        .trim();
}

// Загружаем все достопримечательности
function loadAllPlaces() {
    fetch('/api/places')
        .then(response => response.json())
        .then(places => {
            console.log(`Загружено ${places.length} мест`);
            
            // Создаем ObjectManager
            const objectManager = new ymaps.ObjectManager({
                clusterize: true,
                gridSize: 32,
                clusterDisableClickZoom: false
            });
            
            // Задаем опции для меток и кластеров
            objectManager.objects.options.set('preset', 'islands#blueIcon');
            objectManager.clusters.options.set('preset', 'islands#blueClusterIcons');
            
            // Преобразуем данные в формат для ObjectManager
            const features = places.map((place, index) => {
                return {
                    type: 'Feature',
                    id: index,
                    geometry: {
                        type: 'Point',
                        coordinates: place.coords
                    },
                    properties: {
                        balloonContentHeader: place.name,
                        balloonContentBody: `<b>Тип:</b> ${place.type}<br>${place.description}<br><a href="/place/${index}" target="_blank">Подробнее</a>`,
                        balloonContentFooter: '<button onclick="openPlacePage(' + index + ')">Открыть страницу</button>',
                        hintContent: place.name,
                        placeId: index,
                        type: place.type
                    }
                };
            });
            
            // Добавляем данные в ObjectManager
            objectManager.add({
                type: 'FeatureCollection',
                features: features
            });
            
            // Добавляем обработчик клика
            objectManager.objects.events.add('click', function(e) {
                const objectId = e.get('objectId');
                openPlacePage(objectId);
            });
            
            // Добавляем ObjectManager на карту
            myMap.geoObjects.add(objectManager);
            
            // Сохраняем ObjectManager для возможной фильтрации
            window.objectManager = objectManager;
            
            // Создаем фильтры по типам
            createTypeFilters(places);
        })
        .catch(error => {
            console.error('Ошибка загрузки мест:', error);
        });
}

// Функция для открытия страницы места
function openPlacePage(placeId) {
    window.open(`/place/${placeId}`, '_blank');
}

// Создание фильтров по типам достопримечательностей
function createTypeFilters(places) {
    // Получаем уникальные типы
    const types = [...new Set(places.map(place => place.type))];
    
    // Создаем контейнер для фильтров
    const filterContainer = document.createElement('div');
    filterContainer.className = 'filter-panel';
    document.getElementById('map').parentNode.insertBefore(filterContainer, document.getElementById('map'));
    
    // Добавляем кнопку "Все"
    const allButton = document.createElement('button');
    allButton.innerText = 'Все';
    allButton.onclick = () => filterByType(null);
    filterContainer.appendChild(allButton);
    
    // Добавляем кнопки для каждого типа
    types.forEach(type => {
        const button = document.createElement('button');
        button.innerText = type;
        button.onclick = () => filterByType(type);
        filterContainer.appendChild(button);
    });
}

// Фильтрация объектов по типу
function filterByType(type) {
    if (!window.objectManager) return;
    
    // Сбрасываем фильтр, если передан null
    if (!type) {
        window.objectManager.setFilter(null);
        return;
    }
    
    // Устанавливаем фильтр
    window.objectManager.setFilter(function(object) {
        return object.properties.type === type;
    });
}

// Построение маршрута
function generateRoute() {
    var query = document.getElementById('query').value;
    fetch('/api/generate_route', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + localStorage.getItem('token')
        },
        body: JSON.stringify({ query: query })
    })
    .then(response => response.json())
    .then(data => {
        // Очищаем текст от Markdown перед выводом
        document.getElementById('answer-container').innerText = stripMarkdown(data.description || '');

        // Удаляем старый маршрут если он есть
        if (multiRoute) {
            myMap.geoObjects.remove(multiRoute);
        }

        // Строим маршрут только если есть 2+ точки
        if (data.points && data.points.length >= 2) {
            var routeCoords = data.points.map(p => p.coords);

            multiRoute = new ymaps.multiRouter.MultiRoute({
                referencePoints: routeCoords,
                params: { routingMode: 'auto' }
            }, {
                boundsAutoApply: true,
                routeActiveStrokeWidth: 6,
                routeActiveStrokeColor: '#1976D2'
            });

            myMap.geoObjects.add(multiRoute);
        } else {
            document.getElementById('answer-container').innerText += '\nМаршрут не построен: недостаточно точек.';
        }
    })
    .catch(error => {
        document.getElementById('answer-container').innerText = 'Ошибка: ' + error;
    });
}

// Получение информации по вопросу
function askQuestion() {
    var question = document.getElementById('query').value;
    fetch('/api/ask', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + localStorage.getItem('token')
        },
        body: JSON.stringify({ question: question })
    })
    .then(response => response.json())
    .then(data => {
        // Очищаем текст от Markdown перед выводом
        document.getElementById('answer-container').innerText = stripMarkdown(data.answer || '');
    })
    .catch(error => {
        document.getElementById('answer-container').innerText = 'Ошибка: ' + error;
    });
}

// Назначаем обработчики кнопок после загрузки DOM
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('route-btn').addEventListener('click', generateRoute);
    document.getElementById('question-btn').addEventListener('click', askQuestion);
    
    // Проверка авторизации
    if (!localStorage.getItem('token')) {
        document.getElementById('answer-container').innerText = 'Для использования функций построения маршрута и вопросов необходимо авторизоваться.';
    }
});

ymaps.ready(function() {
    myMap = new ymaps.Map('map', {
        center: [44.952, 34.102],
        zoom: 9
    });

    // Поисковая строка (если нужна)
    const searchControl = new ymaps.control.SearchControl({
        options: {
            provider: 'yandex#search',
            noPlacemark: true,
            size: 'large',
            noPopup: true
        }
    });
    myMap.controls.add(searchControl);
    
    // Загружаем все достопримечательности при инициализации карты
    loadAllPlaces();
});

// Добавляем функции в глобальную область видимости
window.openPlacePage = openPlacePage;
window.filterByType = filterByType;
