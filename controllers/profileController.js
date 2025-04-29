const User = require('../models/user');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

exports.updateAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file provided' });
    }

    const { id } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Create uploads directory if it doesn't exist
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Generate unique filename
    const fileName = `${Date.now()}-${req.file.originalname}`;
    const filePath = path.join(uploadDir, fileName);

    // Move the file to uploads directory
    fs.renameSync(req.file.path, filePath);

    // Construct the URL that will be accessible from the frontend
    const photoUrl = `/uploads/${fileName}`;

    // Update user's avatar
    user.avatar = photoUrl;
    await user.save();

    res.json({ 
      success: true, 
      message: 'Avatar updated successfully', 
      avatar: photoUrl 
    });
  } catch (error) {
    console.error('Error updating avatar:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
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
