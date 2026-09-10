import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Offer } from './offer.entity';

@Entity('pharmacies')
export class Pharmacy {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  // Plain text for now - no governorate lookup or geocoding.
  @Column()
  city: string;

  @Column({ type: 'varchar', nullable: true })
  websiteUrl: string | null;

  @OneToMany(() => Offer, (offer) => offer.pharmacy)
  offers: Offer[];
}
