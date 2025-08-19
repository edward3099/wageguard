const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const crypto = require('crypto');

/**
 * File Upload Service for WageGuard
 * Handles secure file uploads with validation and storage
 */
class FileUploadService {
  constructor() {
    this.uploadDir = path.join(process.cwd(), 'uploads');
    this.maxFileSize = 10 * 1024 * 1024; // 10MB
    this.allowedMimeTypes = [
      'text/csv',
      'application/csv',
      'text/plain'
    ];
    
    // Ensure upload directory exists
    this.ensureUploadDir();
    
    // Configure multer storage
    this.storage = multer.diskStorage({
      destination: (req, file, cb) => {
        // Create user-specific upload directory
        const userDir = path.join(this.uploadDir, req.user?.id?.toString() || 'anonymous');
        fs.ensureDirSync(userDir);
        cb(null, userDir);
      },
      filename: (req, file, cb) => {
        // Generate unique filename with timestamp
        const timestamp = Date.now();
        const randomString = crypto.randomBytes(8).toString('hex');
        const originalExt = path.extname(file.originalname);
        const filename = `wageguard_${timestamp}_${randomString}${originalExt}`;
        cb(null, filename);
      }
    });
    
    // Configure file filter
    this.fileFilter = (req, file, cb) => {
      // Check file type
      if (!this.allowedMimeTypes.includes(file.mimetype)) {
        return cb(new Error('Invalid file type. Only CSV files are allowed.'), false);
      }
      
      // Check file extension
      const ext = path.extname(file.originalname).toLowerCase();
      if (ext !== '.csv') {
        return cb(new Error('Invalid file extension. Only .csv files are allowed.'), false);
      }
      
      // Check file size
      if (file.size > this.maxFileSize) {
        return cb(new Error(`File too large. Maximum size is ${this.maxFileSize / (1024 * 1024)}MB.`), false);
      }
      
      cb(null, true);
    };
    
    // Create multer instance
    this.upload = multer({
      storage: this.storage,
      fileFilter: this.fileFilter,
      limits: {
        fileSize: this.maxFileSize,
        files: 1 // Only allow one file at a time
      }
    });
  }

  /**
   * Ensure upload directory exists
   */
  async ensureUploadDir() {
    try {
      await fs.ensureDir(this.uploadDir);
      console.log(`✅ Upload directory created: ${this.uploadDir}`);
    } catch (error) {
      console.error('❌ Failed to create upload directory:', error);
    }
  }

  /**
   * Get multer upload middleware
   * @returns {Function} Multer middleware
   */
  getUploadMiddleware() {
    return this.upload.single('csvFile');
  }

  /**
   * Validate uploaded file
   * @param {Object} file - Uploaded file object
   * @returns {Object} Validation result
   */
  validateFile(file) {
    const errors = [];
    const warnings = [];
    
    if (!file) {
      errors.push('No file uploaded');
      return { isValid: false, errors, warnings };
    }
    
    // Check file size
    if (file.size > this.maxFileSize) {
      errors.push(`File size ${(file.size / (1024 * 1024)).toFixed(2)}MB exceeds maximum ${this.maxFileSize / (1024 * 1024)}MB`);
    }
    
    // Check file type
    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      errors.push(`File type ${file.mimetype} is not allowed`);
    }
    
    // Check file extension
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.csv') {
      errors.push(`File extension ${ext} is not allowed`);
    }
    
    // Check if file is empty
    if (file.size === 0) {
      errors.push('File is empty');
    }
    
    // Check filename length
    if (file.originalname.length > 255) {
      warnings.push('Filename is very long and may cause issues');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      fileInfo: {
        originalName: file.originalname,
        filename: file.filename,
        size: file.size,
        mimetype: file.mimetype,
        path: file.path
      }
    };
  }

  /**
   * Clean up uploaded file
   * @param {string} filePath - Path to file to remove
   * @returns {Promise<boolean>} Success status
   */
  async cleanupFile(filePath) {
    try {
      if (await fs.pathExists(filePath)) {
        await fs.remove(filePath);
        console.log(`🗑️ Cleaned up file: ${filePath}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Failed to cleanup file:', error);
      return false;
    }
  }

  /**
   * Move file to permanent storage
   * @param {string} sourcePath - Source file path
   * @param {string} destinationPath - Destination file path
   * @returns {Promise<boolean>} Success status
   */
  async moveFile(sourcePath, destinationPath) {
    try {
      await fs.ensureDir(path.dirname(destinationPath));
      await fs.move(sourcePath, destinationPath);
      console.log(`📁 Moved file to: ${destinationPath}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to move file:', error);
      return false;
    }
  }

  /**
   * Get file statistics
   * @param {string} filePath - Path to file
   * @returns {Promise<Object>} File statistics
   */
  async getFileStats(filePath) {
    try {
      const stats = await fs.stat(filePath);
      return {
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory()
      };
    } catch (error) {
      console.error('❌ Failed to get file stats:', error);
      return null;
    }
  }

  /**
   * Create file hash for integrity checking
   * @param {string} filePath - Path to file
   * @returns {Promise<string>} File hash
   */
  async createFileHash(filePath) {
    try {
      const fileBuffer = await fs.readFile(filePath);
      const hash = crypto.createHash('sha256');
      hash.update(fileBuffer);
      return hash.digest('hex');
    } catch (error) {
      console.error('❌ Failed to create file hash:', error);
      return null;
    }
  }

  /**
   * Get upload directory path
   * @returns {string} Upload directory path
   */
  getUploadDir() {
    return this.uploadDir;
  }

  /**
   * Get user upload directory path
   * @param {string|number} userId - User ID
   * @returns {string} User upload directory path
   */
  getUserUploadDir(userId) {
    return path.join(this.uploadDir, userId.toString());
  }

  /**
   * List user's uploaded files
   * @param {string|number} userId - User ID
   * @returns {Promise<Array>} Array of file information
   */
  async listUserFiles(userId) {
    try {
      const userDir = this.getUserUploadDir(userId);
      
      if (!await fs.pathExists(userDir)) {
        return [];
      }
      
      const files = await fs.readdir(userDir);
      const fileList = [];
      
      for (const file of files) {
        const filePath = path.join(userDir, file);
        const stats = await this.getFileStats(filePath);
        
        if (stats && stats.isFile) {
          fileList.push({
            filename: file,
            path: filePath,
            size: stats.size,
            created: stats.created,
            modified: stats.modified
          });
        }
      }
      
      return fileList.sort((a, b) => b.created - a.created);
    } catch (error) {
      console.error('❌ Failed to list user files:', error);
      return [];
    }
  }

  /**
   * Clean up old files
   * @param {number} maxAge - Maximum age in milliseconds
   * @returns {Promise<number>} Number of files cleaned up
   */
  async cleanupOldFiles(maxAge = 24 * 60 * 60 * 1000) { // Default: 24 hours
    try {
      let cleanedCount = 0;
      const now = Date.now();
      
      if (!await fs.pathExists(this.uploadDir)) {
        return 0;
      }
      
      const userDirs = await fs.readdir(this.uploadDir);
      
      for (const userDir of userDirs) {
        const userPath = path.join(this.uploadDir, userDir);
        const stats = await fs.stat(userPath);
        
        if (stats.isDirectory()) {
          const files = await fs.readdir(userPath);
          
          for (const file of files) {
            const filePath = path.join(userPath, file);
            const fileStats = await fs.stat(filePath);
            
            if (fileStats.isFile() && (now - fileStats.mtime.getTime()) > maxAge) {
              await this.cleanupFile(filePath);
              cleanedCount++;
            }
          }
        }
      }
      
      console.log(`🧹 Cleaned up ${cleanedCount} old files`);
      return cleanedCount;
    } catch (error) {
      console.error('❌ Failed to cleanup old files:', error);
      return 0;
    }
  }
}

module.exports = FileUploadService;
