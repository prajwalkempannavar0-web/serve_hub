/* Automated Integration Test for Serve Hub Admin Panel & Backend Integration */
const { Readable } = require('stream');
const path = require('path');

process.env.PORT = '4099';
const app = require('../backend/server');

function mockRequest(app, method, url, headers = {}, body = null) {
  return new Promise((resolve) => {
    const bodyStr = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : null;
    const req = new Readable({
      read() {
        if (bodyStr) this.push(bodyStr);
        this.push(null);
      }
    });
    req.method = method;
    req.url = url;
    req.originalUrl = url;
    req.headers = {
      'content-type': 'application/json',
      host: '127.0.0.1',
      ...Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v])),
    };
    if (bodyStr) {
      req.headers['content-length'] = String(Buffer.byteLength(bodyStr));
    }
    req.socket = { remoteAddress: '127.0.0.1', encrypted: false, destroy() {}, end() {}, write() {} };
    req.connection = req.socket;
    req.destroy = function() { return this; };

    let resBody = '';
    const res = {
      statusCode: 200,
      headers: {},
      setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
      getHeader(k) { return this.headers[k.toLowerCase()]; },
      status(code) { this.statusCode = code; return this; },
      write(chunk) { if (chunk) resBody += chunk; return true; },
      end(chunk) {
        if (chunk) resBody += chunk;
        let json = null;
        try { json = JSON.parse(resBody); } catch (e) { json = resBody; }
        resolve({ status: this.statusCode, headers: this.headers, body: json });
      },
      json(obj) {
        this.setHeader('content-type', 'application/json');
        this.end(JSON.stringify(obj));
      },
      send(data) {
        this.end(data);
      },
    };

    app(req, res);
  });
}

async function runTests() {
  console.log('--- Starting Admin Integration Tests ---');

  let passed = 0;
  let failed = 0;

  function assert(name, condition, details = '') {
    if (condition) {
      console.log(`  ✓ PASS: ${name}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${name} ${details}`);
      failed++;
    }
  }

  try {
    // 1. Health check
    const health = await mockRequest(app, 'GET', '/api/health');
    assert('GET /api/health returns 200 and db mode', health.status === 200 && health.body.ok === true && health.body.db);

    // 2. Authentication
    const adminLogin = await mockRequest(app, 'POST', '/api/auth/login', {}, {
      email: 'admin@servehub.com',
      password: 'admin123',
      role: 'admin',
    });
    assert('Admin login succeeds with token and role admin', adminLogin.status === 200 && adminLogin.body.token && adminLogin.body.user.role === 'admin');
    const adminToken = adminLogin.body ? adminLogin.body.token : null;

    const custLogin = await mockRequest(app, 'POST', '/api/auth/login', {}, {
      email: 'demo@servehub.com',
      password: 'demo123',
      role: 'customer',
    });
    assert('Customer login succeeds with customer role', custLogin.status === 200 && custLogin.body && custLogin.body.token && custLogin.body.user.role === 'customer');
    const custToken = custLogin.body ? custLogin.body.token : null;

    // 3. Security & Authorization checks
    const unauth = await mockRequest(app, 'GET', '/api/admin/bookings');
    assert('Unauthenticated request to admin route returns 401', unauth.status === 401);

    const forbidden = await mockRequest(app, 'GET', '/api/admin/bookings', { Authorization: 'Bearer ' + custToken });
    assert('Customer token to admin route returns 403 Forbidden', forbidden.status === 403);

    const authorized = await mockRequest(app, 'GET', '/api/admin/bookings', { Authorization: 'Bearer ' + adminToken });
    assert('Admin token to admin route returns 200 OK', authorized.status === 200 && Array.isArray(authorized.body.bookings));

    // 4. Admin Dashboard Stats
    const stats = await mockRequest(app, 'GET', '/api/admin/stats', { Authorization: 'Bearer ' + adminToken });
    assert('Admin stats returns summary card metrics',
      stats.status === 200 &&
      typeof stats.body.totalBookings === 'number' &&
      typeof stats.body.pendingBookings === 'number' &&
      typeof stats.body.confirmedBookings === 'number' &&
      typeof stats.body.inProgressBookings === 'number' &&
      typeof stats.body.completedBookings === 'number' &&
      typeof stats.body.cancelledBookings === 'number' &&
      typeof stats.body.customers === 'number' &&
      typeof stats.body.professionals === 'number'
    );

    // 5. Customer creates a booking via customer API
    const newBkId = 'SH' + Math.floor(100000 + Math.random() * 900000);
    const createBk = await mockRequest(app, 'POST', '/api/bookings', { Authorization: 'Bearer ' + custToken }, {
      id: newBkId,
      serviceId: 's1',
      date: '2026-11-20',
      time: '10:00 AM',
      address: 'Flat 402, Sunshine Heights, Mumbai',
      paymentMethod: 'wallet',
    });
    assert('Customer creates booking successfully', createBk.status === 201 && createBk.body.booking.id === newBkId);

    // 6. Admin Booking Management
    // A. Verify newly created booking appears in admin list
    const adminBkList = await mockRequest(app, 'GET', '/api/admin/bookings', { Authorization: 'Bearer ' + adminToken });
    const foundBk = (adminBkList.body.bookings || []).find(b => b.id === newBkId);
    assert('Newly created booking appears in admin bookings list', !!foundBk);

    // B. View booking details
    const bkDetail = await mockRequest(app, 'GET', `/api/admin/bookings/${newBkId}`, { Authorization: 'Bearer ' + adminToken });
    assert('Admin views full booking details with customer info', bkDetail.status === 200 && bkDetail.body.booking && bkDetail.body.customer);

    // C. Assign professional
    const assignPro = await mockRequest(app, 'POST', `/api/admin/bookings/${newBkId}/assign`, { Authorization: 'Bearer ' + adminToken }, {
      proId: 1,
    });
    assert('Admin assigns professional to booking', assignPro.status === 200 && assignPro.body.booking.proId === 1 && assignPro.body.booking.status === 'assigned');

    // D. Update booking status
    const updateStatus = await mockRequest(app, 'PATCH', `/api/admin/bookings/${newBkId}`, { Authorization: 'Bearer ' + adminToken }, {
      status: 'arriving',
    });
    assert('Admin updates booking status to arriving', updateStatus.status === 200 && updateStatus.body.booking.status === 'arriving');

    // E. Status validation: reject invalid status
    const invalidStatus = await mockRequest(app, 'PATCH', `/api/admin/bookings/${newBkId}`, { Authorization: 'Bearer ' + adminToken }, {
      status: 'invalid_status_xyz',
    });
    assert('Server rejects invalid booking status transition with 400', invalidStatus.status === 400);

    // F. Complete booking (triggers reward points and cashback)
    const completeBk = await mockRequest(app, 'PATCH', `/api/admin/bookings/${newBkId}`, { Authorization: 'Bearer ' + adminToken }, {
      status: 'completed',
    });
    assert('Admin marks booking completed', completeBk.status === 200 && completeBk.body.booking.status === 'completed');

    // G. Cancel a booking
    const cancelBkId = 'SH' + Math.floor(100000 + Math.random() * 900000);
    await mockRequest(app, 'POST', '/api/bookings', { Authorization: 'Bearer ' + custToken }, {
      id: cancelBkId,
      serviceId: 's2',
      date: '2026-11-21',
      time: '12:00 PM',
      address: 'Bandra, Mumbai',
      paymentMethod: 'wallet',
    });
    const cancelRes = await mockRequest(app, 'POST', `/api/admin/bookings/${cancelBkId}/cancel`, { Authorization: 'Bearer ' + adminToken }, {
      reason: 'Customer requested reschedule',
    });
    assert('Admin cancels booking with reason', cancelRes.status === 200 && cancelRes.body.booking.status === 'cancelled');

    // H. Process refund for cancelled booking
    const refundRes = await mockRequest(app, 'POST', `/api/admin/bookings/${cancelBkId}/refund`, { Authorization: 'Bearer ' + adminToken }, {
      amount: 399,
    });
    assert('Admin processes refund to customer wallet', refundRes.status === 200 && refundRes.body.refunded === true && refundRes.body.booking.paymentStatus === 'refunded');

    // 7. Professionals Management
    const pros = await mockRequest(app, 'GET', '/api/admin/professionals', { Authorization: 'Bearer ' + adminToken });
    assert('Admin lists all professionals', pros.status === 200 && Array.isArray(pros.body.professionals));

    const proDetail = await mockRequest(app, 'GET', `/api/admin/professionals/1`, { Authorization: 'Bearer ' + adminToken });
    assert('Admin views pro details including assigned bookings', proDetail.status === 200 && proDetail.body.professional && Array.isArray(proDetail.body.bookings));

    const togglePro = await mockRequest(app, 'PATCH', `/api/admin/professionals/1`, { Authorization: 'Bearer ' + adminToken }, {
      status: 'suspended',
    });
    assert('Admin suspends/activates professional', togglePro.status === 200 && togglePro.body.professional.status === 'suspended');
    // Restore
    await mockRequest(app, 'PATCH', `/api/admin/professionals/1`, { Authorization: 'Bearer ' + adminToken }, { status: 'active' });

    // 8. Customer Management
    const users = await mockRequest(app, 'GET', '/api/admin/users', { Authorization: 'Bearer ' + adminToken });
    assert('Admin lists users without exposing password hashes', users.status === 200 && users.body.users.every(u => !u.passwordHash));

    const custDetail = await mockRequest(app, 'GET', `/api/admin/users/9000`, { Authorization: 'Bearer ' + adminToken });
    assert('Admin views customer details and booking history', custDetail.status === 200 && custDetail.body.user && Array.isArray(custDetail.body.bookings));

    const toggleCust = await mockRequest(app, 'PATCH', `/api/admin/users/9000/status`, { Authorization: 'Bearer ' + adminToken }, {
      disabled: true,
    });
    assert('Admin toggles customer active status safely', toggleCust.status === 200 && toggleCust.body.user.disabled === true);
    // Restore
    await mockRequest(app, 'PATCH', `/api/admin/users/9000/status`, { Authorization: 'Bearer ' + adminToken }, { disabled: false });

    // 9. Service Management
    const newSvcId = 's_test_' + Date.now();
    const createSvc = await mockRequest(app, 'POST', '/api/admin/services', { Authorization: 'Bearer ' + adminToken }, {
      id: newSvcId,
      name: 'Kitchen Chimney Deep Clean',
      category: 'Cleaning',
      priceFrom: 799,
      duration: '2 hrs',
      description: 'Complete degreasing and baffle filter cleaning.',
      included: ['Baffle filter wash', 'Motor degrease'],
    });
    assert('Admin adds new service', createSvc.status === 201 && createSvc.body.service.name === 'Kitchen Chimney Deep Clean');

    const editSvc = await mockRequest(app, 'PATCH', `/api/admin/services/${newSvcId}`, { Authorization: 'Bearer ' + adminToken }, {
      priceFrom: 849,
      active: true,
    });
    assert('Admin edits service price and availability', editSvc.status === 200 && editSvc.body.service.priceFrom === 849);

    const deleteSvc = await mockRequest(app, 'DELETE', `/api/admin/services/${newSvcId}`, { Authorization: 'Bearer ' + adminToken });
    assert('Admin deactivates/deletes service', deleteSvc.status === 200 && deleteSvc.body.ok === true);

    // 10. Broadcast Notifications
    const broadcast = await mockRequest(app, 'POST', '/api/admin/broadcast', { Authorization: 'Bearer ' + adminToken }, {
      title: 'Admin Integration Test Alert',
      body: 'System notification verification',
      audience: 'customers',
    });
    assert('Admin sends broadcast in-app notification', broadcast.status === 200 && broadcast.body.ok === true && broadcast.body.count > 0);

  } catch (err) {
    console.error('Unexpected test error:', err);
    failed++;
  } finally {
    console.log(`\n--- Test Results: ${passed} passed, ${failed} failed ---`);
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();
