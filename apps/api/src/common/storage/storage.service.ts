import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class StorageService {
  private readonly s3: AWS.S3;
  private readonly bucket: string;
  private readonly logger = new Logger(StorageService.name);

  constructor(private readonly config: ConfigService) {
    this.bucket = config.get<string>('aws.s3Bucket', 'career-gap-ai-uploads');

    const awsConfig: AWS.S3.ClientConfiguration = {
      accessKeyId: config.get('aws.accessKeyId'),
      secretAccessKey: config.get('aws.secretAccessKey'),
      region: config.get('aws.region', 'us-east-1'),
    };

    // Support local S3-compatible storage (e.g. MinIO)
    const endpoint = config.get('aws.s3Endpoint');
    if (endpoint) {
      awsConfig.endpoint = endpoint;
      awsConfig.s3ForcePathStyle = true;
    }

    this.s3 = new AWS.S3(awsConfig);
  }

  async uploadFile(
    file: Express.Multer.File,
    folder: string = 'uploads',
  ): Promise<{ url: string; key: string }> {
    const extension = file.originalname.split('.').pop();
    const key = `${folder}/${uuidv4()}.${extension}`;

    const params: AWS.S3.PutObjectRequest = {
      Bucket: this.bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      ContentDisposition: `attachment; filename="${file.originalname}"`,
    };

    try {
      await this.s3.upload(params).promise();
      const url = this.getPublicUrl(key);
      this.logger.log(`File uploaded: ${key}`);
      return { url, key };
    } catch (error) {
      this.logger.error(`File upload failed: ${error.message}`);
      throw error;
    }
  }

  async deleteFile(key: string): Promise<void> {
    try {
      await this.s3
        .deleteObject({
          Bucket: this.bucket,
          Key: key,
        })
        .promise();
      this.logger.log(`File deleted: ${key}`);
    } catch (error) {
      this.logger.error(`File deletion failed: ${error.message}`);
    }
  }

  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    return this.s3.getSignedUrl('getObject', {
      Bucket: this.bucket,
      Key: key,
      Expires: expiresIn,
    });
  }

  async getFileBuffer(key: string): Promise<Buffer> {
    const result = await this.s3
      .getObject({
        Bucket: this.bucket,
        Key: key,
      })
      .promise();

    return result.Body as Buffer;
  }

  private getPublicUrl(key: string): string {
    const endpoint = this.config.get('aws.s3Endpoint');
    if (endpoint) {
      return `${endpoint}/${this.bucket}/${key}`;
    }
    return `https://${this.bucket}.s3.${this.config.get('aws.region', 'us-east-1')}.amazonaws.com/${key}`;
  }
}
