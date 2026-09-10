import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Medicine } from './entities/medicine.entity';

export interface OfferResult {
  pharmacyName: string;
  city: string;
  price: number;
  available: boolean;
  lastCheckedAt: Date;
  sourceUrl: string | null;
}

export interface SearchResult {
  medicine: {
    id: string;
    name: string;
    activeIngredient: string;
    strength: string;
    form: string;
    packageSize: string;
  };
  cheapestPrice: number | null;
  offers: OfferResult[];
}

@Injectable()
export class MedicinesService {
  constructor(
    @InjectRepository(Medicine)
    private readonly medicines: Repository<Medicine>,
  ) {}

  async search(query: string): Promise<SearchResult[]> {
    const matches = await this.medicines
      .createQueryBuilder('medicine')
      .leftJoinAndSelect('medicine.offers', 'offer')
      .leftJoinAndSelect('offer.pharmacy', 'pharmacy')
      .where('medicine.name ILIKE :q OR medicine.activeIngredient ILIKE :q', {
        q: `%${query}%`,
      })
      .getMany();

    const results = matches.map((medicine) => {
      const offers = (medicine.offers ?? [])
        .map((offer) => ({
          pharmacyName: offer.pharmacy.name,
          city: offer.pharmacy.city,
          price: Number(offer.price),
          available: offer.available,
          lastCheckedAt: offer.lastCheckedAt,
          sourceUrl: offer.sourceUrl,
        }))
        .sort((a, b) => a.price - b.price);

      return {
        medicine: {
          id: medicine.id,
          name: medicine.name,
          activeIngredient: medicine.activeIngredient,
          strength: medicine.strength,
          form: medicine.form,
          packageSize: medicine.packageSize,
        },
        cheapestPrice: offers.length ? offers[0].price : null,
        offers,
      };
    });

    // Cheapest product first; medicines with no offers sink to the bottom.
    return results.sort(
      (a, b) =>
        (a.cheapestPrice ?? Number.POSITIVE_INFINITY) -
        (b.cheapestPrice ?? Number.POSITIVE_INFINITY),
    );
  }
}
