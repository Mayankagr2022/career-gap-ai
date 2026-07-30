/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, ExecutionContext } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';

describe('ResumesController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // We create a dummy user ID for testing
  const testUserId = '00000000-0000-0000-0000-000000000000';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      // Override the authentication guard so we don't need real JWT tokens for tests
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const req = context.switchToHttp().getRequest();
          req.user = { id: testUserId, email: 'test@example.com' };
          return true;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalInterceptors(new ResponseInterceptor());
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    // Clean up any test data we might have created
    await prisma.resume.deleteMany({ where: { userId: testUserId } });
    await app.close();
  });

  it('GET /api/v1/resumes - should return an empty array if no resumes exist', async () => {
    const response = await request(app.getHttpServer())
      .get('/resumes')
      .expect(200);

    expect(Array.isArray(response.body.data)).toBe(true);
    // Note: The response.body is wrapped in 'data' because of the ResponseInterceptor
  });

  // Note: We avoid testing POST /api/v1/resumes/upload in simple E2E tests 
  // unless we mock the StorageService, otherwise it uploads dummy files to your real AWS S3 bucket!
});
