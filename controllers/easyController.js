// Update the EasyPay API endpoint
const EASYPAY_API_URL = 'https://api.test.easypay.pt/2.0';

// Enhanced createEasyPaySubscription function
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
    let expirationTime = new Date();
    
    if (plano.duracao === 'mensal') expirationTime.setMonth(expirationTime.getMonth() + 1);
    else if (plano.duracao === 'trimestral') expirationTime.setMonth(expirationTime.getMonth() + 3);
    else if (plano.duracao === 'anual') expirationTime.setFullYear(expirationTime.getFullYear() + 1);

    // Map duration to frequency
    const frequencyMap = {
      'mensal': '1M',
      'trimestral': '3M',
      'anual': '1Y'
    };

    // Create SDD Mandate if using Direct Debit
    const sddMandate = {
      name: currentUser.name,
      email: currentUser.email,
      phone: currentUser.phone || '911234567',
      account_holder: currentUser.name,
      country_code: "PT"
    };

    // Create payload
    const payload = {
      capture: {
        expiration_time: formatDateTime(expirationTime),
        descriptive: `Subscription: ${plano.nome}`
      },
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
      method: "cc", // Default to credit card
      sdd_mandate: sddMandate
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
      checkoutId: response.data.id,
      url: response.data.method?.url, // Payment URL
      subscriptionId: novaAssinatura._id
    });

  } catch (error) {
    console.error('Full error:', error);
    console.error('Error details:', error.response?.data || error.message);
    
    res.status(500).json({ 
      success: false, 
      message: 'Error creating subscription',
      error: {
        message: error.message,
        response: error.response?.data,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }
    });
  }
};