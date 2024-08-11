const shortcodes = require("./src/_includes/components/shortcode.js");

module.exports = function(eleventyConfig) {
    for (let shortcodesKey in shortcodes) {
        eleventyConfig.addShortcode(shortcodesKey, shortcodes[shortcodesKey]);
    }

    //eleventyConfig.addPassthroughCopy({"js/*.js": "assets/js" });

    eleventyConfig.setServerPassthroughCopyBehavior("passthrough");

    eleventyConfig.setServerOptions({
        https: {
            key: "./certs/ui.unicycleunicorn.net-key.pem",
            cert: "./certs/ui.unicycleunicorn.net.pem",
        },

        port: 443
    });

    console.log("https://ui.unicycleunicorn.net");

    return {
        dir: {
            input: "src",
            output: "www",
            includes: "_includes",
            layouts: "_layouts"
        }
    }
};