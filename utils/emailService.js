// utils/emailService.js
const nodemailer = require('nodemailer');
const config = require('../config/env');

class EmailService {
  static transporter = null;

  static async createTransporter() {
    if (!this.transporter) {
      // For Gmail
      this.transporter = nodemailer.createTransport({
        service: 'gmail', // Using 'gmail' instead of custom SMTP settings
        auth: {
          user: config.SMTP_USER,
          pass: config.SMTP_PASS // This should be an App Password
        },
        tls: {
          rejectUnauthorized: false // For development
        }
      });

      // Verify connection
      try {
        await this.transporter.verify();
        console.log('Email service connected successfully');
      } catch (error) {
        console.error('Email service connection failed:', error);
        // Fall back to console logging in development
        if (process.env.NODE_ENV === 'development') {
          this.transporter = {
            sendMail: (options) => {
              console.log('Email would have been sent:', options);
              return Promise.resolve({ messageId: 'development' });
            }
          };
        }
      }
    }
    return this.transporter;
  }

  /**
   * Send verification email
   */
  static async sendVerificationEmail(email, name, code) {
    try {
      await this.createTransporter();

      const mailOptions = {
        from: {
          name: 'Ultimate Blog',
          address: config.SMTP_USER
        },
        to: email,
        subject: 'Verify Your Email - Ultimate Blog',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; padding: 20px;">
              <h1 style="color: #333;">Welcome to Ultimate Blog!</h1>
            </div>
            
            <div style="background-color: #ffffff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <h2 style="color: #444; margin-bottom: 20px;">Verify Your Email Address</h2>
              
              <p style="color: #666; font-size: 16px;">Hi ${name},</p>
              
              <p style="color: #666; font-size: 16px;">Thank you for registering with Ultimate Blog. Please use the verification code below to complete your registration:</p>
              
              <div style="background-color: #f8f9fa; padding: 15px; margin: 25px 0; text-align: center; border-radius: 4px;">
                <span style="font-size: 32px; letter-spacing: 5px; color: #333; font-weight: bold;">${code}</span>
              </div>
              
              <p style="color: #666; font-size: 14px;">This code will expire in 30 minutes for security reasons.</p>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                <p style="color: #999; font-size: 12px; text-align: center;">
                  If you didn't request this verification, please ignore this email or contact support if you have concerns.
                </p>
              </div>
            </div>
            
            <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
              <p>© ${new Date().getFullYear()} Ultimate Blog. All rights reserved.</p>
            </div>
          </div>
        `
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Verification email sent:', info.messageId);
      return true;

    } catch (error) {
      console.error('Failed to send verification email:', error);
      if (process.env.NODE_ENV === 'development') {
        // In development, log the email content
        console.log('Email content:', {
          to: email,
          code: code,
          error: error.message
        });
      }
      return false;
    }
  }
}

module.exports = EmailService;