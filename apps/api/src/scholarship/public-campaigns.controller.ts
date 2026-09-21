import { Controller, Get, Header } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';

/** Informations publiques (page d'accueil) : campagnes de l'année en cours et leurs pièces. */
@Controller('public')
export class PublicCampaignsController {
  constructor(private readonly campaigns: CampaignsService) {}

  @Get('campaigns')
  @Header('Cache-Control', 'public, max-age=300')
  list() {
    return this.campaigns.listPublic();
  }
}
