const User = require('../models/user');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { Binary } = require('mongodb');

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    // Create directory if it doesn't exist
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

exports.updateAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    // Read the file into base64
    const filePath = req.file.path;
    const fileData = fs.readFileSync(filePath);
    const base64Data = fileData.toString('base64');

    // Store as binary in MongoDB
    const user = await User.findByIdAndUpdate(
      req.body.id,
      { 
        avatar: Binary.createFromBase64(base64Data),
        avatarContentType: req.file.mimetype 
      },
      { new: true }
    );

    // Clean up the temporary file
    fs.unlinkSync(filePath);

    // Return the avatar as base64 URL
    res.json({
      success: true,
      avatar: `data:${req.file.mimetype};base64,${base64Data}`
    });
  } catch (error) {
    console.error('Avatar update error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.updateProfile = async (req, res) => {
  const { id, name, email, currentPassword, newPassword } = req.body;
  try {
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Se currentPassword for fornecida, verifique se ela corresponde à senha armazenada
    if (currentPassword) {
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ success: false, message: 'Current password is incorrect' });
      }
    }

    // Atualize o nome e o email, se fornecido
    if (name) user.username = name;
    if (email) user.email = email;

    // Se uma nova senha for fornecida, criptografe-a
    if (newPassword) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
    }

    // Salve as mudanças no banco de dados
    await user.save();
    res.status(200).json({ success: true, message: 'Profile updated successfully', user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'An error occurred while updating profile' });
  }
};
