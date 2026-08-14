/**
 * Integration tests for REST API
 * Run: npm run test:integration
 */
const request = require('supertest');
const { server } = require('../../server');

describe('Lxrn REST API', () => {
  let app;

  beforeAll((done) => {
    app = server.listen(0, done);
  });

  afterAll((done) => {
    if (app && app.close) {
      app.close(done);
    } else {
      done();
    }
  });

  describe('POST /compress', () => {
    it('should compress binary data', async () => {
      const data = Buffer.from('Hello, World!');
      const response = await request(app)
        .post('/compress')
        .send(data)
        .expect(200);
      
      expect(response.headers['x-compressed-size']).toBeDefined();
      expect(response.headers['x-original-size']).toBe('13');
    });

    it('should reject empty data', async () => {
      await request(app)
        .post('/compress')
        .send(Buffer.from(''))
        .expect(400);
    });
  });

  describe('POST /compress-text', () => {
    it('should compress text data', async () => {
      const response = await request(app)
        .post('/compress-text')
        .send({
          text: 'Hello, World!',
          level: 'fastest'
        })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.compressedBase64).toBeDefined();
    });
  });
});
