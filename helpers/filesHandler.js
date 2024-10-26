
const fs = require("fs");
const fs_promises = require('fs').promises;
require('dotenv').config()
const { zipper, unzipper } = require("./zipper");
const { convertToPDF } = require("./convertor");
const path = require('path');
const { PDFDocument } = require('pdf-lib');

function getIPAddress() {
  var interfaces = require("os").networkInterfaces();
  for (var devName in interfaces) {
    var iface = interfaces[devName];

    for (var i = 0; i < iface.length; i++) {
      var alias = iface[i];
      if (
        alias.family === "IPv4" &&
        alias.address !== "127.0.0.1" &&
        !alias.internal
      )
        return alias.address;
    }
  }
  return "0.0.0.0";
}

const config = {
  server_address: `http://${getIPAddress()}:3000`,
};

console.info("Serving web service at: ", config.server_address);

const pathSeparator = (path) => {
  return path.replace(/\\/g, `/`);
};

async function createFolderIfNotExist(folderPath) {
  return new Promise(async (resolve, reject) => {
    try {
      const stats = await fs_promises.stat(folderPath);
      if (stats.isDirectory()) {
        resolve();
      } else {
        throw new Error(`${folderPath} exists, but is not a directory.`);
      }
    } catch (error) {
      if (error.code === 'ENOENT') {
        try {
          await fs_promises.mkdir(folderPath, { recursive: true });
          resolve();
        } catch (error) {
          reject(error);
        }
      } else {
        reject(error);
      }
    }
  });
}

const getFileWithoutExt = (str) => {
  return str.replace(/\.[^/.]+$/, "");
}

const getZipName = () => {
  const today = new Date();
  var dd = today.getDate();
  var mo = today.getMonth() + 1; //January is 0!
  var yyyy = today.getFullYear();
  var hh = today.getHours();
  var mm = today.getMinutes();
  var ss = today.getSeconds();
  var ms = today.getMilliseconds();

  return `${dd < 9 ? `0` + dd : dd}-${mo < 9 ? `0` + mo : mo}-${yyyy}--${hh < 9 ? `0` + hh : hh}-${mm < 9 ? `0` + mm : mm}-${ss < 9 ? `0` + ss : ss}-${ms < 9 ? `0` + ms : ms}.zip`;
};

async function recursiveConvert(unconvertedPath, convertedPath) {
  return new Promise(async function(resolve, reject) {
    try {
      let fileCount = 0;
      const files = await fs_promises.readdir(unconvertedPath);
      for (const file of files) {
        const filePathUnconverted = path.join(unconvertedPath, file);
        const stat = await fs_promises.stat(filePathUnconverted);
        if (stat.isDirectory()) {
          let newDirConverted = path.join(convertedPath, file);
          await createFolderIfNotExist(newDirConverted);
          let thisCount = await recursiveConvert(filePathUnconverted, newDirConverted, fileCount);
          fileCount = fileCount + thisCount;
        } else {
          await convertToPDF(filePathUnconverted, convertedPath);
          fs.unlinkSync(filePathUnconverted); //deletes the file.
          fileCount++;
        }
      }
      return resolve(fileCount);
    } catch (error) {
      reject(error);
    }
  });
}

async function mergePDFs(pdfPaths, outputPath) {
  console.log("PDF PATHS:");
  console.log(pdfPaths);

  console.log("Output PATHS:");
  console.log(outputPath);

  const mergedPdf = await PDFDocument.create();
  for (const pdfPath of pdfPaths) {
      const existingPdfBytes = await fs.promises.readFile(pdfPath);
      const pdf = await PDFDocument.load(existingPdfBytes);
      const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      copiedPages.forEach((page) => mergedPdf.addPage(page));
  }
  const pdfBytes = await mergedPdf.save();
  await fs.promises.writeFile(outputPath, pdfBytes);
}

exports.filesHandler = function (req) {
  let files = req.files;
  const mergeFiles = req.body.mergeFiles === 'on'; // Check if merging is requested

  return new Promise(async (resolve, reject) => {
    let resp = {
      linkToZIP: "",
      nb_files: 0,
    };

    if (typeof files !== "object" || files.length === 0) {
      resp.error = true;
      resp.error_message = "An error occurred. (files)";
      return reject(resp);
    } else {
      let pdfDestination = pathSeparator(
        process.cwd() + "/storage/uploads/PDFs/temp"
      );

      await createFolderIfNotExist(pdfDestination);

      let zipDestination = pathSeparator(process.cwd() + "/public/zip");
      let zipName = getZipName();
      let fullZipFilename = pathSeparator(zipDestination + "/" + zipName);

      // If merging PDFs
      if (mergeFiles) {
        const pdfPaths = []; // Array to store paths of the PDFs to merge

        for (let i = 0; i < files.length; i++) {
          let currentFile = files[i];
          let fullPath = pathSeparator(process.cwd() + "/storage/uploads/" + currentFile.filename);

          if (currentFile.mimetype === "application/x-zip-compressed") {
            // Unzip to folder using zip name as folder name
            let zipFolder = pdfDestination + "/" + getFileWithoutExt(currentFile.filename);
            let folderNameUnconverted = zipFolder + "_unconverted";
            await createFolderIfNotExist(folderNameUnconverted);
            await createFolderIfNotExist(zipFolder);
            await unzipper(fullPath, folderNameUnconverted);
            let fileCount = await recursiveConvert(folderNameUnconverted, zipFolder);
            fs.rmSync(folderNameUnconverted, { recursive: true, force: true });
            fs.unlinkSync(fullPath); // Deletes the file.
            resp.nb_files += fileCount;

            // Collect paths for merging
            pdfPaths.push(...fs.readdirSync(zipFolder).map(file => pathSeparator(zipFolder, file)));
          } else {
            try {
              resp.status = await convertToPDF(fullPath, pdfDestination);
              fs.unlinkSync(fullPath); // Deletes the file.
              resp.nb_files += 1;

              // Collect paths for merging
              pdfPaths.push(pathSeparator(pdfDestination, `${getFileWithoutExt(currentFile.filename)}.pdf`));
            } catch (error) {
              resp.error = true;
              resp.error_message = "An error occurred: " + error;
              return reject(error);
            }
          }
        }

        // Merge PDFs if there are any to merge
        if (pdfPaths.length > 0) {
          const mergedPDFPath = pathSeparator(pdfDestination + '/merged.pdf');
          await mergePDFs(pdfPaths, mergedPDFPath); // Call the merge function
          resp.linkToZIP = pathSeparator(config.server_address + `/pdfs/merged.pdf`); // Update link for merged PDF
        }

        fs.rmSync(pdfDestination, { recursive: true, force: true });
        resolve(resp);
        return;
      }

      // Existing logic if not merging
      for (let i = 0; i < files.length; i++) {
        let currentFile = files[i];
        let fullPath = pathSeparator(process.cwd() + "/storage/uploads/" + currentFile.filename);

        try {
          resp.status = await convertToPDF(fullPath, pdfDestination);
          fs.unlinkSync(fullPath); // Deletes the file.
          resp.nb_files += 1;
        } catch (error) {
          resp.error = true;
          resp.error_message = "An error occurred: " + error;
          return reject(error);
        }

        if (files.length === 1) {
          let pdfName = pdfDestination + `/${getFileWithoutExt(files[0].filename)}.pdf`;
          let pdfOut = zipDestination + `/${getFileWithoutExt(files[0].filename)}.pdf`;
          console.log("1 file, PDF is: " + pdfName);
          console.log("Out is: " + pdfOut);
          await fs.promises.rename(pdfName, pdfOut);
          resp.linkToZIP = pathSeparator(config.server_address + `/zip/${getFileWithoutExt(files[0].filename)}.pdf`);
          fs.rmSync(pdfDestination, { recursive: true, force: true });
          resolve(resp);
          return;
        }
      }

      await zipper(pdfDestination, fullZipFilename);
      resp.linkToZIP = pathSeparator(config.server_address + "/zip/" + zipName);
      fs.rmSync(pdfDestination, { recursive: true, force: true });
    }
    resolve(resp);
  });
};

exports.createFolderIfNotExist = createFolderIfNotExist;