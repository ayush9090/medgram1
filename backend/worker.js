const { Pool } = require('pg');
const Minio = require('minio');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const os = require('os');

console.log("Worker Service Starting...");

// --- CONFIGURATION ---
const RAW_BUCKET = 'videos';
const HLS_BUCKET = 'hls';
// Use environment variable for public URL (accessible by browser)
const MINIO_PUBLIC_URL = process.env.MINIO_PUBLIC_URL || 'http://localhost:9000';

// --- DB CONNECTION ---
const pool = new Pool({
  user: process.env.POSTGRES_USER || 'medgram_admin',
  host: process.env.POSTGRES_HOST || 'medgram_db',
  database: process.env.POSTGRES_DB || 'medgram_db',
  password: process.env.POSTGRES_PASSWORD || 'secure_password_change_me',
  port: 5432,
});

// --- MINIO CONNECTION ---
// Connects to internal docker network alias
const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || 'medgram_storage',
  port: parseInt(process.env.MINIO_PORT || '9000'),
  useSSL: false,
  accessKey: process.env.MINIO_ROOT_USER || 'minio_admin',
  secretKey: process.env.MINIO_ROOT_PASSWORD || 'secure_minio_password_change_me',
});

// Ensure HLS bucket exists
const ensureBucket = async () => {
  try {
    const exists = await minioClient.bucketExists(HLS_BUCKET);
    if (!exists) {
      await minioClient.makeBucket(HLS_BUCKET, 'us-east-1');
      // Set policy to public read for HLS bucket
      const policy = {
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Principal: { AWS: ["*"] },
            Action: ["s3:GetObject"],
            Resource: [`arn:aws:s3:::${HLS_BUCKET}/*`]
          }
        ]
      };
      await minioClient.setBucketPolicy(HLS_BUCKET, JSON.stringify(policy));
      console.log(`Bucket ${HLS_BUCKET} created and public policy set.`);
    }
  } catch (err) {
    console.error('Error checking/creating HLS bucket:', err);
  }
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
    // Format: http://localhost:9000/videos/filename (or whatever PUBLIC_URL is)
    const urlParts = post.media_url.split('/');
    const objectName = urlParts[urlParts.length - 1];

    console.log(`Downloading ${objectName} from ${RAW_BUCKET}...`);
    await minioClient.fGetObject(RAW_BUCKET, objectName, inputPath);

    // 2. Transcode to HLS
    console.log('Transcoding to HLS...');
    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .outputOptions([
          '-profile:v baseline',
          '-level 3.0',
          '-start_number 0',
          '-hls_time 10',
          '-hls_list_size 0',
          '-f hls'
        ])
        .output(outputPath)
        .on('end', resolve)
        .on('error', reject)
        .run();
    });

    // 3. Upload HLS files
    const files = fs.readdirSync(tempDir).filter(f => f !== 'input.mp4');
    const hlsFolder = post.id; // Store in a folder named after the post ID

    for (const file of files) {
      const filePath = path.join(tempDir, file);
      const metaData = { 'Content-Type': file.endsWith('.m3u8') ? 'application/x-mpegURL' : 'video/MP2T' };
      await minioClient.fPutObject(HLS_BUCKET, `${hlsFolder}/${file}`, filePath, metaData);
    }

    // 4. Update Database
    // Use the configured public URL for the HLS manifest
    const newMediaUrl = `${MINIO_PUBLIC_URL}/${HLS_BUCKET}/${hlsFolder}/${outputFileName}`;
    
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
