import nodemailer from "nodemailer";

/**
 * Enterprise Email Service using Nodemailer (Gmail SMTP)
 * Replaces unreliable Brevo API and adds robust timeout handling
 */
export const sendEmail = async ({ to, subject, html }) => {
  const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST || "smtp.gmail.com",
    port: process.env.MAIL_PORT || 465,
    secure: process.env.MAIL_PORT == 465 ? true : false,
    auth: {
      user: process.env.EMAIL_USER, // viralshortsking2323@gmail.com
      pass: process.env.EMAIL_PASS, // App Password
    },
    family: 4, // Force IPv4 routing to fix ENETUNREACH error
    connectionTimeout: 10000, // 10s timeout
    greetingTimeout: 10000,
  });

  try {
    const info = await transporter.sendMail({
      from: `"CampusCart" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });

    if (process.env.NODE_ENV !== "production") {
      console.log("Email sent successfully:", info.messageId);
    }
    return info;
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Nodemailer error:", error.message);
    }
    throw error;
  }
};
