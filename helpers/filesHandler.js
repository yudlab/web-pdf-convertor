/* Todo - Improvement:
Gather all path of PDFs and send all of them as an array to convertPDF function
 instead of looping for each uploaded files and converting them individually

soffice --headless --convert-to pdf --outdir /path/to/output file1.docx file2.docx file3.docx

*/





const fs = require("fs");
const fs_promises = require('fs').promises;
require('dotenv').config()
const { zipper, unzipper } = require("./zipper");
const { convertToPDF } = require("./convertor");
const path = require('path');
const { PDFDocument } = require('pdf-lib');
const { pathSeparator,
        generateFileName,
        getIPAddress,
        getFileWithoutExt
      } = require('./functions');

const config = {
  server_address: `http://${getIPAddress()}:3000`,
  pdfDestination: pathSeparator(process.cwd() + "/storage/uploads/PDFs/temp"),
  fileDestination: pathSeparator(process.cwd() + "/public/document")
};

console.info("Serving web service at: ", config.server_address);

(async () => {
  console.log("Cleaning old files...");
  await fs_promises.rm(config.fileDestination, { recursive: true, force: true });
  await fs_promises.mkdir(config.fileDestination, { recursive: true });
})()

async function createFolderIfNotExist(folderPath) {
  console.log("createFolderIfNotExist: ", folderPath)
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

async function recursiveConvert(unconvertedPath, convertedPath) {
  console.log("recursiveConvert: ", { unconvertedPath, convertedPath })
  return new Promise(async function (resolve, reject) {
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
          // Deletes the original file.
          await fs_promises.unlink(filePathUnconverted);
          fileCount++;
        }
      }
      resolve(fileCount);
    } catch (error) {
      reject(error);
    }
  });
}

async function mergePDFs(pdfPaths, outputPath) {
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

async function getAllFiles(dirPath, fileArray = []) {
  const entries = await fs_promises.readdir(dirPath, { withFileTypes: true });
  
  for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
          // Recursively get files in subdirectory
          await getAllFiles(fullPath, fileArray);
      } else if (entry.isFile()) {
          console.log("PUSHED 4 merge:", fullPath);
          fileArray.push(fullPath); // Push file path to array
      }
  }
  return fileArray;
}

exports.filesHandler = function (req) {
  let files = req.files;
  const mergeFiles = req.body.mergeFiles === 'on'; // Check if merging is requested

  return new Promise(async (resolve, reject) => {
    let resp = {
      linkToFile: "",
      nb_files: 0,
    };

    if (typeof files !== "object" || files.length === 0) {
      resp.error = true;
      resp.error_message = "An error occurred. (files)";
      reject(resp);
    } else {

      await createFolderIfNotExist(config.pdfDestination);
      await createFolderIfNotExist(config.fileDestination);

      const pdfPaths = []; // Array to store paths of the converted PDF
      // collect the paths only when merging?

      //Recursively convert and saves the PDFs to temp folder.
      for (let i = 0; i < files.length; i++) {
        let currentFile = files[i];
        let fullPath = pathSeparator(process.cwd() + "/storage/uploads/" + currentFile.filename);

        if (currentFile.mimetype === "application/x-zip-compressed") {
          // Unzip and convert
          let zipFolder = pathSeparator(config.pdfDestination + "/" + getFileWithoutExt(currentFile.filename));
          let folderNameUnconverted = pathSeparator(zipFolder + "_unconverted");
          await createFolderIfNotExist(folderNameUnconverted);
          await createFolderIfNotExist(zipFolder);
          await unzipper(fullPath, folderNameUnconverted);
          let fileCount = await recursiveConvert(folderNameUnconverted, zipFolder);

          await fs_promises.unlink(fullPath);
          await fs_promises.rm(folderNameUnconverted, { recursive: true, force: true });
          resp.nb_files += fileCount;
      
          if(mergeFiles){
            // Collect all file paths recursively from zipFolder, skipping directories
            pdfPaths.push(...await getAllFiles(zipFolder));
          }
        } else if (currentFile.mimetype === "application/pdf" && mergeFiles) {
          // Handles PDF if merging
          pdfPaths.push(fullPath);
        } else { // Not a ZIP
          try {
            resp.status = await convertToPDF(fullPath, config.pdfDestination);
            // Deletes the original file.
            await fs_promises.unlink(fullPath);
            resp.nb_files += 1;
            if(mergeFiles){
              // Collect paths for merging
              pdfPaths.push(pathSeparator(config.pdfDestination + '/' + getFileWithoutExt(currentFile.filename) + '.pdf'));
            }
          } catch (error) {
            resp.error = true;
            resp.error_message = "An error occurred: " + error;
            reject(error);
          }
        }
      }

      // Move from temp folder to public folder
      if (!mergeFiles && resp.nb_files > 1) {
        console.log("init 1")
        // If processing ZIPS
        let zipName = generateFileName() + ".zip";
        let fullZipFilename = pathSeparator(config.fileDestination + "/" + zipName);
        // ZIP everything for more than 2 files
        await zipper(config.pdfDestination, fullZipFilename);
        resp.linkToFile = pathSeparator(config.server_address + "/document/" + zipName);
        resolve(resp);
      } else if (resp.nb_files === 1 && files[0].mimetype !== "application/x-zip-compressed") {
        console.log("init 2")
        // move the file to public
        let pdfName = pathSeparator(config.pdfDestination + `/${getFileWithoutExt(files[0].filename)}.pdf`);
        let pdfOut = pathSeparator(config.fileDestination + `/${getFileWithoutExt(files[0].filename)}.pdf`);
        await fs.promises.rename(pdfName, pdfOut);
        resp.linkToFile = pathSeparator(config.server_address + `/document/${getFileWithoutExt(files[0].filename)}.pdf`);
        resolve(resp);
      } else if (mergeFiles) {
        console.log("init 3")
        if (pdfPaths.length > 0) {
          let mergedPDFFilename = `${generateFileName()}-merged.pdf`;
          const mergedPDFPath = pathSeparator(config.fileDestination + '/' + mergedPDFFilename);
          await mergePDFs(pdfPaths, mergedPDFPath); // Call the merge function
          resp.linkToFile = pathSeparator(config.server_address + `/document/${mergedPDFFilename}`); // Update link for merged PDF
          resolve(resp);
        } else {
          reject("Error")
        }
      }

      
      // Deletes all temp files
      await fs_promises.rm(config.pdfDestination, { recursive: true, force: true });
    }
  });
};

exports.createFolderIfNotExist = createFolderIfNotExist;