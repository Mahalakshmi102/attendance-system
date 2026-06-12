const fs = require('fs');
const FormData = require('form-data');
const jwt = require('jsonwebtoken');

const token = jwt.sign(
  { user: { id: 'test', role: 'Admin' } },
  process.env.JWT_SECRET || 'fallback_secret_key',
  { expiresIn: '1d' }
);

async function upload() {
  const form = new FormData();
  form.append('file', fs.createReadStream('test.csv'));

  try {
    const res = await fetch('http://localhost:5000/api/admin/upload/users', {
      method: 'POST',
      body: form,
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    const data = await res.json();
    console.log('Status:', res.status);
    console.log('Response:', data);
  } catch (err) {
    console.error('Fetch error:', err);
  }
}
upload();
