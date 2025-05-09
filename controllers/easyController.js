const axios = require('axios');
const Subscription = require('../models/subscriptionModel');
const Plano = require('../models/planModel');
const User = require('../models/user');

const EASYPAY_API_URL = 'https://api.test.easypay.pt/2.0';
const CHECKOUT_URL = `${EASYPAY_API_URL}/checkout`;
const ACCOUNT_ID = process.env.EASYPAY_ACCOUNT_ID;
const API_KEY = process.env.EASYPAY_API_KEY;

function formatDateTime(date) {
    const pad = num => num.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

exports.createEasyPaySubscription = async (req, res) => {
    const { planoId } = req.body;
    const currentUser = res.locals.user;

    try {
        // Validate required environment variables
        if (!ACCOUNT_ID || !API_KEY) {
            throw new Error('EasyPay credentials not configured');
        }

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

        const plano = await Plano.findById(planoId);
        if (!plano) {
            return res.status(404).json({ success: false, message: 'Plan not found' });
        }

        // Calculate dates
        const now = new Date();
        const startTime = new Date(now.getTime() + 5 * 60000); // 5 minutes from now
        const expirationTime = new Date(startTime);
        
        if (plano.duracao === 'mensal') expirationTime.setMonth(expirationTime.getMonth() + 1);
        else if (plano.duracao === 'trimestral') expirationTime.setMonth(expirationTime.getMonth() + 3);
        else if (plano.duracao === 'anual') expirationTime.setFullYear(expirationTime.getFullYear() + 1);

        // Create Checkout payload
        const checkoutPayload = {
            type: ["subscription"],
            payment: {
                methods: ["cc", "mbw"],
                type: "sale",
                capture: {
                    descriptive: `Subscription: ${plano.nome}`,
                    transaction_key: `sub-${currentUser._id}-${Date.now()}`
                },
                start_time: formatDateTime(startTime),
                frequency: getFrequency(plano.duracao),
                expiration_time: formatDateTime(new Date(startTime.getTime() + 30 * 60000)), // 30 minutes
                currency: "EUR",
                value: plano.preco,
                customer: {
                    email: currentUser.email,
                    name: currentUser.name,
                    phone: currentUser.phone || '911234567',
                    phone_indicative: "+351",
                    fiscal_number: currentUser.fiscalNumber || "PT123456789",
                    key: currentUser._id.toString()
                }
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
            }
        };

        // Create Checkout session
        const checkoutResponse = await axios.post(CHECKOUT_URL, checkoutPayload, {
            headers: {
                'AccountId': ACCOUNT_ID,
                'ApiKey': API_KEY,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            timeout: 10000
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
            easypayCheckoutId: checkoutResponse.data.id
        });

        await novaAssinatura.save();

        res.json({
            success: true,
            checkoutId: checkoutResponse.data.id,
            session: checkoutResponse.data.session,
            subscriptionId: novaAssinatura._id,
            url: checkoutResponse.data.method?.url,
            createdAt: Date.now(),
            planoId: plano._id
        });

    } catch (error) {
        console.error('Error creating subscription:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating subscription',
            error: error.message
        });
    }
};

// Enhanced status checking with proper callbacks
exports.checkSubscriptionStatus = async (req, res) => {
    const { subscriptionId } = req.params;

    try {
        const subscription = await Subscription.findById(subscriptionId)
            .populate('planoId')
            .populate('userId');

        if (!subscription) {
            return res.status(404).json({ 
                success: false, 
                message: 'Subscription not found' 
            });
        }

        // If already active, return immediately
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

            // Handle successful payment
            if (checkoutData.payment?.status === 'success') {
                // Update subscription
                subscription.status = 'active';
                subscription.paymentStatus = 'completed';
                await subscription.save();

                // Update user level
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

        // Handle expired subscriptions
        if (subscription.status === 'pending' && new Date() > subscription.dataFim) {
            subscription.status = 'expired';
            await subscription.save();
            
            // Reset user level if subscription expired
            await User.findByIdAndUpdate(subscription.userId, {
                sublevel: 'free',
                subscription: null
            });

            return res.json({
                success: true,
                status: 'expired',
                subscription
            });
        }

        // Default return
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

function getFrequency(duracao) {
    const map = {
        'mensal': '1M',
        'trimestral': '3M',
        'anual': '1Y'
    };
    return map[duracao] || '1M';
}