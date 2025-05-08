const User = require('../models/user');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

exports.updateAvatar = async (req, res) => {
  try {
    // Verifique se o arquivo foi enviado
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file provided' });
    }

    // Acesse o id do usuário a partir do corpo da requisição
    const { id } = req.body;

    // Encontre o usuário no banco de dados
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // A URL do avatar que será salva no banco de dados
    const photoUrl = file.location;

    // Atualize o campo avatar do usuário com a URL da imagem
    user.avatar = photoUrl;
    user.updatedAt = Date.now();

    // Salve o usuário com a nova URL do avatar
    await user.save();

    // Retorna uma resposta de sucesso com a URL da imagem
    res.json({ success: true, message: 'Avatar updated successfully', avatar: photoUrl });
  } catch (error) {
    // Captura erros e retorna um erro 500 se algo falhar no backend
    console.error('Error updating avatar:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
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
