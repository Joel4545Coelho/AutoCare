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

        // Calculate dates
        const startTime = new Date();
        startTime.setMinutes(startTime.getMinutes() + 5); // Start 5 minutes from now

        let expirationTime = new Date(startTime);
        if (plano.duracao === 'mensal') expirationTime.setMonth(expirationTime.getMonth() + 1);
        else if (plano.duracao === 'trimestral') expirationTime.setMonth(expirationTime.getMonth() + 3);
        else if (plano.duracao === 'anual') expirationTime.setFullYear(expirationTime.getFullYear() + 1);
        // Map duration to frequency
        const frequencyMap = {
            'mensal': '1M',
            'trimestral': '3M',
            'anual': '1Y'
        };

        const payload = {
            capture: {
                descriptive: `Subscription: ${plano.nome}`
            },
            expiration_time: formatDateTime(expirationTime),
            currency: "EUR",
            customer: {
                name: currentUser.name,
                email: currentUser.email,
                phone: currentUser.phone || '911234567',
                phone_indicative: "+351",
                fiscal_number: currentUser.fiscalNumber || "PT123456789",
                key: currentUser._id.toString(),
                language: "PT"
            },
            value: plano.preco,
            frequency: frequencyMap[plano.duracao] || '1M',
            start_time: formatDateTime(startTime),
            failover: true,
            retries: 2,
            method: "cc"
        };

        // Make API request to EasyPay
        const response = await axios.post(`${EASYPAY_API_URL}/subscription`, payload, {
            headers: {
                'AccountId': process.env.EASYPAY_ACCOUNT_ID,
                'ApiKey': process.env.EASYPAY_API_KEY,
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
            easypayId: response.data.id
        });

        await novaAssinatura.save();

        res.json({
            success: true,
            url: response.data.method?.url, // Payment URL for CC
            subscriptionId: novaAssinatura._id
        });

    } catch (error) {
        console.error('EasyPay API Error:', {
            message: error.message,
            response: error.response?.data,
            config: error.config,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
        res.status(500).json({ 
            success: false, 
            message: 'Error creating subscription',
            error: error.response?.data?.message || error.message
        });
    }
};

exports.checkSubscriptionStatus = async (req, res) => {
    const { subscriptionId } = req.params;

    try {
        const subscription = await Subscription.findById(subscriptionId);
        if (!subscription) {
            return res.status(404).json({ success: false, message: 'Subscription not found' });
        }

        // If already active, return early
        if (subscription.status === 'active') {
            return res.json({
                success: true,
                status: 'active',
                subscription
            });
        }

        // Get status from EasyPay
        const response = await axios.get(
            `${EASYPAY_API_URL}/subscription/${subscription.easypayId}`,
            {
                headers: {
                    'AccountId': ACCOUNT_ID,
                    'ApiKey': API_KEY
                }
            }
        );

        const easypayData = response.data;

        // Update if payment succeeded
        if (easypayData.method?.status === 'active') {
            subscription.status = 'active';
            subscription.paymentStatus = 'completed';
            subscription.dataInicio = new Date(easypayData.start_time);

            // Calculate end date based on frequency
            const frequency = easypayData.frequency;
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
        }

        res.json({
            success: true,
            status: subscription.status,
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