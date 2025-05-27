const User = require("../models/user");

async function addFirebaseToken(req, res) {
  const { userId } = req.params;
  const { token: token_firebase } = req.body; 

  if (!token_firebase) {
    return res.status(400).json({ message: "Token não fornecido." });
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado." });
    }

    if (!user.tokens_associados) {
      user.tokens_associados = [];
    }
    
    if (!user.tokens_associados.includes(token_firebase)) {
      user.tokens_associados.push(token_firebase);
      await user.save();
    }

    return res.status(200).json(user);
  } catch (error) {
    console.error("Erro ao adicionar token firebase:", error);
    return res.status(500).json({ message: "Erro interno do servidor." });
  }
}

module.exports = { addFirebaseToken };
