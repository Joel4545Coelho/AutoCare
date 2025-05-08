const axios = require('axios');
const Subscription = require('../models/subscriptionModel');
const Plano = require('../models/planModel');
const User = require('../models/user');

const EASYPAY_API_URL = 'https://api.test.easypay.pt/2.0';
const ACCOUNT_ID = process.env.EASYPAY_ACCOUNT_ID;
const API_KEY = process.env.EASYPAY_API_KEY;

function formatDateTime(date) {
    const pad = num => num.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// Create EasyPay subscription
exports.createEasyPaySubscription = async (req, res) => {
    const { planoId } = req.body;
    const currentUser = res.locals.user;

    try {
        // Check if user already has an active subscription
        const existingSubscription = await Subscription.findOne({
            userId: currentUser._id,
            status: 'active'
        });

        if (existingSubscription) {
            return res.status(400).json({
                success: false,
                message: 'You already have an active subscription'
            });
        }

        // Get the plan
        const plano = await Plano.findById(planoId);
        if (!plano) {
            return res.status(404).json({ success: false, message: 'Plan not found' });
        }

        // Calculate dates - FIXED: Initialize startTime first
        const startTime = new Date();
        startTime.setMinutes(startTime.getMinutes() + 5); // Start 5 minutes from now

        // FIXED: Initialize expirationTime after startTime is defined
        let expirationTime = new Date(startTime);
        if (plano.duracao === 'mensal') {
            expirationTime.setMonth(expirationTime.getMonth() + 1);
        } else if (plano.duracao === 'trimestral') {
            expirationTime.setMonth(expirationTime.getMonth() + 3);
        } else if (plano.duracao === 'anual') {
            expirationTime.setFullYear(expirationTime.getFullYear() + 1);
        }

        // Map duration to frequency
        const frequencyMap = {
            'mensal': '1M',
            'trimestral': '3M',
            'anual': '1Y'
        };

        const checkoutPayload = {
            type: ["subscription"],
            payment: {
                methods: ["cc", "mbw"],
                type: "sale",
                capture: {
                    descriptive: `Subscrição: ${plano.nome}`,
                    transaction_key: `sub_${currentUser._id}_${Date.now()}` // Add transaction key
                },
                start_time: formatDateTime(startTime),
                frequency: frequencyMap[plano.duracao] || '1M',
                expiration_time: formatDateTime(expirationTime),
                currency: "EUR",
                value: plano.preco
            },
            order: {
                items: [{
                    description: plano.nome,
                    quantity: 1,
                    key: plano._id.toString(),
                    value: plano.preco
                }],
                key: `sub-${currentUser._id}-${Date.now()}`,
                value: plano.preco
            },
            customer: {
                name: currentUser.name,
                email: currentUser.email,
                phone: currentUser.phone || '911234567',
                phone_indicative: "+351",
                fiscal_number: currentUser.fiscalNumber || "PT123456789",
                key: currentUser._id.toString(),
                language: "PT"
            }
        };

        // Create Checkout session
        const response = await axios.post(`${EASYPAY_API_URL}/checkout`, checkoutPayload, {
            headers: {
                'AccountId': ACCOUNT_ID,
                'ApiKey': API_KEY,
                'Content-Type': 'application/json'
            }
        });

        // Create subscription record
        const novaAssinatura = new Subscription({
            userId: currentUser._id,
            planoId: plano._id,
            dataInicio: startTime,
            dataFim: expirationTime,
            status: 'pending', 
            paymentStatus: 'pending',
            level: plano.level,
            easypayId: response.data.id,
            transactionKey: checkoutPayload.payment.capture.transaction_key,
            lastChecked: new Date()
        });
        

        await novaAssinatura.save();

        res.json({
            success: true,
            url: response.data.url, // This will trigger the redirect
            subscriptionId: novaAssinatura._id
        });

    } catch (error) {
        console.error('EasyPay API Error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error creating subscription',
            error: error.response?.data?.message || error.message
        });
    }
};

// Enhanced status checking
exports.checkSubscriptionStatus = async (req, res) => {
    const { subscriptionId } = req.params;

    try {
        const subscription = await Subscription.findById(subscriptionId);
        if (!subscription) {
            return res.status(404).json({ success: false, message: 'Subscription not found' });
        }

        // Update last checked time
        subscription.lastChecked = new Date();
        await subscription.save();

        // First check our database status
        if (subscription.status === 'active') {
            return res.json({
                success: true,
                status: 'active',
                subscription
            });
        }

        // Then check with EasyPay API
        if (subscription.easypayId) {
            const response = await axios.get(
                `${EASYPAY_API_URL}/subscription/${subscription.easypayId}`,
                {
                    headers: {
                        'AccountId': ACCOUNT_ID,
                        'ApiKey': API_KEY
                    }
                }
            );

            const subscriptionData = response.data;

            // Check payment method status
            if (subscriptionData.method?.status === 'active') {
                // Update subscription to active
                subscription.status = 'active';
                subscription.paymentStatus = 'completed';
                subscription.dataInicio = new Date(subscriptionData.start_time);
                
                // Calculate end date based on frequency
                const frequency = subscriptionData.frequency;
                const endDate = new Date(subscription.dataInicio);
                
                if (frequency === '1M') endDate.setMonth(endDate.getMonth() + 1);
                else if (frequency === '3M') endDate.setMonth(endDate.getMonth() + 3);
                else if (frequency === '1Y') endDate.setFullYear(endDate.getFullYear() + 1);
                
                subscription.dataFim = endDate;
                await subscription.save();

                // Update user
                await User.findByIdAndUpdate(subscription.userId, {
                    sublevel: subscription.level,
                    subscription: subscription._id
                });

                return res.json({
                    success: true,
                    status: 'active',
                    subscription
                });
            }
        }

        // If still pending, return current status
        res.json({
            success: true,
            status: subscription.status || 'pending',
            subscription
        });

    } catch (error) {
        console.error('Error checking subscription:', error);
        res.status(500).json({
            success: false,
            message: 'Error checking subscription status',
            error: error.response?.data || error.message
        });
    }
};