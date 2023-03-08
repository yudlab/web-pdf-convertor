const { exec } = require("child_process");
require('dotenv').config();


function convertToPDF(filename, destination) {
    return new Promise(function (resolve, reject) {
        console.log("Exec: ", `${process.env.LIBREOFFICE_EXE} --headless --convert-to pdf --outdir "${destination}" "${filename}"`)
        if(filename !== "undefined" && destination !== "undefined") {
            exec(`${process.env.LIBREOFFICE_EXE} --headless --convert-to pdf --outdir "${destination}" "${filename}"`, (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                    return;
                }
    
                if (stderr) {
                    reject(stderr);
                    return;
                }
    
                resolve(stdout);
            });
        } else {
            reject();
        }
    });
}

exports.convertToPDF = convertToPDF;