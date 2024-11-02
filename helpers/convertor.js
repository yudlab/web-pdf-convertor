const { exec } = require("child_process");
require('dotenv').config();


function convertToPDF(filenames, destination) {
    return new Promise((resolve, reject) => {
        if (!process.env.LIBREOFFICE_EXE) {
            return reject(new Error("LibreOffice not found."));
        }

        // Normalize the filenames input into an array
        const files = Array.isArray(filenames) ? filenames : [filenames];

        // Prepare command line arguments
        const inputFiles = files.map(file => `"${file}"`).join(' ');
        const command = `${process.env.LIBREOFFICE_EXE} --headless --convert-to pdf --outdir "${destination}" ${inputFiles}`;

        console.log("Converting: ", { files: inputFiles, out: destination });

        exec(command, (error, stdout, stderr) => {
            if (error) {
                return reject(error);
            }
            if (stderr) {
                return reject(stderr);
            }
            resolve(stdout);
        });
    });
}

exports.convertToPDF = convertToPDF;