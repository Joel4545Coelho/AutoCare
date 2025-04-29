const User = require('../models/user');
const Plano = require('../models/planModel');
const Subscription = require('../models/subscriptionModel');

exports.getPlanos = async (req, res) => {
  try {
    const planos = await Plano.aggregate([
        { $match: { ativo: true } },
        { $project: {
            nome: '$nome',
            descricao: '$descricao',
            preco: 1,
            duracao: '$duracao',
            beneficios: 1,
            ativo: 1,
            level:'level'
          }
        }
      ]);
    res.json(planos);
  } catch (error) {
    console.error('Erro ao buscar planos:', error);
    res.status(500).json({ success: false, message: 'Erro ao buscar planos disponíveis' });
  }
};

exports.getPlanoAtual = async (req, res) => {
  const currentUser = res.locals.user;
  
  try {
    const assinatura = await Subscription.findOne({ 
      userId: currentUser._id,
      status: 'active'
    }).populate('planoId');

    if (!assinatura) {
      return res.json({ success: true, hasSubscription: false });
    }

    res.json({ 
      success: true,
      hasSubscription: true,
      assinatura 
    });
  } catch (error) {
    console.error('Erro ao buscar plano atual:', error);
    res.status(500).json({ success: false, message: 'Erro ao buscar plano atual' });
  }
};

exports.assinarPlano = async (req, res) => {
  const currentUser = res.locals.user;
  const { planoId } = req.body;

  if (currentUser.type !== 'paciente') {
    return res.status(403).json({ success: false, message: 'Apenas pacientes podem assinar planos' });
  }

  try {
    // Check if user already has an active subscription
    const existingSubscription = await Subscription.findOne({
      userId: currentUser._id,
      status: 'active'
    });

    if (existingSubscription) {
      return res.status(400).json({ 
        success: false, 
        message: 'Você já possui uma assinatura ativa' 
      });
    }

    // Get the plan
    const plano = await Plano.findById(planoId);
    if (!plano) {
      return res.status(404).json({ success: false, message: 'Plano não encontrado' });
    }

    // Calculate end date based on duration
    const dataInicio = new Date();
    let dataFim = new Date();
    
    if (plano.duracao === 'mensal') {
      dataFim.setMonth(dataFim.getMonth() + 1);
    } else if (plano.duracao === 'trimestral') {
      dataFim.setMonth(dataFim.getMonth() + 3);
    } else if (plano.duracao === 'anual') {
      dataFim.setFullYear(dataFim.getFullYear() + 1);
    }

    // Create subscription with pending payment
    const novaAssinatura = new Subscription({
      userId: currentUser._id,
      planoId: plano._id,
      dataInicio,
      dataFim,
      status: 'active',
      paymentStatus: 'pending',
      level: plano.level // Add the level from the plan
    });

    await novaAssinatura.save();

    // Update user's sublevel
    await User.findByIdAndUpdate(currentUser._id, { 
      sublevel: plano.level,
      subscription: novaAssinatura._id
    });

    res.json({ 
      success: true,
      message: 'Assinatura criada com sucesso. Realize o pagamento para ativar.',
      assinaturaId: novaAssinatura._id
    });
  } catch (error) {
    console.error('Erro ao assinar plano:', error);
    res.status(500).json({ success: false, message: 'Erro ao assinar plano' });
  }
};

exports.cancelarPlano = async (req, res) => {
  const currentUser = res.locals.user;

  try {
    const assinatura = await Subscription.findOne({
      userId: currentUser._id,
      status: 'active'
    });

    if (!assinatura) {
      return res.status(404).json({ success: false, message: 'Nenhuma assinatura ativa encontrada' });
    }

    assinatura.status = 'canceled';
    await assinatura.save();

    // Reset user's sublevel to free
    await User.findByIdAndUpdate(currentUser._id, { 
      sublevel: 'free',
      subscription: null
    });

    res.json({ success: true, message: 'Assinatura cancelada com sucesso' });
  } catch (error) {
    console.error('Erro ao cancelar assinatura:', error);
    res.status(500).json({ success: false, message: 'Erro ao cancelar assinatura' });
  }
};

exports.initiatePayment = async (req, res) => {
  const { assinaturaId } = req.body;
  const currentUser = res.locals.user;

  try {
    const assinatura = await Subscription.findOne({
      _id: assinaturaId,
      userId: currentUser._id,
      paymentStatus: 'pending'
    }).populate('planoId');

    if (!assinatura) {
      return res.status(404).json({ success: false, message: 'Assinatura não encontrada' });
    }

    // Mock payment processing
    // In a real app, this would redirect to a payment gateway
    assinatura.paymentStatus = 'completed';
    await assinatura.save();

    res.json({ 
      success: true,
      redirectTo: `/payment/confirmation?success=true&assinaturaId=${assinatura._id}`
    });
  } catch (error) {
    console.error('Erro ao processar pagamento:', error);
    res.json({ 
      success: false,
      redirectTo: '/payment/confirmation?success=false'
    });
  }
};