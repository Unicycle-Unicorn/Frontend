const hostile = require('hostile');

console.log(process.argv);

const localHost = "127.0.0.1";

function getSubDomain(subDomain) {
    return `${subDomain}.unicycleunicorn.net`;
}

function AddEntry(subDomain) {
    let domain = getSubDomain(subDomain);
    hostile.set(localHost, domain, (err) => {
        if (err) {
            console.log(err);
        } else {
            console.log(`Host added successfully: ${domain}`);
        }
    });
}

function RemoveEntry(subDomain) {
    let domain = getSubDomain(subDomain);
    hostile.remove(localHost, domain, (err) => {
        if (err) {
            console.log(err);
        } else {
            console.log(`Host added successfully: ${domain}`);
        }
    });
}


if (process.argv[2] == "add") {
    AddEntry("ui");
} else {
    RemoveEntry("ui");
}