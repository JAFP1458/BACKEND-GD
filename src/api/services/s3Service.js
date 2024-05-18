require('dotenv').config();
const AWS = require('aws-sdk');
const mimeTypes = require('mime-types');
const fs = require('fs');
const { AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_BUCKET_NAME } = process.env;

AWS.config.update({
  accessKeyId: AWS_ACCESS_KEY_ID,
  secretAccessKey: AWS_SECRET_ACCESS_KEY,
  region: 'us-east-2'
});

const s3 = new AWS.S3();

const getETagFromURL = async (documentUrl) => {
  const bucketName = documentUrl.split('.com/')[1].split('/')[0];
  const objectKey = documentUrl.split(`${bucketName}/`)[1];

  const params = {
    Bucket: bucketName,
    Key: objectKey
  };

  try {
    const data = await s3.headObject(params).promise();
    return data.ETag;
  } catch (err) {
    console.error('Error al obtener el ETag:', err);
    throw err;
  }
};

async function uploadDocumentToS3(fileName, fileContent) {
  const params = {
    Bucket: AWS_BUCKET_NAME,
    Key: fileName,
    Body: fileContent
  };

  try {
    const result = await s3.upload(params).promise();
    return result.Location;
  } catch (error) {
    console.error('Error al subir el documento a S3:', error);
    throw error; // Re-lanzar para que el que llama lo maneje
  }
}

async function downloadDocumentFromS3(fileUrl) {
  try {
    const bucketName = fileUrl.split('/')[3]; // Obtener el nombre del bucket de la URL
    const key = decodeURIComponent(fileUrl.split('/').slice(3).join('/')); // Obtener la clave (ruta del objeto) de la URL y decodificar los caracteres especiales

    const params = {
      Bucket: AWS_BUCKET_NAME,
      Key: key,
    };

    const data = await s3.getObject(params).promise();
    const contentType = data.ContentType || mimeTypes.lookup(key.split('/').pop()) || 'application/octet-stream';

    return {
      data: data.Body,
      contentType,
    };
  } catch (error) {
    if (error.code === 'NoSuchKey') {
      throw new Error('Archivo no encontrado');
    } else {
      console.error(error);
      throw new Error('Error al descargar el archivo de S3');
    }
  }
}

async function deleteDocumentFromS3(url) {
  try {

    const fileName = url.split('/').pop();
    const params = {
      Bucket: AWS_BUCKET_NAME,
      Key: fileName,

    };

    const result = await s3.deleteObject(params).promise();
    console.log('Documento eliminado de S3:', result);
    return true;
  } catch (error) {
    if (error.code === 'NoSuchKey') {
      return { error: 'Archivo no encontrado' }; // Objeto de error informativo
    } else {
      console.error('Error al eliminar el documento de S3:', error);
      throw new Error('Eliminación fallida'); // Error más específico
    }
  }
}

module.exports = {
  uploadDocumentToS3,
  downloadDocumentFromS3,
  deleteDocumentFromS3
};