"server-only";

import { PutObjectCommand, S3Client, CopyObjectCommand, DeleteObjectCommand, S3ServiceException, GetObjectCommand, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { waitUntil } from "@vercel/functions";

const s3Client = new S3Client({
  region: "auto", // See: https://developers.cloudflare.com/r2/api/s3/api/#bucket-region
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY as string,
  },
});

export const getUploadSignedUrl = async ({
  userId,
  fileType,
  fileSize,
  isTemp = true,
  expiresIn = 60 * 5,
  metadata,
}: {
  userId: string;
  fileType: string;
  fileSize: number;
  isTemp?: boolean;
  expiresIn?: number;
  metadata?: Record<string, string>;
}) => {
  // 20MB - Chatgpt image upload limit.
  // TODO: Make this take into account the file type.
  if (fileSize > 20 * 1024 * 1024) {
    throw new Error("File size is too large");
  }

  if (!fileType.startsWith("image/") && !fileType.startsWith("application/pdf")) {
    throw new Error("File type is not an image or pdf");
  }

  const fileId = crypto.randomUUID();

  const objectKey = `${isTemp ? "temp/" : ""}${userId}/${fileId}`;

  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: objectKey,
    ContentType: fileType,
    ContentLength: fileSize,
    Metadata: metadata,
  });

  const imageUrl = `${process.env.S3_ENDPOINT}/${process.env.S3_BUCKET_NAME}/${objectKey}`;

  const presignedUrl = await getSignedUrl(s3Client, command, {
    expiresIn,
  });

  return {
    imageUrl,
    presignedUrl,
    fileKey: fileId,
  };
};

export const moveTempFileToPermanent = async (fileKey: string, userId: string) => {
  const bucket = process.env.S3_BUCKET_NAME as string;
  const basePath = `${process.env.S3_ENDPOINT}/${bucket}`;

  const objectKey = `${userId}/${fileKey}`;

  // Copy the object to the new location
  await s3Client.send(
    new CopyObjectCommand({
      Bucket: bucket,
      CopySource: `/${bucket}/temp/${objectKey}`,
      Key: objectKey,
    })
  );

  try {
    // Try to delete the temp file, but don't fail if it's already gone
    waitUntil(s3Client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: `temp/${objectKey}`,
      })
    ));
  } catch (error) {
    if (error instanceof S3ServiceException && error.name === 'NoSuchKey') {
      // File was already deleted by lifecycle rule, that's fine
      console.log('Temp file already deleted:', `temp/${objectKey}`);
    } else {
      // Log other errors but don't fail the operation
      console.error('Failed to delete temp file:', error);
    }
  }

  return { imageUrl: `${basePath}/${objectKey}`, key: objectKey };
};

export const getDownloadSignedUrl = async (objectKey: string, expiresIn = 60, filename?: string) => {
  // Extract filename from objectKey if not provided
  const defaultFilename = objectKey.split('/').pop() || "file";
  const finalFilename = filename || defaultFilename;

  // Generate signed URL with Content-Disposition for download
  const command = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: objectKey,
    ResponseContentDisposition: `attachment; filename="${finalFilename}"`,
  });

  const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });

  return { signedUrl, expiresAt: new Date(Date.now() + expiresIn * 1000) };
}

export const deleteObjectsFromS3 = async (keys: string[]) => {
  try {
    await s3Client.send(
      new DeleteObjectsCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Delete: {
          Objects: keys.map((k) => ({ Key: k })),
        },
      }),
    );
  } catch (caught) {
    if (
      caught instanceof S3ServiceException &&
      caught.name === "NoSuchBucket"
    ) {
      console.error(
        `Error from S3 while deleting objects from ${process.env.S3_BUCKET_NAME}. The bucket doesn't exist.`,
      );
    } else if (caught instanceof S3ServiceException) {
      console.error(
        `Error from S3 while deleting objects from ${process.env.S3_BUCKET_NAME}.  ${caught.name}: ${caught.message}`,
      );
    } else {
      throw caught;
    }
  }
};