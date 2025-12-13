import "./Login/styles/Login.css"
import { useState, useEffect, use } from "react"
import { Link, useNavigate } from "react-router-dom"
import { UserContext, AuthContext } from "../data/context.js"
import { notify_success } from "../modules/notify.js"
import { HttpMethod, APIVersion } from "../data/enums.js"
import Fetch from "../API/Fetch.js"
import getToken from "../modules/getToken.js"
import Input from "./components/UI/Input.jsx"

export default function Register() {

    var { setIsAuth } = use(AuthContext)
    var { user, setUser } = use(UserContext)
    var [registerForm, setRegisterForm] = useState({
        username: "",
        password: "",
        password2: ""
    })
    var navigate = useNavigate()

    async function auth() {
        var token = getToken()
        var data = await Fetch({ api_version: APIVersion.V1, action: "auth/users/me/", method: HttpMethod.GET })

        if (data && !data.detail && data.username && token) {
            setUser({ ...user, ...data })
            setIsAuth(true)
            navigate(`/users/${data.username}/`)
        }
    }

    useEffect(() => {
        auth()
    }, [])

    async function register(event) {
        event.preventDefault()

        if (registerForm.password === registerForm.password2) {

            var data = await Fetch({ api_version: APIVersion.V1, action: "auth/users/", method: HttpMethod.POST, body: registerForm, token: "" })

            if (typeof data.username === "string") {
                setUser({ ...data })
                notify_success("Успешно зарегистрированы!")
                navigate("/login/")
            }
        }
    }

    return (
        <div className="Register">
            <div className="LoginForm">
                <h2>Добро пожаловать в BTC Shabolovka!</h2>

                <form onSubmit={e => register(e)}>
                    <Input
                        value={registerForm.username}
                        onChange={e => setRegisterForm({ ...registerForm, username: e.target.value })}
                        placeholder="ник"
                        type="text"
                        required
                    />
                    <br />
                    <Input
                        value={registerForm.password}
                        onChange={e => setRegisterForm({ ...registerForm, password: e.target.value })}
                        placeholder="пароль"
                        type="password"
                        required
                    />
                    <br />
                    <Input
                        value={registerForm.password2}
                        onChange={e => setRegisterForm({ ...registerForm, password2: e.target.value })}
                        placeholder="подтверждение пароля"
                        type="password"
                        required
                    />
                    <br />
                    <Input type="submit" value="зарегистрироваться" />
                </form>
                <Link to="/login/" >Авторизоваться</Link>
            </div>
        </div>
    )
}