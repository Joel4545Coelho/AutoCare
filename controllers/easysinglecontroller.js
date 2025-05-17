const axios = require('axios');
const Consultas = require('../models/consultasModel');
const User = require('../models/user');

const EASYPAY_API_URL = 'https://api.test.easypay.pt/2.0';
const SINGLE_PAYMENT_URL = `${EASYPAY_API_URL}/single`;
const CHECKOUT_URL = `${EASYPAY_API_URL}/checkout`;
const ACCOUNT_ID = process.env.EASYPAY_ACCOUNT_ID;
const API_KEY = process.env.EASYPAY_API_KEY;

exports.createConsultaPayment = async (req, res) => {
    const { consultaId } = req.body;
    const currentUser = res.locals.user;

    try {
        // Verify consulta exists and belongs to this user
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

        // Get medico's consulta price or use default
        const medico = await User.findById(consulta.medicoId._id);
        const consultaPrice = medico.pconsulta || 80; // Default price if not set

        // Create EasyPay Checkout payload
        const checkoutPayload = {
            type: ["single"],
            payment: {
                methods: ['cc', 'mb', 'mbw'],
                type: "sale",
                capture: {
                    descriptive: `Consulta with ${medico.username}`,
                    transaction_key: `consulta-${consultaId}`
                },
                currency: "EUR",
                value: parseFloat(consultaPrice.toFixed(2)),
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
                    key: `consulta-${consultaId}`,
                    value: parseFloat(consultaPrice.toFixed(2))
                }],
                key: `consulta-${consultaId}`,
                value: parseFloat(consultaPrice.toFixed(2))
            }
        };

        // Create EasyPay Checkout
        const response = await axios.post(CHECKOUT_URL, checkoutPayload, {
            headers: {
                'AccountId': ACCOUNT_ID,
                'ApiKey': API_KEY,
                'Content-Type': 'application/json'
            },
            timeout: 10000 // 10 second timeout
        });

        // Update consulta with payment ID
        consulta.paymentId = response.data.id;
        consulta.price = consultaPrice;
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
        res.status(500).json({
            success: false,
            message: 'Error creating payment',
            error: error.response?.data || error.message
        });
    }
};

exports.verifyConsultaPayment = async (req, res) => {
    const { paymentId } = req.params;

    try {
        // Check payment status with EasyPay
        const response = await axios.get(`${CHECKOUT_URL}/${paymentId}`, {
            headers: {
                'AccountId': ACCOUNT_ID,
                'ApiKey': API_KEY
            }
        });

        const paymentData = response.data;

        // Update consulta status based on payment status
        if (paymentData.payment?.status === 'success') {
            await Consultas.findOneAndUpdate(
                { paymentId: paymentId },
                {
                    status: 'scheduled',
                    paymentStatus: 'completed'
                }
            );

            return res.json({
                success: true,
                status: 'completed',
                payment: paymentData
            });
        }

        res.json({
            success: true,
            status: paymentData.payment?.status || 'pending',
            payment: paymentData
        });

    } catch (error) {
        console.error('Error verifying payment:', error);
        res.status(500).json({
            success: false,
            message: 'Error verifying payment',
            error: error.message
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

        if (status === 'success') {
            // Verify payment with EasyPay
            const response = await axios.get(`${SINGLE_PAYMENT_URL}/${paymentId}`, {
                headers: {
                    'AccountId': ACCOUNT_ID,
                    'ApiKey': API_KEY
                }
            });

            if (response.data.method.status === 'success') {
                consulta.status = 'scheduled';
                consulta.paymentStatus = 'completed';
                await consulta.save();

                return res.redirect('/payment/success');
            }
        }

        // If payment failed
        consulta.paymentStatus = 'failed';
        await consulta.save();
        return res.redirect('/payment/failed');

    } catch (error) {
        console.error('Error handling payment callback:', error);
        return res.redirect('/payment/error');
    }
};

exports.verifyPayment = async (req, res) => {
  const { paymentId, consultaId } = req.body;

  try {
    // First verify with EasyPay
    const response = await axios.get(`${CHECKOUT_URL}/${paymentId}`, {
      headers: {
        'AccountId': ACCOUNT_ID,
        'ApiKey': API_KEY
      }
    });

    const paymentData = response.data;
    console.log('Payment verification data:', paymentData); // Add logging

    // Check payment status - modified to handle MB Way specifically
    let isSuccess = false;
    let isPending = false;
    const paymentMethod = paymentData.payment?.method;

    if (paymentMethod === 'mbw') {
      // MB Way specific status checks
      if (paymentData.method?.status === 'success') {
        isSuccess = true;
      } else if (paymentData.method?.status === 'pending' || 
                 paymentData.payment?.status === 'pending') {
        isPending = true;
      }
    } else {
      // For other payment methods (CC, MB)
      isSuccess = ['success', 'authorised', 'complete'].includes(paymentData.payment?.status);
      isPending = paymentData.payment?.status === 'pending';
    }

    if (isSuccess) {
      // Update consulta status
      const updatedConsulta = await Consultas.findOneAndUpdate(
        { _id: consultaId, paymentId },
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
        paymentStatus: 'completed',
        paymentMethod: paymentMethod,
        consulta: updatedConsulta
      });
    }

    // If payment is pending (especially for MB Way)
    if (isPending) {
      return res.json({
        success: false,
        paymentStatus: 'pending',
        paymentMethod: paymentMethod,
        message: paymentMethod === 'mbw' ? 
          'Waiting for MB Way payment confirmation' : 
          'Payment still processing'
      });
    }

    // If payment failed
    return res.json({
      success: false,
      paymentStatus: paymentData.payment?.status || 'failed',
      paymentMethod: paymentMethod,
      message: 'Payment failed or was canceled'
    });

  } catch (error) {
    console.error('Error verifying payment:', error);
    return res.status(500).json({
      success: false,
      message: 'Error verifying payment',
      error: error.message
    });
  }
};