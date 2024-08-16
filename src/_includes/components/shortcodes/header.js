const shortcodes = {
    image: require("./image.js"),
}

function page(name, link, appendedUrl = "/", icon) {
    return {
        name: name,
        link: link,
        icon: icon,
        url: `${link}${appendedUrl}`.toLowerCase()
    }
}

let profileIcon = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" fill=\"currentColor\" class=\"bi bi-person-fill\" viewBox=\"0 0 16 16\"><path d=\"M3 14s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1zm5-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6\"/></svg>";
const pages = [page("Home", "/", ""), page("Notes", "/notes"), page("Profile", "/profile", "/", profileIcon)];

function generateLink(page, current) {
    let iconText = page.icon ? page.icon : "";
    if (current.toLowerCase() === page.url) {
        return `
            <li class="nav-item">
              <a class="nav-link active" aria-current="page" href=".">${iconText} ${page.name}</a>
            </li>
            `;
    } else {
        return `
            <li class="nav-item">
              <a class="nav-link" href="${page.link}">${iconText} ${page.name}</a>
            </li>
            `;
    }
}

module.exports = async function(data) {
    let links = "";
    pages.forEach((page) => {
        links += generateLink(page, this.page.url);
    });

    return `
    <nav class="navbar navbar-expand-lg nav-underline bg-footer navbar-dark">
      <div class="container-fluid">
        <a class="navbar-brand" href="/">
            ${await shortcodes.image("Logo.png", "UnicycleUnicorn's Logo", "align-top", "50")}
        </a>
        
        <span class="nav-item ps-4 d-none" id="header-logins">
            <button type="button" class="nav-item btn text-white rounded-3 btn-secondary" onclick="ModalUtils.Open('login-modal')">Log In</button>
            <button type="button" class="nav-item btn text-white rounded-3 btn-secondary" onclick="ModalUtils.Open('create-account-modal')">Create Account</button>
        </span>
        
        <span class="nav-item ps-4" id="page-title">
            ${this.page.fileSlug !== "" ? this.page.fileSlug : "Home"}
        </span>
        
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarSupportedContent" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="navbarSupportedContent">
          <ul class="navbar-nav ms-auto mb-2 mb-lg-0">
            ${links}
          </ul>
        </div>
      </div>
    </nav>`;
};