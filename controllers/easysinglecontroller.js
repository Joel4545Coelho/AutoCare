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

        // Get medico's consulta price
        const medico = await User.findById(consulta.medicoId._id);
        const consultaPrice = medico.pconsulta || 80; // Default to 50 if not set

        // Debug: Log the price being used
        console.log(`Creating payment for consulta ${consultaId} with price ${consultaPrice}`);

        // Update consulta with the actual price
        consulta.price = consultaPrice;
        await consulta.save();

        // Create EasyPay Checkout payload (CC only)
        const checkoutPayload = {
            type: ["single"],
            payment: {
                methods: ["cc"], // Credit card only
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
                    phone: currentUser.phone || '911234567',
                    phone_indicative: "+351",
                    fiscal_number: currentUser.fiscalNumber || "PT123456789",
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
            }
        });

        // Return the full manifest including id and session
        res.status(201).json({
            success: true,
            id: response.data.id,
            session: response.data.session,
            config: response.data.config || null
        });

        // Debug: Log the full response
        console.log('EasyPay response:', response.data);

        // Update consulta with payment ID
        consulta.paymentId = response.data.id;
        await consulta.save();

        res.status(201).json({
            success: true,
            paymentId: response.data.id,
            session: response.data.session, // Send the session token to frontend
            consultaId: consulta._id
        });

    } catch (error) {
        // Enhanced error logging
        console.error('Error creating consulta payment:', error.response?.data || error.message);

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

                // Here you might want to send notifications to both parties
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