const express = require('express');
const repo = require('../repo');
const { auth, requireRole } = require('../middleware/auth');
const wrap = require('../middleware/async');

const router = express.Router();
router.use(auth, requireRole('admin'));

// GET /api/admin/stats — dashboard KPIs
router.get('/stats', wrap(async (req, res) => {
  res.json(await repo.dashboardStats());
}));

const VALID_STATUSES = ['pending', 'confirmed', 'assigned', 'arriving', 'started', 'completed', 'paid', 'rated', 'cancelled', 'rejected'];

// GET /api/admin/bookings
router.get('/bookings', wrap(async (req, res) => {
  res.json({ bookings: await repo.listBookings() });
}));

// GET /api/admin/bookings/:id
router.get('/bookings/:id', wrap(async (req, res) => {
  const booking = await repo.findBookingById(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  let customer = null;
  if (booking.userId) {
    const u = await repo.findUserById(booking.userId);
    if (u) {
      const { passwordHash, ...cleanUser } = u;
      customer = cleanUser;
    }
  }
  let pro = null;
  if (booking.proId) {
    pro = await repo.findProById(Number(booking.proId));
  }
  res.json({ booking, customer, pro });
}));

// PATCH /api/admin/bookings/:id — update status, proId, paymentStatus, notes
router.patch('/bookings/:id', wrap(async (req, res) => {
  const booking = await repo.findBookingById(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });

  const { status, proId, paymentStatus, notes } = req.body || {};
  const patch = {};

  if (status !== undefined) {
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Invalid status: ${status}. Valid: ${VALID_STATUSES.join(', ')}` });
    }
    patch.status = status;
  }

  if (proId !== undefined) {
    if (proId === null || proId === '' || proId === 0) {
      patch.proId = null;
      patch.proName = '';
    } else {
      const numProId = Number(proId);
      const pro = await repo.findProById(numProId);
      if (!pro) return res.status(400).json({ error: 'Selected professional does not exist' });
      patch.proId = numProId;
      patch.proName = pro.name;
      if (booking.proId !== numProId) {
        await repo.incrementProBookings(numProId);
      }
      if (!patch.status && ['pending', 'confirmed'].includes(booking.status)) {
        patch.status = 'assigned';
      }
    }
  }

  if (paymentStatus !== undefined) {
    if (!['pending', 'paid', 'refunded'].includes(paymentStatus)) {
      return res.status(400).json({ error: 'Invalid paymentStatus. Valid: pending, paid, refunded' });
    }
    patch.paymentStatus = paymentStatus;
  }

  if (notes !== undefined) {
    patch.notes = String(notes);
  }

  const updated = await repo.updateBooking(booking.id, patch);

  // Rewards and cashback when marked completed
  if (patch.status === 'completed' && booking.status !== 'completed' && booking.status !== 'paid' && booking.status !== 'rated') {
    if (booking.userId) {
      await repo.addPoints(booking.userId, 10);
      await repo.addWallet(booking.userId, Math.round((booking.total || 0) * 0.1));
    }
  }

  // Notify customer of status change
  if (patch.status && patch.status !== booking.status && booking.userId) {
    await repo.createNotification({
      userId: booking.userId,
      title: 'Booking ' + patch.status,
      body: `Your booking ${booking.id} (${booking.serviceName || 'Service'}) status is now ${patch.status}.`,
      type: 'booking',
      channel: 'inapp',
      link: '/dashboard/bookings',
    });
  }

  res.json({ booking: updated });
}));

// POST /api/admin/bookings/:id/assign — { proId }
router.post('/bookings/:id/assign', wrap(async (req, res) => {
  const booking = await repo.findBookingById(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  const { proId } = req.body || {};
  if (!proId) return res.status(400).json({ error: 'proId is required' });
  const pro = await repo.findProById(Number(proId));
  if (!pro) return res.status(404).json({ error: 'Professional not found' });

  const patch = { proId: Number(proId), proName: pro.name };
  if (['pending', 'confirmed'].includes(booking.status)) {
    patch.status = 'assigned';
  }
  const updated = await repo.updateBooking(booking.id, patch);
  if (booking.proId !== Number(proId)) {
    await repo.incrementProBookings(Number(proId));
  }
  if (booking.userId) {
    await repo.createNotification({
      userId: booking.userId,
      title: 'Professional Assigned',
      body: `${pro.name} has been assigned to your booking ${booking.id}.`,
      type: 'booking',
      channel: 'inapp',
      link: '/dashboard/live',
    });
  }
  res.json({ booking: updated });
}));

// POST /api/admin/bookings/:id/cancel — { reason }
router.post('/bookings/:id/cancel', wrap(async (req, res) => {
  const booking = await repo.findBookingById(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  if (['cancelled', 'rejected'].includes(booking.status)) {
    return res.status(400).json({ error: 'Booking is already cancelled or rejected' });
  }
  const { reason } = req.body || {};
  const patch = { status: 'cancelled' };
  if (reason) patch.notes = (booking.notes ? booking.notes + ' | ' : '') + 'Cancelled by admin: ' + reason;
  const updated = await repo.updateBooking(booking.id, patch);
  if (booking.userId) {
    await repo.createNotification({
      userId: booking.userId,
      title: 'Booking Cancelled',
      body: `Booking ${booking.id} has been cancelled by administration.${reason ? ' Reason: ' + reason : ''}`,
      type: 'booking',
      channel: 'inapp',
      link: '/dashboard/bookings',
    });
  }
  res.json({ booking: updated });
}));

// POST /api/admin/bookings/:id/refund — { amount, reason }
router.post('/bookings/:id/refund', wrap(async (req, res) => {
  const booking = await repo.findBookingById(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  if (booking.paymentStatus === 'refunded') {
    return res.status(400).json({ error: 'Booking is already refunded' });
  }
  const refundAmount = Number((req.body || {}).amount) || Number(booking.total) || 0;
  const patch = { paymentStatus: 'refunded' };
  if (booking.status !== 'cancelled') patch.status = 'cancelled';
  const updated = await repo.updateBooking(booking.id, patch);
  if (booking.userId && refundAmount > 0) {
    await repo.addWallet(booking.userId, refundAmount);
    await repo.createNotification({
      userId: booking.userId,
      title: 'Refund Processed 💰',
      body: `₹${refundAmount} has been refunded to your wallet for booking ${booking.id}.`,
      type: 'payment',
      channel: 'inapp',
      link: '/dashboard/wallet',
    });
  }
  res.json({ booking: updated, refunded: true, amount: refundAmount });
}));

// GET /api/admin/users
router.get('/users', wrap(async (req, res) => {
  // Never expose password hashes.
  const users = (await repo.listUsers()).map(({ passwordHash, ...u }) => u);
  res.json({ users });
}));

// GET /api/admin/users/:id — user profile + bookings + addresses
router.get('/users/:id', wrap(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(404).json({ error: 'User not found' });
  const user = await repo.findUserById(id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { passwordHash, ...cleanUser } = user;
  const bookings = await repo.listBookingsByUser(id);
  const addresses = await repo.listAddresses ? await repo.listAddresses(id) : [];
  res.json({ user: cleanUser, bookings, addresses });
}));

// PATCH /api/admin/users/:id/status — toggle active / disable
router.patch('/users/:id/status', wrap(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(404).json({ error: 'User not found' });
  const { disabled, active } = req.body || {};
  const isInactive = disabled !== undefined ? !!disabled : (active !== undefined ? !active : false);
  const user = await repo.updateUser(id, { disabled: isInactive, active: !isInactive });
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { passwordHash, ...cleanUser } = user;
  res.json({ user: cleanUser });
}));

// GET /api/admin/professionals — all, including pending applications
router.get('/professionals', wrap(async (req, res) => {
  res.json({ professionals: await repo.listPros() });
}));

// GET /api/admin/professionals/:id — pro details + assigned bookings
router.get('/professionals/:id', wrap(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(404).json({ error: 'Professional not found' });
  const professional = await repo.findProById(id);
  if (!professional) return res.status(404).json({ error: 'Professional not found' });
  const bookings = await repo.listBookingsByPro(id);
  res.json({ professional, bookings });
}));

// PATCH /api/admin/professionals/:id — update pro status, verified, details
router.patch('/professionals/:id', wrap(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(404).json({ error: 'Professional not found' });
  const professional = await repo.updatePro(id, req.body || {});
  if (!professional) return res.status(404).json({ error: 'Professional not found' });
  res.json({ professional });
}));

// PATCH /api/admin/professionals/:id/approve — { status: 'active' | 'reject' }
router.patch('/professionals/:id/approve', wrap(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(404).json({ error: 'Professional not found' });
  const { status } = req.body || {};
  const professional = await repo.setProStatus(id, status === 'reject' ? 'rejected' : 'active');
  if (!professional) return res.status(404).json({ error: 'Professional not found' });
  res.json({ professional });
}));

/* ================= Services (CRUD) ================= */

// GET /api/admin/services
router.get('/services', wrap(async (req, res) => {
  const services = repo.listAllServices ? await repo.listAllServices() : await repo.listServices();
  res.json({ services });
}));

// POST /api/admin/services — add service
router.post('/services', wrap(async (req, res) => {
  const { name, category, priceFrom, price } = req.body || {};
  if (!name || !String(name).trim()) return res.status(400).json({ error: 'Service name is required' });
  if (!category || !String(category).trim()) return res.status(400).json({ error: 'Service category is required' });
  const service = await repo.createService({
    ...req.body,
    priceFrom: Number(priceFrom || price || 0),
  });
  res.status(201).json({ service });
}));

// PATCH /api/admin/services/:id — edit service
router.patch('/services/:id', wrap(async (req, res) => {
  const service = await repo.updateService(req.params.id, req.body || {});
  if (!service) return res.status(404).json({ error: 'Service not found' });
  res.json({ service });
}));

// DELETE /api/admin/services/:id — deactivate/delete service
router.delete('/services/:id', wrap(async (req, res) => {
  const ok = await repo.deleteService(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Service not found' });
  res.json({ ok: true });
}));

/* ================= Broadcast notifications ================= */

// POST /api/admin/broadcast — { title, body, audience: 'all'|'customers'|'pros' }
router.post('/broadcast', wrap(async (req, res) => {
  const { title, body, audience = 'all' } = req.body || {};
  if (!title || !body) return res.status(400).json({ error: 'Title and body are required' });
  const users = await repo.listUsers();
  let targets = users;
  if (audience === 'customers') targets = users.filter(u => u.role === 'customer');
  else if (audience === 'pros') targets = users.filter(u => u.role === 'pro');
  let count = 0;
  for (const u of targets) {
    await repo.createNotification({
      userId: u.id,
      title: String(title),
      body: String(body),
      type: 'broadcast',
      channel: 'inapp',
      link: '/dashboard/notifications',
    });
    count++;
  }
  res.json({ ok: true, count });
}));

/* ================= Reviews (moderation) ================= */

// GET /api/admin/reviews?status=pending|published|hidden
router.get('/reviews', wrap(async (req, res) => {
  const { status } = req.query;
  res.json({ reviews: await repo.listReviews(status ? { status } : {}) });
}));

// PATCH /api/admin/reviews/:id — { status: 'published' | 'hidden' }
router.patch('/reviews/:id', wrap(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(404).json({ error: 'Review not found' });
  const { status } = req.body || {};
  if (!['published', 'hidden', 'pending'].includes(status)) return res.status(400).json({ error: 'Invalid review status' });
  const review = await repo.updateReview(id, { status });
  if (!review) return res.status(404).json({ error: 'Review not found' });
  res.json({ review });
}));

// DELETE /api/admin/reviews/:id — permanently remove
router.delete('/reviews/:id', wrap(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(404).json({ error: 'Review not found' });
  await repo.deleteReview(id);
  res.json({ ok: true });
}));

/* ================= Coupons (CRUD) ================= */

// GET /api/admin/coupons
router.get('/coupons', wrap(async (req, res) => {
  res.json({ coupons: await repo.listCoupons() });
}));

// POST /api/admin/coupons — { code, type, value, minAmount, cap, active, description, validUntil }
router.post('/coupons', wrap(async (req, res) => {
  const { code } = req.body || {};
  if (!code || !String(code).trim()) return res.status(400).json({ error: 'Coupon code is required' });
  try {
    const coupon = await repo.createCoupon(req.body || {});
    res.status(201).json({ coupon });
  } catch (err) {
    if (String(err.message).includes('already exists') || String(err.code || '').startsWith('11000')) {
      return res.status(409).json({ error: 'A coupon with this code already exists' });
    }
    throw err;
  }
}));

// PATCH /api/admin/coupons/:code
router.patch('/coupons/:code', wrap(async (req, res) => {
  const coupon = await repo.updateCoupon(req.params.code, req.body || {});
  if (!coupon) return res.status(404).json({ error: 'Coupon not found' });
  res.json({ coupon });
}));

// DELETE /api/admin/coupons/:code
router.delete('/coupons/:code', wrap(async (req, res) => {
  await repo.deleteCoupon(req.params.code);
  res.json({ ok: true });
}));

/* ================= Gift cards (CRUD) ================= */

// GET /api/admin/giftcards
router.get('/giftcards', wrap(async (req, res) => {
  res.json({ giftCards: await repo.listGiftCards() });
}));

// POST /api/admin/giftcards — { value, expiresAt }
router.post('/giftcards', wrap(async (req, res) => {
  const value = Number((req.body || {}).value);
  if (!Number.isFinite(value) || value <= 0) return res.status(400).json({ error: 'A positive gift card value is required' });
  const giftCard = await repo.createGiftCard(req.body || {});
  res.status(201).json({ giftCard });
}));

// PATCH /api/admin/giftcards/:id — { status: 'active' | 'expired' }
router.patch('/giftcards/:id', wrap(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(404).json({ error: 'Gift card not found' });
  const giftCard = await repo.updateGiftCard(id, req.body || {});
  if (!giftCard) return res.status(404).json({ error: 'Gift card not found' });
  res.json({ giftCard });
}));

// DELETE /api/admin/giftcards/:id
router.delete('/giftcards/:id', wrap(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(404).json({ error: 'Gift card not found' });
  await repo.deleteGiftCard(id);
  res.json({ ok: true });
}));

/* ================= Membership plans ================= */

// GET /api/admin/plans
router.get('/plans', wrap(async (req, res) => {
  res.json({ plans: await repo.listPlans() });
}));

// PATCH /api/admin/plans/:id — { price, featured, active, perks }
router.patch('/plans/:id', wrap(async (req, res) => {
  const plan = await repo.updatePlan(req.params.id, req.body || {});
  if (!plan) return res.status(404).json({ error: 'Plan not found' });
  res.json({ plan });
}));

/* ================= Support tickets (inbox) ================= */

// GET /api/admin/tickets?status=open
router.get('/tickets', wrap(async (req, res) => {
  const all = await repo.listTickets();
  const { status } = req.query;
  res.json({ tickets: status ? all.filter(t => t.status === status) : all });
}));

// GET /api/admin/tickets/:id — full thread
router.get('/tickets/:id', wrap(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(404).json({ error: 'Ticket not found' });
  const ticket = await repo.findTicketById(id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
  res.json({ ticket });
}));

// POST /api/admin/tickets/:id/reply — { text } (admin reply)
router.post('/tickets/:id/reply', wrap(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(404).json({ error: 'Ticket not found' });
  const text = String((req.body || {}).text || '').trim();
  if (!text) return res.status(400).json({ error: 'Reply text is required' });
  const ticket = await repo.replyTicket(id, text, 'admin');
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
  // notify the customer that support replied (in-app; other channels via notifier)
  if (ticket.userId != null) {
    await repo.createNotification({
      userId: ticket.userId, title: 'Support replied',
      body: 'Support replied to ticket ' + id + ': "' + text.slice(0, 80) + '"',
      type: 'support', channel: 'inapp', link: '/dashboard/support',
    });
  }
  res.json({ ticket });
}));

// PATCH /api/admin/tickets/:id — { status: 'open'|'in-progress'|'resolved'|'closed', priority }
router.patch('/tickets/:id', wrap(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(404).json({ error: 'Ticket not found' });
  const ticket = await repo.updateTicket(id, req.body || {});
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
  res.json({ ticket });
}));

module.exports = router;
