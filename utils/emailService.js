const nodemailer = require('nodemailer');
const config = require('../config/env');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: config.SMTP_HOST,
      port: config.SMTP_PORT,
      secure: config.SMTP_PORT === 465,
      auth: {
        user: config.SMTP_USER,
        pass: config.SMTP_PASS
      }
    });
  }

  // Email templates
  getVerificationEmailTemplate(name, code) {
    return {
      subject: 'Email Verification - Ultimate Blog',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to Ultimate Blog!</h2>
          <p>Hello ${name},</p>
          <p>Thank you for registering. Please use the verification code below to verify your email address:</p>
          <div style="background: #f9f9f9; padding: 15px; text-align: center; font-size: 24px; letter-spacing: 5px;">
            <strong>${code}</strong>
          </div>
          <p>This code will expire in 30 minutes.</p>
          <p>If you didn't request this verification, please ignore this email.</p>
          <hr>
          <p style="font-size: 12px; color: #666;">
            This is an automated message, please do not reply to this email.
          </p>
        </div>
      `
    };
  }

  getPasswordResetTemplate(name, resetLink) {
    return {
      subject: 'Password Reset Request - Ultimate Blog',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Password Reset Request</h2>
          <p>Hello ${name},</p>
          <p>You recently requested to reset your password. Click the button below to reset it:</p>
          <div style="text-align: center; margin: 25px 0;">
            <a href="${resetLink}" style="background: #007bff; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px;">
              Reset Password
            </a>
          </div>
          <p>If you didn't request this reset, please ignore this email and contact support.</p>
          <p>This link will expire in 30 minutes.</p>
          <hr>
          <p style="font-size: 12px; color: #666;">
            This is an automated message, please do not reply to this email.
          </p>
        </div>
      `
    };
  }

  getWelcomeEmailTemplate(name, loginLink) {
    return {
      subject: 'Welcome to Ultimate Blog!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to Ultimate Blog!</h2>
          <p>Hello ${name},</p>
          <p>Thank you for joining Ultimate Blog. We're excited to have you on board!</p>
          <div style="text-align: center; margin: 25px 0;">
            <a href="${loginLink}" style="background: #28a745; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px;">
              Get Started
            </a>
          </div>
          <p>If you have any questions, feel free to contact our support team.</p>
          <hr>
          <p style="font-size: 12px; color: #666;">
            This is an automated message, please do not reply to this email.
          </p>
        </div>
      `
    };
  }

  async sendEmail(to, template) {
    try {
      const mailOptions = {
        from: `Ultimate Blog <${config.EMAIL_FROM}>`,
        to,
        subject: template.subject,
        html: template.html
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Email sent:', info.messageId);
      return true;
    } catch (error) {
      console.error('Email sending failed:', error);
      throw new Error('Failed to send email');
    }
  }

  // Verify email configuration
  async verifyConnection() {
    try {
      await this.transporter.verify();
      console.log('Email service is ready');
      return true;
    } catch (error) {
      console.error('Email service verification failed:', error);
      throw error;
    }
  }
}

module.exports = new EmailService();