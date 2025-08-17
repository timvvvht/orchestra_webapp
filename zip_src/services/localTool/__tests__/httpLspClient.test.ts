import { setBaseUrl, getBaseUrl } from '../httpLspClient';

describe('httpLspClient', () => {
  beforeEach(() => {
    // Reset baseUrl before each test
    setBaseUrl('http://localhost:8000');
  });

  describe('setBaseUrl', () => {
    it('should throw error for invalid URL without protocol', () => {
      expect(() => setBaseUrl('localhost:8000')).toThrow('Invalid base URL');
    });

    it('should throw error for invalid URL with wrong protocol', () => {
      expect(() => setBaseUrl('ftp://localhost:8000')).toThrow('Invalid base URL');
    });

    it('should accept valid http URL', () => {
      expect(() => setBaseUrl('http://localhost:8000')).not.toThrow();
      expect(getBaseUrl()).toBe('http://localhost:8000');
    });

    it('should accept valid https URL', () => {
      expect(() => setBaseUrl('https://localhost:8000')).not.toThrow();
      expect(getBaseUrl()).toBe('https://localhost:8000');
    });

    it('should trim trailing slash from URL', () => {
      setBaseUrl('http://localhost:8000/');
      expect(getBaseUrl()).toBe('http://localhost:8000');
    });

    it('should not trim URL without trailing slash', () => {
      setBaseUrl('http://localhost:8000');
      expect(getBaseUrl()).toBe('http://localhost:8000');
    });
  });

  describe('getBaseUrl', () => {
    it('should return the current baseUrl', () => {
      setBaseUrl('http://localhost:8001');
      expect(getBaseUrl()).toBe('http://localhost:8001');
    });

    it('should return empty string initially', () => {
      // Reset to initial state
      setBaseUrl('');
      expect(getBaseUrl()).toBe('');
    });
  });
});