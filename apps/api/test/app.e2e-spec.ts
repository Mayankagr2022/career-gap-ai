/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';

describe('App & Global Config (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    // Apply the same global pipes/interceptors as main.ts for accurate testing
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should return 404 for unknown route (verifying app is running)', () => {
    return request(app.getHttpServer())
      .get('/api/v1/unknown-route')
      .expect(404);
  });
});
