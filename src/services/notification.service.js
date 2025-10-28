import nodemailer from 'nodemailer';
import winston from 'winston';

// Configure logger for notifications
const notificationLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/notifications.log' })
  ]
});

// Email transporter configuration
const createEmailTransporter = () => {
  // Determine if TLS certificate verification should be disabled
  // Only disable if explicitly opted into insecure mode via SMTP_ALLOW_INSECURE
  const smtpAllowInsecure = process.env.SMTP_ALLOW_INSECURE;
  const rejectUnauthorizedEnv = process.env.SMTP_REJECT_UNAUTHORIZED;
  
  // Default to secure TLS verification
  let rejectUnauthorized = true;
  
  // Allow explicit opt-out via SMTP_ALLOW_INSECURE for testing/local development
  if (smtpAllowInsecure && ['true', '1'].includes(smtpAllowInsecure.toLowerCase())) {
    rejectUnauthorized = false;
  }
  
  // Allow override via SMTP_REJECT_UNAUTHORIZED (backwards compatibility)
  if (rejectUnauthorizedEnv !== undefined) {
    rejectUnauthorized = !['false', '0'].includes(rejectUnauthorizedEnv.toLowerCase());
  }
  
  // Security guard: Never allow insecure TLS in production
  if (process.env.NODE_ENV === 'production' && rejectUnauthorized === false) {
    throw new Error('Insecure TLS configuration not allowed in production. Remove SMTP_ALLOW_INSECURE or set SMTP_REJECT_UNAUTHORIZED to true.');
  }

  return nodemailer.createTransporter({
    host: process.env.SMTP_HOST || 'localhost',
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || ''
    },
    tls: {
      rejectUnauthorized
    }
  });
};

/**
 * Notification Service - Handles email and SMS notifications
 */
export class NotificationService {
  /**
   * Send email notification
   * @param {Object} options - Email options
   * @returns {Object} Send result
   */
  static async sendEmail(options) {
    try {
      const { to, cc, bcc, subject, template, data, attachments } = options;
      
      if (!to || !subject) {
        throw new Error('Email recipient and subject are required');
      }

      const transporter = createEmailTransporter();
      
      // Verify transporter connection
      await transporter.verify();
      
      const emailContent = this.generateEmailContent(template, data);
      
      const mailOptions = {
        from: process.env.SMTP_FROM || 'noreply@flightgroup.com',
        to: Array.isArray(to) ? to.join(', ') : to,
        cc: cc ? (Array.isArray(cc) ? cc.join(', ') : cc) : undefined,
        bcc: bcc ? (Array.isArray(bcc) ? bcc.join(', ') : bcc) : undefined,
        subject,
        html: emailContent.html,
        text: emailContent.text,
        attachments
      };

      const result = await transporter.sendMail(mailOptions);
      
      notificationLogger.info('Email sent successfully', {
        messageId: result.messageId,
        to,
        subject,
        template
      });

      return {
        success: true,
        messageId: result.messageId,
        to,
        subject
      };

    } catch (error) {
      notificationLogger.error('Send email failed', {
        error: error.message,
        options: { ...options, password: '[REDACTED]' }
      });
      throw error;
    }
  }

  /**
   * Send SMS notification (mock implementation)
   * @param {Object} options - SMS options
   * @returns {Object} Send result
   */
  static async sendSMS(options) {
    try {
      const { to, message, template, data } = options;
      
      if (!to || !message) {
        throw new Error('SMS recipient and message are required');
      }

      // Mock SMS service - in production, integrate with Twilio, etc.
      const smsContent = this.generateSMSContent(template, data) || message;
      
      // Simulate SMS sending
      const smsResult = {
        success: true,
        messageId: `SMS_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        to,
        message: smsContent,
        sentAt: new Date().toISOString()
      };

      notificationLogger.info('SMS sent successfully', {
        messageId: smsResult.messageId,
        to,
        messageLength: smsContent.length
      });

      return smsResult;

    } catch (error) {
      notificationLogger.error('Send SMS failed', {
        error: error.message,
        options
      });
      throw error;
    }
  }

  /**
   * Send booking status change notification
   * @param {Object} data - Booking data
   * @returns {Object} Send result
   */
  static async sendBookingStatusChange(data) {
    try {
      const { booking, previousStatus, newStatus, user, agency } = data;
      
      const emailData = {
        userName: user.name,
        userEmail: user.email,
        userPhone: user.phone,
        bookingId: booking.id,
        previousStatus,
        newStatus,
        flightDetails: {
          carrierCode: booking.flightGroup?.carrierCode,
          flightNumber: booking.flightGroup?.flightNumber,
          origin: booking.flightGroup?.origin,
          destination: booking.flightGroup?.destination,
          departureTime: booking.flightGroup?.departureTimeUtc
        },
        pnr: booking.pnr,
        statusChangeTime: new Date().toISOString(),
        agencyName: agency.name
      };

      // Send email notification
      const emailResult = await this.sendEmail({
        to: user.email,
        subject: `Booking Status Updated: ${previousStatus} → ${newStatus}`,
        template: 'booking-status-change',
        data: emailData
      });

      // Send SMS for critical status changes
      let smsResult = null;
      if (['APPROVED', 'REJECTED', 'ISSUED'].includes(newStatus) && user.phone) {
        smsResult = await this.sendSMS({
          to: user.phone,
          template: 'booking-status-sms',
          data: {
            bookingId: booking.id,
            status: newStatus,
            pnr: booking.pnr
          }
        });
      }

      return {
        email: emailResult,
        sms: smsResult
      };

    } catch (error) {
      notificationLogger.error('Send booking status change failed', {
        error: error.message,
        bookingId: data.booking?.id
      });
      throw error;
    }
  }

  /**
   * Send payment reminder notification
   * @param {Object} data - Payment reminder data
   * @returns {Object} Send result
   */
  static async sendPaymentReminder(data) {
    try {
      const { booking, user, paymentDeadline } = data;
      
      const emailData = {
        userName: user.name,
        bookingId: booking.id,
        paymentDeadline,
        amount: booking.pricing?.totals?.totalFare || 0,
        currency: booking.pricing?.currency || 'PKR',
        flightDetails: {
          carrierCode: booking.flightGroup?.carrierCode,
          flightNumber: booking.flightGroup?.flightNumber,
          origin: booking.flightGroup?.origin,
          destination: booking.flightGroup?.destination
        },
        paymentLink: `${process.env.FRONTEND_URL}/bookings/${booking.id}/payment`
      };

      const emailResult = await this.sendEmail({
        to: user.email,
        subject: `Payment Reminder for Booking ${booking.id}`,
        template: 'payment-reminder',
        data: emailData
      });

      // Send SMS reminder
      let smsResult = null;
      if (user.phone) {
        smsResult = await this.sendSMS({
          to: user.phone,
          template: 'payment-reminder-sms',
          data: {
            bookingId: booking.id,
            paymentDeadline: paymentDeadline.split('T')[0], // Date only
            amount: emailData.amount
          }
        });
      }

      return {
        email: emailResult,
        sms: smsResult
      };

    } catch (error) {
      notificationLogger.error('Send payment reminder failed', {
        error: error.message,
        bookingId: data.booking?.id
      });
      throw error;
    }
  }

  /**
   * Send booking confirmation notification
   * @param {Object} data - Booking confirmation data
   * @returns {Object} Send result
   */
  static async sendBookingConfirmation(data) {
    try {
      const { booking, user, passengers } = data;
      
      const emailData = {
        userName: user.name,
        bookingId: booking.id,
        pnr: booking.pnr,
        flightDetails: {
          carrierCode: booking.flightGroup?.carrierCode,
          flightNumber: booking.flightGroup?.flightNumber,
          origin: booking.flightGroup?.origin,
          destination: booking.flightGroup?.destination,
          departureTime: booking.flightGroup?.departureTimeUtc
        },
        passengers: passengers || [],
        pricing: booking.pricing,
        bookingLink: `${process.env.FRONTEND_URL}/bookings/${booking.id}`
      };

      const emailResult = await this.sendEmail({
        to: user.email,
        subject: `Booking Confirmed: ${booking.pnr}`,
        template: 'booking-confirmation',
        data: emailData,
        attachments: this.generateBookingAttachment(booking, passengers)
      });

      return {
        email: emailResult
      };

    } catch (error) {
      notificationLogger.error('Send booking confirmation failed', {
        error: error.message,
        bookingId: data.booking?.id
      });
      throw error;
    }
  }

  /**
   * Generate email content based on template
   * @param {string} template - Template name
   * @param {Object} data - Template data
   * @returns {Object} HTML and text content
   */
  static generateEmailContent(template, data) {
    const templates = {
      'booking-status-change': {
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Booking Status Update</h2>
            <p>Dear ${data.userName},</p>
            <p>Your booking status has been updated:</p>
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Booking ID:</strong> ${data.bookingId}</p>
              <p><strong>Status Change:</strong> ${data.previousStatus} → ${data.newStatus}</p>
              <p><strong>PNR:</strong> ${data.pnr}</p>
              <p><strong>Flight:</strong> ${data.flightDetails.carrierCode} ${data.flightDetails.flightNumber}</p>
              <p><strong>Route:</strong> ${data.flightDetails.origin} → ${data.flightDetails.destination}</p>
              <p><strong>Departure:</strong> ${new Date(data.flightDetails.departureTime).toLocaleString()}</p>
            </div>
            <p>Please contact your agency if you have any questions.</p>
            <p>Best regards,<br>${data.agencyName} Team</p>
          </div>
        `,
        text: `
          Booking Status Update
          
          Dear ${data.userName},
          
          Your booking status has been updated:
          
          Booking ID: ${data.bookingId}
          Status Change: ${data.previousStatus} → ${data.newStatus}
          PNR: ${data.pnr}
          Flight: ${data.flightDetails.carrierCode} ${data.flightDetails.flightNumber}
          Route: ${data.flightDetails.origin} → ${data.flightDetails.destination}
          Departure: ${new Date(data.flightDetails.departureTime).toLocaleString()}
          
          Please contact your agency if you have any questions.
          
          Best regards,
          ${data.agencyName} Team
        `
      },
      
      'payment-reminder': {
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc2626;">Payment Reminder</h2>
            <p>Dear ${data.userName},</p>
            <p>This is a reminder that payment is due for your booking:</p>
            <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #fecaca;">
              <p><strong>Booking ID:</strong> ${data.bookingId}</p>
              <p><strong>Amount Due:</strong> ${data.currency} ${data.amount.toLocaleString()}</p>
              <p><strong>Payment Deadline:</strong> ${new Date(data.paymentDeadline).toLocaleString()}</p>
              <p><strong>Flight:</strong> ${data.flightDetails.carrierCode} ${data.flightDetails.flightNumber}</p>
            </div>
            <p><a href="${data.paymentLink}" style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Pay Now</a></p>
            <p>Please complete your payment before the deadline to avoid cancellation.</p>
          </div>
        `,
        text: `
          Payment Reminder
          
          Dear ${data.userName},
          
          This is a reminder that payment is due for your booking:
          
          Booking ID: ${data.bookingId}
          Amount Due: ${data.currency} ${data.amount.toLocaleString()}
          Payment Deadline: ${new Date(data.paymentDeadline).toLocaleString()}
          Flight: ${data.flightDetails.carrierCode} ${data.flightDetails.flightNumber}
          
          Please complete your payment before the deadline to avoid cancellation.
          
          Payment link: ${data.paymentLink}
        `
      },

      'booking-confirmation': {
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #16a34a;">Booking Confirmed</h2>
            <p>Dear ${data.userName},</p>
            <p>Your booking has been confirmed. Here are your details:</p>
            <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #bbf7d0;">
              <p><strong>Booking ID:</strong> ${data.bookingId}</p>
              <p><strong>PNR:</strong> ${data.pnr}</p>
              <p><strong>Flight:</strong> ${data.flightDetails.carrierCode} ${data.flightDetails.flightNumber}</p>
              <p><strong>Route:</strong> ${data.flightDetails.origin} → ${data.flightDetails.destination}</p>
              <p><strong>Departure:</strong> ${new Date(data.flightDetails.departureTime).toLocaleString()}</p>
              <p><strong>Total Amount:</strong> ${data.pricing?.currency} ${data.pricing?.totals?.totalFare?.toLocaleString()}</p>
            </div>
            <h3>Passengers:</h3>
            <ul>
              ${data.passengers.map(p => `<li>${p.firstName} ${p.lastName} (${p.paxType})</li>`).join('')}
            </ul>
            <p><a href="${data.bookingLink}" style="background: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Booking</a></p>
          </div>
        `,
        text: `
          Booking Confirmed
          
          Dear ${data.userName},
          
          Your booking has been confirmed. Here are your details:
          
          Booking ID: ${data.bookingId}
          PNR: ${data.pnr}
          Flight: ${data.flightDetails.carrierCode} ${data.flightDetails.flightNumber}
          Route: ${data.flightDetails.origin} → ${data.flightDetails.destination}
          Departure: ${new Date(data.flightDetails.departureTime).toLocaleString()}
          Total Amount: ${data.pricing?.currency} ${data.pricing?.totals?.totalFare?.toLocaleString()}
          
          Passengers:
          ${data.passengers.map(p => `- ${p.firstName} ${p.lastName} (${p.paxType})`).join('\n')}
          
          Booking link: ${data.bookingLink}
        `
      }
    };

    const templateContent = templates[template] || templates['booking-status-change'];
    
    // Replace template variables
    let html = templateContent.html;
    let text = templateContent.text;
    
    for (const [key, value] of Object.entries(data)) {
      const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      html = html.replace(placeholder, value);
      text = text.replace(placeholder, value);
    }

    return { html, text };
  }

  /**
   * Generate SMS content based on template
   * @param {string} template - Template name
   * @param {Object} data - Template data
   * @returns {string} SMS content
   */
  static generateSMSContent(template, data) {
    const templates = {
      'booking-status-sms': `Booking ${data.bookingId} status updated to: ${data.status}. PNR: ${data.pnr}`,
      'payment-reminder-sms': `Payment reminder: Booking ${data.bookingId}, Amount: ${data.amount} ${data.currency}, Deadline: ${data.paymentDeadline}`,
      'booking-confirmation-sms': `Booking confirmed! ID: ${data.bookingId}, PNR: ${data.pnr}`
    };

    return templates[template] || `Flight Group Booking: ${data.bookingId}`;
  }

  /**
   * Generate booking attachment (PDF receipt)
   * @param {Object} booking - Booking data
   * @param {Array} passengers - Passenger data
   * @returns {Array} Attachments array
   */
  static generateBookingAttachment(booking, passengers) {
    // Mock PDF generation - in production, use PDFKit or similar
    const receiptContent = `
      BOOKING RECEIPT
      =================
      Booking ID: ${booking.id}
      PNR: ${booking.pnr}
      Date: ${new Date().toLocaleString()}
      
      Flight Details:
      ${booking.flightGroup?.carrierCode} ${booking.flightGroup?.flightNumber}
      ${booking.flightGroup?.origin} → ${booking.flightGroup?.destination}
      Departure: ${new Date(booking.flightGroup?.departureTimeUtc).toLocaleString()}
      
      Passengers:
      ${passengers.map(p => `${p.firstName} ${p.lastName} (${p.paxType})`).join('\n')}
      
      Total: ${booking.pricing?.currency} ${booking.pricing?.totals?.totalFare?.toLocaleString()}
    `;

    return [
      {
        filename: `booking-receipt-${booking.id}.txt`,
        content: receiptContent,
        contentType: 'text/plain'
      }
    ];
  }

  /**
   * Test email configuration
   * @returns {Object} Test result
   */
  static async testEmailConfiguration() {
    try {
      const transporter = createEmailTransporter();
      await transporter.verify();
      
      return {
        success: true,
        message: 'Email configuration is valid'
      };
    } catch (error) {
      return {
        success: false,
        message: `Email configuration error: ${error.message}`
      };
    }
  }
}
