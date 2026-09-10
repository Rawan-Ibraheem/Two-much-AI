import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Medicine } from './medicine.entity';
import { Pharmacy } from './pharmacy.entity';

/**
 * Current state only: one row per (medicine, pharmacy) holding today's price.
 * There is deliberately no price history table.
 */
@Entity('offers')
export class Offer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Medicine, (medicine) => medicine.offers, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'medicineId' })
  medicine: Medicine;

  @Column()
  medicineId: string;

  @ManyToOne(() => Pharmacy, (pharmacy) => pharmacy.offers, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'pharmacyId' })
  pharmacy: Pharmacy;

  @Column()
  pharmacyId: string;

  @Column('numeric', { precision: 10, scale: 2 })
  price: string;

  @Column({ default: true })
  available: boolean;

  /**
   * Where to buy: the pharmacy's storefront category page on Talabat.
   * Talabat exposes no stable per-product URL, so this is deliberately a
   * category-page link, not a deep link to this exact product row.
   */
  @Column({ type: 'varchar', nullable: true })
  sourceUrl: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  lastCheckedAt: Date;
}
