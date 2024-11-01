const fs = require("fs");
const fs_promises = require('fs').promises;
require('dotenv').config();
const { zipper, unzipper } = require("./zipper");
const { convertToPDF } = require("./convertor");
const path = require('path');
const { PDFDocument } = require('pdf-lib');
const os = require("os");

function getIPAddress() {
  const interfaces = os.networkInterfaces();
  for (const devName in interfaces) {
    const iface = interfaces[devName];
    for (const alias of iface) {
      if (alias.family === "IPv4" && alias.address !== "127.0.0.1" && !alias.internal) {
        return alias.address;
      }
    }
  }
  return "localhost";
}

const config = {
  server_address: `http://${getIPAddress()}:3000`,
};

console.info("Serving web service at: ", config.server_address);

const pathSeparator = (filePath) => filePath.replace(/\\/g, `/`);

async function createFolderIfNotExist(folderPath) {
  try {
    const stats = await fs_promises.stat(folderPath);
    if (!stats.isDirectory()) {
      throw new Error(`${folderPath} exists, but is not a directory.`);
    }
  } catch (error) {
    if (error.code === 'ENOENT') {
      await fs_promises.mkdir(folderPath, { recursive: true });
    } else {
      throw error;
    }
  }
}

const getFileWithoutExt = (str) => str.replace(/\.[^/.]+$/, "");

const generateFileName = () => {
  const today = new Date();
  const pad = (num) => (num < 10 ? `0${num}` : num);

  return `${pad(today.getDate())}-${pad(today.getMonth() + 1)}-${today.getFullYear()}--${pad(today.getHours())}-${pad(today.getMinutes())}-${pad(today.getSeconds())}-${today.getMilliseconds()}`;
};

async function recursiveConvert(unconvertedPath, convertedPath) {
  let fileCount = 0;
  const files = await fs_promises.readdir(unconvertedPath);

  for (const file of files) {
    const filePathUnconverted = path.join(unconvertedPath, file);
    const stat = await fs_promises.stat(filePathUnconverted);

    if (stat.isDirectory()) {
      const newDirConverted = path.join(convertedPath, file);
      await createFolderIfNotExist(newDirConverted);
      const count = await recursiveConvert(filePathUnconverted, newDirConverted);
      fileCount += count;
    } else {
      await convertToPDF(filePathUnconverted, convertedPath);
      fs.unlinkSync(filePathUnconverted); // delete original file
      fileCount++;
    }
  }

  return fileCount;
}

async function mergePDFs(pdfPaths, outputPath) {
  const mergedPdf = await PDFDocument.create();

  for (const pdfPath of pdfPaths) {
    const existingPdfBytes = await fs_promises.readFile(pdfPath);
    const pdf = await PDFDocument.load(existingPdfBytes);
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }

  const pdfBytes = await mergedPdf.save();
  await fs_promises.writeFile(outputPath, pdfBytes);
}

exports.filesHandler = async function (req) {
  const files = req.files;
  const mergeFiles = req.body.mergeFiles === 'on'; // Check if merging is requested
  const pdfPaths = [];
  const resp = {
    linkToFile: "",
    nb_files: 0,
    error: false,
    error_message: ""
  };

  if (!files || files.length === 0) {
    resp.error = true;
    resp.error_message = "An error occurred. (files)";
    return Promise.reject(resp);
  }

  const pdf_temp_PATH = pathSeparator(path.join(process.cwd(), "/storage/uploads/PDFs/temp"));
  const public_PATH = pathSeparator(path.join(process.cwd(), "/public/document"));

  try {
    await createFolderIfNotExist(pdf_temp_PATH);
    await createFolderIfNotExist(public_PATH);

    // Recursively convert and save PDFs to public folder.
    for (const file of files) {
      const fullPath = pathSeparator(path.join(process.cwd(), "/storage/uploads", file.filename));

      if (file.mimetype === "application/x-zip-compressed") {
        // Handle ZIP file
        const zipFolder = path.join(pdf_temp_PATH, getFileWithoutExt(file.filename));
        const folderNameUnconverted = `${zipFolder}_unconverted`;

        await createFolderIfNotExist(folderNameUnconverted);
        await createFolderIfNotExist(zipFolder);
        await unzipper(fullPath, folderNameUnconverted);

        const fileCount = await recursiveConvert(folderNameUnconverted, zipFolder);
        fs.rmSync(folderNameUnconverted, { recursive: true, force: true });
        fs.unlinkSync(fullPath);

        resp.nb_files += fileCount;

        const listOfFiles = await fs_promises.readdir(zipFolder);
        listOfFiles.forEach((file) => pdfPaths.push(path.join(zipFolder, file)));

      } else {
        // Handle individual file (non-ZIP)
        await convertToPDF(fullPath, pdf_temp_PATH);
        fs.unlinkSync(fullPath);

        resp.nb_files += 1;
        const filename = path.join(pdf_temp_PATH, `${getFileWithoutExt(file.filename)}.pdf`);
        pdfPaths.push(pathSeparator(filename));
      }
    }

    if (files.length > 1 && !mergeFiles) {
      // ZIP everything for more than 2 files
      const zipName = `${generateFileName()}.zip`;
      const fullZipFilename = pathSeparator(path.join(public_PATH, zipName));

      await zipper(pdf_temp_PATH, fullZipFilename);
      resp.linkToFile = pathSeparator(`${config.server_address}/document/${zipName}`);
    } else if (files.length === 1 && files[0].mimetype !== "application/x-zip-compressed") {
      // Move the single file to public
      const pdfFileName = getFileWithoutExt(files[0].filename);
      const pdfName = path.join(pdf_temp_PATH, `${pdfFileName}.pdf`);
      const pdfOut = path.join(public_PATH, `${pdfFileName}.pdf`);

      await fs.promises.rename(pdfName, pdfOut);
      resp.linkToFile = pathSeparator(`${config.server_address}/document/${pdfFileName}.pdf`);
    } else if (mergeFiles && pdfPaths.length > 0) {
      // Merge PDF files
      const mergedPDFFilename = `${generateFileName()}-merged.pdf`;
      const mergedPDFPath = path.join(public_PATH, mergedPDFFilename);

      await mergePDFs(pdfPaths, mergedPDFPath);
      resp.linkToFile = pathSeparator(`${config.server_address}/document/${mergedPDFFilename}`);
    }

    fs.rmSync(pdf_temp_PATH, { recursive: true, force: true });
    return Promise.resolve(resp);

  } catch (error) {
    console.error("Error in file handling:", error);
    resp.error = true;
    resp.error_message = `An error occurred: ${error.message}`;
    return Promise.reject(resp);
  }
};

exports.createFolderIfNotExist = createFolderIfNotExist;
