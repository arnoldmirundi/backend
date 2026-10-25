import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum RegistrationStatus {
  Pending = 'pending',
  Approved = 'approved',
  Rejected = 'rejected',
}

export enum PaymentStatus {
  NotRequired = 'not_required',
  Unpaid = 'unpaid',
  Paid = 'paid',
}

export interface RegistrationEntry {
  section: string;
  ageGroup: string;
  count: number;
}

@Entity('registration')
export class Registration {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', default: RegistrationStatus.Pending })
  status: RegistrationStatus;

  // Payment
  @Column({ type: 'varchar', default: PaymentStatus.Unpaid })
  paymentStatus: PaymentStatus;

  @Column({ type: 'int', default: 0 })
  amountDue: number; // USD

  @Column({ type: 'timestamptz', nullable: true })
  paidAt: Date | null;

  // Club
  @Column()
  clubName: string;

  @Column()
  country: string;

  @Column({ type: 'varchar', nullable: true })
  logo: string | null;

  @Column({ type: 'varchar', nullable: true })
  kitPrimary: string | null;

  @Column({ type: 'varchar', nullable: true })
  kitSecondary: string | null;

  // Contact
  @Column()
  contactName: string;

  @Column()
  contactRole: string;

  @Column()
  contactEmail: string;

  @Column()
  contactPhone: string;

  // Teams
  @Column({ type: 'jsonb' })
  entries: RegistrationEntry[];

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  // Review
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  reviewedAt: Date | null;

  @Column({ type: 'int', nullable: true })
  clubId: number | null;
  @Column({type:'text', nullable: true})
  rejectionReason:string | null;
}