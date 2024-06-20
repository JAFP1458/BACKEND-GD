require('dotenv').config();
const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const mimeTypes = require('mime-types');
const fs = require('fs');
const { AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_BUCKET_NAME } = process.env;

const s3Client = new S3Client({
  region: 'us-east-2',
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY
  }
});

const getETagFromURL = async (documentUrl) => {
  const bucketName = documentUrl.split('.com/')[1].split('/')[0];
  const objectKey = decodeURIComponent(documentUrl.split('.com/')[1].split('/').slice(1).join('/'));

  const params = {
    Bucket: bucketName,
    Key: objectKey,
  };

  try {
    const command = new GetObjectCommand(params);
    const data = await s3Client.send(command);
    return data.ETag;
  } catch (err) {
    console.error('Error retrieving ETag:', err);
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
    const command = new PutObjectCommand(params);
    const result = await s3Client.send(command);
    return `https://${AWS_BUCKET_NAME}.s3.amazonaws.com/${fileName}`;
  } catch (error) {
    console.error('Error uploading document to S3:', error);
    throw error;
  }
}

async function downloadDocumentFromS3(fileUrl) {
  try {
    const key = decodeURIComponent(fileUrl.split('/').slice(3).join('/'));

    const params = {
      Bucket: AWS_BUCKET_NAME,
      Key: key,
    };

    const command = new GetObjectCommand(params);
    const data = await s3Client.send(command);

    const chunks = [];
    for await (const chunk of data.Body) {
      chunks.push(chunk);
    }

    const fileBuffer = Buffer.concat(chunks);
    const contentType = data.ContentType || mimeTypes.lookup(key.split('/').pop()) || 'application/octet-stream';

    return {
      data: fileBuffer,
      contentType,
    };
  } catch (error) {
    if (error.name === 'NoSuchKey') {
      throw new Error('File not found');
    } else {
      console.error(error);
      throw new Error('Error downloading file from S3');
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

    const command = new DeleteObjectCommand(params);
    const result = await s3Client.send(command);
    console.log('Document deleted from S3:', result);
    return true;
  } catch (error) {
    if (error.name === 'NoSuchKey') {
      return { error: 'File not found' };
    } else {
      console.error('Error deleting document from S3:', error);
      throw new Error('Failed deletion');
    }
  }
}

module.exports = {
  uploadDocumentToS3,
  downloadDocumentFromS3,
  deleteDocumentFromS3
};
