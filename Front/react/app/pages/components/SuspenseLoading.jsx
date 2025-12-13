import "./styles/SuspenseLoading.css"
import Spinner from "react-bootstrap/Spinner"

export default function SuspenseLoading() {
    return (
        <div className="SuspenseLoading d-flex align-items-center justify-content-center">
            <Spinner animation="border" role="status">
                <span className="visually-hidden">Загрузка...</span>
            </Spinner>
        </div>
    )
}