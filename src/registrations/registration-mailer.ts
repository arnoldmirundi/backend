import { Injectable } from '@nestjs/common';
import { MailService } from '../mail/mail.service.js';
import { Registration } from './entities/registration.entity.js';

const TOURNAMENT = 'Iteen International Cup 2026';

// Escape anything typed by users before putting it in HTML
const esc = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const toText = (html: string) =>
  html.replace(/<br\s*\/?>/g, '\n').replace(/<\/(p|li|h2)>/g, '\n').replace(/<[^>]+>/g, '').replace(/\n{3,}/g, '\n\n').trim();

const layout = (title: string, body: string) => `
  <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1f2937;line-height:1.5">
    <h2 style="color:#5b21b6;margin-bottom:4px">${title}</h2>
    <p style="margin-top:0;color:#6b7280">${TOURNAMENT}</p>
    ${body}
    <p style="margin-top:32px;color:#6b7280;font-size:13px">Iteen International Cup · We play it, we enjoy it</p>
  </div>`;

const teamCount = (r: Registration) => r.entries.reduce((sum, e) => sum + e.count, 0);

const teamsList = (r: Registration, withLabels = false) =>
  '<ul>' +
  r.entries
    .map((e) => {
      const labels =
        withLabels && e.count > 1
          ? ` (Team ${Array.from({ length: e.count }, (_, i) => String.fromCharCode(65 + i)).join(', Team ')})`
          : '';
      return `<li>${esc(e.section)} ${esc(e.ageGroup)} × ${e.count}${labels}</li>`;
    })
    .join('') +
  '</ul>';

@Injectable()
export class RegistrationMailer {
  constructor(private readonly mail: MailService) {}

  received(r: Registration) {
    const details = esc(process.env.PAYMENT_DETAILS ?? 'We will contact you with payment details.')
      .replace(/\\n|\n/g, '<br>');

    const html = layout(
      'Registration received',
      `<p>Dear ${esc(r.contactName)},</p>
       <p>Thank you for registering <strong>${esc(r.clubName)}</strong>. We received the following entries:</p>
       ${teamsList(r)}
       <p>To confirm your place, please pay <strong>$${r.amountDue}</strong> (${teamCount(r)} team(s)).</p>
       <p><strong>Payment details</strong><br>${details}</p>
       <p>Please quote your reference <strong>#${r.id}</strong> with the payment.
          Your teams are confirmed once we have received it.</p>`,
    );

    return this.mail.send({
      to: r.contactEmail,
      subject: `Registration received: ${r.clubName} (#${r.id})`,
      html,
      text: toText(html),
    });
  }

  approved(r: Registration) {
    const html = layout(
      'Your registration is confirmed',
      `<p>Dear ${esc(r.contactName)},</p>
       <p><strong>${esc(r.clubName)}</strong> is confirmed for the tournament with these teams:</p>
       ${teamsList(r, true)}
       <p>We will share the groups and match schedule closer to the tournament.</p>
       <p>Reference: <strong>#${r.id}</strong></p>`,
    );

    return this.mail.send({
      to: r.contactEmail,
      subject: `Confirmed: ${r.clubName} (#${r.id})`,
      html,
      text: toText(html),
    });
  }

  rejected(r: Registration) {
    const reason = r.rejectionReason
      ? `<p><strong>Reason:</strong> ${esc(r.rejectionReason)}</p>`
      : '';

    const html = layout(
      'Registration not accepted',
      `<p>Dear ${esc(r.contactName)},</p>
       <p>Unfortunately we are unable to accept the registration of
          <strong>${esc(r.clubName)}</strong> (reference #${r.id}).</p>
       ${reason}
       <p>If you have any questions, simply reply to this email.</p>`,
    );

    return this.mail.send({
      to: r.contactEmail,
      subject: `Registration update: ${r.clubName} (#${r.id})`,
      html,
      text: toText(html),
    });
  }
}