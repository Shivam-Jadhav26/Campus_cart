import multer from "multer";

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("INVALID_FILE_TYPE"), false);
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit per file
  },
  fileFilter,
});

// Catch multer errors specifically in a wrapper
export const uploadImages = (req, res, next) => {
  const uploadMiddleware = upload.array("images", 5);

  uploadMiddleware(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ success: false, message: "File too large. Max size is 5MB." });
      }
      if (err.code === "LIMIT_UNEXPECTED_FILE") {
        return res.status(400).json({ success: false, message: "Too many files or incorrect field name. Max is 5 files via 'images' field." });
      }
      return res.status(400).json({ success: false, message: err.message });
    } else if (err) {
      if (err.message === "INVALID_FILE_TYPE") {
        return res.status(400).json({ success: false, message: "Invalid file type. Only JPEG, PNG, and WebP are allowed." });
      }
      return res.status(500).json({ success: false, message: "File upload error", error: err.message });
    }
    next();
  });
};

export default uploadImages;
