/**
 * Surest Plug - Full-Stack Express Server
 * Handles secure server-side FollowSPanel API proxy and static asset serving
 */

import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import fs from 'fs';

try {
  dotenv.config();
} catch (e) {
  // Ignore in environments without .env
}
import { 
  getFollowSPanelServices, 
  createFollowSPanelOrder, 
  getFollowSPanelOrderStatus, 
  getFollowSPanelMultipleOrderStatus,
  getFollowSPanelBalance,
  testFollowSPanelConnection,
  getFollowSPanelConfigStatus
} from './src/server/smmService.ts';
import {
  getCartlogsCategories,
  getCartlogsProducts,
  createCartlogsOrder,
  getCartlogsOrderStatus,
  testCartlogsConnection,
  inspectCartlogsOtpCapabilities,
  verifyCartlogsWebhookSignature
} from './src/server/cartlogsService.ts';
import {
  initializePaystackTransaction,
  verifyPaystackTransaction,
  verifyPaystackWebhookSignature,
  isReferenceAlreadyProcessed,
  markReferenceAsProcessed
} from './src/server/paystackService.ts';
import {
  getCountries as getIntlCountries,
  getServices as getIntlServices,
  getStock as getIntlStock,
  getPrice as getIntlPrice,
  getAvailability as getIntlAvailability,
  purchaseNumber as purchaseIntlNumber,
  getOrderStatus as getIntlOrderStatus,
  cancelOrder as cancelIntlOrder,
  getBalance as getIntlBalance,
  getPricingConfig as getIntlPricingConfig,
  updatePricingConfig as updateIntlPricingConfig,
  getServerOrders as getIntlServerOrders,
  recordServerOrder as recordIntlServerOrder,
  startIntlExpiryWorker,
  processExpiredOrders as processExpiredIntlOrders
} from './src/server/internationalNumbersService.ts';
import {
  authenticateResellerToken,
  logResellerApiCall,
  getOrCreateResellerProfile,
  generateResellerKey,
  revokeResellerKey,
  updateResellerWebhookConfig,
  dispatchWebhookEvent,
  getResellerProductsCatalog,
  processResellerOrder,
  getResellerOrdersList,
  getResellerOrderById,
  cancelResellerOrder,
  getResellerApiLogs,
  getAllResellersForAdmin,
  adminToggleResellerStatus,
  adminRevokeResellerKey,
  getAdminSystemLogs,
  getResellerPricing,
  updateResellerPricing,
  syncResellerWalletBalance
} from './src/server/resellerService.ts';

// Catch unhandled errors gracefully so the server process stays alive
process.on('uncaughtException', (err) => {
  console.error('[Process Error] Uncaught Exception:', err?.message || err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[Process Error] Unhandled Rejection:', reason);
});

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);

  app.use(express.json());

  // Cloud Run / Container Immediate Health Check Endpoints
  // Zero-dependency, immediate HTTP 200 JSON responses required by Google Cloud Run
  app.get(['/health', '/api/health'], (req, res) => {
    res.status(200).json({
      status: 'ok',
      service: 'surest-plug-digital-marketplace',
      port: PORT,
      timestamp: new Date().toISOString()
    });
  });

// Public SMM Routes for customer boosting features
// 1. Retrieve available services
app.get('/api/smm/services', async (req, res) => {
  try {
    const result = await getFollowSPanelServices();
    res.status(result.success ? 200 : 503).json(result);
  } catch (err: any) {
    console.error('Error in /api/smm/services:', err?.message || err);
    res.status(500).json({
      success: false,
      error: err?.message || 'Failed to retrieve social media boosting services.'
    });
  }
});

// 2. Submit real order
app.post(['/api/smm/order', '/api/admin/followspanel/order'], async (req, res) => {
  try {
    const { serviceId, link, quantity } = req.body || {};
    const result = await createFollowSPanelOrder(serviceId, link, quantity);
    res.status(result.success ? 200 : 400).json(result);
  } catch (err: any) {
    console.error('Error in order endpoint:', err?.message || err);
    res.status(500).json({
      success: false,
      error: err?.message || 'Failed to process boosting order with provider.'
    });
  }
});

// 3. Retrieve order status (Customer-safe sanitized response)
app.get('/api/smm/status', async (req, res) => {
  try {
    const orderId = req.query.order as string;
    const result = await getFollowSPanelOrderStatus(orderId);
    if (result.success && result.data) {
      return res.status(200).json({
        success: true,
        data: {
          status: result.data.status || 'In progress',
          start_count: result.data.start_count || '0',
          remains: result.data.remains || '0'
        }
      });
    }
    res.status(400).json(result);
  } catch (err: any) {
    console.error('Error in /api/smm/status:', err?.message || err);
    res.status(500).json({
      success: false,
      error: err?.message || 'Failed to retrieve boosting order status.'
    });
  }
});

app.post('/api/smm/status', async (req, res) => {
  try {
    const { orderId, order } = req.body || {};
    const result = await getFollowSPanelOrderStatus(orderId || order);
    if (result.success && result.data) {
      return res.status(200).json({
        success: true,
        data: {
          status: result.data.status || 'In progress',
          start_count: result.data.start_count || '0',
          remains: result.data.remains || '0'
        }
      });
    }
    res.status(400).json(result);
  } catch (err: any) {
    console.error('Error in POST /api/smm/status:', err?.message || err);
    res.status(500).json({
      success: false,
      error: err?.message || 'Failed to retrieve boosting order status.'
    });
  }
});

// 4. Retrieve provider balance (for Admin verification)
app.get('/api/smm/balance', async (req, res) => {
  try {
    const result = await getFollowSPanelBalance();
    res.status(result.success ? 200 : 503).json(result);
  } catch (err: any) {
    console.error('Error in /api/smm/balance:', err?.message || err);
    res.status(500).json({
      success: false,
      error: err?.message || 'Failed to query FollowSPanel provider balance.'
    });
  }
});

// Dedicated Admin FollowSPanel API Endpoints
// Safe Configuration & Diagnostics
app.get('/api/admin/followspanel/config', (req, res) => {
  try {
    const config = getFollowSPanelConfigStatus();
    res.json({ success: true, data: config });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to read FollowSPanel configuration status.' });
  }
});

// Test Connection
app.post('/api/admin/followspanel/test', async (req, res) => {
  try {
    const result = await testFollowSPanelConnection();
    res.status(result.success ? 200 : 400).json(result);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: 'Unable to test API connection with FollowSPanel.'
    });
  }
});

app.get('/api/admin/followspanel/test', async (req, res) => {
  try {
    const result = await testFollowSPanelConnection();
    res.status(result.success ? 200 : 400).json(result);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: 'Unable to test API connection with FollowSPanel.'
    });
  }
});

// Get Admin Balance
app.get('/api/admin/followspanel/balance', async (req, res) => {
  try {
    const result = await getFollowSPanelBalance();
    res.status(result.success ? 200 : 503).json(result);
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve FollowSPanel balance.'
    });
  }
});

// Get Admin Services
app.get('/api/admin/followspanel/services', async (req, res) => {
  try {
    const result = await getFollowSPanelServices();
    res.status(result.success ? 200 : 503).json(result);
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve FollowSPanel services catalog.'
    });
  }
});

// Sync Order Status
app.post('/api/admin/followspanel/status', async (req, res) => {
  try {
    const { orderId } = req.body || {};
    const result = await getFollowSPanelOrderStatus(orderId);
    res.status(result.success ? 200 : 400).json(result);
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Failed to query FollowSPanel order status.'
    });
  }
});

// Sync Multiple Orders
app.post('/api/admin/followspanel/multi-status', async (req, res) => {
  try {
    const { orderIds } = req.body || {};
    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ success: false, error: 'orderIds array is required.' });
    }
    const result = await getFollowSPanelMultipleOrderStatus(orderIds);
    res.status(result.success ? 200 : 400).json(result);
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Failed to query FollowSPanel order statuses.'
    });
  }
});

// ==========================================
// Cartlogs API Integration Routes
// ==========================================

// 1. Retrieve Available Categories (Filtered - Boosting excluded)
app.get('/api/cartlogs/categories', async (req, res) => {
  try {
    const result = await getCartlogsCategories(false);
    res.status(result.success ? 200 : 503).json(result);
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Categories are temporarily unavailable. Please try again later.'
    });
  }
});

// 2. Retrieve Available Products (Surest Plug pricing applied, boosting excluded)
app.get('/api/cartlogs/products', async (req, res) => {
  try {
    const category = req.query.category as string | undefined;
    const result = await getCartlogsProducts(category, false);
    res.status(result.success ? 200 : 503).json(result);
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Account products are temporarily unavailable. Please try again later.'
    });
  }
});

// 3. Create Cartlogs Order (Secure purchase execution)
app.post('/api/cartlogs/order', async (req, res) => {
  try {
    const { productId, quantity, orderReference, idempotencyKey } = req.body || {};
    if (!productId || !orderReference) {
      return res.status(400).json({
        success: false,
        error: 'Product ID and Order Reference are required.'
      });
    }

    const result = await createCartlogsOrder(
      productId,
      Number(quantity) || 1,
      orderReference,
      idempotencyKey,
      false
    );

    // Customer safe sanitized response
    if (result.success && result.data) {
      return res.status(200).json({
        success: true,
        data: {
          status: result.data.status,
          credentials: result.data.credentials
        }
      });
    }

    res.status(result.code ? Number(result.code) : 400).json(result);
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Order could not be processed at this time. Please try again.'
    });
  }
});

// 4. Cartlogs Order Status Query
app.get('/api/cartlogs/status', async (req, res) => {
  try {
    const orderId = req.query.orderId as string;
    const result = await getCartlogsOrderStatus(orderId, false);
    res.status(result.success ? 200 : 400).json(result);
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Unable to query order status.'
    });
  }
});

// 5. Cartlogs Webhook (Optional verification if CARTLOGS_WEBHOOK_SECRET is set)
app.post('/api/cartlogs/webhook', (req, res) => {
  try {
    const signature = req.headers['x-cartlogs-signature'] as string | undefined;
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

    if (process.env.CARTLOGS_WEBHOOK_SECRET) {
      const isValid = verifyCartlogsWebhookSignature(rawBody, signature);
      if (!isValid) {
        return res.status(401).json({ success: false, error: 'Invalid webhook signature.' });
      }
    }

    const payload = req.body || {};
    const event = payload.event || payload.type;
    const data = payload.data || payload;

    console.log(`[Cartlogs Webhook] Event: ${event}, Order ID: ${data?.id || data?.order_id}`);

    // Acknowledge webhook delivery
    res.status(200).json({ received: true, event });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Webhook processing error.' });
  }
});

// Admin Cartlogs Endpoints
app.post('/api/admin/cartlogs/test', async (req, res) => {
  try {
    const result = await testCartlogsConnection();
    res.status(result.success ? 200 : 400).json(result);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to execute Cartlogs connection test.'
    });
  }
});

app.get('/api/admin/cartlogs/categories', async (req, res) => {
  try {
    const result = await getCartlogsCategories(true);
    res.status(result.success ? 200 : 503).json(result);
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch categories catalog from Cartlogs.'
    });
  }
});

app.get('/api/admin/cartlogs/products', async (req, res) => {
  try {
    const category = req.query.category as string | undefined;
    const result = await getCartlogsProducts(category, true);
    res.status(result.success ? 200 : 503).json(result);
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch products from Cartlogs.'
    });
  }
});

app.get('/api/admin/cartlogs/capabilities', async (req, res) => {
  try {
    const result = await inspectCartlogsOtpCapabilities();
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({
      supported: false,
      categories: [],
      message: 'Failed to inspect capabilities.'
    });
  }
});

// ==========================================
// Paystack Payment Integration Routes
// ==========================================

// 1. Initialize Paystack Payment
app.post('/api/paystack/initialize', async (req, res) => {
  try {
    const { amount, email, userId, name } = req.body || {};
    const amountNum = Number(amount);
    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid deposit amount.'
      });
    }

    if (amountNum < 1000) {
      return res.status(400).json({
        success: false,
        error: 'Minimum funding amount is ₦1,000.'
      });
    }

    const result = await initializePaystackTransaction({
      amount: amountNum,
      email,
      userId,
      name
    });
    res.status(result.success ? 200 : 400).json(result);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: 'Unable to initialize Paystack payment. Please try again.'
    });
  }
});

// 2. Server-side Verify Paystack Payment
app.post('/api/paystack/verify', async (req, res) => {
  try {
    const { reference, amount, userId, email } = req.body || {};
    if (!reference) {
      return res.status(400).json({
        success: false,
        error: 'Payment reference is required.'
      });
    }

    const result = await verifyPaystackTransaction(
      reference,
      amount ? Number(amount) : undefined,
      userId,
      email
    );

    res.status(result.success ? 200 : 400).json(result);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: 'Unable to verify payment with Paystack.'
    });
  }
});

// 3. Paystack Webhook Handler (Charge Success with Signature Verification)
app.post('/api/paystack/webhook', (req, res) => {
  try {
    const signature = req.headers['x-paystack-signature'] as string | undefined;
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

    if (process.env.PAYSTACK_SECRET_KEY) {
      const isValid = verifyPaystackWebhookSignature(rawBody, signature);
      if (!isValid) {
        return res.status(401).json({ success: false, error: 'Invalid Paystack webhook signature.' });
      }
    }

    const payload = req.body || {};
    const event = payload.event;
    const data = payload.data || {};

    if (event === 'charge.success') {
      const reference = (data.reference || '').trim();
      const amountKobo = Number(data.amount || 0);
      const amountNaira = amountKobo / 100;
      const customerEmail = data.customer?.email;
      const userId = data.metadata?.userId || data.metadata?.user_id;

      if (reference) {
        if (isReferenceAlreadyProcessed(reference)) {
          console.log(`[Paystack Webhook] Reference ${reference} already processed. Duplicate processing prevented.`);
          return res.status(200).json({ status: 'success', received: true, message: 'Already processed' });
        }
        markReferenceAsProcessed(reference, userId || 'webhook', amountNaira, 'success');
        console.log(`[Paystack Webhook] Successfully recorded verified charge for ${customerEmail} (₦${amountNaira}, Ref: ${reference})`);
      }
    }

    // Acknowledge webhook promptly
    res.status(200).json({ status: 'success', received: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Webhook processing error.' });
  }
});

// 4. Paystack Config (Returns Safe Public Key Only)
app.get('/api/paystack/config', (req, res) => {
  res.status(200).json({
    publicKey: process.env.VITE_PAYSTACK_PUBLIC_KEY || 'pk_test_c6a989fa162d6563a2e53015cd6cf15570f68d8f'
  });
});

// ==========================================
// Isolated International Numbers Routes
// Architecture: Frontend -> /api/international-numbers/* -> Service -> Provider API
// Normalized simple response format (Phase 3 & Phase 4)
// ==========================================

// 1. GET /api/international-numbers/countries
app.get('/api/international-numbers/countries', async (req, res) => {
  try {
    const result = await getIntlCountries();
    res.status(result.success ? 200 : 503).json(result);
  } catch (err) {
    res.status(500).json({ success: false, countries: [], error: 'Failed to load countries' });
  }
});

// 2. GET /api/international-numbers/services
app.get('/api/international-numbers/services', async (req, res) => {
  try {
    const country = req.query.country || req.query.countryId ? String(req.query.country || req.query.countryId).trim() : undefined;
    const result = await getIntlServices(country);
    res.status(result.success ? 200 : 503).json(result);
  } catch (err) {
    res.status(500).json({ success: false, services: [], error: 'Failed to load services' });
  }
});

// 3. GET /api/international-numbers/stock
app.get('/api/international-numbers/stock', async (req, res) => {
  try {
    const country = String(req.query.country || req.query.countryId || '1').trim();
    const service = String(req.query.service || req.query.serviceId || '').trim();
    if (!service) {
      return res.status(400).json({ success: false, stock: null, status: 'INVALID_RESPONSE', error: 'Service is required' });
    }
    const result = await getIntlStock(country, service);
    res.status(result.success ? 200 : 502).json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, stock: null, status: 'PROVIDER_UNAVAILABLE', error: err?.message || 'Stock lookup failed' });
  }
});

// 4. GET /api/international-numbers/price
app.get('/api/international-numbers/price', async (req, res) => {
  try {
    const country = String(req.query.country || req.query.countryId || '1').trim();
    const service = String(req.query.service || req.query.serviceId || '').trim();
    if (!service) {
      return res.status(400).json({ success: false, price: 1352, error: 'Service is required' });
    }
    const result = await getIntlPrice(country, service);
    res.status(result.success ? 200 : 502).json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, price: 1352, error: err?.message || 'Price lookup failed' });
  }
});

// 5. GET /api/international-numbers/availability
app.get('/api/international-numbers/availability', async (req, res) => {
  try {
    const country = String(req.query.country || req.query.countryId || '1').trim();
    const service = String(req.query.service || req.query.serviceId || '').trim();
    if (!service) {
      return res.status(400).json({ success: false, available: false, stock: null, price: 1352, status: 'INVALID_RESPONSE', error: 'Service is required' });
    }
    const result = await getIntlAvailability(country, service);
    res.status(result.success ? 200 : 502).json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, available: false, stock: null, price: 1352, status: 'PROVIDER_UNAVAILABLE', error: err?.message || 'Availability lookup failed' });
  }
});

// 6. POST /api/international-numbers/purchase
app.post('/api/international-numbers/purchase', async (req, res) => {
  try {
    const { country, service, countryId, serviceId, userId, userEmail, orderReference } = req.body || {};
    const finalCountry = String(country || countryId || '1').trim();
    const finalService = String(service || serviceId || '').trim();

    if (!finalService) {
      return res.status(400).json({ success: false, error: 'Service is required for purchase' });
    }

    const result = await purchaseIntlNumber(finalCountry, finalService, {
      userId: userId ? String(userId) : undefined,
      userEmail: userEmail ? String(userEmail) : undefined,
      orderReference: orderReference ? String(orderReference) : undefined
    });
    res.status(result.success ? 200 : 400).json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to reserve number' });
  }
});

// 7. GET /api/international-numbers/order/:orderId or /api/international-numbers/sms/:orderId
app.get(['/api/international-numbers/order/:orderId', '/api/international-numbers/sms/:orderId'], async (req, res) => {
  try {
    const { orderId } = req.params;
    if (!orderId) {
      return res.status(400).json({ success: false, error: 'Order ID is required' });
    }
    const result = await getIntlOrderStatus(orderId);
    res.status(result.success ? 200 : 400).json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to check order status' });
  }
});

// Query-based GET /api/international-numbers/status?order_id=...
app.get('/api/international-numbers/status', async (req, res) => {
  try {
    const orderId = String(req.query.order_id || req.query.orderId || req.query.id || '').trim();
    if (!orderId) {
      return res.status(400).json({ success: false, error: 'Order ID is required' });
    }
    const result = await getIntlOrderStatus(orderId);
    res.status(result.success ? 200 : 400).json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to check order status' });
  }
});

// 8. POST /api/international-numbers/order/:orderId/cancel or /sms/:orderId/cancel
app.post(['/api/international-numbers/order/:orderId/cancel', '/api/international-numbers/sms/:orderId/cancel'], async (req, res) => {
  try {
    const { orderId } = req.params;
    if (!orderId) {
      return res.status(400).json({ success: false, error: 'Order ID is required' });
    }
    const result = await cancelIntlOrder(orderId);
    res.status(result.success ? 200 : 400).json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to cancel order' });
  }
});

// POST /api/international-numbers/cancel (body: { order_id })
app.post('/api/international-numbers/cancel', async (req, res) => {
  try {
    const orderId = String(req.body?.order_id || req.body?.orderId || req.body?.id || '').trim();
    if (!orderId) {
      return res.status(400).json({ success: false, error: 'Order ID is required' });
    }
    const result = await cancelIntlOrder(orderId);
    res.status(result.success ? 200 : 400).json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to cancel order' });
  }
});

// 9. GET /api/international-numbers/orders (Backend retrieval when customer leaves and returns)
app.get('/api/international-numbers/orders', (req, res) => {
  try {
    const userId = req.query.user_id ? String(req.query.user_id) : undefined;
    const userEmail = req.query.user_email ? String(req.query.user_email) : undefined;
    const orders = getIntlServerOrders(userId, userEmail);
    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to retrieve orders from backend' });
  }
});

// 10. POST /api/international-numbers/record-order (Sync client orders with backend persistence)
app.post('/api/international-numbers/record-order', (req, res) => {
  try {
    const record = recordIntlServerOrder(req.body || {});
    res.json({ success: true, order: record });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to record order' });
  }
});

// Admin endpoints:
app.get(['/api/international-numbers/balance', '/api/international-numbers/admin/balance'], async (req, res) => {
  try {
    const result = await getIntlBalance();
    res.status(result.success ? 200 : 503).json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch balance' });
  }
});

app.get('/api/international-numbers/admin/pricing-config', (req, res) => {
  res.json({ success: true, data: getIntlPricingConfig() });
});

app.post('/api/international-numbers/admin/pricing-config', (req, res) => {
  const updated = updateIntlPricingConfig(req.body || {});
  res.json({ success: true, data: updated });
});

// Endpoint to trigger or check server-side expiry worker sweep immediately
app.post('/api/international-numbers/process-expired', async (req, res) => {
  try {
    const result = await processExpiredIntlOrders();
    res.json({ success: true, result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to process expired orders' });
  }
});

// ==========================================================
// RESELLER API (v1 Public Endpoints & Management Endpoints)
// ==========================================================

// In-Memory Rate Limiter for Reseller Public API (Rule 25)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute window
const RATE_LIMIT_MAX_REQUESTS = 60; // 60 requests per minute

function checkRateLimit(identifier: string): { allowed: boolean; remaining: number; resetTime: number; retryAfter: number } {
  const now = Date.now();
  let record = rateLimitMap.get(identifier);

  if (!record || now > record.resetTime) {
    record = { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS };
    rateLimitMap.set(identifier, record);
    return {
      allowed: true,
      remaining: RATE_LIMIT_MAX_REQUESTS - 1,
      resetTime: record.resetTime,
      retryAfter: 0
    };
  }

  record.count++;
  const remaining = Math.max(0, RATE_LIMIT_MAX_REQUESTS - record.count);
  const retryAfter = Math.ceil((record.resetTime - now) / 1000);

  return {
    allowed: record.count <= RATE_LIMIT_MAX_REQUESTS,
    remaining,
    resetTime: record.resetTime,
    retryAfter
  };
}

// Middleware helper to authenticate and log v1 API calls
async function handleV1Auth(req: express.Request, res: express.Response, next: () => void) {
  const startTime = Date.now();
  const authHeader = req.headers.authorization || (req.headers['x-api-key'] as string);

  // Rate limiting check by token or IP
  const rateLimitKey = authHeader || req.ip || 'anonymous';
  const rateLimit = checkRateLimit(rateLimitKey);

  res.setHeader('X-RateLimit-Limit', RATE_LIMIT_MAX_REQUESTS);
  res.setHeader('X-RateLimit-Remaining', rateLimit.remaining);
  res.setHeader('X-RateLimit-Reset', Math.ceil(rateLimit.resetTime / 1000));

  if (!rateLimit.allowed) {
    res.setHeader('Retry-After', rateLimit.retryAfter);
    const latency = Date.now() - startTime;
    logResellerApiCall({
      reseller_id: 'rate_limited',
      reseller_email: 'unknown',
      method: req.method,
      path: req.originalUrl || req.path,
      status_code: 429,
      latency_ms: latency,
      ip: req.ip || req.socket.remoteAddress || '127.0.0.1',
      user_agent: req.headers['user-agent'],
      error_message: 'Rate limit exceeded'
    });

    return res.status(429).json({
      success: false,
      code: 'RATE_LIMIT_EXCEEDED',
      error: `Too many requests. Rate limit is ${RATE_LIMIT_MAX_REQUESTS} requests per minute. Please retry after ${rateLimit.retryAfter} seconds.`
    });
  }

  // Information routes (/balance, /profile, /me) can authenticate even if balance is temporarily below ₦5,000
  const isInfoRoute = req.path.endsWith('/profile') || req.path.endsWith('/me') || req.path.endsWith('/balance');
  const authRes = authenticateResellerToken(authHeader, { allowBelowThreshold: isInfoRoute });

  if (!authRes.authenticated || !authRes.reseller) {
    const latency = Date.now() - startTime;
    logResellerApiCall({
      reseller_id: 'unauthenticated',
      reseller_email: 'unknown',
      method: req.method,
      path: req.originalUrl || req.path,
      status_code: authRes.statusCode || 401,
      latency_ms: latency,
      ip: req.ip || req.socket.remoteAddress || '127.0.0.1',
      user_agent: req.headers['user-agent'],
      error_message: authRes.error
    });

    return res.status(authRes.statusCode || 401).json({
      success: false,
      code: authRes.code || 'UNAUTHORIZED',
      error: authRes.error
    });
  }

  // Attach authenticated reseller profile to request
  (req as any).reseller = authRes.reseller;
  (req as any).apiStartTime = startTime;
  next();
}

// 1. GET /api/v1/profile (or /api/v1/me)
app.get(['/api/v1/profile', '/api/v1/me'], handleV1Auth, (req, res) => {
  const reseller = (req as any).reseller;
  const latency = Date.now() - ((req as any).apiStartTime || Date.now());
  logResellerApiCall({
    reseller_id: reseller.user_id,
    reseller_email: reseller.email,
    method: req.method,
    path: req.path,
    status_code: 200,
    latency_ms: latency,
    ip: req.ip || '127.0.0.1',
    user_agent: req.headers['user-agent']
  });

  res.json({
    success: true,
    data: reseller
  });
});

// 2. GET /api/v1/balance
app.get('/api/v1/balance', handleV1Auth, (req, res) => {
  const reseller = (req as any).reseller;
  const latency = Date.now() - ((req as any).apiStartTime || Date.now());
  logResellerApiCall({
    reseller_id: reseller.user_id,
    reseller_email: reseller.email,
    method: req.method,
    path: req.path,
    status_code: 200,
    latency_ms: latency,
    ip: req.ip || '127.0.0.1'
  });

  const minRequired = reseller.min_balance_threshold || 5000;
  const isEligible = (reseller.balance ?? 0) >= minRequired;

  res.json({
    success: true,
    balance: reseller.balance,
    currency: reseller.currency || 'NGN',
    min_required_balance: minRequired,
    is_eligible: isEligible,
    api_access: isEligible ? 'active' : 'temporarily_suspended',
    notice: isEligible
      ? 'Reseller API access is active and fully functional.'
      : `Wallet balance is below ₦${minRequired.toLocaleString()}. API order placement is temporarily suspended. Fund your wallet with at least ₦${Math.max(0, minRequired - (reseller.balance || 0)).toLocaleString()} to restore order placement.`
  });
});

// 3. GET /api/v1/products & GET /api/v1/services (catalog alias)
app.get(['/api/v1/products', '/api/v1/services'], handleV1Auth, async (req, res) => {
  const reseller = (req as any).reseller;
  const { category, search } = req.query;
  const result = await getResellerProductsCatalog(category as string, search as string);

  const latency = Date.now() - ((req as any).apiStartTime || Date.now());
  logResellerApiCall({
    reseller_id: reseller.user_id,
    reseller_email: reseller.email,
    method: req.method,
    path: req.path,
    status_code: 200,
    latency_ms: latency,
    ip: req.ip || '127.0.0.1'
  });

  res.json(result);
});

// 4. GET /api/v1/products/:id
app.get('/api/v1/products/:id', handleV1Auth, async (req, res) => {
  const reseller = (req as any).reseller;
  const productId = req.params.id;
  const catalog = await getResellerProductsCatalog();
  const product = catalog.products.find(p => String(p.id) === String(productId));

  const latency = Date.now() - ((req as any).apiStartTime || Date.now());
  if (!product) {
    logResellerApiCall({
      reseller_id: reseller.user_id,
      reseller_email: reseller.email,
      method: req.method,
      path: req.path,
      status_code: 404,
      latency_ms: latency,
      ip: req.ip || '127.0.0.1',
      error_message: 'Product not found'
    });
    return res.status(404).json({ success: false, error: 'Product not found in reseller catalog.' });
  }

  logResellerApiCall({
    reseller_id: reseller.user_id,
    reseller_email: reseller.email,
    method: req.method,
    path: req.path,
    status_code: 200,
    latency_ms: latency,
    ip: req.ip || '127.0.0.1'
  });

  res.json({ success: true, product });
});

// 5. POST /api/v1/orders
app.post('/api/v1/orders', handleV1Auth, async (req, res) => {
  const reseller = (req as any).reseller;
  const idempotencyKey = (req.headers['idempotency-key'] as string) || req.body?.idempotency_key;

  try {
    const result = await processResellerOrder(reseller, req.body || {}, idempotencyKey);
    const latency = Date.now() - ((req as any).apiStartTime || Date.now());

    logResellerApiCall({
      reseller_id: reseller.user_id,
      reseller_email: reseller.email,
      method: req.method,
      path: req.path,
      status_code: result.statusCode,
      latency_ms: latency,
      ip: req.ip || '127.0.0.1',
      error_message: result.error
    });

    res.status(result.statusCode).json(result);
  } catch (err: any) {
    const latency = Date.now() - ((req as any).apiStartTime || Date.now());
    logResellerApiCall({
      reseller_id: reseller.user_id,
      reseller_email: reseller.email,
      method: req.method,
      path: req.path,
      status_code: 500,
      latency_ms: latency,
      ip: req.ip || '127.0.0.1',
      error_message: err?.message || 'Server order exception'
    });

    res.status(500).json({ success: false, error: 'Internal order processing error.' });
  }
});

// 6. GET /api/v1/orders
app.get('/api/v1/orders', handleV1Auth, (req, res) => {
  const reseller = (req as any).reseller;
  const { category, status, limit } = req.query;
  const list = getResellerOrdersList(
    reseller.user_id,
    category as string,
    status as string,
    Number(limit) || 50
  );

  const latency = Date.now() - ((req as any).apiStartTime || Date.now());
  logResellerApiCall({
    reseller_id: reseller.user_id,
    reseller_email: reseller.email,
    method: req.method,
    path: req.path,
    status_code: 200,
    latency_ms: latency,
    ip: req.ip || '127.0.0.1'
  });

  res.json(list);
});

// 7. GET /api/v1/orders/:id
app.get('/api/v1/orders/:id', handleV1Auth, async (req, res) => {
  const reseller = (req as any).reseller;
  const result = await getResellerOrderById(reseller.user_id, req.params.id);
  const latency = Date.now() - ((req as any).apiStartTime || Date.now());

  logResellerApiCall({
    reseller_id: reseller.user_id,
    reseller_email: reseller.email,
    method: req.method,
    path: req.path,
    status_code: result.success ? 200 : 404,
    latency_ms: latency,
    ip: req.ip || '127.0.0.1',
    error_message: result.error
  });

  res.status(result.success ? 200 : 404).json(result);
});

// 8. POST /api/v1/orders/:id/cancel
app.post('/api/v1/orders/:id/cancel', handleV1Auth, async (req, res) => {
  const reseller = (req as any).reseller;
  const result = await cancelResellerOrder(reseller.user_id, req.params.id);
  const latency = Date.now() - ((req as any).apiStartTime || Date.now());

  logResellerApiCall({
    reseller_id: reseller.user_id,
    reseller_email: reseller.email,
    method: req.method,
    path: req.path,
    status_code: result.success ? 200 : 400,
    latency_ms: latency,
    ip: req.ip || '127.0.0.1',
    error_message: result.error
  });

  res.status(result.success ? 200 : 400).json(result);
});

// 9. GET /api/v1/transactions
app.get('/api/v1/transactions', handleV1Auth, (req, res) => {
  const reseller = (req as any).reseller;
  const list = getResellerOrdersList(reseller.user_id, undefined, undefined, 100);
  const transactions = list.orders.map(o => ({
    id: o.id,
    order_reference: o.order_reference,
    category: o.category,
    product_name: o.product_name,
    amount: o.amount,
    currency: o.currency,
    balance_before: o.balance_before,
    balance_after: o.balance_after,
    status: o.status,
    created_at: o.created_at
  }));

  res.json({
    success: true,
    transactions,
    count: transactions.length
  });
});

// 10. Webhook endpoints: GET, POST, DELETE, TEST
app.get('/api/v1/webhooks', handleV1Auth, (req, res) => {
  const reseller = (req as any).reseller;
  res.json({
    success: true,
    webhook_url: reseller.webhook_url || null,
    webhook_enabled: Boolean(reseller.webhook_enabled),
    webhook_last_status: reseller.webhook_last_status || null,
    webhook_last_error: reseller.webhook_last_error || null,
    webhook_last_dispatched_at: reseller.webhook_last_dispatched_at || null
  });
});

app.post('/api/v1/webhooks', handleV1Auth, (req, res) => {
  const reseller = (req as any).reseller;
  const { webhook_url } = req.body || {};
  const result = updateResellerWebhookConfig(reseller.user_id, webhook_url);
  res.status(result.success ? 200 : 400).json(result);
});

app.delete('/api/v1/webhooks', handleV1Auth, (req, res) => {
  const reseller = (req as any).reseller;
  updateResellerWebhookConfig(reseller.user_id, null);
  res.json({ success: true, message: 'Webhook endpoint removed.' });
});

app.post('/api/v1/webhooks/test', handleV1Auth, async (req, res) => {
  const reseller = (req as any).reseller;
  const result = await dispatchWebhookEvent(reseller.user_id, 'test.ping', {
    message: 'Surest Plug Webhook verification ping is successful!',
    timestamp: new Date().toISOString()
  });
  res.status(result.success ? 200 : 400).json(result);
});

// ==========================================================
// RESELLER MANAGEMENT INTERNAL ENDPOINTS (FOR SUREST PLUG UI)
// ==========================================================

// Get profile & eligibility
app.get('/api/reseller/profile', (req, res) => {
  const { userId, email, fullName, balance } = req.query;
  if (!userId) {
    return res.status(400).json({ success: false, error: 'User ID is required.' });
  }

  const profile = getOrCreateResellerProfile(
    userId as string,
    (email as string) || '',
    (fullName as string) || '',
    parseFloat(balance as string) || 0
  );

  res.json({ success: true, profile });
});

// Generate new API key
app.post('/api/reseller/keys/generate', (req, res) => {
  const { userId, email, fullName, balance } = req.body || {};
  if (!userId) {
    return res.status(400).json({ success: false, error: 'User ID is required.' });
  }

  const result = generateResellerKey(
    userId,
    email || '',
    fullName || '',
    parseFloat(balance) || 0
  );

  res.status(result.success ? 200 : 400).json(result);
});

// Revoke API key
app.post('/api/reseller/keys/revoke', (req, res) => {
  const { userId } = req.body || {};
  if (!userId) {
    return res.status(400).json({ success: false, error: 'User ID is required.' });
  }
  const result = revokeResellerKey(userId);
  res.json(result);
});

// Update webhook from UI
app.post('/api/reseller/webhook', (req, res) => {
  const { userId, webhookUrl } = req.body || {};
  if (!userId) {
    return res.status(400).json({ success: false, error: 'User ID is required.' });
  }
  const result = updateResellerWebhookConfig(userId, webhookUrl);
  res.status(result.success ? 200 : 400).json(result);
});

// Test webhook from UI
app.post('/api/reseller/webhook/test', async (req, res) => {
  const { userId } = req.body || {};
  if (!userId) {
    return res.status(400).json({ success: false, error: 'User ID is required.' });
  }
  const result = await dispatchWebhookEvent(userId, 'test.ping', {
    message: 'Surest Plug Webhook verification ping successful!',
    timestamp: new Date().toISOString()
  });
  res.status(result.success ? 200 : 400).json(result);
});

// Synchronize wallet balance from Surest Plug user store (automatic suspension / reactivation)
app.post('/api/reseller/wallet/sync', (req, res) => {
  const { userId, balance } = req.body || {};
  if (!userId || typeof balance !== 'number') {
    return res.status(400).json({ success: false, error: 'Valid userId and numeric balance are required.' });
  }
  const result = syncResellerWalletBalance(userId, balance);
  res.json(result);
});

// Get user's recent API logs
app.get('/api/reseller/logs', (req, res) => {
  const { userId, limit } = req.query;
  if (!userId) {
    return res.status(400).json({ success: false, error: 'User ID is required.' });
  }
  const logs = getResellerApiLogs(userId as string, Number(limit) || 30);
  res.json({ success: true, logs });
});

// Get user's reseller orders
app.get('/api/reseller/orders', (req, res) => {
  const { userId, category, status, limit } = req.query;
  if (!userId) {
    return res.status(400).json({ success: false, error: 'User ID is required.' });
  }
  const list = getResellerOrdersList(
    userId as string,
    category as string,
    status as string,
    Number(limit) || 50
  );
  res.json(list);
});

// Admin Reseller Management Endpoints:
app.get('/api/admin/resellers', (req, res) => {
  const data = getAllResellersForAdmin();
  res.json({ success: true, ...data });
});

app.post('/api/admin/resellers/toggle-status', (req, res) => {
  const { userId, status } = req.body || {};
  const result = adminToggleResellerStatus(userId, status);
  res.status(result.success ? 200 : 400).json(result);
});

app.post('/api/admin/resellers/revoke-key', (req, res) => {
  const { userId } = req.body || {};
  const result = adminRevokeResellerKey(userId);
  res.json(result);
});

app.get('/api/admin/resellers/logs', (req, res) => {
  const { limit, status } = req.query;
  const logs = getAdminSystemLogs(Number(limit) || 100, status as string);
  res.json({ success: true, logs });
});

app.get('/api/admin/resellers/pricing', (req, res) => {
  res.json({ success: true, pricing: getResellerPricing() });
});

app.post('/api/admin/resellers/pricing', (req, res) => {
  const updated = updateResellerPricing(req.body || {});
  res.json({ success: true, pricing: updated });
});

// Strict 404 handler for unmatched /api routes (prevents SPA HTML index.html fallback for API requests)
app.all('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    code: 'NOT_FOUND',
    error: `API route ${req.method} ${req.path} not found.`
  });
});

  // Vite middleware for development vs static build in production
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    const indexPath = path.join(distPath, 'index.html');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(200).send('Surest Plug Digital Marketplace server is running.');
      }
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Cloud Run / Production] Surest Plug Server successfully listening on 0.0.0.0:${PORT} (PID: ${process.pid})`);
    // Start background worker for automatic 20-minute order expiry & cancellation
    startIntlExpiryWorker(5000);
  });

  server.on('error', (err: any) => {
    console.error(`[Server Error] Failed to listen on 0.0.0.0:${PORT}:`, err);
  });
}

startServer().catch(err => {
  console.error('Failed to start Surest Plug Server:', err);
  process.exit(1);
});
