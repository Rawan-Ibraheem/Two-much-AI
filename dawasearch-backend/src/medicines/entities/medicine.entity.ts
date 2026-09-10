import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Offer } from './offer.entity';

@Entity('medicines')
export class Medicine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  activeIngredient: string;

  @Column()
  strength: string;

  @Column()
  form: string;

  @Column()
  packageSize: string;

  @OneToMany(() => Offer, (offer) => offer.medicine)
  offers: Offer[];
}
