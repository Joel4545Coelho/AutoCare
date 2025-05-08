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
        // Check existing subscription
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

        // Calculate dates
        const startTime = new Date();
        const expirationTime = new Date();
        
        if (plano.duracao === 'mensal') expirationTime.setMonth(expirationTime.getMonth() + 1);
        else if (plano.duracao === 'trimestral') expirationTime.setMonth(expirationTime.getMonth() + 3);
        else if (plano.duracao === 'anual') expirationTime.setFullYear(expirationTime.getFullYear() + 1);

        // Create Checkout session for subscription
        const checkoutPayload = {
            type: ["subscription"],
            payment: {
                methods: ["cc", "mbw"], // Credit Card and MB Way
                type: "sale",
                capture: {
                    descriptive: `Subscription: ${plano.nome}`
                },
                start_time: formatDateTime(startTime),
                frequency: getFrequency(plano.duracao),
                expiration_time: formatDateTime(new Date(expirationTime.getTime() + 15 * 60000)), // 15 minutes from now
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
        const checkoutResponse = await axios.post(`${EASYPAY_API_URL}/checkout`, checkoutPayload, {
            headers: {
                'AccountId': ACCOUNT_ID,
                'ApiKey': API_KEY,
                'Content-Type': 'application/json'
            }
        });

        // Create pending subscription record
        const novaAssinatura = new Subscription({
            userId: currentUser._id,
            planoId: plano._id,
            dataInicio: startTime,
            dataFim: expirationTime,
            status: 'pending',
            paymentStatus: 'pending',
            level: plano.level,
            easypayCheckoutId: checkoutResponse.data.id
        });

        await novaAssinatura.save();

        res.json({
            success: true,
            checkoutId: checkoutResponse.data.id,
            session: checkoutResponse.data.session,
            subscriptionId: novaAssinatura._id,
            url: checkoutResponse.data.method?.url // Include the redirect URL if available
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating subscription',
            error: error.response?.data || error.message
        });
    }
};

// Enhanced status checking
exports.checkSubscriptionStatus = async (req, res) => {
    const { subscriptionId } = req.params;

    try {
        // First check our database
        const subscription = await Subscription.findById(subscriptionId)
            .populate('planoId')
            .populate('userId');

        if (!subscription) {
            return res.status(404).json({ success: false, message: 'Subscription not found' });
        }

        // If already active in our system, return early
        if (subscription.status === 'active') {
            return res.json({
                success: true,
                status: 'active',
                subscription
            });
        }

        // Check with EasyPay API if we have a checkout ID
        if (subscription.easypayCheckoutId) {
            const response = await axios.get(
                `${EASYPAY_API_URL}/checkout/${subscription.easypayCheckoutId}`,
                {
                    headers: {
                        'AccountId': ACCOUNT_ID,
                        'ApiKey': API_KEY
                    }
                }
            );

            const checkoutData = response.data;

            // If payment was successful
            if (checkoutData.payment?.status === 'success') {
                // Update subscription to active
                subscription.status = 'active';
                subscription.paymentStatus = 'completed';
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

        // Default return if still pending
        res.json({
            success: true,
            status: subscription.status || 'pending',
            subscription
        });

    } catch (error) {
        console.error('Error checking subscription:', error);
        res.status(500).json({
            success: false,
            message: 'Error checking subscription status'
        });
    }
};