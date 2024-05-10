let textarea: HTMLTextAreaElement = <HTMLTextAreaElement>document.getElementById("textarea");
let statusarea: HTMLSpanElement = <HTMLSpanElement>document.getElementById("status");

let saving = "↺";
let saved = "✓";

let is_saved = true;
function has_saved() {
    is_saved = true;
    statusarea.textContent = saved;
}
function not_saved() {
    is_saved = false;
    statusarea.textContent = saving;
}
has_saved();



let update_debounce = Utils.Debounce(updating, 300);

function call_update(val: string) {
    not_saved();
    update_debounce(val);
}

class API {
    private static URL: string = "https://api.unicycleunicorn.net/";

    public static async Get(endpoint: string): Promise<any> {
        let url: string = this.URL + endpoint;
        let ops: {} = {
            method: "GET",
            headers: {
                'Content-Type': 'application/json',
            }
        };
        let response: Response = await fetch(url, ops);
        return await response.json();
    }

    public static async Post(endpoint: string, data: any): Promise<void> {
        let url: string = this.URL + endpoint;
        let ops: {} = {
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        };
        await fetch(url, ops);
    }
}

async function updating(val: string) {
    await API.Post("notes/notes", {
        content: val
    });
    has_saved();
}

API.Get("notes/notes").then(note => textarea.value = note.content)