const express = require('express');
const cors = require('cors');
const path = require('path');
const { getDbAsync } = require('./db/database');
const { startCleanupCron } = require('./jobs/cleanup');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const { createRefRouter } = require('./routes/referenceData');
const orderRoutes = require('./routes/orders');
const stockRoutes = require('./routes/leftoverStock');
const usageLogRoutes = require('./routes/usageLog');
const stockAdjustmentRoutes = require('./routes/stockAdjustments');
const photoRoutes = require('./routes/photos');
const vendorRoutes = require('./routes/vendors');
const masterRoutes = require('./routes/masters');
const accessoryMasterRoutes = require('./routes/accessory_masters');
const accessoryRoutes = require('./routes/accessories');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Auth & Users ─────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// ── Reference Data — Pattern A (any user can add inline) ─────
app.use('/api/fabric-types', createRefRouter('fabric_types'));
app.use('/api/embroidery-types', createRefRouter('embroidery_types'));
app.use('/api/printing-types', createRefRouter('printing_types'));
app.use('/api/accessory-types', createRefRouter('accessory_types'));
app.use('/api/storage-locations', createRefRouter('storage_locations'));

// ── Reference Data — Pattern B (admin-only write) ────────────
app.use('/api/condition-options', createRefRouter('condition_options', { hasOther: true, adminOnlyWrite: true }));
app.use('/api/reason-options', createRefRouter('reason_options', { hasOther: true, adminOnlyWrite: true }));

// ── Vendors & Masters ────────────────────────────────────────
app.use('/api/vendors', vendorRoutes);
app.use('/api/masters', masterRoutes);
app.use('/api/accessory-masters', accessoryMasterRoutes);

// ── Orders ───────────────────────────────────────────────────
app.use('/api/orders', orderRoutes);

// ── Fabric Stock ─────────────────────────────────────────────
app.use('/api/stock', stockRoutes);
app.use('/api/stock/:id/usage', usageLogRoutes);
app.use('/api/stock/:id/adjustments', stockAdjustmentRoutes);
app.use('/api/stock/:id/photos', photoRoutes);

// ── Accessories ──────────────────────────────────────────────
app.use('/api/accessories', accessoryRoutes);
app.use('/api/accessories/:id/photos', photoRoutes);

// ── Serve React Client ───────────────────────────────────────
const clientBuildPath = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientBuildPath));
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found' });
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

async function start() {
  try {
    await getDbAsync();
    app.listen(PORT, () => {
      console.log(`\n🧵 Fabric Tracker v2 running at http://localhost:${PORT}`);
      console.log(`   API: http://localhost:${PORT}/api\n`);
      startCleanupCron();
    });
  } catch (err) {
    console.error('Failed to start:', err);
    process.exit(1);
  }
}

start();
