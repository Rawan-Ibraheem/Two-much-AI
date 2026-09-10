import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { MedicinesService, SearchResult } from './medicines.service';

@Controller('medicines')
export class MedicinesController {
  constructor(private readonly medicinesService: MedicinesService) {}

  @Get('search')
  search(@Query('q') q?: string): Promise<SearchResult[]> {
    if (!q || !q.trim()) {
      throw new BadRequestException('q is required');
    }
    return this.medicinesService.search(q.trim());
  }
}
