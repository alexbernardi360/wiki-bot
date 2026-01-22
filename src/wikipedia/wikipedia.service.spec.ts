import { Test, TestingModule } from '@nestjs/testing';
import { WikipediaService } from './wikipedia.service';

describe('WikipediaService', () => {
  let service: WikipediaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WikipediaService],
    }).compile();

    service = module.get<WikipediaService>(WikipediaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
