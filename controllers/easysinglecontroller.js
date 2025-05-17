const axios = require('axios');
const Consultas = require('../models/consultasModel');
const User = require('../models/user');

const EASYPAY_API_URL = 'https://api.test.easypay.pt/2.0';
const CHECKOUT_URL = `${EASYPAY_API_URL}/checkout`;
const ACCOUNT_ID = process.env.EASYPAY_ACCOUNT_ID;
const API_KEY = process.env.EASYPAY_API_KEY;

const createPaymentPayload = (consulta, medico, currentUser) => {
  if (!currentUser.phone) {
    throw new Error('User phone number is required');
  }
  if (!currentUser.fiscalNumber) {
    throw new Error('User fiscal number is required');
  }

  return {
    type: ["single"],
    payment: {
      methods: ['cc', 'mb', 'mbw'],
      type: "sale",
      capture: {
        descriptive: `Consulta with ${medico.username}`,
        transaction_key: `consulta-${consulta._id}`
      },
      currency: "EUR",
      value: parseFloat(medico.pconsulta || 80).toFixed(2),
      customer: {
        email: currentUser.email,
        name: currentUser.username,
        phone: currentUser.phone,
        phone_indicative: "+351",
        fiscal_number: currentUser.fiscalNumber,
        key: currentUser._id.toString(),
        language: "PT"
      }
    },
    order: {
      items: [{
        description: `Medical consultation with ${medico.username}`,
        quantity: 1,
        key: `consulta-${consulta._id}`,
        value: parseFloat(medico.pconsulta || 80).toFixed(2)
      }],
      key: `consulta-${consulta._id}`,
      value: parseFloat(medico.pconsulta || 80).toFixed(2)
    }
  };
};

exports.createConsultaPayment = async (req, res) => {
  const { consultaId } = req.body;
  const currentUser = res.locals.user;

  try {

    const consulta = await Consultas.findOne({
      _id: consultaId,
      clienteId: currentUser._id,
      status: 'pending_payment'
    }).populate('medicoId');

    if (!consulta) {
      return res.status(404).json({
        success: false,
        message: 'Consulta not found or already paid'
      });
    }

    const medico = await User.findById(consulta.medicoId._id);
    const payload = createPaymentPayload(consulta, medico, currentUser);

    console.log('Sending payload to EasyPay:', JSON.stringify(payload, null, 2));

    const response = await axios.post(CHECKOUT_URL, payload, {
      headers: {
        'AccountId': ACCOUNT_ID,
        'ApiKey': API_KEY,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    consulta.paymentId = response.data.id;
    consulta.price = medico.pconsulta || 80;
    consulta.paymentStatus = 'initiated';
    await consulta.save();

    res.status(201).json({
      success: true,
      id: response.data.id,
      session: response.data.session,
      config: response.data.config || null,
      paymentId: response.data.id,
      consultaId: consulta._id
    });

  } catch (error) {
    console.error('Error creating consulta payment:', error);
    if (error.response) {
      console.error('EasyPay API response:', {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers
      });
    }

    const errorMessage = error.response?.data?.message || 
                       Array.isArray(error.response?.data?.message) 
                         ? error.response.data.message.join(', ')
                         : error.message;

    res.status(error.response?.status || 500).json({
      success: false,
      message: 'Error creating payment',
      error: errorMessage
    });
  }
};

exports.verifyConsultaPayment = async (req, res) => {
  const { paymentId } = req.params;

  try {
    const response = await axios.get(`${CHECKOUT_URL}/${paymentId}`, {
      headers: {
        'AccountId': ACCOUNT_ID,
        'ApiKey': API_KEY
      }
    });

    const paymentData = response.data;
    const paymentStatus = paymentData.payment?.status?.toLowerCase();

    if (['success', 'authorised', 'complete', 'paid'].includes(paymentStatus)) {
      const updatedConsulta = await Consultas.findOneAndUpdate(
        { paymentId },
        {
          status: 'scheduled',
          paymentStatus: 'completed',
          paidAt: new Date()
        },
        { new: true }
      );

      if (!updatedConsulta) {
        return res.status(404).json({
          success: false,
          message: 'Consulta not found'
        });
      }

      return res.json({
        success: true,
        status: 'completed',
        payment: paymentData
      });
    }

    if (['pending', 'waiting'].includes(paymentStatus)) {
      return res.json({
        success: true,
        status: 'pending',
        payment: paymentData
      });
    }

    if (['failed', 'rejected', 'error'].includes(paymentStatus)) {
      await Consultas.findOneAndUpdate(
        { paymentId },
        { paymentStatus: 'failed' }
      );
      return res.json({
        success: false,
        status: 'failed',
        payment: paymentData
      });
    }

    return res.json({
      success: true,
      status: paymentStatus || 'unknown',
      payment: paymentData
    });

  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying payment',
      error: error.response?.data || error.message
    });
  }
};

exports.handlePaymentCallback = async (req, res) => {
  const { paymentId, status } = req.query;

  try {
    const consulta = await Consultas.findOne({ paymentId });
    if (!consulta) {
      return res.status(404).json({
        success: false,
        message: 'Consulta not found'
      });
    }

    const response = await axios.get(`${CHECKOUT_URL}/${paymentId}`, {
      headers: {
        'AccountId': ACCOUNT_ID,
        'ApiKey': API_KEY
      }
    });

    const paymentStatus = response.data.payment?.status?.toLowerCase();

    if (['success', 'authorised', 'complete', 'paid'].includes(paymentStatus)) {
      consulta.status = 'scheduled';
      consulta.paymentStatus = 'completed';
      consulta.paidAt = new Date();
      await consulta.save();
      return res.redirect('/payment/success');
    }

    consulta.paymentStatus = 'failed';
    await consulta.save();
    return res.redirect('/payment/failed');

  } catch (error) {
    console.error('Error handling payment callback:', error);
    return res.redirect('/payment/error');
  }
};