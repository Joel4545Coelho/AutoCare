const news = require("../models/newsModel");
const User = require('../models/user')

const index = async (req, res) => {
  try {
    const noticia = await news.find().populate('organization_id'); // Ensure organization_id is populated
    res.status(200).json({ success: true, noticia });
  } catch (err) {
    console.error("Erro ao buscar detalhes do chat:", err);
    res.status(500).send("Erro ao buscar detalhes do chat");
  }
};
const indexN = async (req, res) => {
  try {
    const noticia = await news.find().populate('organization_id');
    const currentUser = res.locals.user;
    const userType = currentUser.type;
    const lista = noticia

    res.render("news/index", { success: true, lista, userType, currentUser });
  } catch (err) {
    console.error("Erro ao buscar detalhes do chat:", err);
    res.status(500).send("Erro ao buscar detalhes do chat");
  }
};

const inserir = async (req, res) => {
  const currentUser = res.locals.user;
  const currentUserId = currentUser._id;

  try {
    const { title, content } = req.body;
    const image = req.file ? req.file.filename : null;

    const noticia = await news.create({
      title,
      content,
      image,
      organization_id: currentUserId,
    });

    // Populate the organization_id field before sending the response
    const populatedNoticia = await news.findById(noticia._id).populate('organization_id');

    res.status(201).json({
      message: 'Notícia inserida com sucesso',
      noticia: populatedNoticia, // Send back the populated news item
    });
  } catch (err) {
    console.error('Erro ao inserir notícia:', err);
    res.status(500).json({ message: 'Erro ao inserir notícia' });
  }
};

const deletee = async (req, res) => {
  try {
    const noticia = await news.findById(req.params.id);
    if (!noticia) {
      return res.status(404).send({ message: "Notícia não encontrada" });
    }

    const currentUser = res.locals.user; // Use res.locals.user instead of req.user

    if (!currentUser) {
      return res.status(401).send({ message: "Usuário não autenticado" });
    }

    if (noticia.organization_id.toString() !== currentUser._id.toString()) {
      return res.status(403).send({ message: "Sem permissão para excluir esta notícia" });
    }

    await news.findByIdAndDelete(req.params.id);
    res.send({ message: "Notícia excluída com sucesso" });
  } catch (err) {
    console.error("Erro ao excluir notícia:", err);
    res.status(500).send({ message: "Erro ao excluir notícia" });
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;
    const image = req.file ? req.file.filename : null;

    const updates = { title, content };
    if (image) {
      updates.image = image;
    }

    const noticia = await news.findByIdAndUpdate(id, updates, { new: true });

    res.status(200).json({
      message: 'Notícia atualizada com sucesso',
      noticia,
    });
  } catch (err) {
    console.error('Erro ao atualizar notícia:', err);
    res.status(500).json({ message: 'Erro ao atualizar notícia' });
  }
};
const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const noticia = await news.findById(id).populate('organization_id');

    if (!noticia) {
      return res.status(404).json({ message: 'Notícia não encontrada' });
    }

    res.status(200).json({ noticia });
  } catch (err) {
    console.error('Erro ao buscar notícia por ID:', err);
    res.status(500).json({ message: 'Erro ao buscar notícia' });
  }
};


module.exports = { index, inserir, deletee, update, indexN, getById  };