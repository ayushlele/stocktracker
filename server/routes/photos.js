const express = require('express');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const {
  getDbAsync,
  saveDb
} = require('../db/database');
const {
  requireAuth
} = require('../middleware/auth');
const {
  upload,
  handleUploadError
} = require('../middleware/upload');
const router = express.Router({
  mergeParams: true
});

const supabase = process.env.SUPABASE_URL ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY) : null;

// POST /api/stock/:id/photos — Upload one or more photos
router.post('/', requireAuth, upload.array('photos', 6), handleUploadError, async (req, res) => {
  const db = await getDbAsync();
  const stockId = parseInt(req.params.id);
  const isAccessory = req.baseUrl.includes('accessories');
  const tableName = isAccessory ? 'accessory_stock' : 'leftover_stock';

  if (!supabase) {
    return res.status(500).json({ error: 'Supabase client not configured' });
  }

  // Verify the stock entry exists
  const entry = await db.get(`SELECT id FROM ${tableName} WHERE id = $1`, [stockId]);
  if (!entry) {
    return res.status(404).json({
      error: 'Entry not found'
    });
  }
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({
      error: 'No files uploaded'
    });
  }

  const photos = [];
  for (const file of req.files) {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const filename = `${uuidv4()}${ext}`;
    
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('photos')
      .upload(filename, file.buffer, {
        contentType: file.mimetype,
        upsert: false
      });

    if (error) {
      console.error('Supabase upload error:', error);
      return res.status(500).json({ error: 'Failed to upload photo to storage' });
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage.from('photos').getPublicUrl(filename);
    const publicUrl = publicUrlData.publicUrl;

    const cols = isAccessory ? '(accessory_stock_id, file_path)' : '(leftover_stock_id, file_path)';
    const result = await db.run(`INSERT INTO photos ${cols} VALUES ($1, $2)`, [stockId, publicUrl]);
    
    const photo = {
      id: result.lastInsertRowid,
      file_path: publicUrl
    };
    if (isAccessory) photo.accessory_stock_id = stockId;else photo.leftover_stock_id = stockId;
    photos.push(photo);
  }
  saveDb();
  res.status(201).json(photos);
});

// DELETE /api/stock/:stockId/photos/:photoId — Remove a photo
router.delete('/:photoId', requireAuth, async (req, res) => {
  const db = await getDbAsync();
  const photoId = parseInt(req.params.photoId);
  const photo = await db.get('SELECT * FROM photos WHERE id = $1', [photoId]);
  if (!photo) {
    return res.status(404).json({
      error: 'Photo not found'
    });
  }

  if (supabase) {
    // Delete file from Supabase storage
    const urlParts = photo.file_path.split('/');
    const filename = urlParts[urlParts.length - 1];
    
    const { error } = await supabase.storage.from('photos').remove([filename]);
    if (error) {
      console.warn('Failed to delete photo from Supabase:', error.message);
    }
  }

  // Delete DB row
  await db.run('DELETE FROM photos WHERE id = $1', [photoId]);
  saveDb();
  res.json({
    message: 'Photo deleted successfully'
  });
});
module.exports = router;