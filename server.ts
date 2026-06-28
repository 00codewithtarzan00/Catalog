import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Helper to format currency for email
const formatEmailPrice = (price: number) => {
  return `₹${price.toFixed(2)}`;
};

// API: Send email notification for orders
app.post('/api/send-email', async (req, res) => {
  const { orderId, customerName, customerEmail, customerPhone, customerAddress, totalPrice, items, location } = req.body;

  if (!customerName || !items || !totalPrice) {
    return res.status(400).json({ error: 'Missing required order details' });
  }

  // Generate Items Table HTML
  const itemsHtml = items.map((item: any) => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #eeeeee;"><strong>${item.name}</strong> ${item.quantityValue ? `(${item.quantityValue} ${item.quantityUnit || 'g'})` : ''}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eeeeee; text-align: center;">${item.quantity}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eeeeee; text-align: right;">${formatEmailPrice(item.price * item.quantity)}</td>
    </tr>
  `).join('');

  // Location string/link
  let mapLinkHtml = '';
  if (location && location.lat && location.lng) {
    const mapUrl = `https://www.google.com/maps?q=${location.lat},${location.lng}`;
    mapLinkHtml = `
      <div style="margin-top: 15px; padding: 12px; background-color: #fef2f2; border: 1px solid #fee2e2; rounded-all: 8px; border-radius: 8px;">
        <p style="margin: 0; color: #991b1b; font-size: 14px; font-weight: bold;">📍 Google Maps Delivery Pin:</p>
        <p style="margin: 4px 0 10px 0; color: #7f1d1d; font-size: 13px;">GPS Coordinates: ${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}</p>
        <a href="${mapUrl}" target="_blank" style="display: inline-block; background-color: #dc2626; color: white; padding: 8px 16px; border-radius: 6px; text-decoration: none; font-size: 13px; font-weight: bold;">Open Delivery Route on Google Maps</a>
      </div>
    `;
  }

  // Owner Notification Email Content
  const ownerSubject = `🛒 [NEW ORDER] #${orderId ? orderId.substring(0, 8).toUpperCase() : 'NEW'} from ${customerName}`;
  const ownerHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333333; line-height: 1.6;">
      <div style="background-color: #4f46e5; padding: 24px; color: white; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">New Store Order Recieved!</h1>
        <p style="margin: 5px 0 0 0; opacity: 0.9;">Order ID: #${orderId || 'Pending'}</p>
      </div>
      <div style="padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; background-color: #ffffff;">
        <h2 style="font-size: 18px; border-bottom: 2px solid #f3f4f6; padding-bottom: 8px; margin-top: 0;">Customer Information</h2>
        <table style="width: 100%; font-size: 14px; margin-bottom: 20px;">
          <tr><td style="padding: 4px 0; font-weight: bold; width: 120px;">Name:</td><td>${customerName}</td></tr>
          ${customerEmail ? `<tr><td style="padding: 4px 0; font-weight: bold;">Email:</td><td>${customerEmail}</td></tr>` : ''}
          ${customerPhone ? `<tr><td style="padding: 4px 0; font-weight: bold;">Phone:</td><td>${customerPhone}</td></tr>` : ''}
          <tr><td style="padding: 4px 0; font-weight: bold;">Delivery Address:</td><td>${customerAddress}</td></tr>
        </table>

        ${mapLinkHtml}

        <h2 style="font-size: 18px; border-bottom: 2px solid #f3f4f6; padding-bottom: 8px; margin-top: 24px;">Order Summary</h2>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 20px;">
          <thead>
            <tr style="background-color: #f9fafb;">
              <th style="padding: 10px; text-align: left; border-bottom: 2px solid #e5e7eb;">Item</th>
              <th style="padding: 10px; text-align: center; border-bottom: 2px solid #e5e7eb;">Qty</th>
              <th style="padding: 10px; text-align: right; border-bottom: 2px solid #e5e7eb;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="2" style="padding: 15px 10px; font-weight: bold; font-size: 16px; text-align: right;">Total Amount:</td>
              <td style="padding: 15px 10px; font-weight: bold; font-size: 18px; color: #4f46e5; text-align: right;">${formatEmailPrice(totalPrice)}</td>
            </tr>
          </tfoot>
        </table>
        
        <p style="font-size: 12px; color: #9ca3af; text-align: center; margin-top: 40px; border-top: 1px dashed #e5e7eb; padding-top: 15px;">
          Received via Raj Kirana Store Application &bull; Managed with Real-time Location Pinning.
        </p>
      </div>
    </div>
  `;

  // Customer Confirmation Email Content
  const customerSubject = `🎉 Thanks for your order at Raj Kirana Store! [Order #${orderId ? orderId.substring(0, 8).toUpperCase() : 'CONFIRMED'}]`;
  const customerHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333333; line-height: 1.6;">
      <div style="background-color: #10b981; padding: 24px; color: white; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">Thank you for your order!</h1>
        <p style="margin: 5px 0 0 0; opacity: 0.9;">We've successfully received your order and are preparing your items.</p>
      </div>
      <div style="padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; background-color: #ffffff;">
        <p>Dear <strong>${customerName}</strong>,</p>
        <p>We are excited to process your order from <strong>Raj Kirana Store</strong>. Below is a summary of the items being dispatched to your delivery address.</p>

        <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; border: 1px solid #f3f4f6; margin-bottom: 20px; font-size: 13px;">
          <strong>Delivery Address:</strong><br/>
          ${customerAddress}
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 20px;">
          <thead>
            <tr style="background-color: #f9fafb;">
              <th style="padding: 10px; text-align: left; border-bottom: 2px solid #e5e7eb;">Item</th>
              <th style="padding: 10px; text-align: center; border-bottom: 2px solid #e5e7eb;">Qty</th>
              <th style="padding: 10px; text-align: right; border-bottom: 2px solid #e5e7eb;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="2" style="padding: 15px 10px; font-weight: bold; font-size: 15px; text-align: right;">Total Paid/Due:</td>
              <td style="padding: 15px 10px; font-weight: bold; font-size: 16px; color: #10b981; text-align: right;">${formatEmailPrice(totalPrice)}</td>
            </tr>
          </tfoot>
        </table>

        <p style="font-size: 14px; color: #4b5563;">
          If you have any questions or need to make changes, feel free to reply directly to this email or reach us at <a href="mailto:rajkiranastore0123@gmail.com" style="color: #10b981; text-decoration: none; font-weight: bold;">rajkiranastore0123@gmail.com</a>.
        </p>

        <p style="font-size: 14px; color: #4b5563; font-weight: bold; margin-top: 25px;">
          Warm regards,<br/>
          Raj Kirana Store Team
        </p>
      </div>
    </div>
  `;

  // Setup Nodemailer Transporter
  const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER;
  const smtpPass = process.env.SMTP_PASS || process.env.EMAIL_PASS;
  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = Number(process.env.SMTP_PORT) || 587;

  if (smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      // 1. Send to Owner (rajkiranastore0123@gmail.com)
      await transporter.sendMail({
        from: `"Raj Kirana Store System" <${smtpUser}>`,
        to: 'rajkiranastore0123@gmail.com',
        subject: ownerSubject,
        html: ownerHtml,
      });

      // 2. Send to Customer
      if (customerEmail) {
        await transporter.sendMail({
          from: `"Raj Kirana Store" <${smtpUser}>`,
          to: customerEmail,
          subject: customerSubject,
          html: customerHtml,
        });
      }

      console.log(`[Email] Dispatch process complete for Order #${orderId}`);
      return res.json({ success: true, message: 'Emails dispatched successfully' });
    } catch (err: any) {
      console.error('[Email Error] Failed to send real emails:', err);
      // Fail gracefully so order isn't broken, but notify of failure
      return res.json({ 
        success: false, 
        error: err.message, 
        message: 'Order created, but email dispatch failed. Verify SMTP settings.' 
      });
    }
  } else {
    // If SMTP keys are missing, we log and return success mock
    console.warn('\n======================================================');
    console.warn('⚠️  EMAIL NOTIFICATION SIMULATION ACTIVE');
    console.warn('SMTP credentials (SMTP_USER/SMTP_PASS) are not configured.');
    console.warn(`[To Owner] Sent order details for #${orderId} to rajkiranastore0123@gmail.com`);
    if (customerEmail) {
      console.warn(`[To Customer] Sent checkout thanks to ${customerEmail}`);
    }
    console.warn('======================================================\n');

    return res.json({
      success: true,
      mocked: true,
      message: 'SMTP not configured. Simulation logged order details.'
    });
  }
});

async function startServer() {
  // Vite integration in development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
