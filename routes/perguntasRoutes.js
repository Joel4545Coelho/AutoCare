const express = require("express");
const router = express.Router();
const Doenca = require("../models/Doenca"); 

router.get("/:doenca", async (req, res) => {
    try {
        const doenca = req.params.doenca

        console.log(`🔍 Buscando perguntas para a doença: ${doenca}`);

        const doencaData = await Doenca.findOne({ doenca: doenca });

        if (!doencaData) {
            return res.status(404).json({ message: `Doença não encontrada: ${doenca}` });
        }

        res.json(doencaData.perguntas); 
    } catch (error) {
        console.error("❌ Erro ao buscar perguntas:", error);
        res.status(500).json({ message: "Erro ao buscar perguntas", error });
    }
});

module.exports = router;
