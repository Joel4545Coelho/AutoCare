const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Configuração dos diretórios
const uploadsDir = path.join(__dirname, '../uploads');
const receitasDir = path.join(uploadsDir, 'receitas');

// Cria os diretórios se não existirem
[uploadsDir, receitasDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configuração de armazenamento
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, receitasDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `receita-${uniqueSuffix}${ext}`;
    cb(null, filename);
  }
});

// Filtro de arquivos permitidos - mais flexível
const fileFilter = (req, file, cb) => {
  // Lista de tipos MIME permitidos
  const allowedMimeTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/jpg'
  ];

  // Verifica se o tipo MIME está na lista permitida
  if (allowedMimeTypes.includes(file.mimetype)) {
    return cb(null, true);
  }

  // Se o tipo MIME não for reconhecido, verifica pela extensão
  const ext = path.extname(file.originalname).toLowerCase();
  if (['.pdf', '.jpg', '.jpeg', '.png'].includes(ext)) {
    return cb(null, true);
  }

  // Se nenhum dos critérios for atendido, rejeita o arquivo
  cb(new Error('Tipo de arquivo inválido. São permitidos apenas PDF, JPG, JPEG e PNG'), false);
};

// Configuração do Multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // Limite de 10MB
    files: 1
  }
});

module.exports = upload;