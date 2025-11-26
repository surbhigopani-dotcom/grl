const cloudinary = require('cloudinary').v2;
const multer = require('multer');

// Configure Cloudinary from environment or use provided credentials
// Support both CLOUDINARY_URL format and individual env vars
if (process.env.CLOUDINARY_URL) {
  // Parse CLOUDINARY_URL: cloudinary://api_key:api_secret@cloud_name
  const url = process.env.CLOUDINARY_URL;
  const match = url.match(/cloudinary:\/\/(\d+):([^@]+)@(.+)/);
  if (match) {
    cloudinary.config({
      cloud_name: match[3],
      api_key: match[1],
      api_secret: match[2]
    });
  } else {
    // Fallback to default if parsing fails
    cloudinary.config({
      cloud_name: 'drjuwboja',
      api_key: '547345649718512',
      api_secret: '8RTn0C4sFmPtfDtlreoJNvV9KtQ'
    });
  }
} else {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'drjuwboja',
    api_key: process.env.CLOUDINARY_API_KEY || '547345649718512',
    api_secret: process.env.CLOUDINARY_API_SECRET || '8RTn0C4sFmPtfDtlreoJNvV9KtQ'
  });
}

// Use memory storage for multer (we'll upload to Cloudinary manually)
const storage = multer.memoryStorage();

// File filter - allow all common document formats, but restrict selfie to images only
const fileFilter = (req, file, cb) => {
  const documentType = req.body.documentType;
  
  // For selfie, only allow images
  if (documentType === 'selfie') {
    const imageExtensions = /jpeg|jpg|png|webp|gif|bmp/i;
    const imageMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/bmp'];
    
    const extname = imageExtensions.test(file.originalname.split('.').pop());
    const mimetype = imageMimeTypes.includes(file.mimetype);
    
    if (mimetype || extname) {
      return cb(null, true);
    } else {
      return cb(new Error('Selfie must be an image file (JPG, PNG, WebP, GIF, BMP)'));
    }
  }
  
  // For Aadhar and PAN, allow all document formats
  const allowedExtensions = /jpeg|jpg|png|webp|pdf|doc|docx|xls|xlsx|txt|csv|rtf|odt|ods|odp/i;
  const allowedMimeTypes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/bmp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
    'application/rtf',
    'application/vnd.oasis.opendocument.text',
    'application/vnd.oasis.opendocument.spreadsheet',
    'application/vnd.oasis.opendocument.presentation'
  ];
  
  const extname = allowedExtensions.test(file.originalname.split('.').pop());
  const mimetype = allowedMimeTypes.includes(file.mimetype);
  
  if (mimetype || extname) {
    return cb(null, true);
  } else {
    cb(new Error('File type not allowed. Allowed formats: Images (JPEG, PNG, WebP, GIF, BMP), Documents (PDF, DOC, DOCX, XLS, XLSX, TXT, CSV, RTF, ODT, ODS, ODP)'));
  }
};

// Create multer upload instance with memory storage
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB max file size
  },
  fileFilter: fileFilter
});

// Helper function to upload file to Cloudinary
const uploadToCloudinary = async (fileBuffer, documentType, userId, originalName) => {
  return new Promise((resolve, reject) => {
    // Determine folder based on document type
    let folder = 'growloan/documents';
    if (documentType === 'selfie') {
      folder = 'growloan/selfies';
    } else if (documentType === 'aadharCard') {
      folder = 'growloan/aadhar';
    } else if (documentType === 'panCard') {
      folder = 'growloan/pan';
    }
    
    const publicId = `${userId}_${documentType}_${Date.now()}`;
    
    // Upload options
    const uploadOptions = {
      folder: folder,
      public_id: publicId,
      resource_type: 'auto', // auto-detect: image, video, raw, auto
      use_filename: false,
      unique_filename: true,
      overwrite: false
    };
    
    // For selfies, add image transformations
    if (documentType === 'selfie') {
      uploadOptions.transformation = [
        { width: 800, height: 800, crop: 'limit', quality: 'auto' }
      ];
    }
    
    // Upload to Cloudinary
    cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          reject(error);
        } else {
          resolve(result);
        }
      }
    ).end(fileBuffer);
  });
};

module.exports = {
  cloudinary,
  upload,
  uploadToCloudinary
};

