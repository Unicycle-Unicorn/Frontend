const Image = require("@11ty/eleventy-img");

module.exports = async function(name, alt, classes = null, height = null) {
    let class_string = classes ? `class = "${classes}"` : "";

    let height_string = height ? `height="${height}"` : "";

    let src = `assets/img/${name}`;

    let metadata = await Image(src, {
        widths: [120, 576, 768, 992, 1200, 1440],
        formats: ["webp"],
        outputDir: "www/assets/img/",
        urlPath: "/img/"
    });

    let imgsrc = `/assets${metadata.webp[0].url}`;
    let sources = []

    metadata.webp.forEach((img) => {
        sources.push(`/assets${img.srcset}`);
    });

    //  style=""

    let style = `background-image: url('${imgsrc}'); background-size: 100% 100%;`;

    return `<img alt="${alt}" loading="lazy" src="${imgsrc}" srcset="${sources.join(', ')}" sizes="100vw" ${class_string} ${height_string} style="${style}">`
};