const { Pool } = require('pg');
const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const { Readable } = require('stream');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const os = require('os');

console.log("Worker Service Starting...");

// --- CONFIGURATION ---
// Supports both AWS S3 and DigitalOcean Spaces
const DO_SPACES_ENDPOINT = process.env.DO_SPACES_ENDPOINT || '';
const DO_SPACES_REGION = process.env.DO_SPACES_REGION || process.env.AWS_REGION || 'us-east-1';
const DO_SPACES_KEY = process.env.DO_SPACES_KEY || process.env.AWS_ACCESS_KEY_ID || '';
const DO_SPACES_SECRET = process.env.DO_SPACES_SECRET || process.env.AWS_SECRET_ACCESS_KEY || '';
const RAW_BUCKET = process.env.DO_SPACES_VIDEOS_BUCKET || process.env.AWS_VIDEOS_BUCKET || 'medgram-videos';
const HLS_BUCKET = process.env.DO_SPACES_HLS_BUCKET || process.env.AWS_HLS_BUCKET || 'medgram-hls';
const DO_SPACES_CDN_URL = process.env.DO_SPACES_CDN_URL || process.env.AWS_CLOUDFRONT_URL || '';
const IS_AWS_S3 = !DO_SPACES_ENDPOINT;

// --- DB CONNECTION ---
const pool = new Pool({
  user: process.env.POSTGRES_USER || 'medgram_admin',
  host: process.env.POSTGRES_HOST || 'medgram_db',
  database: process.env.POSTGRES_DB || 'medgram_db',
  password: process.env.POSTGRES_PASSWORD || 'secure_password_change_me',
  port: 5432,
});

// --- STORAGE CONNECTION (AWS S3 or DigitalOcean Spaces) ---
const s3ClientConfig = {
  region: DO_SPACES_REGION,
  credentials: {
    accessKeyId: DO_SPACES_KEY,
    secretAccessKey: DO_SPACES_SECRET,
  },
};

if (!IS_AWS_S3 && DO_SPACES_ENDPOINT) {
  s3ClientConfig.endpoint = `https://${DO_SPACES_ENDPOINT}`;
  s3ClientConfig.forcePathStyle = false;
} else {
  s3ClientConfig.forcePathStyle = false;
}

const s3Client = new S3Client(s3ClientConfig);

// Helper function to get public URL
const getPublicUrl = (bucketName, objectName) => {
  if (DO_SPACES_CDN_URL) {
    return `${DO_SPACES_CDN_URL}/${objectName}`;
  }
  if (IS_AWS_S3) {
    return `https://${bucketName}.s3.${DO_SPACES_REGION}.amazonaws.com/${objectName}`;
  }
  return `https://${bucketName}.${DO_SPACES_ENDPOINT}/${objectName}`;
};

// Ensure HLS bucket exists (buckets must be created via DO console/API)
const ensureBucket = async () => {
  console.log(`Using HLS bucket: ${HLS_BUCKET}`);
  // Note: Buckets should be created via DigitalOcean console
};

// Process a single video
const processVideo = async (post) => {
  console.log(`Processing post ${post.id}...`);
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hls-'));
  const inputPath = path.join(tempDir, 'input.mp4');
  const outputFileName = `index.m3u8`;
  const outputPath = path.join(tempDir, outputFileName);
  
  try {
    // 1. Download raw file
    // The media_url in DB is the full public URL. We need to parse the object name.
    // AWS S3 URL: https://bucket-name.s3.region.amazonaws.com/userId/timestamp-filename.mp4
    // DO Spaces URL: https://bucket-name.region.digitaloceanspaces.com/userId/timestamp-filename.mp4
    // CDN URL: https://cdn.example.com/userId/timestamp-filename.mp4
    // We need to extract: userId/timestamp-random-filename.mp4
    let objectName;
    if (post.media_url.includes(`/${RAW_BUCKET}/`)) {
      const urlParts = post.media_url.split(`/${RAW_BUCKET}/`);
      objectName = urlParts[1];
    } else if (IS_AWS_S3 && post.media_url.includes(`${RAW_BUCKET}.s3.${DO_SPACES_REGION}.amazonaws.com/`)) {
      const urlParts = post.media_url.split(`${RAW_BUCKET}.s3.${DO_SPACES_REGION}.amazonaws.com/`);
      objectName = urlParts[1];
    } else if (!IS_AWS_S3 && post.media_url.includes(`${RAW_BUCKET}.${DO_SPACES_ENDPOINT}/`)) {
      const urlParts = post.media_url.split(`${RAW_BUCKET}.${DO_SPACES_ENDPOINT}/`);
      objectName = urlParts[1];
    } else {
      // Try to extract from CDN URL or any other format
      const urlParts = post.media_url.split('/');
      const domainIndex = urlParts.findIndex(part => part.includes('.') && !part.includes('://'));
      if (domainIndex !== -1 && domainIndex < urlParts.length - 1) {
        objectName = urlParts.slice(domainIndex + 1).join('/');
      } else {
        throw new Error(`Could not parse object name from URL: ${post.media_url}`);
      }
    }

    console.log(`Downloading ${objectName} from ${RAW_BUCKET}...`);
    const getCommand = new GetObjectCommand({
      Bucket: RAW_BUCKET,
      Key: objectName,
    });
    
    const response = await s3Client.send(getCommand);
    const stream = response.Body;
    
    // Write stream to file
    const writeStream = fs.createWriteStream(inputPath);
    await new Promise((resolve, reject) => {
      stream.pipe(writeStream);
      stream.on('error', reject);
      writeStream.on('finish', resolve);
    });

    // 2. Transcode to HLS with adaptive bitrates (like Instagram)
    console.log('Transcoding to HLS with adaptive streaming...');
    const hlsOutputDir = path.join(tempDir, 'hls');
    fs.mkdirSync(hlsOutputDir, { recursive: true });
    
    // Create single quality HLS for now (can be extended to multiple qualities)
    const outputFileName = 'index.m3u8';
    const outputPath = path.join(hlsOutputDir, outputFileName);
    
    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .outputOptions([
          '-c:v libx264',
          '-c:a aac',
          '-profile:v baseline',
          '-level 3.0',
          '-start_number 0',
          '-hls_time 10', // 10 second chunks for smooth streaming
          '-hls_list_size 0', // Keep all segments
          '-hls_segment_filename', path.join(hlsOutputDir, 'segment_%03d.ts'),
          '-f hls'
        ])
        .output(outputPath)
        .on('end', resolve)
        .on('error', reject)
        .run();
    });

    // 3. Upload HLS files (all segments and playlist)
    const hlsFolder = post.id; // Store in a folder named after the post ID
    const files = fs.readdirSync(hlsOutputDir);

    for (const file of files) {
      const filePath = path.join(hlsOutputDir, file);
      const stat = fs.statSync(filePath);
      if (stat.isFile()) {
        const objectKey = `${hlsFolder}/${file}`;
        const fileContent = fs.readFileSync(filePath);
        const contentType = file.endsWith('.m3u8') ? 'application/x-mpegURL' : 'video/MP2T';
        
        const putCommand = new PutObjectCommand({
          Bucket: HLS_BUCKET,
          Key: objectKey,
          Body: fileContent,
          ContentType: contentType,
          CacheControl: 'public, max-age=31536000',
          ACL: 'public-read',
        });
        
        await s3Client.send(putCommand);
        console.log(`Uploaded HLS file: ${objectKey}`);
      }
    }

    // 4. Update Database
    // Use the configured public URL for the HLS manifest
    const manifestKey = `${hlsFolder}/${outputFileName}`;
    const newMediaUrl = getPublicUrl(HLS_BUCKET, manifestKey);
    
    await pool.query(
      `UPDATE posts SET media_url = $1, processing_status = 'COMPLETED' WHERE id = $2`,
      [newMediaUrl, post.id]
    );

    console.log(`Post ${post.id} processing complete.`);

  } catch (err) {
    console.error(`Error processing post ${post.id}:`, err);
    await pool.query(
      `UPDATE posts SET processing_status = 'FAILED' WHERE id = $1`,
      [post.id]
    );
  } finally {
    // Cleanup
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
};

// Polling Loop
const startWorker = async () => {
  await ensureBucket();
  
  while (true) {
    try {
      // Fetch pending jobs
      const result = await pool.query(
        `SELECT * FROM posts WHERE type = 'VIDEO' AND processing_status = 'PENDING' ORDER BY created_at ASC LIMIT 1`
      );

      if (result.rows.length > 0) {
        const post = result.rows[0];
        // Mark as processing immediately to prevent double pick-up
        await pool.query(`UPDATE posts SET processing_status = 'PROCESSING' WHERE id = $1`, [post.id]);
        await processVideo(post);
      } else {
        // No jobs, wait 5 seconds
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    } catch (err) {
      console.error("Worker loop error:", err);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
};

// Wait for DB to be ready before starting
setTimeout(startWorker, 10000);
