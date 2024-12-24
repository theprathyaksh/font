const express = require('express');
const mongoose = require('mongoose');
const crypto = require('crypto');
const bodyParser = require('body-parser');

// Initialize Express App
const app = express();
app.use(bodyParser.json());

// MongoDB Connection
const MONGO_URI = "mongodb+srv://gorantalaakhil6:3Lg0MtbmwLOrrefm@myfonts.lospx50.mongodb.net/";
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

// Font Schema and Model
const fontSchema = new mongoose.Schema({
  font_name: String,
  font_auther: String,
  font_logo: String,
  download_link: String,
  charter_map: String,
  top_cat: String,
  sub_cat: String,
});
const Font = mongoose.model('Font', fontSchema);

// Encryption Helper Functions
const ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex'); // Replace with a securely stored key
const IV_LENGTH = 16; // Initialization Vector length

function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
  const parts = text.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encryptedText = Buffer.from(parts[1], 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

// API Endpoints

// 1. Fetch Fonts with Pagination and Search
app.get('/api/fonts', async (req, res) => {
  const { page = 1, limit = 10, search = '' } = req.query;

  try {
    const query = search ? { font_name: { $regex: search, $options: 'i' } } : {};
    const fonts = await Font.find(query)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const encryptedFonts = fonts.map(font => ({
      ...font._doc,
      font_name: encrypt(font.font_name),
    }));

    const total = await Font.countDocuments(query);
    res.json({
      data: encryptedFonts,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching fonts', error: err.message });
  }
});

// 2. Decrypt Font Name
app.post('/api/fonts/decrypt', (req, res) => {
  const { encrypted_name } = req.body;

  try {
    const decryptedName = decrypt(encrypted_name);
    res.json({ decrypted_name: decryptedName });
  } catch (err) {
    res.status(400).json({ message: 'Error decrypting name', error: err.message });
  }
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});