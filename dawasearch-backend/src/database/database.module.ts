import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSourceOptions } from 'typeorm';

/**
 * Shared by the Nest app and the standalone seed script so both talk to the
 * same database with the same entity discovery rules.
 */
export function buildDataSourceOptions(): DataSourceOptions {
  return {
    type: 'postgres',
    url:
      process.env.DATABASE_URL ||
      'postgresql://dawasearch:dawasearch@localhost:5433/dawasearch_dev',
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    // Hackathon speed: let TypeORM create/patch tables. No migrations yet.
    synchronize: true,
    logging: false,
  };
}

@Module({
  imports: [TypeOrmModule.forRootAsync({ useFactory: buildDataSourceOptions })],
})
export class DatabaseModule {}
