const Receita = require('../models/receita');

exports.getReceitasByPaciente = async (req, res) => {
  const { pacienteId } = req.params;

  try {
    const receitas = await Receita.find({ pacienteId: pacienteId })
      .sort({ createdAt: -1 }); // mais recentes primeiro

    if (!receitas || receitas.length === 0) {
      return res.status(404).json({ message: 'Nenhuma receita encontrada para este paciente.' });
    }

    res.status(200).json(receitas);
  } catch (error) {
    console.error('Erro ao buscar receitas:', error);
    res.status(500).json({ message: 'Erro ao buscar receitas.' });
  }
};
