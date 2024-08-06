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

async function updating(val: string) {
    await UniApi.Request('POST', "notes", 'notes', 'PostNotes', {
        content: val
    }, {
        "Content-Type": "application/json"
    })
    has_saved();
}

UniApi.Request("GET", "notes", "notes", "GetNotes").then(async note => {
    const c = await note.json();
    textarea.value = c.content;
})