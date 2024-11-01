const { exec } = require("child_process");
require('dotenv').config();


function convertToPDF(filename, destination) {
    return new Promise(function (resolve, reject) {
        let libreOfficeCommand;
    
        // Detect platform
        if (process.platform === 'win32') {
            libreOfficeCommand = process.env.LIBREOFFICE_EXE || 'C:\\Program Files\\LibreOffice\\program\\soffice.exe';
        } else if (process.platform === 'linux') {
            libreOfficeCommand = process.env.LIBREOFFICE_EXE || '/usr/bin/libreoffice';
        } else {
            return reject(new Error("Unsupported platform. Only Windows and Linux are supported."));
        }
    
        // Check if executable exists
        if (!libreOfficeCommand) {
            return reject(new Error("LibreOffice not found."));
        }
    
        if (filename !== undefined && destination !== undefined) {
            console.log("Converting: ", { in: filename, out: destination });
    
            // Construct the command for LibreOffice
            const convertCommand = `${libreOfficeCommand} --headless --convert-to pdf --outdir "${destination}" "${filename}"`;
    
            
            exec(convertCommand, (error, stdout, stderr) => {
                if (error) {
                    return reject(new Error(`Error executing LibreOffice: ${error.message}`));
                }
    
                if (stderr) {
                    return reject(new Error(`LibreOffice stderr: ${stderr}`));
                }
    
                console.log("stdout:", stdout);
                resolve();
            });
        } else {
            reject(new Error("Filename or destination not provided."));
        }
    });
}

exports.convertToPDF = convertToPDF;