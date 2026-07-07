const bcrypt = require('bcryptjs');
const { getDbAsync } = require('./database');

async function seedData() {
  const db = await getDbAsync();
  const salt = bcrypt.genSaltSync(10);

  console.log('Seeding data...');
  try {
    // ── Users ────────────────────────────────────────────────────
    await db.run('INSERT INTO users (name, pin_hash, role) VALUES ($1, $2, $3)', ['Admin', bcrypt.hashSync('3947', salt), 'admin']);
    await db.run('INSERT INTO users (name, pin_hash, role) VALUES ($1, $2, $3)', ['Staff', bcrypt.hashSync('7261', salt), 'staff']);

    // ── Vendors ──────────────────────────────────────────────────
    const vendors = [
      ['Khatri Textiles', 'Ramesh Khatri', '9876543210'],
      ['Surat Silk House', 'Vijay Shah', '9765432109'],
      ['Mumbai Fabric Co.', 'Amit Patel', '9654321098'],
      ['Arvind Mills', 'Sales Team', '9543210987'],
      ['YKK Zippers India', 'Support', '9432109876'],
      ['Bombay Buttons', 'Rekha Sharma', '9321098765'],
    ];
    for (const [name, contact, phone] of vendors) {
      await db.run('INSERT INTO vendors (name, contact_person, phone) VALUES ($1, $2, $3)', [name, contact, phone]);
    }

    // ── Storage Locations ────────────────────────────────────────
    const locations = ['Dyeing Unit', 'Umargaon Factory', 'Kalyan Factory', 'Sakinaka Office', 'Vasai Job Worker'];
    for (const loc of locations) {
      await db.run('INSERT INTO storage_locations (name) VALUES ($1)', [loc]);
    }

    // ── Fabric Types ─────────────────────────────────────────────
    const fabricTypes = ['Cotton', 'Polyester', 'Satin', 'Silk', 'Chiffon', 'Georgette', 'Velvet', 'Linen', 'Rayon', 'Denim', 'Net', 'Crepe', 'Twill', 'Muslin', 'Interlock'];
    for (const ft of fabricTypes) await db.run('INSERT INTO fabric_types (name) VALUES ($1)', [ft]);

    // ── Embroidery Types ─────────────────────────────────────────
    const embroideryTypes = ['Thread Embroidery', 'Sequin/Beadwork', 'Zari Work', 'Applique', 'Mirror Work', 'Cutdana', 'Smocking', 'Shadow Work'];
    for (const et of embroideryTypes) await db.run('INSERT INTO embroidery_types (name) VALUES ($1)', [et]);

    // ── Printing Types ───────────────────────────────────────────
    const printingTypes = ['Screen Print', 'Digital/Sublimation Print', 'Block Print', 'Foil Print', 'Discharge Print', 'Pigment Print', 'Reactive Print'];
    for (const pt of printingTypes) await db.run('INSERT INTO printing_types (name) VALUES ($1)', [pt]);

    // ── Accessory Types ──────────────────────────────────────────
    const accessoryTypes = [
      ['Buttons', 'pieces'],
      ['Zippers', 'pieces'],
      ['Elastic', 'meters'],
      ['Loop Ends / Cord Locks', 'pieces'],
      ['Hangers', 'pieces'],
      ['Woven Labels / Tags', 'pieces'],
      ['Velcro / Hook & Loop', 'meters'],
      ['Snaps / Press Studs', 'pieces'],
      ['Rivets', 'pieces'],
      ['Drawstrings / Cords', 'meters'],
      ['Lace / Trim', 'meters'],
      ['Shoulder Pads', 'pieces'],
      ['Threads', 'cones'],
      ['Safety Pins', 'pieces'],
      ['Applique Patches', 'pieces'],
      ['Ribbons / Bows', 'meters'],
      ['Suspender Clips', 'pieces'],
      ['Poppers / KAM Snaps', 'pieces'],
      ['Hook & Eye', 'pieces'],
      ['Twill Tape', 'meters'],
      ['Seam Binding', 'meters'],
      ['Interlining / Fusible', 'meters'],
    ];
    for (const [name, unit] of accessoryTypes) {
      await db.run('INSERT INTO accessory_types (name, default_unit) VALUES ($1, $2)', [name, unit]);
    }

    // ── Condition Options ────────────────────────────────────────
    const conditions = ['Good / Reusable', 'Minor Stains', 'Major Stains', 'Water Damage', 'Color Fading/Bleeding', 'Torn/Frayed Edges', 'Odor Issue'];
    for (const c of conditions) await db.run('INSERT INTO condition_options (name, is_other) VALUES ($1, 0)', [c]);
    await db.run('INSERT INTO condition_options (name, is_other) VALUES ($1, 1)', ['Other']);

    // ── Reason Options ───────────────────────────────────────────
    const reasons = [
      'Short Supply from Vendor', 'Lower Consumption than Estimated',
      'Excess/Buffer Stock Ordered', 'Cutting Wastage',
      'Order Cancelled/Reduced', 'Defect Found After Cutting',
      'Returned from Job Worker', 'Sample/Swatch Leftover',
      'End of Roll / Short Piece',
    ];
    for (const r of reasons) await db.run('INSERT INTO reason_options (name, is_other) VALUES ($1, 0)', [r]);
    await db.run('INSERT INTO reason_options (name, is_other) VALUES ($1, 1)', ['Other']);

    // ── Orders ───────────────────────────────────────────────────
    await db.run('INSERT INTO orders (order_number, style_name, buyer_name, order_date) VALUES ($1, $2, $3, $4)', ['ORD-2026-001', 'Summer Blouse A', 'H&M India', '2026-06-01']);
    await db.run('INSERT INTO orders (order_number, style_name, buyer_name, order_date) VALUES ($1, $2, $3, $4)', ['ORD-2026-002', 'Formal Shirt B', 'Zara Export', '2026-06-15']);
    await db.run('INSERT INTO orders (order_number, style_name, buyer_name, order_date) VALUES ($1, $2, $3, $4)', ['ORD-2026-003', 'Kids Party Dress C', 'Mango Exports', '2026-05-20']);

    console.log('Seed data inserted successfully!');
  } catch (err) {
    console.error('Failed to seed:', err);
  }
}

seedData().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
