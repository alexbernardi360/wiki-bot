import { Test, TestingModule } from '@nestjs/testing';
import { WikipediaController } from './wikipedia.controller';

describe('WikipediaController', () => {
  let controller: WikipediaController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WikipediaController],
    }).compile();

    controller = module.get<WikipediaController>(WikipediaController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
