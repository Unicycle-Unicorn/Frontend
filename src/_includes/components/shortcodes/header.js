const shortcodes = {
    image: require("./image.js"),
}

function page(name, link, appendedUrl = "/") {
    return {
        name: name,
        link: link,
        url: `${link}${appendedUrl}`.toLowerCase()
    }
}

const pages = [page("Home", "/", ""), page("Notes", "/notes")];

function generateLink(page, current) {
    if (current.toLowerCase() === page.url) {
        return `
            <li class="nav-item">
              <a class="nav-link active" aria-current="page" href=".">${page.name}</a>
            </li>
            `;
    } else {
        return `
            <li class="nav-item">
              <a class="nav-link" href="${page.link}">${page.name}</a>
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
            ${await shortcodes.image("Logo.png", "UnicycleUnicorn's Logo", "align-top", "30")}
        </a>
        <a href="/settings" class="navbar-text" id="welcome-message">Please Log In</a>
        <button class="navbar-text bg-primary" onclick="UniApi.Login()">Log In</button>
        <button class="navbar-text bg-primary-subtle" onclick="UniApi.CreateAccount()">Create Account</button>
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