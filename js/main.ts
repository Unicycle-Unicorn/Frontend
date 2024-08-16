
class Popups {
    public static Success(content: string) {
        console.log(content);
        alert(content);
    }

    public static Failure(content: string) {
        console.error(content);
        alert(content);
    }
}

class ModalUtils {
    public static Close(id: string) {
        // @ts-ignore
        bootstrap.Modal.getOrCreateInstance(document.getElementById(id)).hide();
    }

    public static Open(id: string) {
        // @ts-ignore
        bootstrap.Modal.getOrCreateInstance(document.getElementById(id)).show();
    }
}

class Utils {
    // Returns a function, that, as long as it continues to be invoked, will not
    // be triggered. The function will be called after it stops being called for
    // N milliseconds. If `immediate` is passed, trigger the function on the
    // leading edge, instead of the trailing
    public static Debounce(func: Function, wait: number): Function {
        let timeout: number;
        return function() {
            let context = this, args = arguments;
            let later = function() {
                timeout = null;
                func.apply(context, args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    };

    public static NotNullOrEmpty(value: string): boolean {
        if (value) {
            if (value != "") {
                return true;
            }
        }

        return false;
    }

    public static IsNullOrEmpty(value: string) {
        return !Utils.NotNullOrEmpty(value);
    }
}

class WebStorage {
    private static Subscribers: { [x: string]: any; } = {};

    private static GetSubscribers(key: string) {
        return WebStorage.Subscribers[key];
    }

    public static Set(key: string, value: string) {
        let oldValue = localStorage.getItem(key);
        localStorage.setItem(key, value);
        let keySubscribers = WebStorage.GetSubscribers(key);
        if (keySubscribers) {
            keySubscribers.forEach((subscriber: (newValue: string, oldValue: string) => void) => {
                subscriber(value, oldValue);
            });
        }
    }

    public static Get(key: string) {
        return localStorage.getItem(key);
    }

    public static Delete(key: string) {
        let oldValue = localStorage.getItem(key);
        localStorage.removeItem(key);
        let keySubscribers = WebStorage.GetSubscribers(key);
        if (keySubscribers) {
            keySubscribers.forEach((subscriber: (newValue: null, oldValue: string) => void) => {
                subscriber(null, oldValue);
            });
        }
    }

    public static Subscribe(key: string, callback: (newValue: string, oldValue: string) => void, immediate: boolean = false) {
        let keySubscribers = WebStorage.GetSubscribers(key);
        if (!keySubscribers) {
            WebStorage.Subscribers[key] = [];
            keySubscribers = WebStorage.GetSubscribers(key);
        }

        keySubscribers.push(callback);

        if (immediate) {
            let value = WebStorage.Get(key);
            callback(value, value);
        }
    }

    public static Unsubscribe(key: string, callback: (newValue: string, oldValue: string) => void) {
        let keySubscribers = WebStorage.GetSubscribers(key);
        if (keySubscribers) {
            let index = keySubscribers.indexOf(callback)
            if (index > -1) {
                keySubscribers.splice(index, 1);
            }
        }
    }
}

async function RequestUserCredentials(): Promise<string>  {
    let password: string;

    password = prompt("Enter Password", "password");

    return password;
}

/*
class WatchedVariable<T> {
    private T: T;

    private Subscribers: ((newValue: T, oldValue: T) => void)[] = [];

    public Subscribe(callback: (newValue: T, oldValue: T) => void) {
        this.Subscribers.push(callback);
    }

    public Unsubscribe(callback: (newValue: T, oldValue: T) => void) {
        let index = this.Subscribers.indexOf(callback)
        if (index > -1) {
            this.Subscribers.splice(index, 1);
        }
    }

    public Get(): T {
        return this.T;
    }

    public Set(t: T): void {
        let oldValue = this.T;
        this.T = t;
        this.Subscribers.forEach(subscriber => {
            subscriber(t, oldValue);
        });
    }
}
*/

class ValidationUtils {
    public static SetInvalidText(input: HTMLInputElement, value: string = "") {
        input.setCustomValidity(value);
        let inputInvalid = input.nextElementSibling;
        if (inputInvalid && inputInvalid.classList.contains("invalid-feedback")) {
            inputInvalid.textContent = value;
        }
    }
}

class UniApi {
    // Urls are defined as follows:
    // base/service/controller/action
    private static BaseUrl = "https://api.unicycleunicorn.net";
    private static Endpoints = UniApi.InitializeEndpoints();

    private static InitializeEndpoints() {
        let endpoints = JSON.parse(localStorage.getItem("endpoints"));
        if (!endpoints) {
            endpoints = {}
        }
        return endpoints;
    }

    public static InvalidateEndpoints() {
        localStorage.removeItem("endpoints");
        this.Endpoints = null;
    }

    //region Enumerations
    public static XHeaders = Object.freeze({
        XAuthUser: "X-Auth-User",
        XAuthPass: "X-Auth-Pass",
        XApiKey: "X-Api-Key", // Shouldn't be used by frontend - here for completeness
        XAuthCSRF: "X-Auth-CSRF",
        XExceptionCode: "X-Exception-Code"
    });

    private static XCookies = Object.freeze({
        Session: "Session", // Shouldn't be used manually by frontend - here for completeness
        CSRF: "CSRF"
    });

    private static AuthTypes = Object.freeze({
        SessionAuth: "SessionAuth",
        StrictSessionAuth: "StrictSessionAuth",
        ApiKeyAuth: "ApiKeyAuth", // Shouldn't be used by frontend - here for completeness
        CredentialAuth: "CredentialAuth"
    });
    //endregion

    //region Request & Auth
    public static async PostJson(service: string, controller: string, action: string, body: object = {}, headers: object = {}): Promise<Response> {
        const defaultHeaders = {
            "Content-Type": "application/json"
        };

        return this.Request('POST', service, controller, action, JSON.stringify(body), {...defaultHeaders, ...headers});
    }

    public static async Request(method: string, service: string, controller: string, action: string, body: any = null, headers: object = {}, queryParameters: string = ""): Promise<Response> {

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
                defaultHeaders[UniApi.XHeaders.XAuthPass] = await RequestUserCredentials();
                break;
            case this.AuthTypes.CredentialAuth: // Credentials only - for now, only login so we can ignore it as login passes in the correct items already
                //let userCredentials = RequestUserCredentials(true);
                //defaultHeaders[UniApi.XHeaders.XAuthUser] = userCredentials.username;
                //defaultHeaders[UniApi.XHeaders.XAuthPass] = userCredentials.password;
                break;
            case this.AuthTypes.ApiKeyAuth: // Api key - unsupported by frontend
                Popups.Failure(`${url} maybe only be invoked via the api`);
                throw new Error(`Requested endpoint only supports ApiKeyAuth: ${url}`);
        }

        const response = await fetch(url + "?" + queryParameters, {
            method: method,
            body: body == null ? null : body,
            headers: {...defaultHeaders, ...headers},
            credentials: 'include'
        });

        if (response.status >= 100 && response.status <= 199) { // Informational Response
            console.log(`Request Informational Response: ${method} ${url}`);
        } else if (response.status >= 200 && response.status <= 299) { // Successful Response
            console.log(`Request Successful Response: ${method} ${url}`);
            if ({...defaultHeaders, ...headers}[UniApi.XHeaders.XAuthUser]) {
                WebStorage.Set("username", {...defaultHeaders, ...headers}[UniApi.XHeaders.XAuthUser]);
            }
        } else if (response.status >= 300 && response.status <= 399) { // Redirection Response
            console.log(`Request Redirection Response: ${method} ${url}`);
        } else if (response.status >= 400 && response.status <= 499) { // Client Error Response
            switch (response.status) {
                case 401: // Unauthorized - not logged in, try logging in and attempting request again
                    if (AuthMethod == UniApi.AuthTypes.SessionAuth) {
                        Popups.Failure("Please Login");
                        WebStorage.Delete('username');
                        // return this.Request(method, service, controller, action, body, headers, queryParameters);
                    } else if (AuthMethod == UniApi.AuthTypes.CredentialAuth) {
                        Popups.Failure("Invalid Credentials");
                    } else if (AuthMethod == UniApi.AuthTypes.StrictSessionAuth) {
                        Popups.Failure("Invalid Credentials");
                    }
                    break;
                case 403: // Forbidden - logged in but insufficient permissions
                    Popups.Failure(`Insufficient Permissions: ${method} ${url}`);
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
            WebStorage.Set("endpoints", JSON.stringify(UniApi.Endpoints));
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
        let base = `${this.BaseUrl}/${service}/${controller}/${action}`;

        if ((additions == null) || (additions == "")) {
            return base;
        } else {
            return `${base}/${additions}`;
        }
    }
}

//region Login & Create Account Modals

let ValidateUsernameAvailable = Utils.Debounce(CreateAccountValidateUsernameAvailable, 200);
async function CreateAccountValidateUsernameAvailable() {
    const createUsernameElement = document.getElementById("create-username") as HTMLInputElement;
    let newUsername = createUsernameElement.value;

    if (Utils.NotNullOrEmpty(newUsername)) {
        let result = await UniApi.Request("GET", "cam", "user", "UsernameAvailable", null, {}, `Username=${newUsername}`);
        if (result.ok) {
            let body = await result.body.getReader().read();
            let available = (new TextDecoder().decode(body.value)).trim().toLowerCase() === 'true';
            if (!available) {
                ValidationUtils.SetInvalidText(createUsernameElement, `Username ${newUsername} unavailable`);
                return;
            }
        } else {
            ValidationUtils.SetInvalidText(createUsernameElement, "Server could not validate availability of username");
            return;
        }
    }

    ValidationUtils.SetInvalidText(createUsernameElement);
}

function CreateAccountValidatePasswordConfirmation() {
    const createPasswordElement = document.getElementById("create-password") as HTMLInputElement;
    const createPasswordConfirmationElement = document.getElementById("create-password-confirm") as HTMLInputElement;

    let newPassword = createPasswordElement.value;
    let newPasswordConfirmation = createPasswordConfirmationElement.value;

    if (Utils.NotNullOrEmpty(newPassword) && Utils.NotNullOrEmpty(newPasswordConfirmation)) {
        if (newPasswordConfirmation != newPassword) {
            ValidationUtils.SetInvalidText(createPasswordConfirmationElement, "Password confirmation does not match");
            ValidationUtils.SetInvalidText(createPasswordElement, "Password confirmation does not match");
            return;
        }
    }

    ValidationUtils.SetInvalidText(createPasswordConfirmationElement);
    ValidationUtils.SetInvalidText(createPasswordElement);
}

function CreateAccountCloseAndClear() {
    ModalUtils.Close("create-account-modal");

    const createUsernameElement = document.getElementById("create-username") as HTMLInputElement;
    const createPasswordElement = document.getElementById("create-password") as HTMLInputElement;
    const createPasswordConfirmationElement = document.getElementById("create-password-confirm") as HTMLInputElement;

    createUsernameElement.value = "";
    createPasswordElement.value = "";
    createPasswordConfirmationElement.value = "";

    ValidationUtils.SetInvalidText(createUsernameElement);
    ValidationUtils.SetInvalidText(createPasswordElement);
    ValidationUtils.SetInvalidText(createPasswordConfirmationElement);
}

async function CreateAccount() {
    const createUsernameElement = document.getElementById("create-username") as HTMLInputElement;
    const createPasswordElement = document.getElementById("create-password") as HTMLInputElement;
    const createPasswordConfirmationElement = document.getElementById("create-password-confirm") as HTMLInputElement;

    if (createUsernameElement.validity.valid && createPasswordElement.validity.valid && createPasswordConfirmationElement.validity.valid) {
        let newUsername = createUsernameElement.value;
        let newPassword = createPasswordElement.value;

        let response = await UniApi.PostJson("cam", "User", "CreateAccount", {
            Username: newUsername,
            Password: newPassword
        });

        if (response.ok) {
            Popups.Success("Account Created Successfully!");
            CreateAccountCloseAndClear();
        } else {
            if (response.status == 409) {
                ValidationUtils.SetInvalidText(createUsernameElement, `Username ${newUsername} unavailable`);
            }
        }
    }
}

function LoginAccountCloseAndClear() {
    ModalUtils.Close("login-modal");

    const loginUsernameElement = document.getElementById("login-username") as HTMLInputElement;
    const loginPasswordElement = document.getElementById("login-password") as HTMLInputElement;

    loginUsernameElement.value = "";
    loginPasswordElement.value = "";

    ValidationUtils.SetInvalidText(loginUsernameElement);
    ValidationUtils.SetInvalidText(loginPasswordElement);
}

function LoginAccountResetValidation() {
    const loginUsernameElement = document.getElementById("login-username") as HTMLInputElement;
    const loginPasswordElement = document.getElementById("login-password") as HTMLInputElement;

    ValidationUtils.SetInvalidText(loginUsernameElement);
    ValidationUtils.SetInvalidText(loginPasswordElement);
}

async function LoginAccount() {
    const loginUsernameElement = document.getElementById("login-username") as HTMLInputElement;
    const loginPasswordElement = document.getElementById("login-password") as HTMLInputElement;

    if (loginUsernameElement.validity.valid && loginPasswordElement.validity.valid) {
        let username = loginUsernameElement.value;
        let password = loginPasswordElement.value;

        let response = await UniApi.Request('POST', "cam", "User", "Login", null, {
            [UniApi.XHeaders.XAuthUser]: username,
            [UniApi.XHeaders.XAuthPass]: password
        });

        if (response.ok) {
            LoginAccountCloseAndClear();
        } else {
            ValidationUtils.SetInvalidText(loginUsernameElement, "Incorrect credentials");
            ValidationUtils.SetInvalidText(loginPasswordElement, "Incorrect credentials");
        }
    }
}
//endregion

window.addEventListener('load', function() {
    const headerLogins = document.getElementById('header-logins');
    WebStorage.Subscribe('username', (newValue, oldValue) => {
        console.log(`New: ${newValue} Old: ${oldValue}`)
        if (newValue) {
            headerLogins.classList.add('d-none');
            if (newValue != oldValue) {
                Popups.Success(`Welcome ${newValue}`);
            }
        } else {
            headerLogins.classList.remove('d-none');
        }
    }, true);
});