const B2 = require('backblaze-b2');
const fs = require('fs');

const b2 = new B2({
  applicationKeyId: process.env.B2_KEY_ID,
  applicationKey: process.env.B2_APP_KEY,
});

let authorized = false;

async function authorize() {
  if (!authorized) {
    await b2.authorize();
    authorized = true;
  }
}

async function uploadFile(filePath, fileName, contentType) {
  await authorize();
  const buffer = fs.readFileSync(filePath);
  const { data: uploadUrl } = await b2.getUploadUrl(process.env.B2_BUCKET_ID);
  const { data } = await b2.uploadFile({
    uploadUrl: uploadUrl.uploadUrl,
    uploadAuthToken: uploadUrl.authorizationToken,
    fileName,
    data: buffer,
    mime: contentType,
  });
  return { fileId: data.fileId, fileName: data.fileName };
}

async function getDownloadUrl(fileName) {
  await authorize();
  const auth = await b2.getDownloadAuthorization({
    bucketId: process.env.B2_BUCKET_ID,
    fileNamePrefix: fileName,
    validDurationInSeconds: 300,
  });
  return `${b2.downloadUrl}/file/${process.env.B2_BUCKET_NAME}/${fileName}?Authorization=${auth.data.authorizationToken}`;
}

async function deleteFile(fileName, fileId) {
  await authorize();
  await b2.deleteFileVersion({ fileId, fileName });
}

module.exports = { uploadFile, getDownloadUrl, deleteFile, authorize };
