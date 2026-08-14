/**
 * Authentication tests
 */
const request = require('supertest');
const server = require('../../server-with-auth');

describe('Authentication', () => {
  let accessToken;
  let refreshToken;
  
  beforeAll(async () => {
    // Register a test user
    await request(server)
      .post('/auth/register')
      .send({
        username: 'testuser',
        email: 'test@example.com',
        password: 'Test123!'
      });
  });
  
  afterAll((done) => {
    if (server && server.close) {
      server.close(done);
    } else {
      done();
    }
  });
  
  describe('POST /auth/register', () => {
    it('should register a new user', async () => {
      const response = await request(server)
        .post('/auth/register')
        .send({
          username: 'newuser',
          email: 'new@example.com',
          password: 'New123!'
        });
      
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.accessToken).toBeDefined();
    });
    
    it('should reject duplicate email', async () => {
      const response = await request(server)
        .post('/auth/register')
        .send({
          username: 'testuser2',
          email: 'test@example.com',
          password: 'Test123!'
        });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBe(true);
    });
  });
  
  describe('POST /auth/login', () => {
    it('should login with valid credentials', async () => {
      const response = await request(server)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Test123!'
        });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
      
      accessToken = response.body.data.accessToken;
      refreshToken = response.body.data.refreshToken;
    });
    
    it('should reject invalid password', async () => {
      const response = await request(server)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Wrong123!'
        });
      
      expect(response.status).toBe(401);
      expect(response.body.error).toBe(true);
    });
  });
  
  describe('Authenticated endpoints', () => {
    it('should access protected endpoint with token', async () => {
      const response = await request(server)
        .get('/me')
        .set('Authorization', `Bearer ${accessToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user.email).toBe('test@example.com');
    });
    
    it('should reject request without token', async () => {
      const response = await request(server)
        .get('/me');
      
      expect(response.status).toBe(401);
      expect(response.body.error).toBe(true);
    });
  });
  
  describe('POST /auth/refresh', () => {
    it('should refresh token', async () => {
      const response = await request(server)
        .post('/auth/refresh')
        .send({
          refreshToken: refreshToken
        });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
    });
  });
});
