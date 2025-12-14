import "./styles/User.css"
import DEFAULT_IMAGE_PATH from "../../images/photo_plan.jpeg"
import { useState, useRef, useEffect, useCallback, use } from "react"
import { useParams } from "react-router-dom"
import Plot from "react-plotly.js"
import { AuthContext, UserContext } from "../../data/context.js"
import { HttpMethod, APIVersion } from "../../data/enums.js"
import { ROOMS } from "../../data/rooms.js"
import { useSetUser } from "../../hooks/useAuth.js"
import { notify_success, notify_error } from "../../modules/notify.js"
import Fetch from "../../API/Fetch.js"

var DateTimePlot = (filteredConversations) => {
    var data = filteredConversations.map(item => ({
        user: item.user,
        start: new Date(item.timestamp_start),
        end: new Date(item.timestamp_end)
    }))

    // Create separate traces for start and end markers, connected by lines
    var plotData = [{
        x: data.flatMap(d => [d.start, d.end, null]), // Add "null" to break lines
        y: data.flatMap(d => [d.user, d.user, null]),
        mode: "lines+markers",
        line: { color: "grey", width: 10 },
        marker: {
            size: 20,
            color: ["blue", "red"].flatMap(color => [color, color, color]) // Pattern: start, end, break
        },
        name: "Occupancy Period",
        // hovertemplate: "%{y}<br>Time: %{x}<extra></extra>"

        text: data.flatMap(() => ["▶️ Начало", "⏹️ Конец", ""]),
        customdata: data.flatMap(d => {
            // Вычисляем длительность для каждого периода
            var duration = Math.round((d.end - d.start) / (1000 * 60)); // в минутах
            var hours = Math.floor(duration / 60);
            var minutes = duration % 60;
            var durationText = hours > 0 ? `${hours}ч ${minutes}м` : `${minutes}м`;

            return [durationText, durationText, ""];
        }),
        hovertemplate: "<b>Пользователь:</b> %{y}<br>" +
            "<b>Время:</b> %{x|%Y-%m-%d %H:%M}<br>" +
            "%{text}<br>" +
            "<b>Длительность:</b> %{customdata}<br>" +
            "<extra></extra>",

    }]

    var layout = {
        title: "Room Occupancy Timeline",
        xaxis: {
            title: "Time",
            type: "date",
            tickformat: "%Y-%m-%d %H:%M"
        },
        yaxis: {
            title: "User",
            type: "category"
        },
        showlegend: false,
        autosize: true,  // Добавлено: автоматический размер
        width: null,     // Добавлено: null вместо фиксированной ширины
        height: 500,
        margin: {        // Добавлено: настройка отступов
            l: 120,      // left margin (для имен пользователей)
            r: 30,       // right margin
            b: 50,       // bottom margin
            t: 80,       // top margin (для заголовка)
            pad: 4
        },
        hoverlabel: {
            font: { size: 24 },
        },
    }

    // Добавьте CSS стили для контейнера
    var containerStyle = {
        width: "100%",
        height: "100%",
        minHeight: "500px"
    }

    return (
        <div style={containerStyle}>
            <Plot
                data={plotData}
                layout={layout}
                style={containerStyle}
                useResizeHandler={true}  // Важно: обработчик изменения размера
                config={{ responsive: true }}  // Включение responsive режима
            />
        </div>
    )
}

export default function App() {
    var params = useParams()
    var { setIsAuth } = use(AuthContext)
    var { user, setUser } = use(UserContext)
    useSetUser({ username: params.username, setUser: setUser })
    var [conversations, setConversations] = useState([])
    var [filteredConversations, setFilteredConversations] = useState([])
    var [conversationFutureTime, setConversationFutureTime] = useState(null)

    var [timeStampNow, setTimeStampNow] = useState(null)
    var [timeStampStart, setTimeStampStart] = useState(null)
    var [timeStampEnd, setTimeStampEnd] = useState(null)

    var selectedColor = "#2ecc71"
    var canvasRef = useRef(null)
    var [selectedRoom, setSelectedRoom] = useState(null)
    var [backgroundImage, setBackgroundImage] = useState(null)
    var [isImageLoaded, setIsImageLoaded] = useState(false)
    var [isLoading, setIsLoading] = useState(false)
    var [selectionInfo, setSelectionInfo] = useState(null)
    var [hoveredObject, setHoveredObject] = useState(null)

    // Данные о помещениях и номерах
    var [rooms, setRooms] = useState([])

    var initializeRooms = () => {
        return ROOMS
    }

    // Обновление размеров canvas
    var updateCanvasSize = (img) => {
        var canvas = canvasRef.current
        if (!canvas) {
            return
        }

        var maxWidth = 1000
        var maxHeight = 680

        let newWidth = img.width
        let newHeight = img.height

        var scale

        if (newWidth > maxWidth) {
            scale = maxWidth / newWidth
            newWidth = maxWidth
            newHeight = newHeight * scale
        }

        if (newHeight > maxHeight) {
            scale = maxHeight / newHeight
            newHeight = maxHeight
            newWidth = newWidth * scale
        }

        canvas.width = newWidth
        canvas.height = newHeight
    }

    // Отрисовка на canvas
    var draw = useCallback(() => {
        var canvas = canvasRef.current
        if (!canvas) {
            return
        }

        var ctx = canvas.getContext("2d")
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        // Рисуем фоновое изображение
        if (isImageLoaded && backgroundImage) {
            ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height)
        } else {
            // Рисуем фон если нет изображения
            ctx.fillStyle = "#f8f9fa"
            ctx.fillRect(0, 0, canvas.width, canvas.height)

            // Информационное сообщение
            ctx.fillStyle = "#7f8c8d"
            ctx.font = "20px Arial"
            ctx.textAlign = "center"
            ctx.fillText("Стандартная карта помещений", canvas.width / 2, 30)
            ctx.font = "16px Arial"
            ctx.fillText("Загрузите изображение плана помещения", canvas.width / 2, 60)
        }

        // Рисуем помещения
        Object.values(rooms).forEach(room => {
            ctx.fillStyle = room.color
            ctx.strokeStyle = "#026f02ff"
            ctx.lineWidth = 3

            ctx.beginPath()
            ctx.moveTo(room.points[0].x, room.points[0].y)
            for (let i = 1; i < room.points.length; i++) {
                ctx.lineTo(room.points[i].x, room.points[i].y)
            }
            ctx.closePath()
            ctx.fill()
            ctx.stroke()
        })

        // Подсветка наведенного объекта
        if (hoveredObject) {
            ctx.strokeStyle = "#f39c12"
            ctx.lineWidth = 3

            if (hoveredObject.type === "room") {
                ctx.beginPath()
                ctx.moveTo(hoveredObject.points[0].x, hoveredObject.points[0].y)
                for (let i = 1; i < hoveredObject.points.length; i++) {
                    ctx.lineTo(hoveredObject.points[i].x, hoveredObject.points[i].y)
                }
                ctx.closePath()
                ctx.stroke()
            } else if (hoveredObject.type === "number") {
                ctx.strokeRect(
                    hoveredObject.x,
                    hoveredObject.y,
                    hoveredObject.width,
                    hoveredObject.height
                )
            }
        }
    }, [rooms, backgroundImage, isImageLoaded, hoveredObject])

    var loadDefaultImage = () => {
        setIsLoading(true)

        var img = new Image()

        img.onload = () => {
            setBackgroundImage(img)
            setIsImageLoaded(true)
            setIsLoading(false)
            updateCanvasSize(img)
            draw()
        }

        img.onerror = () => {
            console.error("Не удалось загрузить изображение по пути:", DEFAULT_IMAGE_PATH)
            setIsLoading(false)
        }

        // Загружаем изображение из public папки
        img.src = DEFAULT_IMAGE_PATH
    }

    // Добавьте эту функцию для получения правильных координат
    var getCanvasCoordinates = (canvas, clientX, clientY) => {
        var rect = canvas.getBoundingClientRect()

        // Вычисляем масштаб между CSS размерами и реальными размерами canvas
        var scaleX = canvas.width / rect.width
        var scaleY = canvas.height / rect.height

        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        }
    }

    var isPointInPolygon = (x, y, polygon) => {
        let inside = false
        var epsilon = 1.0 // Увеличьте допуск для масштабированных координат

        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            var xi = polygon[i].x, yi = polygon[i].y
            var xj = polygon[j].x, yj = polygon[j].y

            // Проверка на попадание в вершину
            if (Math.abs(x - xi) < epsilon && Math.abs(y - yi) < epsilon) {
                return true
            }

            // Проверка на попадание на ребро
            if (Math.abs((yj - yi) * (x - xi) - (xj - xi) * (y - yi)) < epsilon) {
                // Коллинеарны, проверяем между ли вершинами
                if (x >= Math.min(xi, xj) - epsilon &&
                    x <= Math.max(xi, xj) + epsilon &&
                    y >= Math.min(yi, yj) - epsilon &&
                    y <= Math.max(yi, yj) + epsilon) {
                    return true
                }
            }

            // Основная логика пересечения луча
            var intersect = ((yi > y) !== (yj > y))
            if (intersect) {
                var xIntersect = (xj - xi) * (y - yi) / (yj - yi) + xi
                if (x <= xIntersect) { // Используйте <= для включения границы
                    inside = !inside
                }
            }
        }

        return inside
    }

    var handleCanvasClick = (e) => {
        var canvas = canvasRef.current
        if (!canvas) {
            return
        }

        var { x, y } = getCanvasCoordinates(canvas, e.clientX, e.clientY)

        handleRoomClick(x, y)

        draw()
        updateSelectionInfo()
    }

    // Обработка клика по помещению
    var handleRoomClick = (x, y) => {
        let clickedRoom = null

        // Находим помещение по координатам
        Object.values(rooms).forEach(room => {
            if (isPointInPolygon(x, y, room.points)) {
                clickedRoom = room
            }
        })

        if (clickedRoom) {
            // Если кликнули на уже выделенное помещение
            if (selectedRoom && selectedRoom.id === clickedRoom.id) {
                // Отрицание разукраски
                if (clickedRoom.color !== clickedRoom.originalColor) {
                    // Сбрасываем цвет
                    setRooms(prev => ({
                        ...prev,
                        [clickedRoom.id]: {
                            ...clickedRoom,
                            color: clickedRoom.originalColor
                        }
                    }))
                    setSelectedRoom(null)
                } else {
                    // Красим в выбранный цвет
                    setRooms(prev => ({
                        ...prev,
                        [clickedRoom.id]: {
                            ...clickedRoom,
                            color: selectedColor
                        }
                    }))
                }
            } else {
                // Если кликнули на другое помещение
                // Сбрасываем предыдущее выделение
                if (selectedRoom) {
                    setRooms(prev => ({
                        ...prev,
                        [selectedRoom.id]: {
                            ...selectedRoom,
                            color: selectedRoom.originalColor
                        }
                    }))
                }

                // Выделяем новое помещение
                setSelectedRoom(clickedRoom)
                setRooms(prev => ({
                    ...prev,
                    [clickedRoom.id]: {
                        ...clickedRoom,
                        color: selectedColor
                    }
                }))
            }
        } else {
            // Кликнули вне помещения
            if (selectedRoom) {
                setRooms(prev => ({
                    ...prev,
                    [selectedRoom.id]: {
                        ...selectedRoom,
                        color: selectedRoom.originalColor
                    }
                }))
                setSelectedRoom(null)
            }
        }
    }

    var handleMouseMove = (e) => {
        var canvas = canvasRef.current
        if (!canvas) {
            return
        }

        // Используем правильные координаты
        var { x, y } = getCanvasCoordinates(canvas, e.clientX, e.clientY)

        let hovered = null

        // Проверяем помещения
        Object.values(rooms).forEach(room => {
            if (isPointInPolygon(x, y, room.points)) {
                hovered = room
            }
        })

        setHoveredObject(hovered)

        // Меняем курсор
        canvas.style.cursor = hovered ? "pointer" : "default"
    }

    // Обновление информации о выборе
    var updateSelectionInfo = async () => {
        if (selectedRoom) {
            setSelectionInfo(selectedRoom.name)

            var filteredConversationsByRoom = conversations.filter((conversation) => {
                return conversation.room === selectedRoom.name
            })
            setFilteredConversations(() => [...filteredConversationsByRoom])

            var data = await Fetch({ api_version: APIVersion.V2, action: `get_conversation_future_time/${selectedRoom.name}/?current_time=${timeStampNow}`, method: HttpMethod.GET })
            if (data.ok) {
                setConversationFutureTime(data.time)
            }
        }
    }

    // Функция для получения форматированной даты
    var getFormattedDateTime = () => {
        var now = new Date()
        var year = now.getFullYear()
        var month = String(now.getMonth() + 1).padStart(2, "0")
        var day = String(now.getDate()).padStart(2, "0")
        var hours = String(now.getHours()).padStart(2, "0")
        var minutes = String(now.getMinutes()).padStart(2, "0")

        return `${year}-${month}-${day}T${hours}:${minutes}`
    }

    async function get_conversation() {
        var data = await Fetch({ api_version: APIVersion.V2, action: `get_conversation/?current_time=${timeStampNow}`, method: HttpMethod.GET })

        if (data.ok) {
            setConversations(data.conversations)
            setFilteredConversations(data.conversations)
        }
    }

    async function add_conversation() {
        var body = {
            user: String(user.username),
            room: String(selectionInfo),
            timestamp_start: String(timeStampStart),
            timestamp_end: String(timeStampEnd),
        }

        var data = await Fetch({ api_version: APIVersion.V2, action: "add_conversation/", method: HttpMethod.POST, body: body })

        if (data.ok) {
            notify_success("Дата сохранена")
        } else if (data.error) {
            notify_error(data.error)
        }
    }

    async function deleteConversation(conversation_id) {
        var data = await Fetch({ api_version: APIVersion.V2, action: `delete_conversation/${conversation_id}/`, method: HttpMethod.DELETE })

        if (data.ok) {
            notify_success("Дата удалена")

            var filteredConversationsAfterDelete = conversations.filter((conversation) => {
                return conversation.id !== conversation_id
            })
            setConversations(() => [...filteredConversationsAfterDelete])
            setFilteredConversations(() => [...filteredConversationsAfterDelete])
        }
    }

    function logout() {
        localStorage.clear()
        setIsAuth(false)
    }

    useEffect(() => {
        var initApp = () => {
            var roomsData = initializeRooms()
            setRooms(roomsData)
            loadDefaultImage()
        }

        initApp()
    }, [])

    // Обновление отрисовки при изменении данных
    useEffect(() => {
        draw()
        updateSelectionInfo()
    }, [rooms, selectedRoom, draw])

    useEffect(() => {
        // Устанавливаем начальное значение
        var initialDateTime = getFormattedDateTime()
        setTimeStampNow(initialDateTime)
    }, [])

    useEffect(() => {
        if (timeStampNow) {
            get_conversation()
        }
    }, [timeStampNow])

    return (
        <div className="app">
            <div>
                <strong>@{user.username}</strong>
            </div>
            <br />
            <button onClick={() => logout()}>Выйти</button>
            <br />
            <br />
            <br />

            <div className="main-content">
                <div className="canvas-section">
                    <div className="canvas-container">
                        <canvas
                            ref={canvasRef}
                            // width="1000"
                            // height="680"
                            onClick={handleCanvasClick}
                            onMouseMove={handleMouseMove}
                        />
                        {isLoading && (
                            <div className="loading-overlay">
                                <div className="loading-spinner"></div>
                                <p>Загрузка изображения...</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="controls-section">
                    <div className="panel control-panel">
                        <div className="selection-info">
                            <h3>Выбранное помещение:</h3>
                            <p>{selectionInfo}</p>
                            {conversationFutureTime &&
                                <p>{conversationFutureTime} до следующего совещания</p>
                            }
                        </div>
                    </div>
                </div>
            </div>
            <div>Текущая дата и время:</div>
            <input type="datetime-local" id="currentDateTime" value={timeStampNow} readOnly></input>
            <div>Начало совещания:</div>
            <input
                className="form-control"
                type="datetime-local"
                value={timeStampStart}
                onChange={(e) => setTimeStampStart(e.target.value)}
            />
            <div>Конец совещания:</div>
            <input
                className="form-control"
                type="datetime-local"
                value={timeStampEnd}
                onChange={(e) => setTimeStampEnd(e.target.value)}
            />
            <br />
            <button
                className="setConversationButton"
                onClick={() => add_conversation()}
            >
                Добавить
            </button>
            <br />
            <br />

            {selectionInfo && DateTimePlot(filteredConversations)}

            <br />
            <br />
            <br />

            {filteredConversations.map((conversation) => {
                // Проверяем, меньше ли 15 минут до начала
                const minutesLeft = parseInt(conversation.total_minutes || 0)
                const shouldFlash = minutesLeft > 0 && minutesLeft < 15

                return (
                    <div
                        className={`Conversation ${shouldFlash ? 'flashing' : ''}`}
                        key={conversation.id}
                    >
                        <strong>@{conversation.user}</strong> "{conversation.room}" {conversation.timestamp_start} -- {conversation.timestamp_end}
                        <br />
                        Будет длиться {conversation.how_long_will_the_conversation_last}
                        <br />
                        Осталось {conversation.how_much_time_is_left} до совещания

                        {
                            conversation.user === user.username &&
                            <>
                                <br />
                                <br />
                                <button onClick={() => deleteConversation(conversation.id)}>Удалить</button>
                            </>
                        }
                    </div>
                )
            })}
        </div>
    )
}