/**
 * A Node.js client for AWS S3. Enables bucket and object management,
 * uploads/downloads (including multipart), and secure sharing via presigned URLs.
 *
 * @class
 * @label "AWS S3"
 * @icon https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/amazonaws.svg
 * @className AwsS3ApiClient
 * @npm_sdk @aws-sdk/client-s3
 * @npm_sdk @aws-sdk/s3-request-presigner
 * @npm_sdk @aws-sdk/s3-presigned-post
 */

const {
  S3Client,
  CreateBucketCommand,
  DeleteBucketCommand,
  ListBucketsCommand,
  HeadBucketCommand,
  PutBucketPolicyCommand,
  GetBucketPolicyCommand,
  DeleteBucketPolicyCommand,
  PutBucketCorsCommand,
  GetBucketCorsCommand,
  DeleteBucketCorsCommand,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  CopyObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  PutObjectAclCommand,
} = require("@aws-sdk/client-s3");

const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { createPresignedPost } = require("@aws-sdk/s3-presigned-post");
const { Readable } = require("stream");

/** ==============================
 *           ENUMS
 *  ============================== */
/**
 * Common AWS regions. This list is not exhaustive; supply any valid AWS region string if needed.
 */
const REGION_OPTIONS = [
  "us-east-1",
  "us-east-2",
  "us-west-1",
  "us-west-2",
  "af-south-1",
  "ap-east-1",
  "ap-south-1",
  "ap-south-2",
  "ap-southeast-1",
  "ap-southeast-2",
  "ap-southeast-3",
  "ap-southeast-4",
  "ap-northeast-1",
  "ap-northeast-2",
  "ap-northeast-3",
  "ca-central-1",
  "eu-central-1",
  "eu-central-2",
  "eu-west-1",
  "eu-west-2",
  "eu-west-3",
  "eu-south-1",
  "eu-south-2",
  "eu-north-1",
  "il-central-1",
  "me-central-1",
  "me-south-1",
  "sa-east-1",
];

/** Canned ACL options (subset of most used). */
const ACL_OPTIONS = [
  "private",
  "public-read",
  "public-read-write",
  "authenticated-read",
  "aws-exec-read",
  "bucket-owner-read",
  "bucket-owner-full-control",
];

/** S3 storage classes. */
const STORAGE_CLASS_OPTIONS = [
  "STANDARD",
  "INTELLIGENT_TIERING",
  "STANDARD_IA",
  "ONEZONE_IA",
  "GLACIER_IR",
  "GLACIER",
  "DEEP_ARCHIVE",
  "REDUCED_REDUNDANCY",
];

/** Checksums supported by S3 v3 client. */
const CHECKSUM_ALGORITHM_OPTIONS = ["CRC32", "CRC32C", "SHA1", "SHA256"];

/**
 * Helper: Convert a string/Buffer/Uint8Array/stream into a Node.js Readable stream for GetObject convenience.
 * @param {any} body
 * @returns {Readable}
 */
function toNodeStream(body) {
  if (!body) return Readable.from([]);
  if (typeof body.pipe === "function") return body; // already a stream
  return Readable.from(body);
}

class AwsS3ApiClient {
  /**
   * Construct the client with configuration; does not contact AWS until `_init()` is called.
   *
   * @constructor
   * @param {object} config Root configuration
   * @param {string} config.region AWS region to use
   * @enumRef REGION_OPTIONS
   * @param {string} [config.accessKeyId] AWS access key ID (omit to use default credential chain)
   * @param {string} [config.secretAccessKey] AWS secret access key
   * @param {string} [config.sessionToken] Optional session token for temporary creds
   * @param {boolean} [config.forcePathStyle=false] Use path-style URLs (useful for S3-compatible endpoints)
   * @param {string} [config.endpoint] Custom endpoint (for S3-compatible providers / local testing)
   * @param {object} [config.tuning] Client tuning options
   * @param {number} [config.tuning.maxAttempts=3] Retry attempts
   * @param {number} [config.tuning.requestTimeoutMs=300000] Per-request timeout in ms
   */
  constructor(config = {}) {
    this.config = {
      tuning: {},
      forcePathStyle: false,
      ...config,
    };

    this._client = null;
    this._initPromise = null;
    this.ready = false;
    this._closed = false;
  }

  /**
   * Internal: ensure the client is initialized.
   * @private
   */
  async _ensureReady() {
    if (this.ready) return;
    await this._init();
  }

  /**
   * Performs provider-specific startup (e.g., connect/auth/init).
   * Safe to call multiple times; no-ops after first success.
   * @function _init
   * @group Init
   * @label Initialize Client
   * @returns {Promise<{region:string, endpoint?:string, pathStyle:boolean}>} Resolves when the client is ready with brief connection info.
   */
  async _init() {
    if (this.ready) {
      return {
        region: this.config.region,
        endpoint: this.config.endpoint,
        pathStyle: !!this.config.forcePathStyle,
      };
    }
    if (this._initPromise) return this._initPromise;

    this._initPromise = (async () => {
      const {
        region,
        accessKeyId,
        secretAccessKey,
        sessionToken,
        forcePathStyle,
        endpoint,
        tuning,
      } = this.config;

      if (!region) {
        throw new Error("AwsS3ApiClient: `config.region` is required.");
      }

      const clientConfig = {
        region,
        forcePathStyle: !!forcePathStyle,
        maxAttempts: tuning?.maxAttempts ?? 3,
        requestHandler: undefined, // use default
      };

      if (endpoint) clientConfig.endpoint = endpoint;
      if (accessKeyId && secretAccessKey) {
        clientConfig.credentials = {
          accessKeyId,
          secretAccessKey,
          sessionToken,
        };
      }
      if (tuning?.requestTimeoutMs) {
        clientConfig.requestHandler =
          new (require("@aws-sdk/node-http-handler").NodeHttpHandler)({
            connectionTimeout: Math.min(60, tuning.requestTimeoutMs),
            socketTimeout: tuning.requestTimeoutMs,
          });
      }

      this._client = new S3Client(clientConfig);

      // Light-touch probe: listBuckets to verify credentials & connectivity.
      // This is relatively lightweight and does not require a bucket name.
      await this._client.send(new ListBucketsCommand({}));

      this.ready = true;
      this._closed = false;

      return {
        region,
        endpoint,
        pathStyle: !!forcePathStyle,
      };
    })();

    try {
      return await this._initPromise;
    } finally {
      // If init fails, allow retry by clearing the promise
      if (!this.ready) {
        this._initPromise = null;
      }
    }
  }

  /**
   * Releases underlying resources initialized in _init().
   * Calls provider-specific cleanup (disconnect/close) if available.
   * Safe to call multiple times.
   * @function _close
   * @group Init
   * @label Close Client
   * @returns {Promise<void>} Resolves when cleanup is complete.
   */
  async _close() {
    // AWS SDK v3 S3Client has a destroy() method to close sockets.
    if (this._client && typeof this._client.destroy === "function") {
      this._client.destroy();
    }
    this._client = null;
    this.ready = false;
    this._closed = true;
    this._initPromise = null;
  }

  // -----------------------------
  //           BUCKETS
  // -----------------------------

  /**
   * Create a new bucket.
   * @function createBucket
   * @group Buckets
   * @label Create Bucket
   * @param {object} input
   * @param {string} input.bucket Bucket name
   * @param {string} [input.location] AWS region for the bucket (LocationConstraint). If omitted, uses client region defaults.
   * @returns {Promise<object>} AWS response
   */
  async createBucket(input) {
    await this._ensureReady();
    const params = { Bucket: input.bucket };
    if (input.location && input.location !== "us-east-1") {
      params.CreateBucketConfiguration = { LocationConstraint: input.location };
    }
    return this._client.send(new CreateBucketCommand(params));
  }

  /**
   * List all buckets for the account/credentials.
   * @function listBuckets
   * @group Buckets
   * @label List Buckets
   * @returns {Promise<{Buckets:Array, Owner:object}>} Buckets and owner
   */
  async listBuckets() {
    await this._ensureReady();
    return this._client.send(new ListBucketsCommand({}));
  }

  /**
   * Check if a bucket exists and you have access.
   * @function headBucket
   * @group Buckets
   * @label Head Bucket
   * @param {object} input
   * @param {string} input.bucket Bucket name
   * @returns {Promise<void>} Resolves if accessible; throws otherwise
   */
  async headBucket(input) {
    await this._ensureReady();
    return this._client.send(new HeadBucketCommand({ Bucket: input.bucket }));
  }

  /**
   * Delete a bucket (must be empty).
   * @function deleteBucket
   * @group Buckets
   * @label Delete Bucket
   * @param {object} input
   * @param {string} input.bucket Bucket name
   * @returns {Promise<object>} AWS response
   */
  async deleteBucket(input) {
    await this._ensureReady();
    return this._client.send(new DeleteBucketCommand({ Bucket: input.bucket }));
  }

  /**
   * Set or replace a bucket policy.
   * @function putBucketPolicy
   * @group Buckets
   * @label Put Bucket Policy
   * @param {object} input
   * @param {string} input.bucket Bucket name
   * @param {object|string} input.policy Policy document (object or JSON string)
   * @returns {Promise<object>} AWS response
   */
  async putBucketPolicy(input) {
    await this._ensureReady();
    const Policy =
      typeof input.policy === "string"
        ? input.policy
        : JSON.stringify(input.policy);
    return this._client.send(
      new PutBucketPolicyCommand({ Bucket: input.bucket, Policy }),
    );
  }

  /**
   * Get a bucket policy.
   * @function getBucketPolicy
   * @group Buckets
   * @label Get Bucket Policy
   * @param {object} input
   * @param {string} input.bucket Bucket name
   * @returns {Promise<{Policy:string}>} Policy JSON string
   */
  async getBucketPolicy(input) {
    await this._ensureReady();
    return this._client.send(
      new GetBucketPolicyCommand({ Bucket: input.bucket }),
    );
  }

  /**
   * Delete a bucket policy.
   * @function deleteBucketPolicy
   * @group Buckets
   * @label Delete Bucket Policy
   * @param {object} input
   * @param {string} input.bucket Bucket name
   * @returns {Promise<object>} AWS response
   */
  async deleteBucketPolicy(input) {
    await this._ensureReady();
    return this._client.send(
      new DeleteBucketPolicyCommand({ Bucket: input.bucket }),
    );
  }

  /**
   * Set CORS configuration for a bucket.
   * @function setBucketCors
   * @group Buckets
   * @label Set Bucket CORS
   * @param {object} input
   * @param {string} input.bucket Bucket name
   * @param {object} input.corsConfiguration CORS configuration ({ CORSRules: [...] })
   * @returns {Promise<object>} AWS response
   */
  async setBucketCors(input) {
    await this._ensureReady();
    return this._client.send(
      new PutBucketCorsCommand({
        Bucket: input.bucket,
        CORSConfiguration: input.corsConfiguration,
      }),
    );
  }

  /**
   * Get bucket CORS configuration.
   * @function getBucketCors
   * @group Buckets
   * @label Get Bucket CORS
   * @param {object} input
   * @param {string} input.bucket Bucket name
   * @returns {Promise<object>} CORS configuration
   */
  async getBucketCors(input) {
    await this._ensureReady();
    return this._client.send(
      new GetBucketCorsCommand({ Bucket: input.bucket }),
    );
  }

  /**
   * Delete bucket CORS configuration.
   * @function deleteBucketCors
   * @group Buckets
   * @label Delete Bucket CORS
   * @param {object} input
   * @param {string} input.bucket Bucket name
   * @returns {Promise<object>} AWS response
   */
  async deleteBucketCors(input) {
    await this._ensureReady();
    return this._client.send(
      new DeleteBucketCorsCommand({ Bucket: input.bucket }),
    );
  }

  // -----------------------------
  //           OBJECTS
  // -----------------------------

  /**
   * Upload an object (small to medium). For large files, use multipart methods.
   * @function putObject
   * @group Files
   * @label Put Object (Upload)
   * @param {object} input
   * @param {string} input.bucket Bucket name
   * @param {string} input.key Object key
   * @param {Buffer|Uint8Array|string|Readable} input.body Content
   * @param {string} [input.contentType] MIME type
   * @param {string} [input.acl] Canned ACL
   * @enumRef ACL_OPTIONS
   * @param {string} [input.storageClass] Storage class
   * @enumRef STORAGE_CLASS_OPTIONS
   * @param {Record<string,string>} [input.metadata] User metadata
   * @param {string} [input.checksumAlgorithm] Checksum algorithm
   * @enumRef CHECKSUM_ALGORITHM_OPTIONS
   * @returns {Promise<object>} AWS response (ETag, VersionId, etc.)
   */
  async putObject(input) {
    await this._ensureReady();
    return this._client.send(
      new PutObjectCommand({
        Bucket: input.bucket,
        Key: input.key,
        Body: input.body,
        ContentType: input.contentType,
        ACL: input.acl,
        StorageClass: input.storageClass,
        Metadata: input.metadata,
        ChecksumAlgorithm: input.checksumAlgorithm,
      }),
    );
  }

  /**
   * Download an object. Returns body stream; use `await streamToBuffer()` helper if needed.
   * @function getObject
   * @group Files
   * @label Get Object (Download)
   * @param {object} input
   * @param {string} input.bucket Bucket name
   * @param {string} input.key Object key
   * @param {string} [input.range] HTTP range header (e.g., "bytes=0-1023")
   * @returns {Promise<{Body:Readable, ContentType?:string, ContentLength?:number, Metadata?:object}>} Object data
   */
  async getObject(input) {
    await this._ensureReady();
    const res = await this._client.send(
      new GetObjectCommand({
        Bucket: input.bucket,
        Key: input.key,
        Range: input.range,
      }),
    );
    // Ensure Node Readable for consumers
    res.Body = toNodeStream(res.Body);
    return res;
  }

  /**
   * Delete an object.
   * @function deleteObject
   * @group Files
   * @label Delete Object
   * @param {object} input
   * @param {string} input.bucket Bucket name
   * @param {string} input.key Object key
   * @returns {Promise<object>} AWS response
   */
  async deleteObject(input) {
    await this._ensureReady();
    return this._client.send(
      new DeleteObjectCommand({ Bucket: input.bucket, Key: input.key }),
    );
  }

  /**
   * Check if an object exists and fetch metadata.
   * @function headObject
   * @group Files
   * @label Head Object (Metadata)
   * @param {object} input
   * @param {string} input.bucket Bucket name
   * @param {string} input.key Object key
   * @returns {Promise<object>} Metadata (ContentLength, ContentType, ETag, etc.)
   */
  async headObject(input) {
    await this._ensureReady();
    return this._client.send(
      new HeadObjectCommand({ Bucket: input.bucket, Key: input.key }),
    );
  }

  /**
   * Copy an object within S3 (server-side).
   * @function copyObject
   * @group Files
   * @label Copy Object
   * @param {object} input
   * @param {string} input.sourceBucket Source bucket
   * @param {string} input.sourceKey Source key
   * @param {string} input.destinationBucket Destination bucket
   * @param {string} input.destinationKey Destination key
   * @param {string} [input.acl] Canned ACL
   * @enumRef ACL_OPTIONS
   * @returns {Promise<object>} AWS response
   */
  async copyObject(input) {
    await this._ensureReady();
    return this._client.send(
      new CopyObjectCommand({
        Bucket: input.destinationBucket,
        Key: input.destinationKey,
        CopySource: `/${input.sourceBucket}/${encodeURIComponent(input.sourceKey)}`,
        ACL: input.acl,
      }),
    );
  }

  /**
   * List objects (v2) with pagination support.
   * @function listObjects
   * @group Files
   * @label List Objects
   * @param {object} input
   * @param {string} input.bucket Bucket name
   * @param {string} [input.prefix] Prefix filter
   * @param {string} [input.continuationToken] For pagination
   * @param {number} [input.maxKeys=1000] Page size
   * @returns {Promise<{Contents:Array, IsTruncated:boolean, NextContinuationToken?:string, CommonPrefixes?:Array}>}
   */
  async listObjects(input) {
    await this._ensureReady();
    return this._client.send(
      new ListObjectsV2Command({
        Bucket: input.bucket,
        Prefix: input.prefix,
        ContinuationToken: input.continuationToken,
        MaxKeys: input.maxKeys ?? 1000,
        Delimiter: input.delimiter, // optional for "folders"
      }),
    );
  }

  /**
   * Set canned ACL on an object.
   * @function putObjectAcl
   * @group Files
   * @label Put Object ACL
   * @param {object} input
   * @param {string} input.bucket Bucket name
   * @param {string} input.key Object key
   * @param {string} input.acl Canned ACL
   * @enumRef ACL_OPTIONS
   * @returns {Promise<object>} AWS response
   */
  async putObjectAcl(input) {
    await this._ensureReady();
    return this._client.send(
      new PutObjectAclCommand({
        Bucket: input.bucket,
        Key: input.key,
        ACL: input.acl,
      }),
    );
  }

  // -----------------------------
  //      MULTIPART UPLOADS
  // -----------------------------

  /**
   * Start a multipart upload session.
   * @function createMultipartUpload
   * @group Multipart
   * @label Create Multipart Upload
   * @param {object} input
   * @param {string} input.bucket Bucket name
   * @param {string} input.key Object key
   * @param {string} [input.contentType] MIME type
   * @param {string} [input.acl] Canned ACL
   * @enumRef ACL_OPTIONS
   * @param {string} [input.storageClass] Storage class
   * @enumRef STORAGE_CLASS_OPTIONS
   * @returns {Promise<{UploadId:string}>} Upload session data
   */
  async createMultipartUpload(input) {
    await this._ensureReady();
    const res = await this._client.send(
      new CreateMultipartUploadCommand({
        Bucket: input.bucket,
        Key: input.key,
        ContentType: input.contentType,
        ACL: input.acl,
        StorageClass: input.storageClass,
      }),
    );
    return { UploadId: res.UploadId };
  }

  /**
   * Upload a single part (5MB–5GB).
   * @function uploadPart
   * @group Multipart
   * @label Upload Part
   * @param {object} input
   * @param {string} input.bucket Bucket name
   * @param {string} input.key Object key
   * @param {string} input.uploadId Upload ID from createMultipartUpload
   * @param {number} input.partNumber Part number (1..10,000)
   * @param {Buffer|Uint8Array|Readable} input.body Part content
   * @returns {Promise<{ETag:string, PartNumber:number}>} Part ETag and number
   */
  async uploadPart(input) {
    await this._ensureReady();
    const res = await this._client.send(
      new UploadPartCommand({
        Bucket: input.bucket,
        Key: input.key,
        UploadId: input.uploadId,
        PartNumber: input.partNumber,
        Body: input.body,
      }),
    );
    return { ETag: res.ETag, PartNumber: input.partNumber };
  }

  /**
   * Complete a multipart upload with the collected parts.
   * @function completeMultipartUpload
   * @group Multipart
   * @label Complete Multipart Upload
   * @param {object} input
   * @param {string} input.bucket Bucket name
   * @param {string} input.key Object key
   * @param {string} input.uploadId Upload ID
   * @param {Array<{ETag:string, PartNumber:number}>} input.parts Parts list
   * @returns {Promise<object>} AWS response (Location, Bucket, Key, ETag, VersionId, etc.)
   */
  async completeMultipartUpload(input) {
    await this._ensureReady();
    return this._client.send(
      new CompleteMultipartUploadCommand({
        Bucket: input.bucket,
        Key: input.key,
        UploadId: input.uploadId,
        MultipartUpload: { Parts: input.parts },
      }),
    );
  }

  /**
   * Abort a multipart upload session (cleanup).
   * @function abortMultipartUpload
   * @group Multipart
   * @label Abort Multipart Upload
   * @param {object} input
   * @param {string} input.bucket Bucket name
   * @param {string} input.key Object key
   * @param {string} input.uploadId Upload ID
   * @returns {Promise<object>} AWS response
   */
  async abortMultipartUpload(input) {
    await this._ensureReady();
    return this._client.send(
      new AbortMultipartUploadCommand({
        Bucket: input.bucket,
        Key: input.key,
        UploadId: input.uploadId,
      }),
    );
  }

  // -----------------------------
  //         SHARING / AUTH
  // -----------------------------

  /**
   * Generate a presigned URL for get/put operations.
   * @function getSignedUrl
   * @group Sharing
   * @label Get Signed URL
   * @param {object} input
   * @param {"getObject"|"putObject"} input.operation Operation type
   * @param {string} input.bucket Bucket name
   * @param {string} input.key Object key
   * @param {number} [input.expiresIn=900] Expiration in seconds (max varies by SDK—commonly 7 days)
   * @param {string} [input.contentType] For putObject URLs, specify expected MIME
   * @returns {Promise<{url:string, expiresIn:number}>} Signed URL and expiry
   */
  async getSignedUrl(input) {
    await this._ensureReady();
    const expiresIn = input.expiresIn ?? 900;
    let cmd;
    if (input.operation === "getObject") {
      cmd = new GetObjectCommand({ Bucket: input.bucket, Key: input.key });
    } else if (input.operation === "putObject") {
      cmd = new PutObjectCommand({
        Bucket: input.bucket,
        Key: input.key,
        ContentType: input.contentType,
      });
    } else {
      throw new Error(
        'getSignedUrl: unsupported operation; use "getObject" or "putObject".',
      );
    }
    const url = await getSignedUrl(this._client, cmd, { expiresIn });
    return { url, expiresIn };
  }

  /**
   * Create a browser-based presigned POST policy for direct uploads.
   * @function createPresignedPostPolicy
   * @group Sharing
   * @label Create Presigned POST
   * @param {object} input
   * @param {string} input.bucket Bucket name
   * @param {string} input.key Object key (supports prefix with ${filename} patterns)
   * @param {number} [input.expiresIn=3600] Expiry seconds (max typically 7 days)
   * @param {Array<Array>} [input.conditions] Additional policy conditions (e.g., ["content-length-range", 1, 10485760])
   * @param {Record<string,string>} [input.fields] Additional form fields (e.g., {"Content-Type":"image/png"})
   * @returns {Promise<{url:string, fields:Record<string,string>}>} POST URL and form fields
   */
  async createPresignedPostPolicy(input) {
    await this._ensureReady();
    const res = await createPresignedPost(this._client, {
      Bucket: input.bucket,
      Key: input.key,
      Expires: input.expiresIn ?? 3600,
      Conditions: input.conditions,
      Fields: input.fields,
    });
    return res;
  }

  // -----------------------------
  //         UTILITIES
  // -----------------------------

  /**
   * Convenience: Convert a stream/Body to Buffer.
   * @function streamToBuffer
   * @group Utils
   * @label Stream to Buffer
   * @param {object} input
   * @param {Readable} input.stream Node.js readable stream
   * @returns {Promise<Buffer>} Buffer with full content
   */
  async streamToBuffer(input) {
    await this._ensureReady();
    const chunks = [];
    for await (const chunk of input.stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  /**
   * Test connectivity by issuing a lightweight ListBuckets call.
   * @function ping
   * @group Utils
   * @label Ping
   * @returns {Promise<{ok:true, buckets:number}>} Basic OK response and bucket count
   */
  async ping() {
    await this._ensureReady();
    const res = await this._client.send(new ListBucketsCommand({}));
    return { ok: true, buckets: res?.Buckets?.length ?? 0 };
  }
}

// Expose enums for UI binding (optional)
AwsS3ApiClient.REGION_OPTIONS = REGION_OPTIONS;
AwsS3ApiClient.ACL_OPTIONS = ACL_OPTIONS;
AwsS3ApiClient.STORAGE_CLASS_OPTIONS = STORAGE_CLASS_OPTIONS;
AwsS3ApiClient.CHECKSUM_ALGORITHM_OPTIONS = CHECKSUM_ALGORITHM_OPTIONS;

module.exports = AwsS3ApiClient;
