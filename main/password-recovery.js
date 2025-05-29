const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { store } = require('./store');

// Configure email transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

// Store recovery codes with expiration
const recoveryCodes = new Map();

// Generate a secure recovery code
function generateRecoveryCode() {
    return crypto.randomBytes(4).toString('hex').toUpperCase();
}

// Send recovery code via email
async function sendRecoveryCode(email) {
    const userData = await store.get('userData');
    
    if (!userData || userData.email !== email) {
        throw new Error('No admin account found with this email');
    }

    const recoveryCode = generateRecoveryCode();
    const expirationTime = Date.now() + 15 * 60 * 1000; // 15 minutes

    // Store recovery code with expiration
    recoveryCodes.set(email, {
        code: recoveryCode,
        expires: expirationTime
    });

    // Send email with recovery code
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Admin Password Recovery Code',
        html: `
            <h2>Admin Password Recovery</h2>
            <p>Your recovery code is: <strong>${recoveryCode}</strong></p>
            <p>This code will expire in 15 minutes.</p>
            <p>If you did not request this code, please ignore this email.</p>
        `
    };

    await transporter.sendMail(mailOptions);
}

// Verify recovery code and reset password
async function resetPassword(email, recoveryCode, newPassword) {
    const recoveryData = recoveryCodes.get(email);
    
    if (!recoveryData) {
        throw new Error('No recovery code found for this email');
    }

    if (Date.now() > recoveryData.expires) {
        recoveryCodes.delete(email);
        throw new Error('Recovery code has expired');
    }

    if (recoveryData.code !== recoveryCode) {
        throw new Error('Invalid recovery code');
    }

    // Update admin password
    const userData = await store.get('userData');
    userData.adminPassword = newPassword;
    await store.set('userData', userData);

    // Remove used recovery code
    recoveryCodes.delete(email);
}

// Clean up expired recovery codes periodically
setInterval(() => {
    const now = Date.now();
    for (const [email, data] of recoveryCodes.entries()) {
        if (now > data.expires) {
            recoveryCodes.delete(email);
        }
    }
}, 5 * 60 * 1000); // Check every 5 minutes

module.exports = {
    sendRecoveryCode,
    resetPassword
}; 