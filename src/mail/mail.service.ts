import { Injectable } from '@nestjs/common';
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';


export interface MailMessage{
  to:string;
  subject:string;
  html:string;
  text:string;
}

@Injectable()
export class MailService {
  private readonly transporter:Transporter = nodemailer.createTransport({
    host:process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT ?? 1025),
    secure: process.env.MAIL_SECURE === 'true',
    auth: process.env.MAIL_USER ? {user: process.env.MAIL_USER, pass: process.env.MAIL_PASS} : undefined,
  });

  async send(message:MailMessage){
    await this.transporter.sendMail({from:process.env.MAIL_FROM, ...message});
  }
}
