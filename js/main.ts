class Utils {
    // Returns a function, that, as long as it continues to be invoked, will not
    // be triggered. The function will be called after it stops being called for
    // N milliseconds. If `immediate` is passed, trigger the function on the
    // leading edge, instead of the trailing
    static Debounce(func: Function, wait: number): Function {
        var timeout: number;
        return function() {
            var context = this, args = arguments;
            var later = function() {
                timeout = null;
                func.apply(context, args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    };


}

class UniApi {
    // Urls are defined as follows:
    // base/service/controller/action
    /*
    private static BaseUrl = "http://localhost";
    private static IgnoreService = true;*/
    private static BaseUrl = "https://api.unicycleunicorn.net";
    private static IgnoreService = false;
    private static Endpoints = {};

    //region Enumerations
    private static XHeaders = Object.freeze({
        XAuthUser: "X-Auth-User",
        XAuthPass: "X-Auth-Pass",
        XApiKey: "X-Api-Key", // Shouldn't be used by frontend - here for completeness
        XAuthCSRF: "X-Auth-CSRF",
        XExceptionCode: "X-Exception-Code"
    });

    private static XCookies = Object.freeze({
        Session: "Session", // Shouldn't be used manually by frontend - here for completeness
        CSRF: "CSRF"
    })

    private static AuthTypes = Object.freeze({
        SessionAuth: "SessionAuth",
        StrictSessionAuth: "StrictSessionAuth",
        ApiKeyAuth: "ApiKeyAuth",
        CredentialAuth: "CredentialAuth"
    })
    //endregion

    //region Request & Auth
    private static async Login() {
        const response = await UniApi.Request('POST', "cam", "User", "Login");

        if (!response.ok) {
            console.log("Failed Login");
        }
    }

    public static async Request(method: string, service: string, controller: string, action: string, body: any = null, headers: object = {}) {

        const defaultHeaders = {};

        const endpointMetadata = await this.GetActionMetadata(method, service, controller, action);
        const url = this.BuildUrl(service, controller, action);

        if (endpointMetadata == null) {
            throw new Error(`Requested endpoint does not exist: ${url}`);
        }

        const AuthMethod = this.DetermineAuthMethod(endpointMetadata.auth);

        switch (AuthMethod) {
            case null: // No auth
                break;
            case this.AuthTypes.SessionAuth: // Session only
                defaultHeaders[UniApi.XHeaders.XAuthCSRF] = UniApi.RetrieveCSRFCookie();
                break;
            case this.AuthTypes.StrictSessionAuth: // Session & credentials
                defaultHeaders[UniApi.XHeaders.XAuthCSRF] = UniApi.RetrieveCSRFCookie();
                defaultHeaders[UniApi.XHeaders.XAuthPass] = prompt("Enter Password", "password");
                break;
            case this.AuthTypes.CredentialAuth: // Credentials only
                defaultHeaders[UniApi.XHeaders.XAuthUser] = prompt("Enter Username", "Admin");
                defaultHeaders[UniApi.XHeaders.XAuthPass] = prompt("Enter Password", "password");
                break;
            case this.AuthTypes.ApiKeyAuth: // Api key - unsupported by frontend
                throw new Error(`Requested endpoint only supports ApiKeyAuth: ${url}`);
        }

        const response = await fetch(url, {
            method: method,
            body: body == null ? null : JSON.stringify(body),
            headers: {...defaultHeaders, ...headers},
            credentials: 'include'
        });

        if (response.status >= 100 && response.status <= 199) { // Informational Response
            console.log(`Request Informational Response: ${method} ${url}`);
        } else if (response.status >= 200 && response.status <= 299) { // Successful Response
            console.log(`Request Successful Response: ${method} ${url}`);
        } else if (response.status >= 300 && response.status <= 399) { // Redirection Response
            console.log(`Request Redirection Response: ${method} ${url}`);
        } else if (response.status >= 400 && response.status <= 499) { // Client Error Response
            switch (response.status) {
                case 401: // Unauthorized - not logged in, try logging in and attempting request again
                    console.log(`Request Client Unauthorized Response: ${method} ${url}`);
                    if (AuthMethod == UniApi.AuthTypes.SessionAuth) {
                        await this.Login();
                        return this.Request(method, service, controller, action, body, headers);
                    } else if (AuthMethod == UniApi.AuthTypes.CredentialAuth) {
                        alert(`Invalid Credentials: ${method} ${url}`);
                    } else {
                        alert(`Not Logged In: ${method} ${url}`);
                    }
                    break;
                case 403: // Forbidden - logged in but insufficient permissions
                    console.log(`Request Client Forbidden Response: ${method} ${url}`);
                    alert(`Insufficient Permissions: ${method} ${url}`);
                    break;
                default:
                    console.log(`Request Client Error Response: ${method} ${url}`);
                    break;
            }
        } else if (response.status >= 500 && response.status <= 599) { // Server Error Response
            console.log(`Request Server Error Response: ${method} ${url}`);
            alert(`Error Code: ${response.headers.get(UniApi.XHeaders.XExceptionCode)}`);
        }

        return response;
    }

    private static DetermineAuthMethod(auth: {permission: string, primary: string, secondary: string}) {
        if (auth == null) return null;

        if (auth.primary == this.AuthTypes.ApiKeyAuth) {
            if (auth.secondary == null) return auth.primary;
            return auth.secondary;
        }
        return auth.primary;
    }

    private static RetrieveCSRFCookie(): string {
        let nameOfCookie = UniApi.XCookies.CSRF + '=';
        //let cookieDecoded = decodeURIComponent();
        let cookieArray = document.cookie.split(';');

        for (let i = 0; i < cookieArray.length; i++) {
            let cIndex = cookieArray[i];
            while (cIndex.charAt(0) == ' ') {
                cIndex = cIndex.substring(1);
            }
            if (cIndex.indexOf(nameOfCookie) == 0) {
                return decodeURIComponent(cIndex.substring(nameOfCookie.length, cIndex.length));
            }
        }
        return null;
    }
    //endregion

    //region Metadata
    private static async UpdateMetadata(service: string) {
        const response = await fetch(this.BuildUrl(service, "Service", "GetEndpoints"), {
            method: 'GET',
        });

        if (response.ok) {
            const metadata = await response.json();
            this.Endpoints[metadata.service] = metadata.endpoints;
        }
    }

    private static async GetActionMetadata(method: string, service: string, controller: string, action: string) {
        // Convert all to lowercase to avoid issues
        service = service.toLowerCase();
        controller = controller.toLowerCase();
        action = action.toLowerCase();

        if (this.Endpoints[service] == null) {
            await this.UpdateMetadata(service);
        }

        const endpoints: [{auth: {permission: string, primary: string, secondary: string}, method: string, route: string}] = this.Endpoints[service][controller][action];
        if (endpoints != null) {
            const endpoint = endpoints.find((e) => {return e.method == method;});
            if (endpoint != null) {
                return endpoint;
            }
        }

        return null;
    }
    //endregion

    private static BuildUrl(service: string, controller: string, action: string, additions: string = null) {
        let base = "";
        if (UniApi.IgnoreService) {
            let servicePort = "";
            switch (service.toLowerCase()) {
                case "cam":
                    servicePort = "5048";
                    break;
                case "notes":
                    servicePort = "5186";
                    break;
            }

            base = `${this.BaseUrl}:${servicePort}/${controller}/${action}`
        } else {
            base = `${this.BaseUrl}/${service}/${controller}/${action}`;
        }
        if ((additions == null) || (additions == "")) {
            return base;
        } else {
            return `${base}/${additions}`;
        }
    }
}

// UniApi.Request("GET", "cam", "Test", "TestSessioned");