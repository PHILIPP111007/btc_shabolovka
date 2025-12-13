import { useEffect } from "react"
import { HttpMethod, APIVersion } from "../data/enums.js"
import Fetch from "../API/Fetch.js"
import getToken from "../modules/getToken.js"

export function useAuth({ username, setIsAuth }) {
    var Func = useEffect(() => {
        var token = getToken()
        if (token === null) {
            setIsAuth(false)
        } else {
            setIsAuth(true)
        }
    }, [username])
    return Func
}

export function useSetUser({ username, setUser }) {
    var Func = useEffect(() => {
        Fetch({ api_version: APIVersion.V2, action: `user/${username}/`, method: HttpMethod.GET })
            .then((data) => {
                if (data && data.user) {
                    setUser(data.user)
                }
            })
    }, [username])
    return Func
}