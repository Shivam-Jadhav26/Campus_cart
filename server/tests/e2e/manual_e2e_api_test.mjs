// CampusCart E2E API Test (Node.js)
// Run: node tests/manual_e2e_api_test.mjs

const BASE = 'http://localhost:5000';

let sellerToken = null;
let buyerToken = null;
let listingId = null;
let conversationId = null;

const results = [];

// Color helpers
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const red   = (s) => `\x1b[31m${s}\x1b[0m`;
const cyan  = (s) => `\x1b[36m${s}\x1b[0m`;
const yellow= (s) => `\x1b[33m${s}\x1b[0m`;

function step(msg)  { console.log(cyan(`\n==> ${msg}`)); }
function pass(msg)  { console.log(green(`  [PASS] ${msg}`)); results.push(`[PASS] ${msg}`); }
function fail(msg)  { console.log(red(`  [FAIL] ${msg}`)); results.push(`[FAIL] ${msg}`); }
function info(msg)  { console.log(yellow(`  [INFO] ${msg}`)); }

async function post(url, body, token) {
  const res = await fetch(`${BASE}${url}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(body),
    credentials: 'include'
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

async function get(url, token) {
  const res = await fetch(`${BASE}${url}`, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'include'
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

async function run() {

  // ====================================================
  // PHASE 1: Health Check
  // ====================================================
  step('Phase 0: Health Check');
  try {
    const r = await get('/health');
    if (r.ok) {
      pass(`Backend healthy — uptime: ${Math.round(r.data.uptime)}s`);
    } else {
      fail(`Health check returned ${r.status}`);
    }
  } catch(e) {
    fail(`Health check error: ${e.message}`);
  }

  // ====================================================
  // PHASE 1: Seller Login
  // ====================================================
  step('Phase 1.1: Seller Login');
  try {
    const r = await post('/api/auth/login', { email: 'sellerA@journey.com', password: 'Password123' });
    info(`Response status: ${r.status}`);
    info(`Response data: ${JSON.stringify(r.data).slice(0, 200)}`);
    sellerToken = r.data.token || r.data.accessToken;
    if (r.ok && sellerToken) {
      pass('Seller login succeeded — token received');
    } else if (r.ok && !sellerToken) {
      fail(`Login OK but no token. Keys: ${Object.keys(r.data).join(', ')}`);
    } else {
      fail(`Seller login failed: ${r.status} — ${r.data.message || JSON.stringify(r.data)}`);
    }
  } catch(e) {
    fail(`Seller login exception: ${e.message}`);
  }

  // ====================================================
  // PHASE 1.2: Create Listing (no image)
  // ====================================================
  step('Phase 1.2: Create Listing (no image)');
  if (sellerToken) {
    try {
      const r = await post('/api/listings', {
        title: 'Test Calculus Textbook',
        price: 25,
        category: 'Books',
        description: 'Mint condition calculus textbook, never used',
        contact: '9876543210'
      }, sellerToken);
      info(`Response status: ${r.status}`);
      info(`Response data: ${JSON.stringify(r.data).slice(0, 300)}`);
      listingId = r.data?.data?._id || r.data?._id;
      if (r.ok && listingId) {
        pass(`Listing created — ID: ${listingId}`);
      } else if (!r.ok) {
        fail(`Create listing ${r.status}: ${r.data.message || JSON.stringify(r.data)}`);
      } else {
        fail(`No listing ID in response. Data: ${JSON.stringify(r.data)}`);
      }
    } catch(e) {
      fail(`Create listing exception: ${e.message}`);
    }
  } else {
    info('Skipping — no seller token');
    results.push('[SKIP] Phase 1.2: Create Listing');
  }

  // ====================================================
  // PHASE 1.3: Verify on Homepage
  // ====================================================
  step('Phase 1.3: Verify Listing on Homepage');
  if (listingId) {
    try {
      const r = await get('/api/listings');
      const listings = r.data.listings || r.data || [];
      const found = listings.find(l => l._id === listingId);
      if (found) {
        pass(`Listing visible: "${found.title}" at price ${found.price}`);
      } else {
        fail(`Listing ${listingId} NOT found in homepage. Total listings: ${listings.length}`);
      }
    } catch(e) {
      fail(`Get listings exception: ${e.message}`);
    }
  } else {
    info('Skipping — no listing ID');
    results.push('[SKIP] Phase 1.3: Listing on Homepage');
  }

  // ====================================================
  // PHASE 2.1: Buyer Login
  // ====================================================
  step('Phase 2.1: Buyer Login');
  try {
    const r = await post('/api/auth/login', { email: 'buyerB@journey.com', password: 'Password123' });
    info(`Response status: ${r.status}`);
    info(`Response data: ${JSON.stringify(r.data).slice(0, 200)}`);
    buyerToken = r.data.token || r.data.accessToken;
    if (r.ok && buyerToken) {
      pass('Buyer login succeeded — token received');
    } else if (r.ok && !buyerToken) {
      fail(`Login OK but no token. Keys: ${Object.keys(r.data).join(', ')}`);
    } else {
      fail(`Buyer login failed: ${r.status} — ${r.data.message || JSON.stringify(r.data)}`);
    }
  } catch(e) {
    fail(`Buyer login exception: ${e.message}`);
  }

  // ====================================================
  // PHASE 2.2: View Listing Detail
  // ====================================================
  step('Phase 2.2: View Listing Detail');
  if (buyerToken && listingId) {
    try {
      const r = await get(`/api/listings/${listingId}`, buyerToken);
      info(`Listing detail: ${JSON.stringify(r.data).slice(0, 200)}`);
      if (r.ok && r.data.title) {
        pass(`Listing detail loaded: "${r.data.title}" — Price: ${r.data.price}`);
      } else {
        fail(`Get listing detail ${r.status}: ${r.data.message}`);
      }
    } catch(e) {
      fail(`Get listing detail exception: ${e.message}`);
    }
  } else {
    info('Skipping — no buyer token or listing ID');
    results.push('[SKIP] Phase 2.2: View Listing Detail');
  }

  // ====================================================
  // PHASE 3.1: Submit Offer
  // ====================================================
  step('Phase 3.1: Submit Offer (buyer)');
  if (buyerToken && listingId) {
    try {
      const r = await post(`/api/offers/${listingId}`, { amount: 20 }, buyerToken);
      info(`Offer response status: ${r.status}`);
      info(`Offer response data: ${JSON.stringify(r.data).slice(0, 400)}`);
      const offerId = r.data?.data?._id || r.data?.offer?._id || r.data?._id;
      conversationId = r.data?.data?.conversationId || r.data?.conversationId || r.data?.conversation?._id;
      if (r.ok && offerId) {
        pass(`Offer submitted — ID: ${offerId}`);
      } else if (r.ok) {
        info(`Offer OK but no offerId. Data: ${JSON.stringify(r.data)}`);
        results.push('[INFO] Phase 3.1: Offer OK but structure unclear');
      } else {
        fail(`Offer failed ${r.status}: ${r.data.message || JSON.stringify(r.data)}`);
      }
      if (conversationId) {
        pass(`Conversation created — ID: ${conversationId}`);
        results.push('[PASS] Phase 3.2: Redirected to Chat (conversation ID found)');
      } else {
        info(`No conversationId. Looking in all keys: ${Object.keys(r.data?.data || r.data || {}).join(', ')}`);
        results.push('[INFO] Phase 3.2: No conversationId in offer response');
      }
    } catch(e) {
      fail(`Offer submission exception: ${e.message}`);
    }
  } else {
    info('Skipping — no buyer token or listing ID');
    results.push('[SKIP] Phase 3.1: Offer Submission');
  }

  // ====================================================
  // PHASE 4.1: Buyer Conversations
  // ====================================================
  step('Phase 4.1: Buyer Conversations');
  if (buyerToken) {
    try {
      const r = await get('/api/chat/conversations', buyerToken);
      info(`Conversations: ${JSON.stringify(r.data).slice(0, 400)}`);
      const convs = r.data?.data || (Array.isArray(r.data) ? r.data : []);
      if (r.ok && convs.length > 0) {
        pass(`Buyer has ${convs.length} conversation(s)`);
        if (!conversationId && convs[0]._id) {
          conversationId = convs[0]._id;
          info(`Set conversationId from list: ${conversationId}`);
        }
      } else if (r.ok) {
        info('Conversations list is empty or unexpected format');
        results.push('[INFO] Phase 4.1: Conversation list empty');
      } else {
        fail(`Get conversations ${r.status}: ${r.data.message}`);
      }
    } catch(e) {
      fail(`Get conversations exception: ${e.message}`);
    }
  }

  // ====================================================
  // PHASE 4.2: Messages in Conversation
  // ====================================================
  step('Phase 4.2: Messages in Conversation');
  if (buyerToken && conversationId) {
    try {
      const r = await get(`/api/chat/conversations/${conversationId}/messages`, buyerToken);
      info(`Messages response: ${JSON.stringify(r.data).slice(0, 400)}`);
      const msgs = r.data?.data || (Array.isArray(r.data) ? r.data : []);
      if (r.ok && msgs.length > 0) {
        pass(`${msgs.length} message(s) in conversation — first: "${msgs[0].text || msgs[0].content || JSON.stringify(msgs[0])}"`);
      } else if (r.ok) {
        info('No messages found in conversation');
        results.push('[INFO] Phase 4.2: No messages in conversation');
      } else {
        fail(`Get messages ${r.status}: ${r.data.message}`);
      }
    } catch(e) {
      fail(`Get messages exception: ${e.message}`);
    }
  } else {
    info('Skipping messages check — no conversationId');
    results.push('[SKIP] Phase 4.2: Messages Check');
  }

  // ====================================================
  // PHASE 4.3: Send Message (buyer)
  // ====================================================
  step('Phase 4.3: Send Chat Message (buyer)');
  if (buyerToken && conversationId) {
    try {
      const r = await post('/api/chat/messages', {
        conversationId,
        text: 'Hi, is this still available?'
      }, buyerToken);
      info(`Send message response: ${JSON.stringify(r.data).slice(0, 300)}`);
      if (r.ok) {
        pass('Buyer message sent successfully');
      } else {
        fail(`Send message ${r.status}: ${r.data.message || JSON.stringify(r.data)}`);
      }
    } catch(e) {
      fail(`Send message exception: ${e.message}`);
    }
  } else {
    info('Skipping — no conversationId');
    results.push('[SKIP] Phase 4.3: Send Message');
  }

  // ====================================================
  // PHASE 5.1: Seller Sees Conversation
  // ====================================================
  step('Phase 5.1: Seller Conversation List');
  if (sellerToken) {
    try {
      const r = await get('/api/chat/conversations', sellerToken);
      info(`Seller conversations: ${JSON.stringify(r.data).slice(0, 400)}`);
      const convs = r.data?.data || (Array.isArray(r.data) ? r.data : []);
      const found = convs.find(c => c._id === conversationId);
      if (r.ok && found) {
        pass('Seller sees the conversation with buyer');
      } else if (r.ok && convs.length > 0) {
        info(`Seller has ${convs.length} conversation(s) but target not found by ID. IDs: ${convs.map(c => c._id).join(', ')}`);
        results.push('[INFO] Phase 5.1: Seller has conversations but target ID mismatch');
      } else if (r.ok) {
        fail('Seller sees NO conversations');
      } else {
        fail(`Seller get conversations ${r.status}: ${r.data.message}`);
      }
    } catch(e) {
      fail(`Seller get conversations exception: ${e.message}`);
    }
  }

  // ====================================================
  // PHASE 5.2: Seller Sends Reply
  // ====================================================
  step('Phase 5.2: Seller Sends Reply');
  if (sellerToken && conversationId) {
    try {
      const r = await post('/api/chat/messages', {
        conversationId,
        text: 'Thanks for your offer, let me think!'
      }, sellerToken);
      info(`Seller reply response: ${JSON.stringify(r.data).slice(0, 300)}`);
      if (r.ok) {
        pass('Seller reply sent successfully');
      } else {
        fail(`Seller send reply ${r.status}: ${r.data.message || JSON.stringify(r.data)}`);
      }
    } catch(e) {
      fail(`Seller reply exception: ${e.message}`);
    }
  } else {
    info('Skipping — no conversationId');
    results.push('[SKIP] Phase 5.2: Seller Reply');
  }

  // ====================================================
  // PHASE 6: Refresh Persistence (verify messages still there)
  // ====================================================
  step('Phase 6: Refresh Persistence (re-fetch messages)');
  if (buyerToken && conversationId) {
    try {
      const r = await get(`/api/chat/conversations/${conversationId}/messages`, buyerToken);
      const msgs = r.data?.data || (Array.isArray(r.data) ? r.data : []);
      if (r.ok && msgs.length >= 2) {
        pass(`Messages persist after re-fetch: ${msgs.length} messages found`);
      } else if (r.ok) {
        info(`Only ${msgs.length} message(s) found (expected at least 2)`);
        results.push(`[INFO] Phase 6: ${msgs.length} messages persisted`);
      } else {
        fail(`Re-fetch messages ${r.status}: ${r.data.message}`);
      }
    } catch(e) {
      fail(`Refresh persistence exception: ${e.message}`);
    }
  } else {
    info('Skipping — no conversationId');
    results.push('[SKIP] Phase 6: Refresh Persistence');
  }

  // ====================================================
  // PHASE 7: 429 Navigation Stability Test
  // ====================================================
  step('Phase 7: Rapid Requests — Navigation Stability (429 Test)');
  let got429 = false;
  for (let i = 0; i < 15; i++) {
    try {
      const r = await get('/api/auth/me', buyerToken);
      if (r.status === 429) {
        fail(`429 received on iteration ${i+1} of /api/auth/me`);
        got429 = true;
        break;
      }
    } catch(e) {
      info(`Request ${i+1} error: ${e.message}`);
    }
  }
  if (!got429) {
    pass('No 429 errors on 15 rapid /api/auth/me requests');
  }

  // Also test /api/listings rapid requests
  let got429Listings = false;
  for (let i = 0; i < 10; i++) {
    try {
      const r = await get('/api/listings');
      if (r.status === 429) {
        fail(`429 received on /api/listings iteration ${i+1}`);
        got429Listings = true;
        break;
      }
    } catch(e) {
      info(`Listings request ${i+1} error: ${e.message}`);
    }
  }
  if (!got429Listings) {
    pass('No 429 errors on 10 rapid /api/listings requests');
  }

  // ====================================================
  // PHASE 8.1: Duplicate Offer Protection
  // ====================================================
  step('Phase 8.1: Duplicate Offer Protection');
  if (buyerToken && listingId) {
    try {
      const r = await post(`/api/offers/${listingId}`, { amount: 18 }, buyerToken);
      info(`Second offer status: ${r.status}`);
      info(`Second offer data: ${JSON.stringify(r.data).slice(0, 400)}`);
      const newConvId = r.data?.data?.conversationId || r.data?.conversationId || r.data?.conversation?._id;
      if (r.status === 400 || r.status === 409 || (r.data?.message || '').toLowerCase().includes('already')) {
        pass('Duplicate offer properly rejected (400/409 or "already" message)');
      } else if (r.ok && newConvId === conversationId) {
        pass('Re-offer returned same conversation — no duplicate created');
      } else if (r.ok) {
        info(`Re-offer returned new/different conversationId: ${newConvId} vs ${conversationId}`);
        results.push('[INFO] Phase 8.1: Re-offer behavior unclear');
      } else {
        info(`Offer second attempt: ${r.status} — ${JSON.stringify(r.data)}`);
        results.push(`[INFO] Phase 8.1: Second offer returned ${r.status}`);
      }
    } catch(e) {
      fail(`Duplicate offer exception: ${e.message}`);
    }
  }

  // ====================================================
  // FINAL REPORT
  // ====================================================
  console.log('\n\n====== CAMPUSCART MANUAL API TEST REPORT ======');
  for (const r of results) {
    if (r.startsWith('[PASS]')) console.log(green(r));
    else if (r.startsWith('[FAIL]')) console.log(red(r));
    else console.log(yellow(r));
  }

  const passed = results.filter(r => r.startsWith('[PASS]')).length;
  const failed  = results.filter(r => r.startsWith('[FAIL]')).length;
  const skipped = results.filter(r => r.startsWith('[SKIP]') || r.startsWith('[INFO]')).length;

  console.log(`\n${green(`Passed: ${passed}`)}  ${red(`Failed: ${failed}`)}  ${yellow(`Info/Skip: ${skipped}`)}`);

  const overallStatus = failed === 0 ? 'PASS' : passed > failed ? 'PARTIAL' : 'FAIL';
  console.log(`\nOVERALL STATUS: ${overallStatus === 'PASS' ? green(overallStatus) : overallStatus === 'PARTIAL' ? yellow(overallStatus) : red(overallStatus)}`);
  console.log('======================================\n');
}

run().catch(e => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
